import { useCallback, useEffect, useState } from 'react';

export type WeatherData = {
    weatherType: string;
    temp: number;
};

export type WeatherLocation = {
    name: string;
    country: string;
    label: string;
    lat: number;
    lon: number;
    localName?: string;
    state?: string;
};

interface CachedWeather {
    data: WeatherData;
    locationKey: string;
    timestamp: number;
}

interface CachedWeatherLocations {
    locations: readonly WeatherLocation[];
    query: string;
    timestamp: number;
}

const BASE_API_URL = '/api/weather';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const CURRENT_LOCATION_LABEL = 'Current location';
const DEFAULT_WEATHER_LOCATION = {
    name: 'Taipei',
    country: 'TW',
    label: 'Taipei, TW',
    lat: 25.033,
    lon: 121.5654,
} as const;
const LOCATION_SEARCH_CACHE_KEY_PREFIX = 'weather_location_search';
const LOCATION_SEARCH_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const WEATHER_CACHE_KEY_PREFIX = 'weather_cache';
const WEATHER_LOCATION_CHANGE_EVENT = 'weather-location-change';
const WEATHER_LOCATION_STORAGE_KEY = 'weather_location';
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

function isWeatherLocation(value: unknown): value is WeatherLocation {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const location = value as Partial<WeatherLocation>;

    return (
        typeof location.name === 'string' &&
        typeof location.country === 'string' &&
        typeof location.label === 'string' &&
        typeof location.lat === 'number' &&
        typeof location.lon === 'number' &&
        Number.isFinite(location.lat) &&
        Number.isFinite(location.lon) &&
        (location.localName === undefined ||
            typeof location.localName === 'string') &&
        (location.state === undefined || typeof location.state === 'string')
    );
}

function getInitialLocation(): WeatherLocation {
    const savedLocation = readJson(WEATHER_LOCATION_STORAGE_KEY);

    return isWeatherLocation(savedLocation)
        ? savedLocation
        : DEFAULT_WEATHER_LOCATION;
}

function getLocationKey(location: WeatherLocation): string {
    return `${location.lat.toFixed(4)}_${location.lon.toFixed(4)}`;
}

function getWeatherCacheKey(location: WeatherLocation): string {
    return `${WEATHER_CACHE_KEY_PREFIX}_${getLocationKey(location)}`;
}

function getLocationSearchCacheKey(query: string): string {
    return `${LOCATION_SEARCH_CACHE_KEY_PREFIX}_${query.toLocaleLowerCase()}`;
}

function getCachedWeather(
    location: WeatherLocation
): CachedWeather | undefined {
    const cached = readJson(getWeatherCacheKey(location)) as
        | CachedWeather
        | undefined;

    if (
        cached === undefined ||
        cached.locationKey !== getLocationKey(location) ||
        !isCacheFresh(cached.timestamp, CACHE_TTL)
    ) {
        return undefined;
    }

    return cached;
}

function getCachedLocationSearch(
    query: string
): readonly WeatherLocation[] | undefined {
    const cached = readJson(getLocationSearchCacheKey(query)) as
        | CachedWeatherLocations
        | undefined;

    if (
        cached === undefined ||
        cached.query !== query ||
        !isCacheFresh(cached.timestamp, LOCATION_SEARCH_CACHE_TTL) ||
        !cached.locations.every(isWeatherLocation)
    ) {
        return undefined;
    }

    return cached.locations;
}

function getWeatherLocationFromEvent(
    event: Event
): WeatherLocation | undefined {
    if (!(event instanceof CustomEvent) || !isWeatherLocation(event.detail)) {
        return undefined;
    }

    return event.detail;
}

async function requestWeather(location: WeatherLocation): Promise<WeatherData> {
    const locationKey = getLocationKey(location);
    const pendingRequest = weatherRequests.get(locationKey);

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
        weatherRequests.delete(locationKey);
    });

    weatherRequests.set(locationKey, request);
    return await request;
}

