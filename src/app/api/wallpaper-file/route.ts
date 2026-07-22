import { auth } from '@clerk/nextjs/server';

import { ApiError, createApiErrorResponse } from '@/server/apiError';
import { readWallpaperObject } from '@/server/wallpaperStorage';
import { getUserWallpaperObject } from '@/server/wallpaperStore';
import { wallpaperUploadCacheMaxAgeSeconds } from '../../../../shared/wallpaper';

export const GET = async (request: Request): Promise<Response> => {
    try {
        const { userId } = await auth();

        if (userId === null) {
            throw new ApiError('Sign in is required.', 401);
        }

        const url = new URL(request.url);
        const key = url.searchParams.get('key');

        if (key === null || key === '') {
            throw new ApiError('Wallpaper object key is required.', 400);
        }

        const { contentType, provider } = await getUserWallpaperObject(
            userId,
            key
        );
        const object = await readWallpaperObject(provider, key, contentType);
        const headers = new Headers({
            'Cache-Control': `private, max-age=${wallpaperUploadCacheMaxAgeSeconds}`,
            'Content-Type': object.contentType,
        });

        if (url.searchParams.get('download') === '1') {
            headers.set(
                'Content-Disposition',
                `attachment; filename="${key.split('/').at(-1) ?? 'wallpaper'}"`
            );
        }

        return new Response(object.body, { headers });
    } catch (error) {
        return createApiErrorResponse(error);
    }
};
