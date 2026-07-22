import { auth } from '@clerk/nextjs/server';

import { ApiError, createApiErrorResponse } from '@/server/apiError';
import { clearUserWallpaper, getUserWallpaper } from '@/server/wallpaperStore';

const requireUserId = async (): Promise<string> => {
    const { userId } = await auth();

    if (userId === null) {
        throw new ApiError('Sign in is required.', 401);
    }

    return userId;
};

export const GET = async (): Promise<Response> => {
    try {
        const userId = await requireUserId();

        return Response.json({
            wallpaper: await getUserWallpaper(userId),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
};

export const DELETE = async (): Promise<Response> => {
    try {
        const userId = await requireUserId();
        await clearUserWallpaper(userId);

        return Response.json({ wallpaper: undefined });
    } catch (error) {
        return createApiErrorResponse(error);
    }
};
