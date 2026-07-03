import { fetchAqiData } from '@/server/environmentData';

const aqiCacheControl = 's-maxage=300, stale-while-revalidate=600';
const defaultSiteName = '新竹';
const maxSiteNameLength = 32;

const parseSiteName = (value: string | null): string | undefined => {
    const siteName = (value ?? defaultSiteName).trim();

    if (siteName === '' || siteName.length > maxSiteNameLength) {
        return undefined;
    }

    return siteName;
};

export const GET = async (request: Request): Promise<Response> => {
    const requestUrl = new URL(request.url);

    try {
        const siteName = parseSiteName(requestUrl.searchParams.get('site'));

        if (siteName === undefined) {
            return Response.json(
                { error: 'Invalid AQI site parameter.' },
                { status: 400 }
            );
        }

        const payload = await fetchAqiData(siteName);

        if (payload === undefined) {
            return new Response(undefined, { status: 204 });
        }

        return Response.json(payload, {
            headers: {
                'Cache-Control': aqiCacheControl,
            },
        });
    } catch (error) {
        console.error('AQI fetch error:', error);
        return Response.json(
            { error: 'Failed to fetch AQI data' },
            { status: 500 }
        );
    }
};

export const OPTIONS = (): Response => new Response(undefined, { status: 204 });
