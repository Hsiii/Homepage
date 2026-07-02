import type { AppLocale } from './i18n';

export type TaiwanLocation = {
    id: string;
    county: string;
    aqiSiteName: string;
    lat: number;
    lon: number;
    labels: Record<AppLocale, string>;
};

export const defaultLocationId = 'taipei-city';

export const taiwanLocations = [
    {
        id: 'keelung-city',
        county: '基隆市',
        aqiSiteName: '基隆',
        lat: 25.1276,
        lon: 121.7392,
        labels: {
            'en': 'Keelung',
            'zh-TW': '基隆',
        },
    },
    {
        id: 'taipei-city',
        county: '臺北市',
        aqiSiteName: '中山',
        lat: 25.033,
        lon: 121.5654,
        labels: {
            'en': 'Taipei',
            'zh-TW': '臺北',
        },
    },
    {
        id: 'new-taipei-city',
        county: '新北市',
        aqiSiteName: '板橋',
        lat: 25.011_997,
        lon: 121.465_662,
        labels: {
            'en': 'New Taipei',
            'zh-TW': '新北',
        },
    },
    {
        id: 'taoyuan-city',
        county: '桃園市',
        aqiSiteName: '桃園',
        lat: 24.9937,
        lon: 121.301,
        labels: {
            'en': 'Taoyuan',
            'zh-TW': '桃園',
        },
    },
    {
        id: 'hsinchu-city',
        county: '新竹市',
        aqiSiteName: '新竹',
        lat: 24.8138,
        lon: 120.9675,
        labels: {
            'en': 'Hsinchu',
            'zh-TW': '新竹',
        },
    },
    {
        id: 'miaoli-county',
        county: '苗栗縣',
        aqiSiteName: '苗栗',
        lat: 24.5602,
        lon: 120.8214,
        labels: {
            'en': 'Miaoli',
            'zh-TW': '苗栗',
        },
    },
    {
        id: 'taichung-city',
        county: '臺中市',
        aqiSiteName: '忠明',
        lat: 24.1477,
        lon: 120.6736,
        labels: {
            'en': 'Taichung',
            'zh-TW': '臺中',
        },
    },
    {
        id: 'changhua-county',
        county: '彰化縣',
        aqiSiteName: '彰化',
        lat: 24.0518,
        lon: 120.5161,
        labels: {
            'en': 'Changhua',
            'zh-TW': '彰化',
        },
    },
    {
        id: 'nantou-county',
        county: '南投縣',
        aqiSiteName: '南投',
        lat: 23.9609,
        lon: 120.9719,
        labels: {
            'en': 'Nantou',
            'zh-TW': '南投',
        },
    },
    {
        id: 'yunlin-county',
        county: '雲林縣',
        aqiSiteName: '斗六',
        lat: 23.7092,
        lon: 120.4313,
        labels: {
            'en': 'Yunlin',
            'zh-TW': '雲林',
        },
    },
    {
        id: 'chiayi-city',
        county: '嘉義市',
        aqiSiteName: '嘉義',
        lat: 23.4801,
        lon: 120.4491,
        labels: {
            'en': 'Chiayi',
            'zh-TW': '嘉義',
        },
    },
    {
        id: 'tainan-city',
        county: '臺南市',
        aqiSiteName: '臺南',
        lat: 22.9999,
        lon: 120.227,
        labels: {
            'en': 'Tainan',
            'zh-TW': '臺南',
        },
    },
    {
        id: 'kaohsiung-city',
        county: '高雄市',
        aqiSiteName: '前金',
        lat: 22.6273,
        lon: 120.3014,
        labels: {
            'en': 'Kaohsiung',
            'zh-TW': '高雄',
        },
    },
    {
        id: 'pingtung-county',
        county: '屏東縣',
        aqiSiteName: '屏東',
        lat: 22.551,
        lon: 120.5488,
        labels: {
            'en': 'Pingtung',
            'zh-TW': '屏東',
        },
    },
    {
        id: 'yilan-county',
        county: '宜蘭縣',
        aqiSiteName: '宜蘭',
        lat: 24.7021,
        lon: 121.7378,
        labels: {
            'en': 'Yilan',
            'zh-TW': '宜蘭',
        },
    },
    {
        id: 'hualien-county',
        county: '花蓮縣',
        aqiSiteName: '花蓮',
        lat: 23.9872,
        lon: 121.6015,
        labels: {
            'en': 'Hualien',
            'zh-TW': '花蓮',
        },
    },
    {
        id: 'taitung-county',
        county: '臺東縣',
        aqiSiteName: '臺東',
        lat: 22.7972,
        lon: 121.0714,
        labels: {
            'en': 'Taitung',
            'zh-TW': '臺東',
        },
    },
    {
        id: 'penghu-county',
        county: '澎湖縣',
        aqiSiteName: '馬公',
        lat: 23.5711,
        lon: 119.5793,
        labels: {
            'en': 'Penghu',
            'zh-TW': '澎湖',
        },
    },
    {
        id: 'kinmen-county',
        county: '金門縣',
        aqiSiteName: '金門',
        lat: 24.4321,
        lon: 118.3171,
        labels: {
            'en': 'Kinmen',
            'zh-TW': '金門',
        },
    },
    {
        id: 'lienchiang-county',
        county: '連江縣',
        aqiSiteName: '馬祖',
        lat: 26.1602,
        lon: 119.9517,
        labels: {
            'en': 'Lienchiang',
            'zh-TW': '連江',
        },
    },
] as const satisfies readonly TaiwanLocation[];

