import type { HandleUploadBody } from '@vercel/blob/client';
import { handleUpload } from '@vercel/blob/client';
import type { VercelRequest, VercelResponse } from '@vercel/node';

import {
    getWallpaperUploadPrefix,
    wallpaperAcceptedContentTypes,
    wallpaperMaxFileSizeBytes,
    wallpaperUploadCacheMaxAgeSeconds,
    wallpaperUploadTokenTtlMs,
} from '../shared/wallpaper';
import { ApiError, authenticateRequest, sendApiError } from './_shared/auth';

const parseHandleUploadBody = (body: unknown): HandleUploadBody => {
    if (typeof body === 'string') {
        return JSON.parse(body) as HandleUploadBody;
    }

    return body as HandleUploadBody;
};

// eslint-disable-next-line import-x/no-default-export
export default async function handler(
    request: VercelRequest,
    response: VercelResponse
): Promise<void> {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        response.status(405).json({ error: 'Method not allowed.' });
        return;
    }

    try {
        const { userId } = await authenticateRequest(request);
        const body = parseHandleUploadBody(request.body);

        const uploadResponse = await handleUpload({
            body,
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

        response.status(200).json(uploadResponse);
    } catch (error) {
        sendApiError(response, error);
    }
}
