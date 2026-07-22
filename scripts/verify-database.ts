import postgres from 'postgres';

/* eslint-disable unicorn/template-indent */

const databaseUrl = [
    process.env.DATABASE_URL?.trim(),
    process.env.POSTGRES_URL?.trim(),
].find((value) => value !== undefined && value !== '');

if (databaseUrl === undefined) {
    throw new Error('DATABASE_URL or POSTGRES_URL is not configured.');
}

const sql = postgres(databaseUrl, { max: 1, prepare: false });

try {
    const rows = await sql`
        select
            (select count(*)::integer from user_bookmarks) as bookmarks,
            (select count(*)::integer from user_wallpapers) as wallpapers,
            (select count(*)::integer from user_wallpapers
                where storage_provider is null or object_key is null) as invalid_wallpapers
    `;
    const row = rows[0];

    if (row.invalid_wallpapers !== 0) {
        throw new Error('Homepage database verification failed.');
    }

    console.log(JSON.stringify(row));
} finally {
    await sql.end();
}
