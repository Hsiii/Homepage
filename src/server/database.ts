import 'server-only';

import { neon } from '@neondatabase/serverless';
import type { NeonQueryFunction } from '@neondatabase/serverless';

import { ApiError } from '@/server/apiError';

const databaseUrlVariableNames = [
    'DATABASE_URL',
    'POSTGRES_URL',
    'DATABASE_URL_UNPOOLED',
    'POSTGRES_URL_NON_POOLING',
] as const;

let database: NeonQueryFunction<false, false> | undefined;

const readDatabaseUrl = (): string | undefined => {
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

export const getDatabase = (): NeonQueryFunction<false, false> => {
    database ??= neon(getDatabaseUrl());
    return database;
};
