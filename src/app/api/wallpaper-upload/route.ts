import { ApiError, createApiErrorResponse } from '@/server/apiError';
import { requireAuthenticatedRequest } from '@/server/auth';
import {
    deleteWallpaperObject,
    writeWallpaperObject,
} from '@/server/wallpaperStorage';
import { saveUserWallpaper } from '@/server/wallpaperStore';
import type { WallpaperAsset } from '../../../../shared/wallpaper';
import {
    getWallpaperUploadPrefix,
    isWallpaperContentType,
    wallpaperMaxDimensionPx,
    wallpaperMaxFileSizeBytes,
} from '../../../../shared/wallpaper';

const readInteger = (formData: FormData, name: string): number => {
    const value = Number(formData.get(name));

    if (!Number.isInteger(value) || value <= 0) {
        throw new ApiError(`${name} is invalid.`, 400);
    }

    return value;
};

export const POST = async (request: Request): Promise<Response> => {
    try {
        const { client, userId } = await requireAuthenticatedRequest();

        const formData = await request.formData();
        const file = formData.get('file');
        const pathname = formData.get('pathname');
        const width = readInteger(formData, 'width');
        const height = readInteger(formData, 'height');

        if (!(file instanceof Blob) || typeof pathname !== 'string') {
            throw new ApiError('Wallpaper upload is invalid.', 400);
        }

        if (
            file.size <= 0 ||
            file.size > wallpaperMaxFileSizeBytes ||
            width > wallpaperMaxDimensionPx ||
            height > wallpaperMaxDimensionPx ||
            !isWallpaperContentType(file.type)
        ) {
            throw new ApiError('Wallpaper upload is not supported.', 400);
        }

        if (!pathname.startsWith(`${getWallpaperUploadPrefix(userId)}/`)) {
            throw new ApiError(
                'Wallpaper path does not belong to this user.',
                400
            );
        }

        await writeWallpaperObject(client, pathname, file, file.type);

        const asset: WallpaperAsset = {
            contentType: file.type,
            downloadUrl: `/api/wallpaper-file?${new URLSearchParams({
                download: '1',
                key: pathname,
            }).toString()}`,
            height,
            pathname,
            sizeBytes: file.size,
            uploadedAt: new Date().toISOString(),
            url: `/api/wallpaper-file?${new URLSearchParams({
                key: pathname,
            }).toString()}`,
            width,
        };

        try {
            return Response.json({
                wallpaper: await saveUserWallpaper(client, userId, asset),
            });
        } catch (error) {
            await deleteWallpaperObject(client, pathname).catch(
                () => undefined
            );
            throw error;
        }
    } catch (error) {
        return createApiErrorResponse(error);
    }
};
