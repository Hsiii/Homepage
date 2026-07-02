import { useCallback, useEffect, useState } from 'react';

import type { TaiwanLocation } from '@/constants/taiwanLocations';
import {
    findNearestTaiwanLocation,
    findTaiwanLocation,
    findTaiwanLocationByAqiSiteName,
    findTaiwanLocationByWeatherName,
} from '@/constants/taiwanLocations';

const LOCATION_CHANGE_EVENT = 'homepage-location-change';
const LOCATION_STORAGE_KEY = 'homepage_location_id';
const LEGACY_AQI_SITE_STORAGE_KEY = 'aqi_site';
const LEGACY_WEATHER_LOCATION_STORAGE_KEY = 'weather_location';
const locationSyncTimeout = 10_000;
const unsupportedGeolocationPermission = 'unsupported';

export type GeolocationPermissionState =
    | PermissionState
    | typeof unsupportedGeolocationPermission;

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

function getLegacyWeatherName(): string | undefined {
    const savedLocation = readJson(LEGACY_WEATHER_LOCATION_STORAGE_KEY);

    if (typeof savedLocation !== 'object' || savedLocation === null) {
        return undefined;
    }

    const location = savedLocation as {
        label?: unknown;
        name?: unknown;
    };

    if (typeof location.name === 'string') {
        return location.name;
    }

    if (typeof location.label === 'string') {
        return location.label.split(',').at(0);
    }

    return undefined;
}

function getInitialLocation(): TaiwanLocation {
    const savedLocation = globalThis.localStorage.getItem(LOCATION_STORAGE_KEY);

    if (savedLocation !== null) {
        return findTaiwanLocation(savedLocation);
    }

    const legacyAqiLocation = findTaiwanLocationByAqiSiteName(
        globalThis.localStorage.getItem(LEGACY_AQI_SITE_STORAGE_KEY)
    );

    if (legacyAqiLocation !== undefined) {
        return legacyAqiLocation;
    }

    return (
        findTaiwanLocationByWeatherName(getLegacyWeatherName()) ??
        findTaiwanLocation(undefined)
    );
}

function getLocationFromEvent(event: Event): TaiwanLocation | undefined {
    if (
        !(event instanceof CustomEvent) ||
        typeof event.detail !== 'object' ||
        event.detail === null
    ) {
        return undefined;
    }

    const { id } = event.detail as { id?: unknown };

    return typeof id === 'string' ? findTaiwanLocation(id) : undefined;
}

export const useTaiwanLocation = (): {
    selectedLocation: TaiwanLocation;
    geolocationPermission: GeolocationPermissionState;
    isGeolocationAvailable: boolean;
    isSyncingLocation: boolean;
    lastLocationSyncSucceededAt: number | undefined;
    selectLocationId: (locationId: string) => void;
    syncCurrentLocation: () => void;
} => {
    const [selectedLocation, setSelectedLocation] =
        useState(getInitialLocation);
    const [geolocationPermission, setGeolocationPermission] =
        useState<GeolocationPermissionState>(
            'geolocation' in navigator
                ? 'prompt'
                : unsupportedGeolocationPermission
        );
    const [isSyncingLocation, setIsSyncingLocation] = useState(false);
    const [lastLocationSyncSucceededAt, setLastLocationSyncSucceededAt] =
        useState<number>();

    const selectLocation = useCallback((location: TaiwanLocation) => {
        globalThis.localStorage.setItem(LOCATION_STORAGE_KEY, location.id);
        setSelectedLocation(location);
        globalThis.dispatchEvent(
            new CustomEvent(LOCATION_CHANGE_EVENT, { detail: location })
        );
    }, []);

    const selectLocationId = useCallback(
        (locationId: string) => {
            selectLocation(findTaiwanLocation(locationId));
        },
        [selectLocation]
    );

    const syncCurrentLocation = useCallback(() => {
        if (!('geolocation' in navigator)) {
            setGeolocationPermission(unsupportedGeolocationPermission);
            return;
        }

        setIsSyncingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                selectLocation(findNearestTaiwanLocation(latitude, longitude));
                setGeolocationPermission('granted');
                setIsSyncingLocation(false);
                setLastLocationSyncSucceededAt(Date.now());
            },
            (error) => {
                console.error(error);
                if (error.code === error.PERMISSION_DENIED) {
                    setGeolocationPermission('denied');
                }
                setIsSyncingLocation(false);
            },
            {
                maximumAge: 30 * 60 * 1000,
                timeout: locationSyncTimeout,
            }
        );
    }, [selectLocation]);

    useEffect(() => {
        if (!('geolocation' in navigator)) {
            setGeolocationPermission(unsupportedGeolocationPermission);
            return undefined;
        }

        if (!('permissions' in navigator)) {
            return undefined;
        }

        let permissionStatus: PermissionStatus | undefined;
        let isSubscribed = true;
        const updatePermission = () => {
            if (permissionStatus !== undefined) {
                setGeolocationPermission(permissionStatus.state);
            }
        };

        navigator.permissions
            .query({ name: 'geolocation' })
            .then((status) => {
                if (!isSubscribed) {
                    return;
                }

                permissionStatus = status;
                updatePermission();
                permissionStatus.addEventListener('change', updatePermission);
            })
            .catch(console.error);

        return () => {
            isSubscribed = false;
            permissionStatus?.removeEventListener('change', updatePermission);
        };
    }, []);

    useEffect(() => {
        const onLocationChange = (event: Event) => {
            const location = getLocationFromEvent(event);

            if (location !== undefined) {
                setSelectedLocation(location);
            }
        };

        globalThis.addEventListener(LOCATION_CHANGE_EVENT, onLocationChange);
        return () => {
            globalThis.removeEventListener(
                LOCATION_CHANGE_EVENT,
                onLocationChange
            );
        };
    }, []);

    return {
        selectedLocation,
        geolocationPermission,
        isGeolocationAvailable: geolocationPermission !== 'unsupported',
        isSyncingLocation,
        lastLocationSyncSucceededAt,
        selectLocationId,
        syncCurrentLocation,
    };
};
