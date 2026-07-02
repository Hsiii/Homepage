import 'server-only';

import type { TaiwanLocation } from '@/constants/taiwanLocations';
import type { AqiData, AqiSiteOption, WeatherData } from '@/types/environment';

type AqiRecord = Readonly<Record<string, unknown>>;

interface WeatherPayload {
    main?: {
        temp?: number;
    };
    weather?: Array<{
        main?: string;
    }>;
}

const moenvAqiUrl = 'https://data.moenv.gov.tw/api/v2/aqx_p_432';
const openWeatherUrl = 'https://api.openweathermap.org/data/2.5/weather';
const sharedDataRevalidateSeconds = 300;
const siteListRevalidateSeconds = 3600;

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

const mapSiteOption = (record: AqiRecord): AqiSiteOption | undefined => {
    const siteName = readString(record, 'sitename');

    if (siteName === '') {
        return undefined;
    }

    return {
        county: readString(record, 'county'),
        siteId: readString(record, 'siteid'),
        siteName,
    };
};

const uniqueSites = (
    records: readonly AqiRecord[]
): readonly AqiSiteOption[] => {
    const sites = new Map<string, AqiSiteOption>();

    for (const record of records) {
        const site = mapSiteOption(record);

        if (site !== undefined) {
            sites.set(site.siteName, site);
        }
    }

    return [...sites.values()].toSorted((a, b) =>
        `${a.county}${a.siteName}`.localeCompare(`${b.county}${b.siteName}`)
    );
};

export const fetchWeatherByCoordinates = async (
    lat: number,
    lon: number
): Promise<WeatherData | undefined> => {
    const apiKey = process.env.OPENWEATHERMAP_API_KEY;

    if (apiKey === undefined || apiKey.trim() === '') {
        return undefined;
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
    const apiKey = process.env.MOENV_API_KEY;

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

export const fetchAqiSites = async (): Promise<readonly AqiSiteOption[]> => {
    const apiKey = process.env.MOENV_API_KEY;

    if (apiKey === undefined || apiKey.trim() === '') {
        return [];
    }

    const url = buildMoenvUrl(apiKey);
    url.searchParams.set('fields', 'sitename,county,siteid');
    url.searchParams.set('limit', '1000');

    const response = await fetch(url, {
        next: { revalidate: siteListRevalidateSeconds },
    });

    if (!response.ok) {
        throw new Error(`MOENV API responded with status ${response.status}`);
    }

    const payload = (await response.json()) as unknown;

    if (!isRecordArray(payload)) {
        throw new TypeError('MOENV API returned an unexpected payload.');
    }

    return uniqueSites(payload);
};
