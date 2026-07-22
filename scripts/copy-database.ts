import { createHash } from 'node:crypto';
import postgres from 'postgres';
import type { Sql } from 'postgres';

/* eslint-disable no-await-in-loop, unicorn/template-indent */

type Mode = 'copy' | 'plan' | 'verify';

interface DatabaseSnapshot {
    bookmarkDigest: string;
    bookmarks: number;
    wallpaperDigest: string;
    wallpapers: number;
}

const validModes = new Set<Mode>(['copy', 'plan', 'verify']);
const mode = process.argv[2] as Mode | undefined;

if (mode === undefined || !validModes.has(mode)) {
    throw new Error('Usage: bun run db:copy -- <plan|copy|verify>');
}

const readRequiredUrl = (name: string): string => {
    const value = process.env[name]?.trim();

    if (value === undefined || value === '') {
        throw new Error(`${name} is not configured.`);
    }

    return value;
};

const sourceUrl = readRequiredUrl('SOURCE_DATABASE_URL');
const targetUrl = readRequiredUrl('TARGET_DATABASE_URL');

if (sourceUrl === targetUrl) {
    throw new Error('Source and target database URLs must be different.');
}

const source = postgres(sourceUrl, { max: 1, prepare: false });
const target = postgres(targetUrl, { max: 1, prepare: false });

const digestRows = (rows: readonly unknown[]): string =>
    createHash('sha256').update(JSON.stringify(rows)).digest('hex');

const snapshotDatabase = async (sql: Sql): Promise<DatabaseSnapshot> => {
    const bookmarks = await sql`
        select
            user_id,
            categories::text as categories,
            version,
            created_at::text as created_at,
            updated_at::text as updated_at
        from user_bookmarks
        order by user_id
    `;
    const wallpapers = await sql`
        select
            user_id,
            url,
            download_url,
            pathname,
            storage_provider,
            object_key,
            content_type,
            size_bytes,
            width,
            height,
            created_at::text as created_at,
            updated_at::text as updated_at
        from user_wallpapers
        order by user_id
    `;

    return {
        bookmarkDigest: digestRows(bookmarks),
        bookmarks: bookmarks.length,
        wallpaperDigest: digestRows(wallpapers),
        wallpapers: wallpapers.length,
    };
};

const verifyCopy = async (): Promise<void> => {
    const [sourceSnapshot, targetSnapshot] = await Promise.all([
        snapshotDatabase(source),
        snapshotDatabase(target),
    ]);
    const matches =
        sourceSnapshot.bookmarkDigest === targetSnapshot.bookmarkDigest &&
        sourceSnapshot.wallpaperDigest === targetSnapshot.wallpaperDigest;

    console.log(
        JSON.stringify({
            matches,
            source: sourceSnapshot,
            target: targetSnapshot,
        })
    );

    if (!matches) {
        throw new Error('Source and target database snapshots do not match.');
    }
};

const copyDatabase = async (): Promise<void> => {
    if (process.env.MIGRATION_CONFIRM_COPY !== 'copy-homepage-data') {
        throw new Error(
            'Set MIGRATION_CONFIRM_COPY=copy-homepage-data to authorize target writes.'
        );
    }

    const bookmarks = await source`
        select
            user_id,
            categories,
            version,
            created_at::text as created_at,
            updated_at::text as updated_at
        from user_bookmarks
        order by user_id
    `;
    const wallpapers = await source`
        select
            user_id,
            url,
            download_url,
            pathname,
            storage_provider,
            object_key,
            content_type,
            size_bytes,
            width,
            height,
            created_at::text as created_at,
            updated_at::text as updated_at
        from user_wallpapers
        order by user_id
    `;

    await target.begin(async (transaction) => {
        for (const row of bookmarks) {
            await transaction`
                insert into user_bookmarks (
                    user_id, categories, version, created_at, updated_at
                ) values (
                    ${row.user_id},
                    ${transaction.json(row.categories)},
                    ${row.version},
                    ${transaction.typed(row.created_at, 25)}::timestamptz,
                    ${transaction.typed(row.updated_at, 25)}::timestamptz
                )
                on conflict (user_id) do update set
                    categories = excluded.categories,
                    version = excluded.version,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at
            `;
        }

        for (const row of wallpapers) {
            await transaction`
                insert into user_wallpapers (
                    user_id,
                    url,
                    download_url,
                    pathname,
                    storage_provider,
                    object_key,
                    content_type,
                    size_bytes,
                    width,
                    height,
                    created_at,
                    updated_at
                ) values (
                    ${row.user_id},
                    ${row.url},
                    ${row.download_url},
                    ${row.pathname},
                    ${row.storage_provider},
                    ${row.object_key},
                    ${row.content_type},
                    ${row.size_bytes},
                    ${row.width},
                    ${row.height},
                    ${transaction.typed(row.created_at, 25)}::timestamptz,
                    ${transaction.typed(row.updated_at, 25)}::timestamptz
                )
                on conflict (user_id) do update set
                    url = excluded.url,
                    download_url = excluded.download_url,
                    pathname = excluded.pathname,
                    storage_provider = excluded.storage_provider,
                    object_key = excluded.object_key,
                    content_type = excluded.content_type,
                    size_bytes = excluded.size_bytes,
                    width = excluded.width,
                    height = excluded.height,
                    created_at = excluded.created_at,
                    updated_at = excluded.updated_at
            `;
        }
    });

    await verifyCopy();
};

try {
    if (mode === 'plan') {
        const [sourceSnapshot, targetSnapshot] = await Promise.all([
            snapshotDatabase(source),
            snapshotDatabase(target),
        ]);
        console.log(
            JSON.stringify({ source: sourceSnapshot, target: targetSnapshot })
        );
    } else if (mode === 'copy') {
        await copyDatabase();
    } else {
        await verifyCopy();
    }
} finally {
    await Promise.all([source.end(), target.end()]);
}
