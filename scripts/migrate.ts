import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';

/* eslint-disable no-await-in-loop, unicorn/template-indent */

const databaseUrlVariableNames = [
    'DATABASE_URL',
    'POSTGRES_URL',
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_URL_NON_POOLING',
] as const;
const databaseUrl = databaseUrlVariableNames
    .map((name) => process.env[name]?.trim())
    .find((value) => value !== undefined && value !== '');

if (databaseUrl === undefined) {
    throw new Error(
        `${databaseUrlVariableNames.join(', ')} is not configured.`
    );
}

const migrationsDirectory = path.resolve(
    import.meta.dirname,
    '..',
    'migrations'
);
const migrationEntries = await readdir(migrationsDirectory);
const migrationNames = migrationEntries
    .filter((name) => /^\d+.*\.sql$/u.test(name))
    .toSorted();
const sql = postgres(databaseUrl, { max: 1, prepare: false });

try {
    await sql`
        create table if not exists homepage_schema_migrations (
            name text primary key,
            applied_at timestamptz not null default now()
        )
    `;

    for (const name of migrationNames) {
        const applied = await sql`
            select 1
            from homepage_schema_migrations
            where name = ${name}
        `;

        if (applied.length > 0) {
            console.log(`already applied: ${name}`);
            continue;
        }

        const source = await readFile(
            path.resolve(migrationsDirectory, name),
            'utf8'
        );
        await sql.begin(async (transaction) => {
            await transaction.unsafe(source);
            await transaction`
                insert into homepage_schema_migrations (name)
                values (${name})
            `;
        });
        console.log(`applied: ${name}`);
    }
} finally {
    await sql.end();
}
