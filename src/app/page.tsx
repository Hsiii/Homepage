import type { ReactNode } from 'react';

import { isSupabaseConfigured } from '@/lib/supabase/config';
import { readInitialAppPreferences } from '@/server/preferences';
import { HomePageClient } from './HomePageClient';

export const dynamic = 'force-dynamic';

export default async function Page(): Promise<ReactNode> {
    const initialPreferences = await readInitialAppPreferences();

    return (
        <HomePageClient
            initialAqi={undefined}
            initialBookmarkTree={undefined}
            initialPreferences={initialPreferences}
            initialWallpaper={undefined}
            initialWeather={undefined}
            isSupabaseEnabled={isSupabaseConfigured()}
        />
    );
}
