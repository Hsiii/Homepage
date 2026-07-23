/* eslint-disable complete/prefer-readonly-parameter-types -- Supabase defines mutable cookie callback parameters. */
import { createServerClient } from '@supabase/ssr';
import type { SetAllCookies } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import type { Database } from '@/types/database';
import { getSupabaseConfig } from './config';

export const createClient = async (): Promise<SupabaseClient<Database>> => {
    const cookieStore = await cookies();
    const { publishableKey, url } = getSupabaseConfig();

    const setAll: SetAllCookies = (cookiesToSet) => {
        try {
            for (const { name, options, value } of cookiesToSet) {
                cookieStore.set(name, value, options);
            }
        } catch {
            // Supabase's proxy refreshes sessions before authenticated server code.
        }
    };

    return createServerClient(url, publishableKey, {
        cookies: {
            // eslint-disable-next-line complete/require-variadic-function-argument -- Supabase requires every cookie.
            getAll: () => cookieStore.getAll(),
            setAll,
        },
    });
};
