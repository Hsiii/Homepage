import 'server-only';

import type { TaiwanLocation } from '@/constants/taiwanLocations';
import type { AqiData, WeatherData } from '@/types/environment';

type AqiRecord = Readonly<Record<string, unknown>>;

interface WeatherPayload {
    main?: {
        temp?: number;
    };
    weather?: Array<{
        main?: string;
    }>;
}

interface OpenMeteoWeatherPayload {
    current?: {
        temperature_2m?: number;
        weather_code?: number;
    };
}

const moenvAqiUrl = 'https://data.moenv.gov.tw/api/v2/aqx_p_432';
const openMeteoUrl = 'https://api.open-meteo.com/v1/forecast';
const openWeatherUrl = 'https://api.openweathermap.org/data/2.5/weather';
const sharedDataRevalidateSeconds = 300;

const getOpenWeatherApiKey = (): string | undefined =>
    process.env.OPENWEATHERMAP_API_KEY ??
    process.env.VITE_OPENWEATHERMAP_API_KEY ??
    process.env.OPENWEATHER_API_KEY ??
    process.env.VITE_OPENWEATHER_API_KEY;

const getMoenvApiKey = (): string | undefined =>
    process.env.MOENV_API_KEY ?? process.env.VITE_MOENV_API_KEY;

const readString = (record: AqiRecord, key: string): string => {
    const value = record[key];

    return typeof value === 'string' ? value : '';
};

const readOptionalString = (
    record: AqiRecord,
    key: string
): string | undefined => {
    const value = readString(record, key).trim();

    return value === '' ? undefined : value;
};

const readNumber = (record: AqiRecord, key: string): number | undefined => {
    const value = Number.parseFloat(readString(record, key));

    return Number.isNaN(value) ? undefined : value;
};

const isRecordArray = (value: unknown): value is readonly AqiRecord[] =>
    Array.isArray(value) &&
    value.every((record) => typeof record === 'object' && record !== null);

const buildMoenvUrl = (apiKey: string): URL => {
    const url = new URL(moenvAqiUrl);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('format', 'json');

    return url;
};

const fetchMoenvRecords = async (url: URL): Promise<readonly AqiRecord[]> => {
    const response = await fetch(url, {
        next: { revalidate: sharedDataRevalidateSeconds },
    });

    if (!response.ok) {
        throw new Error(`MOENV API responded with status ${response.status}`);
    }

    const payload = (await response.json()) as unknown;

    if (!isRecordArray(payload)) {
        throw new TypeError('MOENV API returned an unexpected payload.');
    }

    return payload;
};

const mapAqiRecord = (record: AqiRecord): AqiData => ({
    aqi: readNumber(record, 'aqi'),
    county: readString(record, 'county'),
    pm10: readNumber(record, 'pm10'),
    pm25: readNumber(record, 'pm2.5'),
    pollutant: readOptionalString(record, 'pollutant'),
    publishTime: readString(record, 'publishtime'),
    siteName: readString(record, 'sitename'),
    status: readString(record, 'status'),
});

const mapOpenMeteoWeatherCode = (weatherCode: number | undefined): string => {
    if (weatherCode === 0) {
        return 'Clear';
    }

    if (
        weatherCode === 71 ||
        weatherCode === 73 ||
        weatherCode === 75 ||
        weatherCode === 77 ||
        weatherCode === 85 ||
        weatherCode === 86
    ) {
        return 'Snow';
    }

    if (
        weatherCode === 51 ||
        weatherCode === 53 ||
        weatherCode === 55 ||
        weatherCode === 56 ||
        weatherCode === 57
    ) {
        return 'Drizzle';
    }

    if (
        weatherCode === 61 ||
        weatherCode === 63 ||
        weatherCode === 65 ||
        weatherCode === 66 ||
        weatherCode === 67 ||
        weatherCode === 80 ||
        weatherCode === 81 ||
        weatherCode === 82
    ) {
        return 'Rain';
    }

    if (weatherCode === 95 || weatherCode === 96 || weatherCode === 99) {
        return 'Thunderstorm';
    }

    return 'Clouds';
};

const fetchOpenMeteoWeatherByCoordinates = async (
    lat: number,
    lon: number
): Promise<WeatherData> => {
    const url = new URL(openMeteoUrl);
    url.searchParams.set('latitude', lat.toFixed(4));
    url.searchParams.set('longitude', lon.toFixed(4));
    url.searchParams.set('current', 'temperature_2m,weather_code');
    url.searchParams.set('timezone', 'Asia/Taipei');

    const response = await fetch(url, {
        next: { revalidate: sharedDataRevalidateSeconds },
    });

    if (!response.ok) {
        throw new Error(
            `Open-Meteo API responded with status ${response.status}`
        );
    }

    const payload = (await response.json()) as OpenMeteoWeatherPayload;
    const temp = payload.current?.temperature_2m;

    if (typeof temp !== 'number') {
        throw new TypeError('Open-Meteo API returned an unexpected payload.');
    }

    return {
        temp,
        weatherType: mapOpenMeteoWeatherCode(payload.current?.weather_code),
    };
};

export const fetchWeatherByCoordinates = async (
    lat: number,
    lon: number
): Promise<WeatherData | undefined> => {
    const apiKey = getOpenWeatherApiKey();

    if (apiKey === undefined || apiKey.trim() === '') {
        return await fetchOpenMeteoWeatherByCoordinates(lat, lon);
    }

    const url = new URL(openWeatherUrl);
    url.searchParams.set('lat', lat.toFixed(4));
    url.searchParams.set('lon', lon.toFixed(4));
    url.searchParams.set('units', 'metric');
    url.searchParams.set('appid', apiKey);

    const response = await fetch(url, {
        next: { revalidate: sharedDataRevalidateSeconds },
    });

    if (!response.ok) {
        throw new Error(`Weather API responded with status ${response.status}`);
    }

    const payload = (await response.json()) as WeatherPayload;
    const temp = payload.main?.temp;
    const weatherType = payload.weather?.at(0)?.main;

    if (typeof temp !== 'number' || typeof weatherType !== 'string') {
        throw new TypeError('Weather API returned an unexpected payload.');
    }

    return {
        temp,
        weatherType,
    };
};

export const fetchWeatherData = async (
    location: TaiwanLocation
): Promise<WeatherData | undefined> =>
    await fetchWeatherByCoordinates(location.lat, location.lon);

export const fetchAqiData = async (
    siteName: string
): Promise<AqiData | undefined> => {
    const apiKey = getMoenvApiKey();

    if (apiKey === undefined || apiKey.trim() === '') {
        return undefined;
    }

    const url = buildMoenvUrl(apiKey);
    url.searchParams.set('filters', `sitename,EQ,${siteName}`);
    url.searchParams.set('limit', '1');

    const records = await fetchMoenvRecords(url);
    const record = records.at(0);

    return record === undefined ? undefined : mapAqiRecord(record);
};
