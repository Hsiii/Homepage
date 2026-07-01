import React, {
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import {
    CloudSun,
    Gauge,
    HelpCircle,
    LocateFixed,
    Moon,
    Palette,
    Play,
    PlayOff,
    Settings,
    Sun,
} from 'lucide-react';

import { useAqi } from '@/hooks/useAqi';
import type { WeatherLocation } from '@/hooks/useWeather';
import { useWeather } from '@/hooks/useWeather';

import './Help.css';

interface ThemeTransitionModule {
    runThemeTransition: (options: {
        button: HTMLButtonElement;
        isDarkMode: boolean;
    }) => boolean;
}

const loadHelpDialog = async () => await import('./HelpDialog');

const HelpDialog = lazy(
    async () =>
        await loadHelpDialog().then((module) => ({
            default: module.HelpDialog,
        }))
);

const animationStorageKey = 'animation-mode';
const defaultThemeColor = 'amethyst';
const normalAnimationMode = 'normal';
const skipAnimationMode = 'skip';
const themeColorStorageKey = 'theme-color';
const weatherLocationSearchDelay = 300;
const weatherLocationSearchMinLength = 2;

const themeColorOptions = [
    {
        label: 'Amethyst',
        value: 'amethyst',
    },
    {
        label: 'Azure',
        value: 'azure',
    },
] as const;

type ThemeColor = (typeof themeColorOptions)[number]['value'];

const isThemeColor = (value: string | null): value is ThemeColor =>
    themeColorOptions.some((option) => option.value === value);

const applyThemeImmediately = (isDarkMode: boolean): boolean => {
    const nextDarkMode = !isDarkMode;
    const nextTheme = nextDarkMode ? 'dark' : 'light';
    const root = globalThis.document.documentElement;

    root.dataset.theme = nextTheme;
    root.style.colorScheme = nextTheme;
    globalThis.localStorage.setItem('theme', nextTheme);

    return nextDarkMode;
};

const applyThemeColor = (themeColor: ThemeColor) => {
    const root = globalThis.document.documentElement;

    if (themeColor === defaultThemeColor) {
        delete root.dataset.themeColor;
        globalThis.localStorage.removeItem(themeColorStorageKey);
        return;
    }

    root.dataset.themeColor = themeColor;
    globalThis.localStorage.setItem(themeColorStorageKey, themeColor);
};

export const SettingsMenu: React.FC = () => {
    const { isSitesLoading, selectedSiteName, selectSiteName, siteOptions } =
        useAqi();
    const {
        fetchWeatherByCurrentLocation,
        isLoading: isWeatherLoading,
        searchWeatherLocations,
        selectedLocation: selectedWeatherLocation,
        selectWeatherLocation,
    } = useWeather();
    const [isOpen, setIsOpen] = useState(false);
    const [isHelpOpen, setIsHelpOpen] = useState(false);
    const [isMouseMode, setIsMouseMode] = useState(true);
    const [weatherLocationQuery, setWeatherLocationQuery] = useState('');
    const [weatherLocationOptions, setWeatherLocationOptions] = useState<
        readonly WeatherLocation[]
    >([]);
    const [isWeatherLocationLoading, setIsWeatherLocationLoading] =
        useState(false);
    const [isDarkMode, setIsDarkMode] = useState(
        () => globalThis.document.documentElement.dataset.theme === 'dark'
    );
    const [isSkipAnimation, setIsSkipAnimation] = useState(
        () =>
            globalThis.document.documentElement.dataset.animationMode ===
            skipAnimationMode
    );
    const [selectedThemeColor, setSelectedThemeColor] = useState<ThemeColor>(
        () => {
            const savedThemeColor =
                globalThis.localStorage.getItem(themeColorStorageKey);

            return isThemeColor(savedThemeColor)
                ? savedThemeColor
                : defaultThemeColor;
        }
    );
    const menuRef = useRef<HTMLDivElement>(null);
    const themeTransitionLoaderRef = useRef<
        Promise<ThemeTransitionModule> | undefined
    >(undefined);
    const selectedSite = siteOptions.find(
        (site) => site.siteName === selectedSiteName
    );

    const loadThemeTransition =
        useCallback(async (): Promise<ThemeTransitionModule> => {
            themeTransitionLoaderRef.current ??=
                import('@/utils/themeTransition');

            return await themeTransitionLoaderRef.current;
        }, []);

    const preloadThemeTransition = useCallback(() => {
        loadThemeTransition().catch(() => undefined);
        return undefined;
    }, [loadThemeTransition]);

    const preloadHelpDialog = useCallback(() => {
        loadHelpDialog().catch(() => undefined);
        return undefined;
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const onClickOutside = (e: MouseEvent) => {
            if (menuRef.current?.contains(e.target as Node) === false) {
                setIsOpen(false);
            }
        };

        globalThis.document.addEventListener('click', onClickOutside);
        return () => {
            globalThis.document.removeEventListener('click', onClickOutside);
        };
    }, [isOpen]);

    useEffect(() => {
        const query = weatherLocationQuery.trim();

        if (!isOpen || query.length < weatherLocationSearchMinLength) {
            setWeatherLocationOptions([]);
            setIsWeatherLocationLoading(false);
            return undefined;
        }

        let isCancelled = false;
        const timeoutHandle = globalThis.setTimeout(
            () => {
                setIsWeatherLocationLoading(true);
                searchWeatherLocations(query)
                    .then((locations) => {
                        if (!isCancelled) {
                            setWeatherLocationOptions(locations);
                        }
                    })
                    .catch((error: unknown) => {
                        console.error(error);
                        if (!isCancelled) {
                            setWeatherLocationOptions([]);
                        }
                    })
                    .finally(() => {
                        if (!isCancelled) {
                            setIsWeatherLocationLoading(false);
                        }
                    });
            },
            weatherLocationSearchDelay,
            undefined
        );

        return () => {
            isCancelled = true;
            globalThis.clearTimeout(timeoutHandle);
        };
    }, [isOpen, searchWeatherLocations, weatherLocationQuery]);

    const toggleTheme = useCallback(
        async (event: React.MouseEvent<HTMLButtonElement>) => {
            const button = event.currentTarget;

            try {
                const { runThemeTransition } = await loadThemeTransition();
                const nextDarkMode = runThemeTransition({
                    button,
                    isDarkMode,
                });

                setIsDarkMode(nextDarkMode);
            } catch {
                setIsDarkMode(applyThemeImmediately(isDarkMode));
            }
        },
        [isDarkMode, loadThemeTransition]
    );

    const selectThemeColor = useCallback((themeColor: ThemeColor) => {
        applyThemeColor(themeColor);
        setSelectedThemeColor(themeColor);
    }, []);

    const updateAnimationMode = useCallback((nextSkipAnimation: boolean) => {
        const nextAnimationMode = nextSkipAnimation
            ? skipAnimationMode
            : normalAnimationMode;

        globalThis.document.documentElement.dataset.animationMode =
            nextAnimationMode;
        globalThis.localStorage.setItem(animationStorageKey, nextAnimationMode);
        setIsSkipAnimation(nextSkipAnimation);
    }, []);

    const clearWeatherLocationSearch = useCallback(() => {
        setWeatherLocationQuery('');
        setWeatherLocationOptions([]);
        setIsWeatherLocationLoading(false);
    }, []);

    const chooseWeatherLocation = useCallback(
        (location: WeatherLocation) => {
            selectWeatherLocation(location);
            clearWeatherLocationSearch();
        },
        [clearWeatherLocationSearch, selectWeatherLocation]
    );

    return (
        <div className='settings-control' ref={menuRef}>
            <button
                className='settings-trigger'
                type='button'
                aria-label='Settings'
                aria-expanded={isOpen}
                onClick={(event) => {
                    event.stopPropagation();
                    setIsOpen(!isOpen);
                }}
            >
                <Settings className='icon' />
            </button>
            {isOpen ? (
                <div
                    className='settings-menu'
                    role='dialog'
                    aria-label='Settings'
                >
                    <div className='settings-section'>
                        <button
                            className='settings-row settings-action-row'
                            type='button'
                            aria-label={
                                isDarkMode
                                    ? 'Switch to light mode'
                                    : 'Switch to dark mode'
                            }
                            onFocus={preloadThemeTransition}
                            onMouseEnter={preloadThemeTransition}
                            onClick={(event) => {
                                toggleTheme(event).catch(() => undefined);
                            }}
                        >
                            <span className='settings-row-icon'>
                                {isDarkMode ? (
                                    <Moon className='icon' size={20} />
                                ) : (
                                    <Sun className='icon' size={20} />
                                )}
                            </span>
                            <span className='settings-row-label'>Theme</span>
                            <span className='settings-value'>
                                {isDarkMode ? 'Dark' : 'Light'}
                            </span>
                        </button>

                        <div className='settings-row'>
                            <span className='settings-row-icon'>
                                <Palette className='icon' size={20} />
                            </span>
                            <span className='settings-row-label'>Accent</span>
                            <div
                                className='settings-swatch-group'
                                role='radiogroup'
                                aria-label='Accent'
                            >
                                {themeColorOptions.map((option) => (
                                    <button
                                        className={[
                                            'settings-swatch',
                                            `settings-swatch-${option.value}`,
                                            selectedThemeColor ===
                                                option.value && 'selected',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                        key={option.value}
                                        type='button'
                                        role='radio'
                                        aria-checked={
                                            selectedThemeColor === option.value
                                        }
                                        aria-label={option.label}
                                        title={option.label}
                                        onClick={() => {
                                            selectThemeColor(option.value);
                                        }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className='settings-section'>
                        <button
                            className='settings-row settings-action-row'
                            type='button'
                            aria-label={
                                isSkipAnimation
                                    ? 'Use normal animations'
                                    : 'Skip rise animations'
                            }
                            onClick={() => {
                                updateAnimationMode(!isSkipAnimation);
                            }}
                        >
                            <span className='settings-row-icon'>
                                {isSkipAnimation ? (
                                    <PlayOff className='icon' size={20} />
                                ) : (
                                    <Play className='icon' size={20} />
                                )}
                            </span>
                            <span className='settings-row-label'>
                                Animations
                            </span>
                            <span className='settings-value'>
                                {isSkipAnimation ? 'Skip' : 'Normal'}
                            </span>
                        </button>

                        <div className='settings-row settings-location-row'>
                            <span className='settings-row-icon'>
                                <CloudSun className='icon' size={20} />
                            </span>
                            <label
                                className='settings-row-label'
                                htmlFor='weather-location-picker'
                            >
                                Weather
                            </label>
                            <input
                                className='settings-input'
                                id='weather-location-picker'
                                type='search'
                                value={weatherLocationQuery}
                                placeholder={selectedWeatherLocation.label}
                                autoComplete='off'
                                spellCheck={false}
                                onChange={(event) => {
                                    setWeatherLocationQuery(event.target.value);
                                }}
                            />
                            <button
                                className='settings-icon-action'
                                type='button'
                                aria-label='Use current location'
                                title='Use current location'
                                disabled={isWeatherLoading}
                                onClick={() => {
                                    fetchWeatherByCurrentLocation();
                                    clearWeatherLocationSearch();
                                }}
                            >
                                <LocateFixed className='icon' size={18} />
                            </button>
                        </div>
                        <span className='settings-hint'>
                            {selectedWeatherLocation.label}
                        </span>
                        {weatherLocationOptions.length > 0 ? (
                            <div
                                className='settings-location-results'
                                role='listbox'
                                aria-label='Weather locations'
                            >
                                {weatherLocationOptions.map((location) => (
                                    <button
                                        className='settings-location-option'
                                        key={`${location.lat}-${location.lon}-${location.label}`}
                                        type='button'
                                        role='option'
                                        aria-selected={
                                            location.lat ===
                                                selectedWeatherLocation.lat &&
                                            location.lon ===
                                                selectedWeatherLocation.lon
                                        }
                                        onClick={() => {
                                            chooseWeatherLocation(location);
                                        }}
                                    >
                                        <span>{location.label}</span>
                                        {location.localName !== undefined &&
                                        location.localName !== location.name ? (
                                            <span className='settings-location-local'>
                                                {location.localName}
                                            </span>
                                        ) : undefined}
                                    </button>
                                ))}
                            </div>
                        ) : undefined}
                        {isWeatherLocationLoading ? (
                            <span className='settings-hint'>Searching</span>
                        ) : undefined}

                        <label
                            className='settings-row settings-select-row'
                            htmlFor='aqi-district-picker'
                        >
                            <span className='settings-row-icon'>
                                <Gauge className='icon' size={20} />
                            </span>
                            <span className='settings-row-label'>AQI</span>
                            <select
                                className='settings-select'
                                id='aqi-district-picker'
                                value={selectedSiteName}
                                disabled={isSitesLoading}
                                onChange={(event) => {
                                    selectSiteName(event.target.value);
                                }}
                            >
                                {siteOptions.map((site) => (
                                    <option
                                        key={site.siteId || site.siteName}
                                        value={site.siteName}
                                    >
                                        {site.county} {site.siteName}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <span className='settings-hint'>
                            {selectedSite?.county ?? ''} {selectedSiteName}
                        </span>
                    </div>

                    <div className='settings-section settings-help-section'>
                        <button
                            className='settings-row settings-action-row'
                            type='button'
                            aria-label='Help'
                            aria-expanded={isHelpOpen}
                            onFocus={preloadHelpDialog}
                            onMouseEnter={preloadHelpDialog}
                            onClick={() => {
                                if (!isHelpOpen) {
                                    preloadHelpDialog();
                                }
                                setIsHelpOpen(!isHelpOpen);
                            }}
                        >
                            <span className='settings-row-icon'>
                                <HelpCircle className='icon' size={20} />
                            </span>
                            <span className='settings-row-label'>Help</span>
                            <span className='settings-value'>
                                {isHelpOpen ? 'Open' : 'Closed'}
                            </span>
                        </button>
                        {isHelpOpen ? (
                            <div className='settings-help-panel'>
                                <Suspense fallback={undefined}>
                                    <HelpDialog
                                        isMouseMode={isMouseMode}
                                        onSelectKeyboardMode={() => {
                                            setIsMouseMode(false);
                                        }}
                                        onSelectMouseMode={() => {
                                            setIsMouseMode(true);
                                        }}
                                    />
                                </Suspense>
                            </div>
                        ) : undefined}
                    </div>
                </div>
            ) : undefined}
        </div>
    );
};
