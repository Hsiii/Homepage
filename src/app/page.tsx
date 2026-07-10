import type { ReactNode } from 'react';
import { auth } from '@clerk/nextjs/server';
import { preload } from 'react-dom';

import { findTaiwanLocation } from '@/constants/taiwanLocations';
import { getUserBookmarks } from '@/server/bookmarkStore';
import { fetchAqiData, fetchWeatherData } from '@/server/environmentData';
import { readInitialAppPreferences } from '@/server/preferences';
import { withServerTimeout } from '@/server/timeout';
import { getUserWallpaper } from '@/server/wallpaperStore';
import type { BookmarkCategoryData } from '@/types/bookmarks';
import type { WallpaperAsset } from '../../shared/wallpaper';
import { HomePageClient } from './HomePageClient';

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isClerkEnabled =
    clerkPublishableKey !== undefined && clerkPublishableKey.trim() !== '';
const skipInitialServerData =
    process.env.BENCHMARK_SKIP_INITIAL_SERVER_DATA === 'true';
const initialEnvironmentTimeoutMs = 1200;
const initialUserDataTimeoutMs = 1400;

interface InitialUserData {
    bookmarks?: BookmarkCategoryData[];
    wallpaper?: WallpaperAsset;
}

const readOptionalInitialData = async <T,>(
    label: string,
    promise: Promise<T | undefined>,
    timeoutMs: number
): Promise<T | undefined> => {
    try {
        return await withServerTimeout(label, promise, timeoutMs);
    } catch (error) {
        console.error(`Failed to read initial ${label}:`, error);
        return undefined;
    }
};

const readInitialUserData = async (): Promise<InitialUserData> => {
    if (!isClerkEnabled) {
        return {};
    }

    try {
        const { userId } = await auth();

        if (userId === null) {
            return {};
        }

        const [wallpaper, bookmarks] = await Promise.all([
            readOptionalInitialData(
                'wallpaper',
                getUserWallpaper(userId),
                initialUserDataTimeoutMs
            ),
            readOptionalInitialData(
                'bookmarks',
                getUserBookmarks(userId),
                initialUserDataTimeoutMs
            ),
        ]);

        return {
            bookmarks,
            wallpaper,
        };
    } catch (error) {
        console.error('Failed to read initial user data:', error);
        return {};
    }
};

export const dynamic = 'force-dynamic';

export default async function Page(): Promise<ReactNode> {
    const initialPreferences = await readInitialAppPreferences();
    const initialLocation = findTaiwanLocation(initialPreferences.locationId);
    const [initialWeather, initialAqi, initialUserData] = skipInitialServerData
        ? [undefined, undefined, {}]
        : await Promise.all([
              readOptionalInitialData(
                  'weather',
                  fetchWeatherData(initialLocation),
                  initialEnvironmentTimeoutMs
              ),
              readOptionalInitialData(
                  'AQI',
                  fetchAqiData(initialLocation.aqiSiteName),
                  initialEnvironmentTimeoutMs
              ),
              readInitialUserData(),
          ]);

    if (initialUserData.wallpaper !== undefined) {
        preload(initialUserData.wallpaper.url, {
            as: 'image',
            fetchPriority: 'high',
        });
    }

    return (
        <HomePageClient
            initialAqi={initialAqi}
            initialBookmarkTree={initialUserData.bookmarks}
            initialPreferences={initialPreferences}
            initialWallpaper={initialUserData.wallpaper}
            initialWeather={initialWeather}
            isClerkEnabled={isClerkEnabled}
        />
    );
}
