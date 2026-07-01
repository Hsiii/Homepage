import {
    Cloud,
    CloudDrizzle,
    CloudLightning,
    CloudRain,
    CloudSnow,
    Sun,
} from 'lucide-react';

import './Weather.css';

import { aqiRankLabels, getAqiRank } from '@/constants/aqi';
import { getDateLocale } from '@/constants/i18n';
import { getLocationLabel } from '@/constants/taiwanLocations';
import { useAqi } from '@/hooks/useAqi';
import { useLocale } from '@/hooks/useLocale';
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
    const { locale, t } = useLocale();
    const hasWeather = weather !== undefined;
    const hasAqi = aqi !== undefined;
    const locationLabel = getLocationLabel(selectedLocation, locale);
    const aqiRank = getAqiRank(aqi?.aqi);
    const aqiRankLabel = aqiRankLabels[locale][aqiRank];

    const date = new Date();
    const dateStr = date.toLocaleDateString(getDateLocale(locale), {
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
            <span className='weather-metrics'>
                <span className='weather-location'>{locationLabel}</span>
                {hasWeather && (
                    <span className='weather-info' title={locationLabel}>
                        {weatherIcon}
                        {`${Math.round(weather.temp)}°C`}
                    </span>
                )}
                {hasAqi && (
                    <span
                        className='aqi-info'
                        data-aqi-rank={aqiRank}
                        title={`${locationLabel} · ${aqi.publishTime} · ${aqiRankLabel}`}
                        aria-label={`${t.aqi} ${aqi.aqi ?? '--'}, ${aqiRankLabel}`}
                    >
                        <span>{t.aqi}</span>
                        <span>{aqi.aqi ?? '--'}</span>
                    </span>
                )}
            </span>
        </div>
    );
};
