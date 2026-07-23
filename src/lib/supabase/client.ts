import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

import type { Database } from '@/types/database';
import { getSupabaseConfig } from './config';

export const createClient = (): SupabaseClient<Database> => {
    const { publishableKey, url } = getSupabaseConfig();

    return createBrowserClient<Database>(url, publishableKey);
};
