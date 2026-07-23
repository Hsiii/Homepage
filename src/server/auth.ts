import 'server-only';

import type { SupabaseClient } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';
import { ApiError } from '@/server/apiError';
import type { Database } from '@/types/database';

export interface AuthenticatedRequest {
    client: SupabaseClient<Database>;
    userId: string;
}

export const requireAuthenticatedRequest =
    async (): Promise<AuthenticatedRequest> => {
        const client = await createClient();
        const { data, error } = await client.auth.getClaims();
        const userId = data?.claims.sub;

        if (error !== null || typeof userId !== 'string' || userId === '') {
            throw new ApiError('Sign in is required.', 401);
        }

        return { client, userId };
    };
