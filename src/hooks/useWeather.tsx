import type { JSX } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
    Cloud,
    CloudDrizzle,
    CloudLightning,
    CloudRain,
    CloudSnow,
    Sun,
} from 'lucide-react';

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

enum WeatherType {
    Thunderstorm = 'Thunderstorm',
    Drizzle = 'Drizzle',
    Rain = 'Rain',
    Snow = 'Snow',
    Clear = 'Clear',
    Clouds = 'Clouds',
}

const weatherIcons: Record<WeatherType, JSX.Element> = {
    [WeatherType.Thunderstorm]: <CloudLightning size={20} />,
    [WeatherType.Drizzle]: <CloudDrizzle size={20} />,
    [WeatherType.Rain]: <CloudRain size={20} />,
    [WeatherType.Snow]: <CloudSnow size={20} />,
    [WeatherType.Clear]: <Sun size={20} />,
    [WeatherType.Clouds]: <Cloud size={20} />,
};

// Taipei Coordinates
const DEFAULT_LAT = 25.033;
const DEFAULT_LON = 121.5654;
// Use production API for local dev (bun dev), relative path for Vercel.
const BASE_API_URL = import.meta.env.DEV
    ? 'https://hsi-homepage.vercel.app/api/weather'
    : '/api/weather';
const CACHE_KEY = 'weather_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const WEATHER_INIT_TIMEOUT = 1000;
const WEATHER_INIT_FALLBACK_DELAY = 200;

export const useWeather = (): {
    weather: WeatherData | undefined;
    weatherIcon: JSX.Element | undefined;
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
    const correspondingWeatherIcon = weather
        ? weatherIcons[weather.weatherType as WeatherType]
        : undefined;
    const weatherIcon = correspondingWeatherIcon ?? <Cloud size={20} />;
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

    const cachedWeatherRef = useRef(cachedWeather);
    cachedWeatherRef.current = cachedWeather;

    useEffect(() => {
        const initWeather = async () => {
            const cached = cachedWeatherRef.current;
            const isCacheValid =
                cached !== undefined &&
                Date.now() - cached.timestamp < CACHE_TTL;
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
    }, [fetchWeatherByCurrentLocation, fetchWeatherByDefaultLocation]);

    return {
        weather,
        weatherIcon,
        isLoading,
        isCached,
        fetchWeatherByCurrentLocation,
    };
};
