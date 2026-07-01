import type { VercelRequest, VercelResponse } from '@vercel/node';

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

interface WeatherPayload {
    main: {
        temp: number;
    };
    weather: Array<{
        main: string;
    }>;
}

interface WeatherLocationPayload {
    name?: string;
    country?: string;
    lat?: number;
    local_names?: Record<string, string>;
    lon?: number;
    state?: string;
}

const allowedOrigins = new Set([
    'https://hsi-homepage.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]);

const defaultCoords = {
    lat: '25.0330',
    lon: '121.5654',
};
const weatherCurrentUrl = 'https://api.openweathermap.org/data/2.5/weather';
const weatherGeocodingUrl = 'https://api.openweathermap.org/geo/1.0/direct';

function setCorsHeaders(request: VercelRequest, response: VercelResponse) {
    const { origin } = request.headers;
    response.setHeader('Vary', 'Origin');

    response.setHeader(
        'Access-Control-Allow-Origin',
        origin !== undefined && allowedOrigins.has(origin)
            ? origin
            : 'https://hsi-homepage.vercel.app'
    );
    response.setHeader('Access-Control-Allow-Credentials', 'true');
    response.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    response.setHeader('Access-Control-Allow-Headers', 'Content-Type, Origin');
}

function parseCoordinate(
    value: string | string[] | undefined,
    defaultValue: string
): string | undefined {
    const raw = Array.isArray(value) ? value[0] : value;
    const str = raw ?? defaultValue;
    const num = Number.parseFloat(str);

    if (Number.isNaN(num)) {
        return undefined;
    }

    return num.toFixed(4);
}

function readQueryString(value: string | string[] | undefined): string {
    const raw = Array.isArray(value) ? value[0] : value;
    return raw?.trim() ?? '';
}

function buildLocationLabel(location: WeatherLocationPayload): string {
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
        label: buildLocationLabel(location),
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

    const url = new URL(weatherGeocodingUrl);
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

// eslint-disable-next-line import-x/no-default-export
export default async function handler(
    request: VercelRequest,
    response: VercelResponse
): Promise<VercelResponse> {
    setCorsHeaders(request, response);

    if (request.method === 'OPTIONS') {
        return response.status(200).end();
    }

    const lat = parseCoordinate(request.query.lat, defaultCoords.lat);
    const lon = parseCoordinate(request.query.lon, defaultCoords.lon);

    if (lat === undefined || lon === undefined) {
        return response.status(400).json({
            error: 'Invalid lat/lon parameters. Must be numeric values.',
        });
    }

    const apiKey = process.env.OPENWEATHERMAP_API_KEY;

    if (apiKey === undefined) {
        return response.status(500).json({
            error: 'OpenWeatherMap API key not configured',
        });
    }

    try {
        if (readQueryString(request.query.mode) === 'locations') {
            const locations = await fetchWeatherLocations(
                readQueryString(request.query.q),
                apiKey
            );

            response.setHeader(
                'Cache-Control',
                's-maxage=86400, stale-while-revalidate=604800'
            );

            return response.status(200).json({ locations });
        }

        const url = `${weatherCurrentUrl}?lat=${lat}&lon=${lon}&units=metric&appid=${apiKey}`;
        const res = await fetch(url);

        if (!res.ok) {
            throw new Error(`Weather API responded with status ${res.status}`);
        }

        const {
            main: { temp },
            weather: [{ main: weatherType }],
        } = (await res.json()) as WeatherPayload;

        const payload: WeatherData = {
            weatherType,
            temp,
        };

        response.setHeader(
            'Cache-Control',
            's-maxage=300, stale-while-revalidate=600'
        );

        return response.status(200).json(payload);
    } catch (error) {
        console.error('Weather fetch error:', error);
        return response
            .status(500)
            .json({ error: 'Failed to fetch weather data' });
    }
}
