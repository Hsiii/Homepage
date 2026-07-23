import { createApiErrorResponse } from '@/server/apiError';
import { requireAuthenticatedRequest } from '@/server/auth';
import { clearUserWallpaper, getUserWallpaper } from '@/server/wallpaperStore';

export const GET = async (): Promise<Response> => {
    try {
        const { client, userId } = await requireAuthenticatedRequest();

        return Response.json({
            wallpaper: await getUserWallpaper(client, userId),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
};

export const DELETE = async (): Promise<Response> => {
    try {
        const { client, userId } = await requireAuthenticatedRequest();
        await clearUserWallpaper(client, userId);

        return Response.json({ wallpaper: undefined });
    } catch (error) {
        return createApiErrorResponse(error);
    }
};
