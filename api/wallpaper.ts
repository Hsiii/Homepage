import type { VercelRequest, VercelResponse } from '@vercel/node';

import type { WallpaperAsset } from '../shared/wallpaper';
import { authenticateRequest, sendApiError } from './_shared/auth';
import {
    clearUserWallpaper,
    getUserWallpaper,
    saveUserWallpaper,
} from './_shared/wallpaperStore';

const parseWallpaperAsset = (body: unknown): WallpaperAsset => {
    if (typeof body === 'string') {
        return JSON.parse(body) as WallpaperAsset;
    }

    return body as WallpaperAsset;
};

// eslint-disable-next-line import-x/no-default-export
export default async function handler(
    request: VercelRequest,
    response: VercelResponse
): Promise<void> {
    try {
        const { userId } = await authenticateRequest(request);

        if (request.method === 'GET') {
            response.status(200).json({
                wallpaper: await getUserWallpaper(userId),
            });
            return;
        }

        if (request.method === 'POST') {
            response.status(200).json({
                wallpaper: await saveUserWallpaper(
                    userId,
                    parseWallpaperAsset(request.body)
                ),
            });
            return;
        }

        if (request.method === 'DELETE') {
            await clearUserWallpaper(userId);
            response.status(200).json({ wallpaper: undefined });
            return;
        }

        response.setHeader('Allow', 'GET,POST,DELETE');
        response.status(405).json({ error: 'Method not allowed.' });
    } catch (error) {
        sendApiError(response, error);
    }
}
