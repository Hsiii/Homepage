import { auth } from '@clerk/nextjs/server';
import type { HandleUploadBody } from '@vercel/blob/client';
import { handleUpload } from '@vercel/blob/client';

import { ApiError, createApiErrorResponse } from '@/server/apiError';
import { isDatabaseConfigured } from '@/server/database';
import { getWallpaperBlobToken } from '@/server/wallpaperBlob';
import {
    getWallpaperUploadPrefix,
    wallpaperAcceptedContentTypes,
    wallpaperMaxFileSizeBytes,
    wallpaperUploadCacheMaxAgeSeconds,
    wallpaperUploadTokenTtlMs,
} from '../../../../shared/wallpaper';

const requireUserId = async (): Promise<string> => {
    const { userId } = await auth();

    if (userId === null) {
        throw new ApiError('Sign in is required.', 401);
    }

    return userId;
};

export const POST = async (request: Request): Promise<Response> => {
    try {
        const userId = await requireUserId();
        const body = (await request.json()) as HandleUploadBody;

        if (!isDatabaseConfigured()) {
            throw new ApiError('Wallpaper sync is not configured.', 503);
        }

        const uploadResponse = await handleUpload({
            body,
            token: getWallpaperBlobToken(),
            request,
            onBeforeGenerateToken: async (pathname) => {
                await Promise.resolve();
                const expectedPrefix = `${getWallpaperUploadPrefix(userId)}/`;

                if (!pathname.startsWith(expectedPrefix)) {
                    throw new ApiError(
                        'Wallpaper path does not belong to this user.',
                        400
                    );
                }

                return {
                    addRandomSuffix: false,
                    allowedContentTypes: [...wallpaperAcceptedContentTypes],
                    cacheControlMaxAge: wallpaperUploadCacheMaxAgeSeconds,
                    maximumSizeInBytes: wallpaperMaxFileSizeBytes,
                    tokenPayload: JSON.stringify({ userId }),
                    validUntil: Date.now() + wallpaperUploadTokenTtlMs,
                };
            },
        });

        return Response.json(uploadResponse);
    } catch (error) {
        return createApiErrorResponse(error);
    }
};
