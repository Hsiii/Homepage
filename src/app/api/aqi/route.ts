import { fetchAqiData, fetchAqiSites } from '@/server/environmentData';

const aqiCacheControl = 's-maxage=300, stale-while-revalidate=600';
const defaultSiteName = '新竹';
const maxSiteNameLength = 32;
const siteListCacheControl = 's-maxage=3600, stale-while-revalidate=86400';

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
        if (requestUrl.searchParams.get('mode') === 'sites') {
            return Response.json(
                { sites: await fetchAqiSites() },
                {
                    headers: {
                        'Cache-Control': siteListCacheControl,
                    },
                }
            );
        }

        const siteName = parseSiteName(requestUrl.searchParams.get('site'));

        if (siteName === undefined) {
            return Response.json(
                { error: 'Invalid AQI site parameter.' },
                { status: 400 }
            );
        }

        const payload = await fetchAqiData(siteName);

        if (payload === undefined) {
            return Response.json(
                { error: 'MOENV API key not configured' },
                { status: 500 }
            );
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
