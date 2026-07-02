import { useCallback, useEffect, useState } from 'react';

import { useTaiwanLocation } from '@/hooks/useTaiwanLocation';
import { isBrowser } from '@/utils/browserEnv';

export type AqiData = {
    siteName: string;
    county: string;
    aqi: number | undefined;
    status: string;
    pollutant: string | undefined;
    pm25: number | undefined;
    pm10: number | undefined;
    publishTime: string;
};

interface CachedAqi {
    data: AqiData;
    locationId: string;
    timestamp: number;
}

const AQI_CACHE_KEY_PREFIX = 'aqi_cache';
const AQI_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const BASE_API_URL = '/api/aqi';

function readJson(key: string): unknown {
    if (!isBrowser()) {
        return undefined;
    }

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

function getAqiCacheKey(locationId: string): string {
    return `${AQI_CACHE_KEY_PREFIX}_${locationId}`;
}

function isCacheFresh(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp < ttl;
}

function getCachedAqi(locationId: string): AqiData | undefined {
    const cached = readJson(getAqiCacheKey(locationId)) as
        | CachedAqi
        | undefined;

    if (
        cached === undefined ||
        cached.locationId !== locationId ||
        !isCacheFresh(cached.timestamp, AQI_CACHE_TTL)
    ) {
        return undefined;
    }

    return cached.data;
}

export const useAqi = (): {
    aqi: AqiData | undefined;
    isLoading: boolean;
    refreshAqi: () => void;
} => {
    const { selectedLocation } = useTaiwanLocation();
    const [aqi, setAqi] = useState<AqiData | undefined>(() =>
        getCachedAqi(selectedLocation.id)
    );
    const [isLoading, setIsLoading] = useState(false);

    const fetchAqi = useCallback(async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({
                site: selectedLocation.aqiSiteName,
            });
            const res = await fetch(`${BASE_API_URL}?${params.toString()}`);

            if (!res.ok) {
                throw new Error('Failed to fetch AQI data');
            }

            const data = (await res.json()) as AqiData;
            const cache: CachedAqi = {
                data,
                locationId: selectedLocation.id,
                timestamp: Date.now(),
            };
            globalThis.localStorage.setItem(
                getAqiCacheKey(selectedLocation.id),
                JSON.stringify(cache)
            );
            setAqi(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, [selectedLocation]);

    const refreshAqi = useCallback(() => {
        fetchAqi().catch(console.error);
    }, [fetchAqi]);

    useEffect(() => {
        const cached = getCachedAqi(selectedLocation.id);

        if (cached !== undefined) {
            setAqi(cached);
            return;
        }

        setAqi(undefined);
        fetchAqi().catch(console.error);
    }, [fetchAqi, selectedLocation.id]);

    return {
        aqi,
        isLoading,
        refreshAqi,
    };
};
