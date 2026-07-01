import { useCallback, useEffect, useState } from 'react';

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

interface CachedAqi {
    data: AqiData;
    siteName: string;
    timestamp: number;
}

interface CachedAqiSites {
    sites: readonly AqiSiteOption[];
    timestamp: number;
}

const DEFAULT_AQI_SITE_NAME = '新竹';
const AQI_SITE_STORAGE_KEY = 'aqi_site';
const AQI_SITES_CACHE_KEY = 'aqi_sites_cache';
const AQI_CACHE_KEY_PREFIX = 'aqi_cache';
const AQI_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
const AQI_SITES_CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
const BASE_API_URL = '/api/aqi';
const defaultSiteOptions: readonly AqiSiteOption[] = [
    {
        siteName: DEFAULT_AQI_SITE_NAME,
        county: '新竹市',
        siteId: '24',
    },
];

function readJson(key: string): unknown {
    const value = globalThis.localStorage.getItem(key);

    if (value === null) {
        return undefined;
    }

    try {
        return JSON.parse(value) as unknown;
    } catch {
        return undefined;
    }
}

function getAqiCacheKey(siteName: string): string {
    return `${AQI_CACHE_KEY_PREFIX}_${siteName}`;
}

function isCacheFresh(timestamp: number, ttl: number): boolean {
    return Date.now() - timestamp < ttl;
}

function getInitialSiteName(): string {
    return (
        globalThis.localStorage.getItem(AQI_SITE_STORAGE_KEY) ??
        DEFAULT_AQI_SITE_NAME
    );
}

function getCachedAqi(siteName: string): AqiData | undefined {
    const cached = readJson(getAqiCacheKey(siteName)) as CachedAqi | undefined;

    if (
        cached === undefined ||
        cached.siteName !== siteName ||
        !isCacheFresh(cached.timestamp, AQI_CACHE_TTL)
    ) {
        return undefined;
    }

    return cached.data;
}

function getCachedSites(): readonly AqiSiteOption[] | undefined {
    const cached = readJson(AQI_SITES_CACHE_KEY) as CachedAqiSites | undefined;

    if (
        cached === undefined ||
        !isCacheFresh(cached.timestamp, AQI_SITES_CACHE_TTL)
    ) {
        return undefined;
    }

    return cached.sites;
}

export const useAqi = (): {
    aqi: AqiData | undefined;
    siteOptions: readonly AqiSiteOption[];
    selectedSiteName: string;
    isLoading: boolean;
    isSitesLoading: boolean;
    refreshAqi: () => void;
    selectSiteName: (siteName: string) => void;
} => {
    const [selectedSiteName, setSelectedSiteName] =
        useState(getInitialSiteName);
    const [aqi, setAqi] = useState<AqiData | undefined>(() =>
        getCachedAqi(selectedSiteName)
    );
    const [siteOptions, setSiteOptions] = useState<readonly AqiSiteOption[]>(
        () => getCachedSites() ?? defaultSiteOptions
    );
    const [isLoading, setIsLoading] = useState(false);
    const [isSitesLoading, setIsSitesLoading] = useState(false);

    const fetchAqi = useCallback(async (siteName: string) => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams({ site: siteName });
            const res = await fetch(`${BASE_API_URL}?${params.toString()}`);

            if (!res.ok) {
                throw new Error('Failed to fetch AQI data');
            }

            const data = (await res.json()) as AqiData;
            const cache: CachedAqi = {
                data,
                siteName,
                timestamp: Date.now(),
            };
            globalThis.localStorage.setItem(
                getAqiCacheKey(siteName),
                JSON.stringify(cache)
            );
            setAqi(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const fetchSites = useCallback(async () => {
        setIsSitesLoading(true);
        try {
            const res = await fetch(`${BASE_API_URL}?mode=sites`);

            if (!res.ok) {
                throw new Error('Failed to fetch AQI sites');
            }

            const { sites } = (await res.json()) as {
                sites: readonly AqiSiteOption[];
            };

            if (sites.length > 0) {
                const cache: CachedAqiSites = {
                    sites,
                    timestamp: Date.now(),
                };
                globalThis.localStorage.setItem(
                    AQI_SITES_CACHE_KEY,
                    JSON.stringify(cache)
                );
                setSiteOptions(sites);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSitesLoading(false);
        }
    }, []);

    const selectSiteName = useCallback((siteName: string) => {
        globalThis.localStorage.setItem(AQI_SITE_STORAGE_KEY, siteName);
        setSelectedSiteName(siteName);
    }, []);

    const refreshAqi = useCallback(() => {
        fetchAqi(selectedSiteName).catch(console.error);
    }, [fetchAqi, selectedSiteName]);

    useEffect(() => {
        const cached = getCachedSites();

        if (cached !== undefined) {
            setSiteOptions(cached);
            return;
        }

        fetchSites().catch(console.error);
    }, [fetchSites]);

    useEffect(() => {
        const cached = getCachedAqi(selectedSiteName);

        if (cached !== undefined) {
            setAqi(cached);
            return;
        }

        setAqi(undefined);
        fetchAqi(selectedSiteName).catch(console.error);
    }, [fetchAqi, selectedSiteName]);

    return {
        aqi,
        siteOptions,
        selectedSiteName,
        isLoading,
        isSitesLoading,
        refreshAqi,
        selectSiteName,
    };
};
