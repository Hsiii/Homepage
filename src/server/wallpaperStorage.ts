import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '@/server/apiError';
import type { Database } from '@/types/database';
import type { WallpaperContentType } from '../../shared/wallpaper';

export const wallpaperBucket = 'wallpapers';

export const writeWallpaperObject = async (
    client: SupabaseClient<Database>,
    key: string,
    body: Blob,
    contentType: WallpaperContentType
): Promise<void> => {
    const { error } = await client.storage
        .from(wallpaperBucket)
        .upload(key, new Uint8Array(await body.arrayBuffer()), {
            contentType,
            upsert: false,
        });

    if (error !== null) {
        throw new ApiError('Wallpaper could not be uploaded.', 502);
    }
};

export const readWallpaperObject = async (
    client: SupabaseClient<Database>,
    key: string
): Promise<Blob> => {
    const { data, error } = await client.storage
        .from(wallpaperBucket)
        .download(key);

    if (error !== null) {
        throw new ApiError('Wallpaper could not be read.', 502);
    }

    return data;
};

export const deleteWallpaperObject = async (
    client: SupabaseClient<Database>,
    key: string
): Promise<void> => {
    const { error } = await client.storage.from(wallpaperBucket).remove([key]);

    if (error !== null) {
        throw new ApiError('Wallpaper could not be removed.', 502);
    }
};
