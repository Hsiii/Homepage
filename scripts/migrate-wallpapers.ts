import { createHash } from 'node:crypto';
import {
    GetObjectCommand,
    PutObjectCommand,
    S3Client,
} from '@aws-sdk/client-s3';
import { head } from '@vercel/blob';
import postgres from 'postgres';

/* eslint-disable no-await-in-loop, unicorn/template-indent */

type Mode = 'copy' | 'plan' | 'rollback' | 'switch' | 'verify';

interface WallpaperRow {
    content_type: string;
    download_url: string;
    object_key: string;
    size_bytes: number;
    storage_provider: string;
    user_id: string;
    url: string;
}

const validModes = new Set<Mode>([
    'copy',
    'plan',
    'rollback',
    'switch',
    'verify',
]);
const mode = process.argv[2] as Mode | undefined;

if (mode === undefined || !validModes.has(mode)) {
    throw new Error(
        'Usage: bun run wallpapers:migrate -- <plan|copy|verify|switch|rollback>'
    );
}

const readRequiredSetting = (name: string): string => {
    const value = process.env[name]?.trim();

    if (value === undefined || value === '') {
        throw new Error(`${name} is not configured.`);
    }

    return value;
};

const databaseUrl = readRequiredSetting('DATABASE_URL');
const sql = postgres(databaseUrl, { max: 1, prepare: false });
let r2: S3Client | undefined;

const getBlobToken = (): string => {
    const token = [
        process.env.WALLPAPER_READ_WRITE_TOKEN?.trim(),
        process.env.BLOB_READ_WRITE_TOKEN?.trim(),
    ].find((value) => value !== undefined && value !== '');

    if (token === undefined) {
        throw new Error(
            'WALLPAPER_READ_WRITE_TOKEN or BLOB_READ_WRITE_TOKEN is not configured.'
        );
    }

    return token;
};

const getR2 = (): S3Client => {
    r2 ??= new S3Client({
        credentials: {
            accessKeyId: readRequiredSetting('R2_ACCESS_KEY_ID'),
            secretAccessKey: readRequiredSetting('R2_SECRET_ACCESS_KEY'),
        },
        endpoint: readRequiredSetting('R2_ENDPOINT'),
        forcePathStyle: true,
        region: 'auto',
    });
    return r2;
};

const getR2Bucket = (): string => readRequiredSetting('R2_BUCKET');

const hash = (body: Uint8Array): string =>
    createHash('sha256').update(body).digest('hex');

const readLegacyObject = async (row: WallpaperRow): Promise<Uint8Array> => {
    const metadata = await head(row.object_key, { token: getBlobToken() });
    const response = await fetch(metadata.downloadUrl);

    if (!response.ok) {
        throw new Error(`Legacy object fetch failed with ${response.status}.`);
    }

    return new Uint8Array(await response.arrayBuffer());
};

const readR2Object = async (key: string): Promise<Uint8Array> => {
    const result = await getR2().send(
        new GetObjectCommand({ Bucket: getR2Bucket(), Key: key })
    );

    if (result.Body === undefined) {
        throw new Error('R2 object body is missing.');
    }

    return new Uint8Array(await result.Body.transformToByteArray());
};

const listLegacyRows = async (): Promise<WallpaperRow[]> =>
    (await sql`
        select
            user_id,
            url,
            download_url,
            object_key,
            content_type,
            size_bytes,
            storage_provider
        from user_wallpapers
        where storage_provider = 'vercel-blob'
        order by user_id
    `) as unknown as WallpaperRow[];

const listMigratedRows = async (): Promise<WallpaperRow[]> =>
    (await sql`
        select
            wallpaper.user_id,
            wallpaper.url,
            wallpaper.download_url,
            wallpaper.object_key,
            wallpaper.content_type,
            wallpaper.size_bytes,
            wallpaper.storage_provider
        from user_wallpapers as wallpaper
        inner join homepage_wallpaper_migrations as migration
            on migration.user_id = wallpaper.user_id
            and migration.object_key = wallpaper.object_key
        order by wallpaper.user_id
    `) as unknown as WallpaperRow[];

