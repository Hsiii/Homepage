import type { EmailOtpType } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';

export const GET = async (request: NextRequest): Promise<NextResponse> => {
    const redirectUrl = new URL('/', request.url);
    const code = request.nextUrl.searchParams.get('code');
    const tokenHash = request.nextUrl.searchParams.get('token_hash');
    const type = request.nextUrl.searchParams.get(
        'type'
    ) as EmailOtpType | null;
    const supabase = await createClient();

    if (code !== null) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);

        if (error === null) {
            return NextResponse.redirect(redirectUrl);
        }
    } else if (tokenHash !== null && type !== null) {
        const { error } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type,
        });

        if (error === null) {
            return NextResponse.redirect(redirectUrl);
        }
    }

    redirectUrl.searchParams.set('auth_error', 'invalid_link');
    return NextResponse.redirect(redirectUrl);
};
