import {
    Cloud,
    CloudDrizzle,
    CloudLightning,
    CloudRain,
    CloudSnow,
    RefreshCw,
    Sun,
} from 'lucide-react';

import './Weather.css';

import { useWeather } from '@/hooks/useWeather';

const weatherIcons = {
    Thunderstorm: <CloudLightning size={20} />,
    Drizzle: <CloudDrizzle size={20} />,
    Rain: <CloudRain size={20} />,
    Snow: <CloudSnow size={20} />,
    Clear: <Sun size={20} />,
    Clouds: <Cloud size={20} />,
};

export const Weather: React.FC = () => {
    const { weather, isLoading, isCached, fetchWeatherByCurrentLocation } =
        useWeather();

    const date = new Date();
    const dateStr = date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        weekday: 'short',
    });

    const weatherIcon =
        weather?.weatherType !== undefined &&
        weather.weatherType in weatherIcons
            ? weatherIcons[weather.weatherType as keyof typeof weatherIcons]
            : weatherIcons.Clouds;

    return (
        <div
            className={`weather-container ${weather === undefined ? 'placeholder' : ''}`}
            aria-hidden={weather === undefined}
        >
            <span className='weather-date'>{dateStr}</span>
            <span className='weather-info'>
                {weatherIcon}
                {weather === undefined
                    ? '--°C'
                    : `${Math.round(weather.temp)}°C`}
                {!isCached && weather !== undefined && (
                    <button
                        className={`weather-refresh ${isLoading ? 'loading' : ''}`}
                        onClick={fetchWeatherByCurrentLocation}
                        title='Update with my location'
                    >
                        <RefreshCw size={14} />
                    </button>
                )}
            </span>
        </div>
    );
};
