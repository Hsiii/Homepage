import 'server-only';

import postgres from 'postgres';
import type { Sql } from 'postgres';

import { ApiError } from '@/server/apiError';

const databaseUrlVariableNames = [
    'DATABASE_URL',
    'POSTGRES_URL',
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_URL_NON_POOLING',
] as const;

let database: Sql | undefined;

export const readDatabaseUrl = (): string | undefined => {
    for (const variableName of databaseUrlVariableNames) {
        const databaseUrl = process.env[variableName]?.trim();

        if (databaseUrl !== undefined && databaseUrl !== '') {
            return databaseUrl;
        }
    }

    return undefined;
};

export const isDatabaseConfigured = (): boolean =>
    readDatabaseUrl() !== undefined;

const getDatabaseUrl = (): string => {
    const databaseUrl = readDatabaseUrl();

    if (databaseUrl !== undefined) {
        return databaseUrl;
    }

    throw new ApiError(
        `${databaseUrlVariableNames.join(', ')} is not configured.`,
        503
    );
};

export const getDatabase = (): Sql => {
    database ??= postgres(getDatabaseUrl(), {
        connect_timeout: 10,
        idle_timeout: 20,
        max: 10,
        prepare: false,
    });
    return database;
};