const legacyLocationIds = {
    'chiayi-county': 'chiayi-city',
    'hsinchu-county': 'hsinchu-city',
} as const satisfies Record<string, string>;

const legacyAqiSiteLocationIds = {
    朴子: 'chiayi-city',
    竹東: 'hsinchu-city',
} as const satisfies Record<string, string>;

function normalizeLocationName(value: string): string {
    return value
        .toLocaleLowerCase()
        .replace(/\s+(city|county)$/u, '')
        .replace(/[市縣]$/u, '')
        .trim();
}

export function getLocationLabel(
    location: TaiwanLocation,
    locale: AppLocale
): string {
    return location.labels[locale];
}

export function findTaiwanLocation(id: string | undefined): TaiwanLocation {
    const locationId =
        id === undefined || !(id in legacyLocationIds)
            ? id
            : legacyLocationIds[id as keyof typeof legacyLocationIds];

    return (
        taiwanLocations.find((location) => location.id === locationId) ??
        taiwanLocations.find((location) => location.id === defaultLocationId) ??
        taiwanLocations[0]
    );
}

export function findTaiwanLocationByAqiSiteName(
    siteName: string | null
): TaiwanLocation | undefined {
    const location = taiwanLocations.find(
        (candidate) => candidate.aqiSiteName === siteName
    );

    if (location !== undefined || siteName === null) {
        return location;
    }

    if (!(siteName in legacyAqiSiteLocationIds)) {
        return undefined;
    }

    return findTaiwanLocation(
        legacyAqiSiteLocationIds[
            siteName as keyof typeof legacyAqiSiteLocationIds
        ]
    );
}

export function findTaiwanLocationByWeatherName(
    weatherName: string | undefined
): TaiwanLocation | undefined {
    if (weatherName === undefined) {
        return undefined;
    }

    const normalizedName = normalizeLocationName(weatherName);

    return taiwanLocations.find((location) =>
        normalizeLocationName(location.labels.en).startsWith(normalizedName)
    );
}

function getDistanceSquared(
    lat: number,
    lon: number,
    location: TaiwanLocation
): number {
    return (location.lat - lat) ** 2 + (location.lon - lon) ** 2;
}

export function findNearestTaiwanLocation(
    lat: number,
    lon: number
): TaiwanLocation {
    let nearestLocation: TaiwanLocation = taiwanLocations[0];
    let nearestDistance = getDistanceSquared(lat, lon, nearestLocation);

    for (const location of taiwanLocations.slice(1)) {
        const distance = getDistanceSquared(lat, lon, location);

        if (distance < nearestDistance) {
            nearestLocation = location;
            nearestDistance = distance;
        }
    }

    return nearestLocation;
}
