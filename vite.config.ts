import type { IncomingMessage, ServerResponse } from 'node:http';
import react from '@vitejs/plugin-react';
import type { Plugin, ViteDevServer } from 'vite';
import { defineConfig, loadEnv } from 'vite';

type AqiRecord = Readonly<Record<string, unknown>>;
type WeatherPayload = {
    main?: {
        temp?: number;
    };
    weather?: readonly {
        main?: string;
    }[];
};
type WeatherLocation = {
    name: string;
    country: string;
    label: string;
    lat: number;
    lon: number;
    localName?: string;
    state?: string;
};
type WeatherLocationPayload = {
    name?: string;
    country?: string;
    lat?: number;
    local_names?: Record<string, string>;
    lon?: number;
    state?: string;
};

const defaultAqiSiteName = '新竹';
const defaultWeatherCoords = {
    lat: '25.0330',
    lon: '121.5654',
};
const moenvAqiUrl = 'https://data.moenv.gov.tw/api/v2/aqx_p_432';
const openWeatherUrl = 'https://api.openweathermap.org/data/2.5/weather';
const openWeatherGeocodingUrl = 'https://api.openweathermap.org/geo/1.0/direct';

function getRequestUrl(request: IncomingMessage): URL {
    return new URL(request.url ?? '/', 'http://localhost');
}

function readString(record: AqiRecord, key: string): string {
    const value = record[key];
    return typeof value === 'string' ? value : '';
}

function readNumber(record: AqiRecord, key: string): number | undefined {
    const value = Number.parseFloat(readString(record, key));
    return Number.isNaN(value) ? undefined : value;
}

function readOptionalString(
    record: AqiRecord,
    key: string
): string | undefined {
    const value = readString(record, key).trim();
    return value === '' ? undefined : value;
}

function parseCoordinate(
    value: string | null,
    defaultValue: string
): string | undefined {
    const str = value ?? defaultValue;
    const num = Number.parseFloat(str);

    if (Number.isNaN(num)) {
        return undefined;
    }

    return num.toFixed(4);
}

function writeJson(
    response: ServerResponse,
    statusCode: number,
    payload: unknown
) {
    response.statusCode = statusCode;
    response.setHeader('Content-Type', 'application/json');
    response.end(JSON.stringify(payload));
}

function isRecordArray(value: unknown): value is readonly AqiRecord[] {
    return (
        Array.isArray(value) &&
        value.every((record) => typeof record === 'object' && record !== null)
    );
}

async function fetchMoenvRecords(url: URL): Promise<readonly AqiRecord[]> {
    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`MOENV API responded with status ${res.status}`);
    }

    const payload = (await res.json()) as unknown;

    if (!isRecordArray(payload)) {
        throw new Error('MOENV API returned an unexpected payload');
    }

    return payload;
}

function buildMoenvUrl(apiKey: string): URL {
    const url = new URL(moenvAqiUrl);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('format', 'json');
    return url;
}

function mapAqiRecord(record: AqiRecord) {
    return {
        siteName: readString(record, 'sitename'),
        county: readString(record, 'county'),
        aqi: readNumber(record, 'aqi'),
        status: readString(record, 'status'),
        pollutant: readOptionalString(record, 'pollutant'),
        pm25: readNumber(record, 'pm2.5'),
        pm10: readNumber(record, 'pm10'),
        publishTime: readString(record, 'publishtime'),
    };
}

function mapSiteOption(record: AqiRecord) {
    return {
        siteName: readString(record, 'sitename'),
        county: readString(record, 'county'),
        siteId: readString(record, 'siteid'),
    };
}

function buildWeatherLocationLabel(location: WeatherLocationPayload): string {
    return [location.name, location.state, location.country]
        .filter((part) => part !== undefined && part !== '')
        .join(', ');
}

function mapWeatherLocation(
    location: WeatherLocationPayload
): WeatherLocation | undefined {
    if (
        location.name === undefined ||
        location.country === undefined ||
        location.lat === undefined ||
        location.lon === undefined
    ) {
        return undefined;
    }

    return {
        name: location.name,
        country: location.country,
        label: buildWeatherLocationLabel(location),
        lat: location.lat,
        lon: location.lon,
        localName:
            location.local_names?.en ??
            location.local_names?.zh_tw ??
            location.local_names?.zh ??
            location.local_names?.ascii,
        state: location.state,
    };
}

async function fetchWeatherLocations(
    query: string,
    apiKey: string
): Promise<readonly WeatherLocation[]> {
    if (query.length < 2) {
        return [];
    }

    const url = new URL(openWeatherGeocodingUrl);
    url.searchParams.set('q', query);
    url.searchParams.set('limit', '5');
    url.searchParams.set('appid', apiKey);

    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`Geocoding API responded with status ${res.status}`);
    }

    const payload = (await res.json()) as unknown;

    if (!Array.isArray(payload)) {
        throw new TypeError('Geocoding API returned an unexpected payload');
    }

    return payload
        .map((location) =>
            typeof location === 'object' && location !== null
                ? mapWeatherLocation(location as WeatherLocationPayload)
                : undefined
        )
        .filter(
            (location): location is WeatherLocation => location !== undefined
        );
}

