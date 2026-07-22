import 'server-only';

import { ApiError } from '@/server/apiError';
import { getDatabase, isDatabaseConfigured } from '@/server/database';
import {
    deleteWallpaperObject,
    getWallpaperStorageProvider,
    wallpaperStorageProviders,
} from '@/server/wallpaperStorage';
import type { WallpaperStorageProvider } from '@/server/wallpaperStorage';
import type { WallpaperAsset } from '../../shared/wallpaper';
import {
    getWallpaperUploadPrefix,
    isWallpaperContentType,
    wallpaperMaxDimensionPx,
    wallpaperMaxFileSizeBytes,
} from '../../shared/wallpaper';

interface WallpaperRow {
    content_type: string;
    height: number;
    object_key: string;
    size_bytes: number;
    storage_provider: string;
    updated_at: string;
    width: number;
}

const getWallpaperUrl = (key: string, download = false): string => {
    const parameters = new URLSearchParams({ key });

    if (download) {
        parameters.set('download', '1');
    }

    return `/api/wallpaper-file?${parameters.toString()}`;
};

const parseStorageProvider = (value: string): WallpaperStorageProvider => {
    if (
        !wallpaperStorageProviders.includes(value as WallpaperStorageProvider)
    ) {
        throw new ApiError('Stored wallpaper provider is invalid.', 500);
    }

    return value as WallpaperStorageProvider;
};

const mapWallpaperRow = (row: WallpaperRow): WallpaperAsset => {
    if (!isWallpaperContentType(row.content_type)) {
        throw new ApiError('Stored wallpaper has an unsupported type.', 500);
    }

    parseStorageProvider(row.storage_provider);

    return {
        contentType: row.content_type,
        downloadUrl: getWallpaperUrl(row.object_key, true),
        height: row.height,
        pathname: row.object_key,
        sizeBytes: row.size_bytes,
        uploadedAt: row.updated_at,
        url: getWallpaperUrl(row.object_key),
        width: row.width,
    };
};

const validateWallpaperAsset = (
    userId: string,
    asset: WallpaperAsset
): void => {
    if (!isWallpaperContentType(asset.contentType)) {
        throw new ApiError('Unsupported wallpaper image type.', 400);
    }

    if (
        !Number.isInteger(asset.sizeBytes) ||
        asset.sizeBytes <= 0 ||
        asset.sizeBytes > wallpaperMaxFileSizeBytes
    ) {
        throw new ApiError('Wallpaper file is too large.', 400);
    }

    if (
        !Number.isInteger(asset.width) ||
        !Number.isInteger(asset.height) ||
        asset.width <= 0 ||
        asset.height <= 0 ||
        asset.width > wallpaperMaxDimensionPx ||
        asset.height > wallpaperMaxDimensionPx
    ) {
        throw new ApiError('Wallpaper dimensions are not supported.', 400);
    }

    const expectedPrefix = `${getWallpaperUploadPrefix(userId)}/`;
    if (!asset.pathname.startsWith(expectedPrefix)) {
        throw new ApiError('Wallpaper path does not belong to this user.', 400);
    }
};

const wallpaperColumns = `
    storage_provider,
    object_key,
    content_type,
    size_bytes,
    width,
    height,
    updated_at::text
`;

export const getUserWallpaper = async (
    userId: string
): Promise<WallpaperAsset | undefined> => {
    if (!isDatabaseConfigured()) {
        return undefined;
    }

    const rows = (await getDatabase().unsafe(
        `select ${wallpaperColumns}
         from user_wallpapers
         where user_id = $1
         limit 1`,
        [userId]
    )) as unknown as WallpaperRow[];
    const row = rows.at(0);

    return row === undefined ? undefined : mapWallpaperRow(row);
};

export const getUserWallpaperObject = async (
    userId: string,
    key: string
): Promise<{
    contentType: WallpaperAsset['contentType'];
    provider: WallpaperStorageProvider;
}> => {
    const rows = (await getDatabase()`
        select storage_provider, object_key, content_type
        from user_wallpapers
        where user_id = ${userId} and object_key = ${key}
        limit 1
    `) as unknown as WallpaperRow[];
    const row = rows.at(0);

    if (row === undefined || !isWallpaperContentType(row.content_type)) {
        throw new ApiError('Wallpaper was not found.', 404);
    }

    return {
        contentType: row.content_type,
        provider: parseStorageProvider(row.storage_provider),
    };
};

export const saveUserWallpaper = async (
    userId: string,
    asset: WallpaperAsset,
    provider = getWallpaperStorageProvider()
): Promise<WallpaperAsset> => {
    if (!isDatabaseConfigured()) {
        throw new ApiError('Wallpaper sync is not configured.', 503);
    }

    validateWallpaperAsset(userId, asset);

    const previousRows = (await getDatabase()`
        select storage_provider, object_key
        from user_wallpapers
        where user_id = ${userId}
        limit 1
    `) as unknown as WallpaperRow[];
    const previousRow = previousRows.at(0);
    const rows = (await getDatabase()`
        insert into user_wallpapers (
            user_id,
            url,
            download_url,
            pathname,
            storage_provider,
            object_key,
            content_type,
            size_bytes,
            width,
            height
        )
        values (
            ${userId},
            ${asset.url},
            ${asset.downloadUrl},
            ${asset.pathname},
            ${provider},
            ${asset.pathname},
            ${asset.contentType},
            ${asset.sizeBytes},
            ${asset.width},
            ${asset.height}
        )
        on conflict (user_id) do update set
            url = excluded.url,
            download_url = excluded.download_url,
            pathname = excluded.pathname,
            storage_provider = excluded.storage_provider,
            object_key = excluded.object_key,
            content_type = excluded.content_type,
            size_bytes = excluded.size_bytes,
            width = excluded.width,
            height = excluded.height,
            updated_at = now()
        returning
            storage_provider,
            object_key,
            content_type,
            size_bytes,
            width,
            height,
            updated_at::text
    `) as unknown as WallpaperRow[];
    const row = rows.at(0);

    if (row === undefined) {
        throw new ApiError('Wallpaper could not be saved.', 500);
    }

    if (
        previousRow !== undefined &&
        previousRow.object_key !== asset.pathname
    ) {
        await deleteWallpaperObject(
            parseStorageProvider(previousRow.storage_provider),
            previousRow.object_key
        ).catch((error: unknown) => {
            console.error('Failed to delete previous wallpaper:', error);
        });
    }

    return mapWallpaperRow(row);
};

export const clearUserWallpaper = async (userId: string): Promise<void> => {
    if (!isDatabaseConfigured()) {
        return;
    }

    const rows = (await getDatabase()`
        delete from user_wallpapers
        where user_id = ${userId}
        returning storage_provider, object_key
    `) as unknown as WallpaperRow[];
    const row = rows.at(0);

    if (row !== undefined) {
        await deleteWallpaperObject(
            parseStorageProvider(row.storage_provider),
            row.object_key
        ).catch((error: unknown) => {
            console.error('Failed to delete wallpaper:', error);
        });
    }
};
