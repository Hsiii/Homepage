import { useCallback, useEffect, useState } from 'react';

// The weather type returned by the OpenWeatherMap API.
export type WeatherData = {
    weatherType: string;
    temp: number;
};

interface CachedWeather {
    data: WeatherData;
    timestamp: number;
    isDefault?: boolean;
}

// Taipei Coordinates
const DEFAULT_LAT = 25.033;
const DEFAULT_LON = 121.5654;
const BASE_API_URL = '/api/weather';
const CACHE_KEY = 'weather_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const WEATHER_INIT_TIMEOUT = 1000;
const WEATHER_INIT_FALLBACK_DELAY = 200;

export const useWeather = (): {
    weather: WeatherData | undefined;
    isLoading: boolean;
    isCached: boolean;
    fetchWeatherByCurrentLocation: () => void;
} => {
    // sync with localStorage
    const [cachedWeather, setCachedWeather] = useState<
        CachedWeather | undefined
    >(() => {
        const cached = localStorage.getItem(CACHE_KEY);
        if (cached !== null) {
            try {
                return JSON.parse(cached) as CachedWeather;
            } catch {
                return undefined;
            }
        }
        return undefined;
    });
    const isCached =
        cachedWeather !== undefined && cachedWeather.isDefault !== true;
    const weather = cachedWeather?.data;
    const [isLoading, setIsLoading] = useState(false);

    const updateCache = useCallback((data: WeatherData, isDefault: boolean) => {
        const cache: CachedWeather = {
            data,
            timestamp: Date.now(),
            isDefault,
        };
        localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
        setCachedWeather(cache);
    }, []);

    const fetchWeather = useCallback(
        async (lat: number, lon: number, isDefault: boolean) => {
            setIsLoading(true);
            try {
                const res = await fetch(
                    `${BASE_API_URL}?lat=${lat}&lon=${lon}`
                );
                if (!res.ok) {
                    throw new Error('Failed to fetch weather data');
                }
                const data = (await res.json()) as WeatherData;
                updateCache(data, isDefault);
            } catch (error) {
                console.error(error);
            } finally {
                setIsLoading(false);
            }
        },
        [updateCache]
    );

    const fetchWeatherByDefaultLocation = useCallback(() => {
        fetchWeather(DEFAULT_LAT, DEFAULT_LON, true).catch(console.error);
    }, [fetchWeather]);

    const fetchWeatherByCurrentLocation = useCallback(() => {
        navigator.geolocation.getCurrentPosition((position) => {
            const { latitude, longitude } = position.coords;
            fetchWeather(latitude, longitude, false).catch(console.error);
        }, fetchWeatherByDefaultLocation);
    }, [fetchWeather, fetchWeatherByDefaultLocation]);

    useEffect(() => {
        const initWeather = async () => {
            const isCacheValid =
                cachedWeather !== undefined &&
                Date.now() - cachedWeather.timestamp < CACHE_TTL;
            if (isCacheValid) {
                return;
            }

            try {
                const result = await navigator.permissions.query({
                    name: 'geolocation',
                });
                if (result.state === 'granted') {
                    fetchWeatherByCurrentLocation();
                } else {
                    fetchWeatherByDefaultLocation();
                }
            } catch {
                fetchWeatherByDefaultLocation();
            }
        };

        const runInitWeather = () => {
            initWeather().catch((error: unknown) => {
                console.error('Failed to fetch weather:', error);
            });
        };

        if ('requestIdleCallback' in globalThis) {
            const idleHandle = globalThis.requestIdleCallback(runInitWeather, {
                timeout: WEATHER_INIT_TIMEOUT,
            });

            return () => {
                globalThis.cancelIdleCallback(idleHandle);
            };
        }

        const timeoutHandle = globalThis.setTimeout(
            () => {
                runInitWeather();
            },
            WEATHER_INIT_FALLBACK_DELAY,
            undefined
        );

        return () => {
            globalThis.clearTimeout(timeoutHandle);
        };
    }, [
        cachedWeather,
        fetchWeatherByCurrentLocation,
        fetchWeatherByDefaultLocation,
    ]);

    return {
        weather,
        isLoading,
        isCached,
        fetchWeatherByCurrentLocation,
    };
};