export const useWeather = (): {
    weather: WeatherData | undefined;
    isLoading: boolean;
    selectedLocation: WeatherLocation;
    fetchWeatherByCurrentLocation: () => void;
    searchWeatherLocations: (
        query: string
    ) => Promise<readonly WeatherLocation[]>;
    selectWeatherLocation: (location: WeatherLocation) => void;
} => {
    const [selectedLocation, setSelectedLocation] =
        useState(getInitialLocation);
    const [cachedWeather, setCachedWeather] = useState<
        CachedWeather | undefined
    >(() => getCachedWeather(getInitialLocation()));
    const weather = cachedWeather?.data;
    const [isLoading, setIsLoading] = useState(false);

    const updateCache = useCallback(
        (data: WeatherData, location: WeatherLocation) => {
            const cache: CachedWeather = {
                data,
                locationKey: getLocationKey(location),
                timestamp: Date.now(),
            };
            globalThis.localStorage.setItem(
                getWeatherCacheKey(location),
                JSON.stringify(cache)
            );
            setCachedWeather(cache);
        },
        []
    );

    const fetchWeather = useCallback(
        async (location: WeatherLocation) => {
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

    const selectWeatherLocation = useCallback((location: WeatherLocation) => {
        globalThis.localStorage.setItem(
            WEATHER_LOCATION_STORAGE_KEY,
            JSON.stringify(location)
        );
        setSelectedLocation(location);
        globalThis.dispatchEvent(
            new CustomEvent(WEATHER_LOCATION_CHANGE_EVENT, {
                detail: location,
            })
        );
    }, []);

    const fetchWeatherByCurrentLocation = useCallback(() => {
        if (!('geolocation' in navigator)) {
            return;
        }

        setIsLoading(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                selectWeatherLocation({
                    name: CURRENT_LOCATION_LABEL,
                    country: '',
                    label: CURRENT_LOCATION_LABEL,
                    lat: latitude,
                    lon: longitude,
                });
            },
            (error) => {
                console.error(error);
                setIsLoading(false);
            },
            {
                maximumAge: CACHE_TTL,
                timeout: 10_000,
            }
        );
    }, [selectWeatherLocation]);

    const searchWeatherLocations = useCallback(
        async (query: string): Promise<readonly WeatherLocation[]> => {
            const trimmedQuery = query.trim();

            if (trimmedQuery.length < 2) {
                return [];
            }

            const cachedLocations = getCachedLocationSearch(trimmedQuery);

            if (cachedLocations !== undefined) {
                return cachedLocations;
            }

            const params = new URLSearchParams({
                mode: 'locations',
                q: trimmedQuery,
            });
            const res = await fetch(`${BASE_API_URL}?${params.toString()}`);

            if (!res.ok) {
                throw new Error('Failed to fetch weather locations');
            }

            const { locations } = (await res.json()) as {
                locations: readonly WeatherLocation[];
            };
            const validLocations = locations.filter(isWeatherLocation);
            const cache: CachedWeatherLocations = {
                locations: validLocations,
                query: trimmedQuery,
                timestamp: Date.now(),
            };
            globalThis.localStorage.setItem(
                getLocationSearchCacheKey(trimmedQuery),
                JSON.stringify(cache)
            );

            return validLocations;
        },
        []
    );

    useEffect(() => {
        const onLocationChange = (event: Event) => {
            const location = getWeatherLocationFromEvent(event);

            if (location !== undefined) {
                setSelectedLocation(location);
            }
        };

        globalThis.addEventListener(
            WEATHER_LOCATION_CHANGE_EVENT,
            onLocationChange
        );
        return () => {
            globalThis.removeEventListener(
                WEATHER_LOCATION_CHANGE_EVENT,
                onLocationChange
            );
        };
    }, []);

    useEffect(() => {
        const cached = getCachedWeather(selectedLocation);

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
        isLoading,
        selectedLocation,
        fetchWeatherByCurrentLocation,
        searchWeatherLocations,
        selectWeatherLocation,
    };
};
