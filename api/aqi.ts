import type { VercelRequest, VercelResponse } from '@vercel/node';

export type AqiData = {
    siteName: string;
    county: string;
    aqi: number | undefined;
    status: string;
    pollutant: string | undefined;
    pm25: number | undefined;
    pm10: number | undefined;
    publishTime: string;
};

export type AqiSiteOption = {
    siteName: string;
    county: string;
    siteId: string;
};

type AqiRecord = Readonly<Record<string, unknown>>;

const allowedOrigins = new Set([
    'https://hsi-homepage.vercel.app',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
]);

const defaultSiteName = '新竹';
const moenvAqiUrl = 'https://data.moenv.gov.tw/api/v2/aqx_p_432';

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

function getQueryValue(value: string | string[] | undefined): string {
    return Array.isArray(value) ? (value[0] ?? '') : (value ?? '');
}

function parseSiteName(value: string | string[] | undefined): string {
    const siteName = getQueryValue(value).trim();
    return siteName === '' ? defaultSiteName : siteName;
}

function readString(record: AqiRecord, key: string): string {
    const value = record[key];
    return typeof value === 'string' ? value : '';
}

function readOptionalString(
    record: AqiRecord,
    key: string
): string | undefined {
    const value = readString(record, key).trim();
    return value === '' ? undefined : value;
}

function readNumber(record: AqiRecord, key: string): number | undefined {
    const value = Number.parseFloat(readString(record, key));
    return Number.isNaN(value) ? undefined : value;
}

function buildMoenvUrl(apiKey: string): URL {
    const url = new URL(moenvAqiUrl);
    url.searchParams.set('api_key', apiKey);
    url.searchParams.set('format', 'json');
    return url;
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

function mapAqiRecord(record: AqiRecord): AqiData {
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

function mapSiteOption(record: AqiRecord): AqiSiteOption | undefined {
    const siteName = readString(record, 'sitename');

    if (siteName === '') {
        return undefined;
    }

    return {
        siteName,
        county: readString(record, 'county'),
        siteId: readString(record, 'siteid'),
    };
}

function uniqueSites(records: readonly AqiRecord[]): readonly AqiSiteOption[] {
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

    const apiKey = process.env.MOENV_API_KEY;

    if (apiKey === undefined) {
        return response.status(500).json({
            error: 'MOENV API key not configured',
        });
    }

    try {
        const mode = getQueryValue(request.query.mode);
        const url = buildMoenvUrl(apiKey);

        if (mode === 'sites') {
            url.searchParams.set('fields', 'sitename,county,siteid');
            url.searchParams.set('limit', '1000');

            const records = await fetchMoenvRecords(url);
            response.setHeader(
                'Cache-Control',
                's-maxage=3600, stale-while-revalidate=86400'
            );

            return response.status(200).json({
                sites: uniqueSites(records),
            });
        }

        const siteName = parseSiteName(request.query.site);
        url.searchParams.set('filters', `sitename,EQ,${siteName}`);
        url.searchParams.set('limit', '1');

        const records = await fetchMoenvRecords(url);
        const record = records.at(0);

        if (record === undefined) {
            return response.status(404).json({
                error: `No AQI data found for ${siteName}`,
            });
        }

        response.setHeader(
            'Cache-Control',
            's-maxage=300, stale-while-revalidate=600'
        );

        return response.status(200).json(mapAqiRecord(record));
    } catch (error) {
        console.error('AQI fetch error:', error);
        return response.status(500).json({ error: 'Failed to fetch AQI data' });
    }
}
