import { useCallback, useEffect, useState } from 'react';

import type { TaiwanLocation } from '@/constants/taiwanLocations';
import type { GeolocationPermissionState } from '@/hooks/useTaiwanLocation';
import { useTaiwanLocation } from '@/hooks/useTaiwanLocation';

export type WeatherData = {
    weatherType: string;
    temp: number;
};

interface CachedWeather {
    data: WeatherData;
    locationId: string;
    timestamp: number;
}

const BASE_API_URL = '/api/weather';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const WEATHER_CACHE_KEY_PREFIX = 'weather_cache';
const weatherRequests = new Map<string, Promise<WeatherData>>();

function readJson(key: string): unknown {
    const value = globalThis.localStorage.getItem(key);

    if (value === null) {
        return undefined;
    }

    try {
        return JSON.parse(value) as unknown;
    } catch {
        return undefined;
    }
}

function isCacheFresh(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp < ttl;
}

function getWeatherCacheKey(locationId: string): string {
    return `${WEATHER_CACHE_KEY_PREFIX}_${locationId}`;
}

function getCachedWeather(locationId: string): CachedWeather | undefined {
    const cached = readJson(getWeatherCacheKey(locationId)) as
        | CachedWeather
        | undefined;

    if (
        cached === undefined ||
        cached.locationId !== locationId ||
        !isCacheFresh(cached.timestamp, CACHE_TTL)
    ) {
        return undefined;
    }

    return cached;
}

async function requestWeather(location: TaiwanLocation): Promise<WeatherData> {
    const pendingRequest = weatherRequests.get(location.id);

    if (pendingRequest !== undefined) {
        return await pendingRequest;
    }

    const request = (async () => {
        const params = new URLSearchParams({
            lat: String(location.lat),
            lon: String(location.lon),
        });
        const res = await fetch(`${BASE_API_URL}?${params.toString()}`);

        if (!res.ok) {
            throw new Error('Failed to fetch weather data');
        }

        return (await res.json()) as WeatherData;
    })().finally(() => {
        weatherRequests.delete(location.id);
    });

    weatherRequests.set(location.id, request);
    return await request;
}

export const useWeather = (): {
    weather: WeatherData | undefined;
    geolocationPermission: GeolocationPermissionState;
    isLoading: boolean;
    isGeolocationAvailable: boolean;
    isSyncingLocation: boolean;
    lastLocationSyncSucceededAt: number | undefined;
    selectedLocation: TaiwanLocation;
    syncCurrentLocation: () => void;
} => {
    const {
        selectedLocation,
        geolocationPermission,
        isGeolocationAvailable,
        isSyncingLocation,
        lastLocationSyncSucceededAt,
        syncCurrentLocation,
    } = useTaiwanLocation();
    const [cachedWeather, setCachedWeather] = useState<
        CachedWeather | undefined
    >(() => getCachedWeather(selectedLocation.id));
    const weather = cachedWeather?.data;
    const [isLoading, setIsLoading] = useState(false);

    const updateCache = useCallback(
        (data: WeatherData, location: TaiwanLocation) => {
            const cache: CachedWeather = {
                data,
                locationId: location.id,
                timestamp: Date.now(),
            };
            globalThis.localStorage.setItem(
                getWeatherCacheKey(location.id),
                JSON.stringify(cache)
            );
            setCachedWeather(cache);
        },
        []
    );

    const fetchWeather = useCallback(
        async (location: TaiwanLocation) => {
            setIsLoading(true);
            try {
                const data = await requestWeather(location);
                updateCache(data, location);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        },
        [updateCache]
    );

    useEffect(() => {
        const cached = getCachedWeather(selectedLocation.id);

        if (cached !== undefined) {
            setCachedWeather(cached);
            setIsLoading(false);
            return;
        }

        setCachedWeather(undefined);
        fetchWeather(selectedLocation).catch(console.error);
    }, [fetchWeather, selectedLocation]);

    return {
        weather,
        geolocationPermission,
        isLoading,
        isGeolocationAvailable,
        isSyncingLocation,
        lastLocationSyncSucceededAt,
        selectedLocation,
        syncCurrentLocation,
    };
};