const verifyRows = async (rows: readonly WallpaperRow[]): Promise<void> => {
    for (const row of rows) {
        const [sourceBody, targetBody] = await Promise.all([
            readLegacyObject(row),
            readR2Object(row.object_key),
        ]);
        const sourceHash = hash(sourceBody);
        const targetHash = hash(targetBody);

        if (
            sourceBody.byteLength !== row.size_bytes ||
            sourceBody.byteLength !== targetBody.byteLength ||
            sourceHash !== targetHash
        ) {
            throw new Error('Wallpaper object verification failed.');
        }

        const verifiedRows = await sql`
            update homepage_wallpaper_migrations
            set verified_at = now()
            where
                user_id = ${row.user_id}
                and object_key = ${row.object_key}
                and sha256 = ${sourceHash}
                and size_bytes = ${sourceBody.byteLength}
            returning user_id
        `;

        if (verifiedRows.length !== 1) {
            throw new Error('Wallpaper migration ledger verification failed.');
        }
    }
};

const copyRows = async (rows: readonly WallpaperRow[]): Promise<void> => {
    if (process.env.MIGRATION_CONFIRM_OBJECT_COPY !== 'copy-wallpapers-to-r2') {
        throw new Error(
            'Set MIGRATION_CONFIRM_OBJECT_COPY=copy-wallpapers-to-r2 to authorize R2 writes.'
        );
    }

    for (const row of rows) {
        const body = await readLegacyObject(row);
        const sha256 = hash(body);

        if (body.byteLength !== row.size_bytes) {
            throw new Error(
                'Legacy object size does not match database metadata.'
            );
        }

        await getR2().send(
            new PutObjectCommand({
                Body: body,
                Bucket: getR2Bucket(),
                ContentType: row.content_type,
                Key: row.object_key,
            })
        );
        await sql`
            insert into homepage_wallpaper_migrations (
                user_id,
                object_key,
                source_provider,
                target_provider,
                sha256,
                size_bytes
            ) values (
                ${row.user_id},
                ${row.object_key},
                'vercel-blob',
                'r2',
                ${sha256},
                ${body.byteLength}
            )
            on conflict (user_id) do update set
                object_key = excluded.object_key,
                sha256 = excluded.sha256,
                size_bytes = excluded.size_bytes,
                copied_at = now(),
                verified_at = null,
                switched_at = null,
                rolled_back_at = null
        `;
    }

    await verifyRows(rows);
};

const switchRows = async (): Promise<void> => {
    if (
        process.env.MIGRATION_CONFIRM_R2_SWITCH !== 'serve-wallpapers-from-r2'
    ) {
        throw new Error(
            'Set MIGRATION_CONFIRM_R2_SWITCH=serve-wallpapers-from-r2 to authorize metadata cutover.'
        );
    }

    const rows = await listLegacyRows();
    await verifyRows(rows);
    const result = await sql.begin(async (transaction) => {
        const unverified = await transaction`
            select count(*)::integer as count
            from user_wallpapers as wallpaper
            left join homepage_wallpaper_migrations as migration
                on migration.user_id = wallpaper.user_id
                and migration.object_key = wallpaper.object_key
                and migration.verified_at is not null
            where
                wallpaper.storage_provider = 'vercel-blob'
                and migration.user_id is null
        `;

        if (unverified[0].count !== 0) {
            throw new Error(
                'Not every legacy wallpaper has a verified R2 copy.'
            );
        }

        return await transaction`
            update user_wallpapers as wallpaper
            set storage_provider = 'r2', updated_at = now()
            from homepage_wallpaper_migrations as migration
            where
                migration.user_id = wallpaper.user_id
                and migration.object_key = wallpaper.object_key
                and migration.verified_at is not null
                and wallpaper.storage_provider = 'vercel-blob'
            returning wallpaper.user_id
        `;
    });
    await sql`
        update homepage_wallpaper_migrations as migration
        set switched_at = now(), rolled_back_at = null
        where
            migration.verified_at is not null
            and exists (
                select 1
                from user_wallpapers as wallpaper
                where
                    wallpaper.user_id = migration.user_id
                    and wallpaper.object_key = migration.object_key
                    and wallpaper.storage_provider = 'r2'
            )
    `;
    console.log(JSON.stringify({ switched: result.length }));
};

