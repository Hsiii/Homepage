export const wallpaperAcceptedContentTypes = [
    'image/jpeg',
    'image/png',
    'image/webp',
] as const;

export type WallpaperContentType =
    (typeof wallpaperAcceptedContentTypes)[number];

export interface WallpaperAsset {
    contentType: WallpaperContentType;
    downloadUrl: string;
    height: number;
    pathname: string;
    sizeBytes: number;
    uploadedAt: string;
    url: string;
    width: number;
}

export const wallpaperMaxDimensionPx = 5120;
export const wallpaperMaxFileSizeBytes = 32 * 1024 * 1024;
const wallpaperStoragePrefix = 'homepage-assets';
export const wallpaperUploadCacheMaxAgeSeconds = 60 * 60 * 24 * 365;
export const wallpaperUploadTokenTtlMs = 10 * 60 * 1000;

export const isWallpaperContentType = (
    value: string
): value is WallpaperContentType =>
    wallpaperAcceptedContentTypes.includes(value as WallpaperContentType);

const getWallpaperFileExtension = (
    contentType: WallpaperContentType
): 'jpg' | 'png' | 'webp' => {
    if (contentType === 'image/jpeg') {
        return 'jpg';
    }

    if (contentType === 'image/png') {
        return 'png';
    }

    return 'webp';
};

export const getWallpaperUploadPrefix = (userId: string): string =>
    `${wallpaperStoragePrefix}/${encodeURIComponent(userId)}/wallpapers`;

export const getWallpaperUploadPath = (
    userId: string,
    assetId: string,
    contentType: WallpaperContentType
): string =>
    `${getWallpaperUploadPrefix(userId)}/${assetId}.${getWallpaperFileExtension(
        contentType
    )}`;
