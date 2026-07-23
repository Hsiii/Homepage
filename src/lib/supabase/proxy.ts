/* eslint-disable complete/prefer-readonly-parameter-types -- Supabase defines mutable cookie callback parameters. */
import { createServerClient } from '@supabase/ssr';
import type { SetAllCookies } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import type { Database } from '@/types/database';
import { getSupabaseConfig } from './config';

export const updateSession = async (
    request: NextRequest
): Promise<NextResponse> => {
    const { publishableKey, url } = getSupabaseConfig();
    let response = NextResponse.next({ request });
    const setAll: SetAllCookies = (cookiesToSet, headers) => {
        for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, options, value } of cookiesToSet) {
            response.cookies.set(name, value, options);
        }

        for (const [name, value] of Object.entries(headers)) {
            response.headers.set(name, value);
        }
    };
    const supabase = createServerClient<Database>(url, publishableKey, {
        cookies: {
            // eslint-disable-next-line complete/require-variadic-function-argument -- Supabase requires every cookie.
            getAll: () => request.cookies.getAll(),
            setAll,
        },
    });

    await supabase.auth.getClaims();

    return response;
};