const rollbackRows = async (): Promise<void> => {
    if (
        process.env.MIGRATION_CONFIRM_R2_ROLLBACK !==
        'serve-migrated-wallpapers-from-vercel-blob'
    ) {
        throw new Error(
            'Set MIGRATION_CONFIRM_R2_ROLLBACK=serve-migrated-wallpapers-from-vercel-blob to authorize rollback.'
        );
    }

    const rows = (await sql`
        select
            wallpaper.user_id,
            wallpaper.url,
            wallpaper.download_url,
            wallpaper.object_key,
            wallpaper.content_type,
            wallpaper.size_bytes,
            wallpaper.storage_provider
        from user_wallpapers as wallpaper
        inner join homepage_wallpaper_migrations as migration
            on migration.user_id = wallpaper.user_id
            and migration.object_key = wallpaper.object_key
            and migration.switched_at is not null
        where wallpaper.storage_provider = 'r2'
        order by wallpaper.user_id
    `) as unknown as WallpaperRow[];

    for (const row of rows) {
        const sourceBody = await readLegacyObject(row);

        const migrationRows = await sql`
            select sha256
            from homepage_wallpaper_migrations
            where user_id = ${row.user_id} and object_key = ${row.object_key}
        `;
        const migrationRow = migrationRows.at(0);

        if (
            sourceBody.byteLength !== row.size_bytes ||
            migrationRow === undefined ||
            migrationRow.sha256 !== hash(sourceBody)
        ) {
            throw new Error('Legacy rollback object failed verification.');
        }
    }

    const result = await sql.begin(
        async (transaction) =>
            await transaction`
            update user_wallpapers as wallpaper
            set storage_provider = 'vercel-blob', updated_at = now()
            from homepage_wallpaper_migrations as migration
            where
                migration.user_id = wallpaper.user_id
                and migration.object_key = wallpaper.object_key
                and migration.switched_at is not null
                and wallpaper.storage_provider = 'r2'
            returning wallpaper.user_id
        `
    );
    await sql`
        update homepage_wallpaper_migrations as migration
        set rolled_back_at = now()
        where
            migration.switched_at is not null
            and migration.rolled_back_at is null
            and exists (
                select 1
                from user_wallpapers as wallpaper
                where
                    wallpaper.user_id = migration.user_id
                    and wallpaper.object_key = migration.object_key
                    and wallpaper.storage_provider = 'vercel-blob'
            )
    `;
    console.log(JSON.stringify({ rolledBack: result.length }));
};

try {
    const rows = await listLegacyRows();

    switch (mode) {
        case 'plan': {
            console.log(JSON.stringify({ legacyWallpapers: rows.length }));
            break;
        }

        case 'copy': {
            await copyRows(rows);
            console.log(JSON.stringify({ copiedAndVerified: rows.length }));
            break;
        }

        case 'verify': {
            const migratedRows = await listMigratedRows();
            await verifyRows(migratedRows);
            console.log(JSON.stringify({ verified: migratedRows.length }));
            break;
        }

        case 'switch': {
            await switchRows();
            break;
        }

        case 'rollback': {
            await rollbackRows();
            break;
        }
    }
} finally {
    r2?.destroy();
    await sql.end();
}
