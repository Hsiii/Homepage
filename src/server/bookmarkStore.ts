import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { ApiError } from '@/server/apiError';
import type { BookmarkCategoryData } from '@/types/bookmarks';
import type { Database, Json } from '@/types/database';
import { coerceBookmarkTree } from '@/utils/bookmarks';

const validateBookmarkTree = (value: unknown): BookmarkCategoryData[] => {
    const bookmarkTree = coerceBookmarkTree(value);

    if (bookmarkTree === undefined) {
        throw new ApiError('Bookmarks are empty or invalid.', 400);
    }

    return bookmarkTree;
};

export const getUserBookmarks = async (
    client: SupabaseClient<Database>,
    userId: string
): Promise<BookmarkCategoryData[] | undefined> => {
    const { data, error } = await client
        .from('user_bookmarks')
        .select('categories')
        .eq('user_id', userId)
        .maybeSingle();

    if (error !== null) {
        throw new ApiError('Bookmarks could not be loaded.', 502);
    }

    return data === null ? undefined : validateBookmarkTree(data.categories);
};

export const saveUserBookmarks = async (
    client: SupabaseClient<Database>,
    userId: string,
    value: unknown
): Promise<BookmarkCategoryData[]> => {
    const bookmarkTree = validateBookmarkTree(value);
    const { data, error } = await client
        .from('user_bookmarks')
        .upsert(
            {
                categories: bookmarkTree as unknown as Json,
                updated_at: new Date().toISOString(),
                user_id: userId,
            },
            { onConflict: 'user_id' }
        )
        .select('categories')
        .single();

    if (error !== null) {
        throw new ApiError('Bookmarks could not be saved.', 502);
    }

    return validateBookmarkTree(data.categories);
};
