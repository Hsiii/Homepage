import { ApiError, createApiErrorResponse } from '@/server/apiError';
import { requireAuthenticatedRequest } from '@/server/auth';
import { readWallpaperObject } from '@/server/wallpaperStorage';
import { getUserWallpaperObject } from '@/server/wallpaperStore';
import { wallpaperUploadCacheMaxAgeSeconds } from '../../../../shared/wallpaper';

export const GET = async (request: Request): Promise<Response> => {
    try {
        const { client, userId } = await requireAuthenticatedRequest();

        const url = new URL(request.url);
        const key = url.searchParams.get('key');

        if (key === null || key === '') {
            throw new ApiError('Wallpaper object key is required.', 400);
        }

        const contentType = await getUserWallpaperObject(client, userId, key);
        const object = await readWallpaperObject(client, key);
        const headers = new Headers({
            'Cache-Control': `private, max-age=${wallpaperUploadCacheMaxAgeSeconds}`,
            'Content-Type': contentType,
        });

        if (url.searchParams.get('download') === '1') {
            headers.set(
                'Content-Disposition',
                `attachment; filename="${key.split('/').at(-1) ?? 'wallpaper'}"`
            );
        }

        return new Response(object, { headers });
    } catch (error) {
        return createApiErrorResponse(error);
    }
};
