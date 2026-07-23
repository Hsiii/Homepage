'use client';

import { useState } from 'react';

import { Main } from '@/components/Main';
import type { BookmarkCategoryData } from '@/types/bookmarks';
import type { AqiData, WeatherData } from '@/types/environment';
import type { InitialAppPreferences } from '@/types/preferences';
import type { WallpaperAsset } from '../../shared/wallpaper';

interface HomePageClientProps {
    initialAqi: AqiData | undefined;
    initialBookmarkTree: BookmarkCategoryData[] | undefined;
    initialPreferences: InitialAppPreferences;
    initialWallpaper: WallpaperAsset | undefined;
    initialWeather: WeatherData | undefined;
    isSupabaseEnabled: boolean;
}

export const HomePageClient: React.FC<HomePageClientProps> = ({
    initialAqi,
    initialBookmarkTree,
    initialPreferences,
    initialWallpaper,
    initialWeather,
    isSupabaseEnabled,
}) => {
    const [wallpaper, setWallpaper] = useState(initialWallpaper);

    return (
        <Main
            initialAqi={initialAqi}
            initialBookmarkTree={initialBookmarkTree}
            initialPreferences={initialPreferences}
            initialWallpaper={wallpaper}
            initialWeather={initialWeather}
            isSupabaseEnabled={isSupabaseEnabled}
            onWallpaperChange={setWallpaper}
        />
    );
};
