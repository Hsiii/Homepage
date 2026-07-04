import 'server-only';

import { ApiError } from '@/server/apiError';
import { getDatabase } from '@/server/database';
import type { BookmarkCategoryData } from '@/types/bookmarks';
import { coerceBookmarkTree } from '@/utils/bookmarks';

interface BookmarkRow {
    categories: unknown;
}

let schemaReady: Promise<void> | undefined;

const ensureBookmarkSchema = async (): Promise<void> => {
    const sql = getDatabase();

    // eslint-disable-next-line unicorn/template-indent
    await sql`
        create table if not exists user_bookmarks (
            user_id text primary key,
            categories jsonb not null
                check (jsonb_typeof(categories) = 'array'),
            version integer not null default 1,
            created_at timestamptz not null default now(),
            updated_at timestamptz not null default now()
        )
    `;
};

const ensureSchema = async (): Promise<void> => {
    schemaReady ??= ensureBookmarkSchema();
    await schemaReady;
};

const mapBookmarkRow = (row: BookmarkRow): BookmarkCategoryData[] => {
    const bookmarkTree = coerceBookmarkTree(row.categories);

    if (bookmarkTree === undefined) {
        throw new ApiError('Stored bookmarks are invalid.', 500);
    }

    return bookmarkTree;
};

const validateBookmarkTree = (value: unknown): BookmarkCategoryData[] => {
    const bookmarkTree = coerceBookmarkTree(value);

    if (bookmarkTree === undefined) {
        throw new ApiError('Bookmarks are empty or invalid.', 400);
    }

    return bookmarkTree;
};

export const getUserBookmarks = async (
    userId: string
): Promise<BookmarkCategoryData[] | undefined> => {
    await ensureSchema();

    const rows = (await getDatabase()`
        select categories
        from user_bookmarks
        where user_id = ${userId}
        limit 1
    `) as BookmarkRow[];
    const row = rows.at(0);

    return row === undefined ? undefined : mapBookmarkRow(row);
};

export const saveUserBookmarks = async (
    userId: string,
    value: unknown
): Promise<BookmarkCategoryData[]> => {
    const bookmarkTree = validateBookmarkTree(value);
    await ensureSchema();

    const rows = (await getDatabase()`
        insert into user_bookmarks (user_id, categories)
        values (${userId}, ${JSON.stringify(bookmarkTree)}::jsonb)
        on conflict (user_id) do update set
            categories = excluded.categories,
            version = user_bookmarks.version + 1,
            updated_at = now()
        returning categories
    `) as BookmarkRow[];
    const row = rows.at(0);

    if (row === undefined) {
        throw new ApiError('Bookmarks could not be saved.', 500);
    }

    return mapBookmarkRow(row);
};

export const clearUserBookmarks = async (userId: string): Promise<void> => {
    await ensureSchema();

    await getDatabase()`
        delete from user_bookmarks
        where user_id = ${userId}
    `;
};
