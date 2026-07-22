import 'server-only';

import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import {
    DeleteObjectCommand,
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { del, head, put } from '@vercel/blob';

import { ApiError } from '@/server/apiError';
import type { WallpaperContentType } from '../../shared/wallpaper';

export const wallpaperStorageProviders = [
    'vercel-blob',
    'r2',
    'local',
] as const;
export type WallpaperStorageProvider =
    (typeof wallpaperStorageProviders)[number];

export interface WallpaperObject {
    body: BodyInit;
    contentType: WallpaperContentType;
}

const localStorageRoot = path.resolve(
    process.env.WALLPAPER_LOCAL_DIRECTORY ?? '.data/wallpapers'
);
let r2Client: S3Client | undefined;

const getBlobToken = (): string | undefined =>
    [
        process.env.WALLPAPER_READ_WRITE_TOKEN?.trim(),
        process.env.BLOB_READ_WRITE_TOKEN?.trim(),
    ].find((value) => value !== undefined && value !== '');

const getR2Setting = (name: string): string => {
    const value = process.env[name]?.trim();

    if (value === undefined || value === '') {
        throw new ApiError(`${name} is not configured.`, 503);
    }

    return value;
};

const getR2Client = (): S3Client => {
    r2Client ??= new S3Client({
        credentials: {
            accessKeyId: getR2Setting('R2_ACCESS_KEY_ID'),
            secretAccessKey: getR2Setting('R2_SECRET_ACCESS_KEY'),
        },
        endpoint: getR2Setting('R2_ENDPOINT'),
        forcePathStyle: true,
        region: 'auto',
    });
    return r2Client;
};

const getR2Bucket = (): string => getR2Setting('R2_BUCKET');

const getLocalPath = (key: string): string => {
    const objectPath = path.resolve(localStorageRoot, key);

    if (!objectPath.startsWith(`${localStorageRoot}/`)) {
        throw new ApiError('Wallpaper object key is invalid.', 400);
    }

    return objectPath;
};

export const getWallpaperStorageProvider = (): WallpaperStorageProvider => {
    const provider = process.env.WALLPAPER_STORAGE_PROVIDER?.trim();

    if (provider === undefined || provider === '') {
        return getBlobToken() === undefined ? 'local' : 'vercel-blob';
    }

    if (
        !wallpaperStorageProviders.includes(
            provider as WallpaperStorageProvider
        )
    ) {
        throw new ApiError('WALLPAPER_STORAGE_PROVIDER is invalid.', 503);
    }

    return provider as WallpaperStorageProvider;
};

export const writeWallpaperObject = async (
    provider: WallpaperStorageProvider,
    key: string,
    body: Blob,
    contentType: WallpaperContentType
): Promise<void> => {
    if (provider === 'vercel-blob') {
        await put(key, body, {
            access: 'public',
            addRandomSuffix: false,
            contentType,
            token: getBlobToken(),
        });
        return;
    }

    if (provider === 'r2') {
        await getR2Client().send(
            new PutObjectCommand({
                Body: new Uint8Array(await body.arrayBuffer()),
                Bucket: getR2Bucket(),
                ContentType: contentType,
                Key: key,
            })
        );
        return;
    }

    const objectPath = getLocalPath(key);
    await mkdir(path.dirname(objectPath), { recursive: true });
    await writeFile(objectPath, new Uint8Array(await body.arrayBuffer()));
};

export const readWallpaperObject = async (
    provider: WallpaperStorageProvider,
    key: string,
    contentType: WallpaperContentType
): Promise<WallpaperObject> => {
    if (provider === 'vercel-blob') {
        const metadata = await head(key, { token: getBlobToken() });
        const response = await fetch(metadata.url);

        if (!response.ok || response.body === null) {
            throw new ApiError('Wallpaper object could not be read.', 502);
        }

        return { body: response.body, contentType };
    }

    if (provider === 'r2') {
        const result = await getR2Client().send(
            new GetObjectCommand({ Bucket: getR2Bucket(), Key: key })
        );

        if (result.Body === undefined) {
            throw new ApiError('Wallpaper object could not be read.', 404);
        }

        return {
            body: result.Body.transformToWebStream(),
            contentType,
        };
    }

    return {
        body: await readFile(getLocalPath(key)),
        contentType,
    };
};

export const deleteWallpaperObject = async (
    provider: WallpaperStorageProvider,
    key: string
): Promise<void> => {
    if (provider === 'vercel-blob') {
        await del(key, { token: getBlobToken() });
        return;
    }

    if (provider === 'r2') {
        await getR2Client().send(
            new DeleteObjectCommand({ Bucket: getR2Bucket(), Key: key })
        );
        return;
    }

    await unlink(getLocalPath(key)).catch((error: unknown) => {
        if (
            !(error instanceof Error) ||
            !('code' in error) ||
            error.code !== 'ENOENT'
        ) {
            throw error;
        }
    });
};
