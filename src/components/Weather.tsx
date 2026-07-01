import {
    Cloud,
    CloudDrizzle,
    CloudLightning,
    CloudRain,
    CloudSnow,
    Gauge,
    Sun,
} from 'lucide-react';

import './Weather.css';

import { useAqi } from '@/hooks/useAqi';
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
    const { weather, selectedLocation } = useWeather();
    const { aqi } = useAqi();
    const hasWeather = weather !== undefined;
    const hasAqi = aqi !== undefined;

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
            className={`weather-container ${!hasWeather && !hasAqi ? 'placeholder' : ''}`}
            aria-hidden={!hasWeather && !hasAqi}
        >
            <span className='weather-date'>{dateStr}</span>
            {hasWeather && (
                <span className='weather-info' title={selectedLocation.label}>
                    {weatherIcon}
                    {`${Math.round(weather.temp)}°C`}
                </span>
            )}
            {hasAqi && (
                <span
                    className='aqi-info'
                    title={`${aqi.county} ${aqi.siteName} · ${aqi.publishTime}`}
                >
                    <Gauge size={20} />
                    <span className='aqi-site'>{aqi.siteName}</span>
                    <span>AQI {aqi.aqi ?? '--'}</span>
                    <span className='aqi-status'>{aqi.status}</span>
                </span>
            )}
        </div>
    );
};
