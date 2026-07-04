import 'server-only';

const wallpaperBlobTokenVariableNames = [
    'WALLPAPER_READ_WRITE_TOKEN',
    'BLOB_READ_WRITE_TOKEN',
] as const;

interface WallpaperBlobTokenOptions {
    token?: string;
}

export const getWallpaperBlobToken = (): string | undefined => {
    for (const variableName of wallpaperBlobTokenVariableNames) {
        const token = process.env[variableName]?.trim();

        if (token !== undefined && token !== '') {
            return token;
        }
    }

    return undefined;
};

export const getWallpaperBlobTokenOptions = (): WallpaperBlobTokenOptions => {
    const token = getWallpaperBlobToken();

    return token === undefined ? {} : { token };
};
