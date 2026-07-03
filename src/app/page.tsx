import type { ReactNode } from 'react';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

import {
    findTaiwanLocation,
    taiwanLocationCookieName,
} from '@/constants/taiwanLocations';
import { fetchAqiData, fetchWeatherData } from '@/server/environmentData';
import { getUserWallpaper } from '@/server/wallpaperStore';
import type { WallpaperAsset } from '../../shared/wallpaper';
import { HomePageClient } from './HomePageClient';

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const isClerkEnabled =
    clerkPublishableKey !== undefined && clerkPublishableKey.trim() !== '';

const readInitialWallpaper = async (): Promise<WallpaperAsset | undefined> => {
    if (!isClerkEnabled) {
        return undefined;
    }

    try {
        const { userId } = await auth();

        return userId === null ? undefined : await getUserWallpaper(userId);
    } catch (error) {
        console.error('Failed to read initial wallpaper:', error);
        return undefined;
    }
};

export const dynamic = 'force-dynamic';

export default async function Page(): Promise<ReactNode> {
    const cookieStore = await cookies();
    const locationCookie = cookieStore.get(taiwanLocationCookieName);
    const initialLocation = findTaiwanLocation(locationCookie?.value);
    const [initialWeather, initialAqi, initialWallpaper] = await Promise.all([
        fetchWeatherData(initialLocation).catch((error: unknown) => {
            console.error('Failed to read initial weather:', error);
            return undefined;
        }),
        fetchAqiData(initialLocation.aqiSiteName).catch((error: unknown) => {
            console.error('Failed to read initial AQI:', error);
            return undefined;
        }),
        readInitialWallpaper(),
    ]);

    return (
        <HomePageClient
            hasInitialLocationCookie={locationCookie !== undefined}
            initialAqi={initialAqi}
            initialLocationId={initialLocation.id}
            initialWallpaper={initialWallpaper}
            initialWeather={initialWeather}
            isClerkEnabled={isClerkEnabled}
        />
    );
}
