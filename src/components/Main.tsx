import React from 'react';

import { footerCredit, footerLink } from '@/constants/footer';
import type { BookmarkCategoryData } from '@/types/bookmarks';
import type { AqiData, WeatherData } from '@/types/environment';
import type { InitialAppPreferences } from '@/types/preferences';
import type { WallpaperAsset } from '../../shared/wallpaper';
import { Cover } from './Cover';

interface MainProps {
    initialAqi: AqiData | undefined;
    initialBookmarkTree: BookmarkCategoryData[] | undefined;
    initialPreferences: InitialAppPreferences;
    initialWallpaper: WallpaperAsset | undefined;
    initialWeather: WeatherData | undefined;
    isSupabaseEnabled: boolean;
    onWallpaperChange: (wallpaper: WallpaperAsset | undefined) => void;
}

export const Main: React.FC<MainProps> = ({
    initialAqi,
    initialBookmarkTree,
    initialPreferences,
    initialWallpaper,
    initialWeather,
    isSupabaseEnabled,
    onWallpaperChange,
}) => (
    <>
        <main>
            <Cover
                initialAqi={initialAqi}
                initialBookmarkTree={initialBookmarkTree}
                initialPreferences={initialPreferences}
                initialWallpaper={initialWallpaper}
                initialWeather={initialWeather}
                isSupabaseEnabled={isSupabaseEnabled}
                onWallpaperChange={onWallpaperChange}
            />
        </main>
        <footer>
            <a href={footerLink}>{footerCredit}</a>
        </footer>
    </>
);
