import { fetchWeatherByCoordinates } from '@/server/environmentData';

const defaultCoords = {
    lat: 25.033,
    lon: 121.5654,
};

const weatherCacheControl = 's-maxage=300, stale-while-revalidate=600';

const parseCoordinate = (
    value: string | null,
    defaultValue: number,
    min: number,
    max: number
): number | undefined => {
    const parsedValue = Number.parseFloat(value ?? String(defaultValue));

    if (
        !Number.isFinite(parsedValue) ||
        parsedValue < min ||
        parsedValue > max
    ) {
        return undefined;
    }

    return parsedValue;
};

export const GET = async (request: Request): Promise<Response> => {
    const requestUrl = new URL(request.url);
    const lat = parseCoordinate(
        requestUrl.searchParams.get('lat'),
        defaultCoords.lat,
        -90,
        90
    );
    const lon = parseCoordinate(
        requestUrl.searchParams.get('lon'),
        defaultCoords.lon,
        -180,
        180
    );

    if (lat === undefined || lon === undefined) {
        return Response.json(
            { error: 'Invalid lat/lon parameters. Must be numeric values.' },
            { status: 400 }
        );
    }

    try {
        const payload = await fetchWeatherByCoordinates(lat, lon);

        if (payload === undefined) {
            return Response.json(
                { error: 'OpenWeatherMap API key not configured' },
                { status: 500 }
            );
        }

        return Response.json(payload, {
            headers: {
                'Cache-Control': weatherCacheControl,
            },
        });
    } catch (error) {
        console.error('Weather fetch error:', error);
        return Response.json(
            { error: 'Failed to fetch weather data' },
            { status: 500 }
        );
    }
};

export const OPTIONS = (): Response => new Response(undefined, { status: 204 });
