import 'server-only';

import { neon } from '@neondatabase/serverless';
import type { NeonQueryFunction } from '@neondatabase/serverless';
import { del } from '@vercel/blob';

import { ApiError } from '@/server/apiError';
import type { WallpaperAsset } from '../../shared/wallpaper';
import {
    getWallpaperUploadPrefix,
    isWallpaperContentType,
    wallpaperMaxDimensionPx,
    wallpaperMaxFileSizeBytes,
} from '../../shared/wallpaper';

interface WallpaperRow {
    content_type: string;
    download_url: string;
    height: number;
    pathname: string;
    size_bytes: number;
    updated_at: string;
    url: string;
    width: number;
}

let database: NeonQueryFunction<false, false> | undefined;
let schemaReady: Promise<void> | undefined;

const getDatabaseUrl = (): string => {
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl === undefined) {
        throw new ApiError('DATABASE_URL is not configured.', 500);
    }

    return databaseUrl;
};

const getDatabase = (): NeonQueryFunction<false, false> => {
    database ??= neon(getDatabaseUrl());
    return database;
};

const ensureWallpaperSchema = async (): Promise<void> => {
    const sql = getDatabase();

    // eslint-disable-next-line unicorn/template-indent
    await sql`
        create table if not exists user_wallpapers (
            user_id text primary key,
            url text not null,
            download_url text not null,
            pathname text not null,
            content_type text not null,
            size_bytes integer not null
                check (size_bytes > 0 and size_bytes <= ${wallpaperMaxFileSizeBytes}),
            width integer not null
                check (width > 0 and width <= ${wallpaperMaxDimensionPx}),
            height integer not null
                check (height > 0 and height <= ${wallpaperMaxDimensionPx}),
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
        )
    `;
};

const ensureSchema = async (): Promise<void> => {
    schemaReady ??= ensureWallpaperSchema();
    await schemaReady;
};

const mapWallpaperRow = (row: WallpaperRow): WallpaperAsset => {
    if (!isWallpaperContentType(row.content_type)) {
        throw new ApiError('Stored wallpaper has an unsupported type.', 500);
    }

    return {
        contentType: row.content_type,
        downloadUrl: row.download_url,
        height: row.height,
        pathname: row.pathname,
        sizeBytes: row.size_bytes,
        uploadedAt: row.updated_at,
        url: row.url,
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

    try {
        const url = new URL(asset.url);
        const downloadUrl = new URL(asset.downloadUrl);

        if (
            url.protocol !== 'https:' ||
            downloadUrl.protocol !== 'https:' ||
            !url.hostname.endsWith('.blob.vercel-storage.com') ||
            !downloadUrl.hostname.endsWith('.blob.vercel-storage.com')
        ) {
            throw new ApiError('Wallpaper URL is not a Vercel Blob URL.', 400);
        }
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError('Wallpaper URL is invalid.', 400);
    }
};

export const getUserWallpaper = async (
    userId: string
): Promise<WallpaperAsset | undefined> => {
    await ensureSchema();

    const rows = (await getDatabase()`
        select
            url,
            download_url,
            pathname,
            content_type,
            size_bytes,
            width,
            height,
            updated_at::text
        from user_wallpapers
        where user_id = ${userId}
        limit 1
    `) as WallpaperRow[];
    const row = rows.at(0);

    return row === undefined ? undefined : mapWallpaperRow(row);
};

export const saveUserWallpaper = async (
    userId: string,
    asset: WallpaperAsset
): Promise<WallpaperAsset> => {
    validateWallpaperAsset(userId, asset);
    await ensureSchema();

    const previousRows = (await getDatabase()`
        select url
        from user_wallpapers
        where user_id = ${userId}
        limit 1
    `) as Array<Pick<WallpaperRow, 'url'>>;
    const previousRow = previousRows.at(0);

    const rows = (await getDatabase()`
        insert into user_wallpapers (
            user_id,
            url,
            download_url,
            pathname,
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
            ${asset.contentType},
            ${asset.sizeBytes},
            ${asset.width},
            ${asset.height}
        )
        on conflict (user_id) do update set
            url = excluded.url,
            download_url = excluded.download_url,
            pathname = excluded.pathname,
            content_type = excluded.content_type,
            size_bytes = excluded.size_bytes,
            width = excluded.width,
            height = excluded.height,
            updated_at = now()
        returning
            url,
            download_url,
            pathname,
            content_type,
            size_bytes,
            width,
            height,
            updated_at::text
    `) as WallpaperRow[];
    const row = rows.at(0);

    if (row === undefined) {
        throw new ApiError('Wallpaper could not be saved.', 500);
    }

    if (
        previousRow?.url !== undefined &&
        previousRow.url !== asset.url &&
        previousRow.url.endsWith('.blob.vercel-storage.com')
    ) {
        await del(previousRow.url).catch((error: unknown) => {
            console.error('Failed to delete previous wallpaper:', error);
        });
    }

    return mapWallpaperRow(row);
};

export const clearUserWallpaper = async (userId: string): Promise<void> => {
    await ensureSchema();

    const rows = (await getDatabase()`
        delete from user_wallpapers
        where user_id = ${userId}
        returning url
    `) as Array<Pick<WallpaperRow, 'url'>>;
    const row = rows.at(0);

    if (
        row?.url !== undefined &&
        row.url.endsWith('.blob.vercel-storage.com')
    ) {
        await del(row.url).catch((error: unknown) => {
            console.error('Failed to delete wallpaper:', error);
        });
    }
};
