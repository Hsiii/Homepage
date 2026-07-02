import { useEffect, useState } from 'react';
import {
    Cloud,
    CloudDrizzle,
    CloudLightning,
    CloudRain,
    CloudSnow,
    LocateFixed,
    MapPinCheck,
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
const locationGrantFeedbackDuration = 1600;

export const Weather: React.FC = () => {
    const {
        weather,
        geolocationPermission,
        isGeolocationAvailable,
        isSyncingLocation,
        lastLocationSyncSucceededAt,
        selectedLocation,
        syncCurrentLocation,
    } = useWeather();
    const { aqi } = useAqi();
    const { locale, t } = useLocale();
    const [showLocationGranted, setShowLocationGranted] = useState(false);
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
    const showLocationTrigger =
        isGeolocationAvailable && geolocationPermission !== 'granted';
    const showLocationControl = showLocationTrigger || showLocationGranted;
    const hasWeatherRowContent = hasWeather || hasAqi || showLocationControl;
    const locationControlState = showLocationGranted ? 'granted' : 'request';
    let locationControlLabel = t.myLocation;

    if (showLocationGranted) {
        locationControlLabel = locationLabel;
    } else if (isSyncingLocation) {
        locationControlLabel = t.syncing;
    }

    useEffect(() => {
        if (
            lastLocationSyncSucceededAt === undefined ||
            geolocationPermission !== 'granted'
        ) {
            return undefined;
        }

        setShowLocationGranted(true);
        const timeoutId = setTimeout(() => {
            setShowLocationGranted(false);
        }, locationGrantFeedbackDuration);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [geolocationPermission, lastLocationSyncSucceededAt]);

    return (
        <div
            className={[
                'weather-container',
                !hasWeatherRowContent && 'placeholder',
                showLocationControl && 'with-location-control',
            ]
                .filter(Boolean)
                .join(' ')}
            aria-hidden={!hasWeatherRowContent}
        >
            <span className='weather-date'>{dateStr}</span>
            <span className='weather-metrics'>
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
            {showLocationControl && (
                <button
                    className='weather-location-sync'
                    type='button'
                    aria-label={locationControlLabel}
                    title={locationControlLabel}
                    data-state={locationControlState}
                    data-syncing={isSyncingLocation}
                    disabled={isSyncingLocation || showLocationGranted}
                    onClick={syncCurrentLocation}
                >
                    <span className='weather-location-sync-icons' aria-hidden>
                        <LocateFixed
                            className='weather-location-sync-icon weather-location-sync-icon-locate'
                            size={20}
                        />
                        <MapPinCheck
                            className='weather-location-sync-icon weather-location-sync-icon-granted'
                            size={20}
                        />
                    </span>
                </button>
            )}
        </div>
    );
};