function uniqueSites(
    records: readonly AqiRecord[]
): readonly ReturnType<typeof mapSiteOption>[] {
    const sites = new Map<string, ReturnType<typeof mapSiteOption>>();

    for (const record of records) {
        const site = mapSiteOption(record);
        if (site.siteName !== '') {
            sites.set(site.siteName, site);
        }
    }

    return [...sites.values()].toSorted((a, b) =>
        `${a.county}${a.siteName}`.localeCompare(`${b.county}${b.siteName}`)
    );
}

async function handleAqiDevRequest(
    request: IncomingMessage,
    response: ServerResponse,
    apiKey: string | undefined
) {
    if (request.method === 'OPTIONS') {
        writeJson(response, 200, {});
        return;
    }

    if (request.method !== 'GET') {
        writeJson(response, 405, { error: 'Method not allowed' });
        return;
    }

    if (apiKey === undefined) {
        writeJson(response, 500, { error: 'MOENV API key not configured' });
        return;
    }

    const requestUrl = getRequestUrl(request);
    const url = buildMoenvUrl(apiKey);

    if (requestUrl.searchParams.get('mode') === 'sites') {
        url.searchParams.set('fields', 'sitename,county,siteid');
        url.searchParams.set('limit', '1000');

        const records = await fetchMoenvRecords(url);
        writeJson(response, 200, { sites: uniqueSites(records) });
        return;
    }

    const siteName =
        requestUrl.searchParams.get('site')?.trim() ?? defaultAqiSiteName;
    url.searchParams.set(
        'filters',
        `sitename,EQ,${siteName === '' ? defaultAqiSiteName : siteName}`
    );
    url.searchParams.set('limit', '1');

    const records = await fetchMoenvRecords(url);
    const record = records.at(0);

    if (record === undefined) {
        writeJson(response, 404, { error: 'AQI site not found' });
        return;
    }

    writeJson(response, 200, mapAqiRecord(record));
}

async function handleWeatherDevRequest(
    request: IncomingMessage,
    response: ServerResponse,
    apiKey: string | undefined
) {
    if (request.method === 'OPTIONS') {
        writeJson(response, 200, {});
        return;
    }

    if (request.method !== 'GET') {
        writeJson(response, 405, { error: 'Method not allowed' });
        return;
    }

    if (apiKey === undefined) {
        writeJson(response, 500, {
            error: 'OpenWeatherMap API key not configured',
        });
        return;
    }

    const requestUrl = getRequestUrl(request);

    if (requestUrl.searchParams.get('mode') === 'locations') {
        const locations = await fetchWeatherLocations(
            requestUrl.searchParams.get('q')?.trim() ?? '',
            apiKey
        );

        writeJson(response, 200, { locations });
        return;
    }

    const lat = parseCoordinate(
        requestUrl.searchParams.get('lat'),
        defaultWeatherCoords.lat
    );
    const lon = parseCoordinate(
        requestUrl.searchParams.get('lon'),
        defaultWeatherCoords.lon
    );

    if (lat === undefined || lon === undefined) {
        writeJson(response, 400, {
            error: 'Invalid lat/lon parameters. Must be numeric values.',
        });
        return;
    }

    const url = new URL(openWeatherUrl);
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lon);
    url.searchParams.set('units', 'metric');
    url.searchParams.set('appid', apiKey);

    const res = await fetch(url);

    if (!res.ok) {
        throw new Error(`Weather API responded with status ${res.status}`);
    }

    const payload = (await res.json()) as WeatherPayload;
    const weatherType = payload.weather?.at(0)?.main;
    const temp = payload.main?.temp;

    if (weatherType === undefined || temp === undefined) {
        throw new Error('Weather API returned an unexpected payload');
    }

    writeJson(response, 200, {
        weatherType,
        temp,
    });
}

function createAqiDevApi(apiKey: string | undefined): Plugin {
    return {
        name: 'aqi-dev-api',
        configureServer(server: ViteDevServer) {
            server.middlewares.use('/api/aqi', (request, response) => {
                handleAqiDevRequest(request, response, apiKey).catch(
                    (error: unknown) => {
                        console.error('AQI dev proxy error:', error);
                        writeJson(response, 500, {
                            error: 'Failed to fetch AQI data',
                        });
                    }
                );
            });
        },
    };
}

function createWeatherDevApi(apiKey: string | undefined): Plugin {
    return {
        name: 'weather-dev-api',
        configureServer(server: ViteDevServer) {
            server.middlewares.use('/api/weather', (request, response) => {
                handleWeatherDevRequest(request, response, apiKey).catch(
                    (error: unknown) => {
                        console.error('Weather dev proxy error:', error);
                        writeJson(response, 500, {
                            error: 'Failed to fetch weather data',
                        });
                    }
                );
            });
        },
    };
}

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, process.cwd(), '');

    return {
        base: '/',
        plugins: [
            react(),
            createAqiDevApi(env.MOENV_API_KEY),
            createWeatherDevApi(env.OPENWEATHERMAP_API_KEY),
        ],
        resolve: {
            alias: {
                '@': '/src',
            },
        },
        server: {
            watch: {
                ignored: ['**/api/**'],
            },
            fs: {
                deny: ['api/**'],
            },
            port: 3000,
        },
        preview: {
            port: 3000,
        },
        optimizeDeps: {
            exclude: ['api'],
        },
        build: {
            rollupOptions: {
                output: {
                    entryFileNames: 'assets/[name]-[hash].js',
                    chunkFileNames: 'assets/[name]-[hash].js',
                    assetFileNames: 'assets/[name]-[hash].[ext]',
                },
            },
        },
    };
});
