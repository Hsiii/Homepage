import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Languages,
    MapPin,
    Moon,
    Palette,
    Play,
    PlayOff,
    RefreshCw,
    Settings,
    Sun,
} from 'lucide-react';

import { isAppLocale, localeOptions } from '@/constants/i18n';
import { getLocationLabel, taiwanLocations } from '@/constants/taiwanLocations';
import { useLocale } from '@/hooks/useLocale';
import { useTaiwanLocation } from '@/hooks/useTaiwanLocation';

interface ThemeTransitionModule {
    runThemeTransition: (options: {
        button: HTMLButtonElement;
        isDarkMode: boolean;
    }) => boolean;
}

const animationStorageKey = 'animation-mode';
const defaultThemeColor = 'amethyst';
const normalAnimationMode = 'normal';
const skipAnimationMode = 'skip';
const themeColorStorageKey = 'theme-color';

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
    const {
        isSyncingLocation,
        selectLocationId,
        selectedLocation,
        syncCurrentLocation,
    } = useTaiwanLocation();
    const { locale, setLocale, t } = useLocale();
    const [isOpen, setIsOpen] = useState(false);
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

    return (
        <div className='settings-control' ref={menuRef}>
            <button
                className='settings-trigger'
                type='button'
                aria-label={t.settings}
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
                    aria-label={t.settings}
                >
                    <div className='settings-section'>
                        <button
                            className='settings-row settings-action-row'
                            type='button'
                            aria-label={
                                isDarkMode
                                    ? t.switchToLightMode
                                    : t.switchToDarkMode
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
                            <span className='settings-row-label'>
                                {t.theme}
                            </span>
                            <span className='settings-value'>
                                {isDarkMode ? t.dark : t.light}
                            </span>
                        </button>

                        <div className='settings-row'>
                            <span className='settings-row-icon'>
                                <Palette className='icon' size={20} />
                            </span>
                            <span className='settings-row-label'>
                                {t.accent}
                            </span>
                            <div
                                className='settings-swatch-group'
                                role='radiogroup'
                                aria-label={t.accent}
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
                                    ? t.useNormalAnimations
                                    : t.skipRiseAnimations
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
                                {t.animations}
                            </span>
                            <span className='settings-value'>
                                {isSkipAnimation ? t.skip : t.normal}
                            </span>
                        </button>

                        <div className='settings-row settings-location-select-row'>
                            <span className='settings-row-icon'>
                                <MapPin className='icon' size={20} />
                            </span>
                            <label
                                className='settings-row-label'
                                htmlFor='location-picker'
                            >
                                {t.location}
                            </label>
                            <select
                                className='settings-select'
                                id='location-picker'
                                value={selectedLocation.id}
                                onChange={(event) => {
                                    selectLocationId(event.target.value);
                                }}
                            >
                                {taiwanLocations.map((location) => (
                                    <option
                                        key={location.id}
                                        value={location.id}
                                    >
                                        {getLocationLabel(location, locale)}
                                    </option>
                                ))}
                            </select>
                            <button
                                className={[
                                    'settings-icon-action',
                                    isSyncingLocation && 'loading',
                                ]
                                    .filter(Boolean)
                                    .join(' ')}
                                type='button'
                                aria-label={t.useCurrentLocation}
                                title={t.useCurrentLocation}
                                disabled={isSyncingLocation}
                                onClick={() => {
                                    syncCurrentLocation();
                                }}
                            >
                                <RefreshCw className='icon' size={18} />
                            </button>
                        </div>

                        <label
                            className='settings-row settings-select-row'
                            htmlFor='language-picker'
                        >
                            <span className='settings-row-icon'>
                                <Languages className='icon' size={20} />
                            </span>
                            <span className='settings-row-label'>
                                {t.language}
                            </span>
                            <select
                                className='settings-select'
                                id='language-picker'
                                value={locale}
                                onChange={(event) => {
                                    if (isAppLocale(event.target.value)) {
                                        setLocale(event.target.value);
                                    }
                                }}
                            >
                                {localeOptions.map((option) => (
                                    <option
                                        key={option.value}
                                        value={option.value}
                                    >
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                    </div>
                </div>
            ) : undefined}
        </div>
    );
};
