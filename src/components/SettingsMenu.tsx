import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    ChevronDown,
    Languages,
    MapPin,
    Monitor,
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

const animationStorageKey = 'animation-mode';
const defaultThemeColor = 'amethyst';
const normalAnimationMode = 'normal';
const skipAnimationMode = 'skip';
const themeStorageKey = 'theme';
const themeColorStorageKey = 'theme-color';
const systemThemeQuery = '(prefers-color-scheme: dark)';

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
type ThemeMode = 'system' | 'light' | 'dark';

const isThemeColor = (value: string | null): value is ThemeColor =>
    themeColorOptions.some((option) => option.value === value);

const isThemeMode = (value: string | null): value is ThemeMode =>
    value === 'system' || value === 'light' || value === 'dark';

const getInitialThemeMode = (): ThemeMode => {
    const savedThemeMode = globalThis.localStorage.getItem(themeStorageKey);

    return isThemeMode(savedThemeMode) ? savedThemeMode : 'system';
};

const getSystemTheme = (): Exclude<ThemeMode, 'system'> =>
    globalThis.matchMedia(systemThemeQuery).matches ? 'dark' : 'light';

const resolveThemeMode = (
    themeMode: ThemeMode
): Exclude<ThemeMode, 'system'> =>
    themeMode === 'system' ? getSystemTheme() : themeMode;

const applyResolvedTheme = (
    theme: Exclude<ThemeMode, 'system'>,
    themeMode: ThemeMode
) => {
    const root = globalThis.document.documentElement;

    root.dataset.theme = theme;
    root.dataset.themeMode = themeMode;
    root.style.colorScheme = theme;
};

const applyThemeMode = (themeMode: ThemeMode) => {
    globalThis.localStorage.setItem(themeStorageKey, themeMode);
    applyResolvedTheme(resolveThemeMode(themeMode), themeMode);
};

const getThemeModeIcon = (themeMode: ThemeMode) => {
    if (themeMode === 'system') {
        return <Monitor className='icon' size={20} />;
    }

    return themeMode === 'dark' ? (
        <Moon className='icon' size={20} />
    ) : (
        <Sun className='icon' size={20} />
    );
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
    const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);
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
        if (themeMode !== 'system') {
            return undefined;
        }

        const mediaQuery = globalThis.matchMedia(systemThemeQuery);
        const updateSystemTheme = () => {
            applyResolvedTheme(getSystemTheme(), 'system');
        };

        updateSystemTheme();
        mediaQuery.addEventListener('change', updateSystemTheme);

        return () => {
            mediaQuery.removeEventListener('change', updateSystemTheme);
        };
    }, [themeMode]);

    const updateThemeMode = useCallback((nextThemeMode: ThemeMode) => {
        applyThemeMode(nextThemeMode);
        setThemeMode(nextThemeMode);
    }, []);

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
                        <label
                            className='settings-row settings-select-row'
                            htmlFor='theme-picker'
                        >
                            <span className='settings-row-icon'>
                                {getThemeModeIcon(themeMode)}
                            </span>
                            <span className='settings-row-label'>
                                {t.theme}
                            </span>
                            <span className='settings-select-control'>
                                <select
                                    className='settings-select'
                                    id='theme-picker'
                                    value={themeMode}
                                    onChange={(event) => {
                                        if (isThemeMode(event.target.value)) {
                                            updateThemeMode(event.target.value);
                                        }
                                    }}
                                >
                                    <option value='system'>{t.system}</option>
                                    <option value='light'>{t.light}</option>
                                    <option value='dark'>{t.dark}</option>
                                </select>
                                <ChevronDown
                                    className='settings-select-chevron'
                                    size={16}
                                    aria-hidden
                                />
                            </span>
                        </label>

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
                    </div>

                    <div className='settings-section settings-location-section'>
                        <div className='settings-row settings-label-row'>
                            <span className='settings-row-icon'>
                                <MapPin className='icon' size={20} />
                            </span>
                            <label
                                className='settings-row-label'
                                htmlFor='location-picker'
                            >
                                {t.location}
                            </label>
                        </div>
                        <div className='settings-row settings-field-row'>
                            <span className='settings-select-control settings-select-control-full'>
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
                                <ChevronDown
                                    className='settings-select-chevron'
                                    size={16}
                                    aria-hidden
                                />
                            </span>
                        </div>
                        <button
                            className='settings-row settings-action-row'
                            type='button'
                            aria-label={t.useCurrentLocation}
                            title={t.useCurrentLocation}
                            disabled={isSyncingLocation}
                            onClick={() => {
                                syncCurrentLocation();
                            }}
                        >
                            <span className='settings-row-icon'>
                                <RefreshCw
                                    className={[
                                        'icon',
                                        isSyncingLocation && 'loading',
                                    ]
                                        .filter(Boolean)
                                        .join(' ')}
                                    size={20}
                                />
                            </span>
                            <span className='settings-row-label'>
                                {t.useCurrentLocation}
                            </span>
                            {isSyncingLocation ? (
                                <span className='settings-value'>
                                    {t.syncing}
                                </span>
                            ) : undefined}
                        </button>
                    </div>

                    <div className='settings-section'>
                        <div className='settings-row settings-label-row'>
                            <span className='settings-row-icon'>
                                <Languages className='icon' size={20} />
                            </span>
                            <label
                                className='settings-row-label'
                                htmlFor='language-picker'
                            >
                                {t.language}
                            </label>
                        </div>
                        <div className='settings-row settings-field-row'>
                            <span className='settings-select-control settings-select-control-full'>
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
                                <ChevronDown
                                    className='settings-select-chevron'
                                    size={16}
                                    aria-hidden
                                />
                            </span>
                        </div>
                    </div>
                </div>
            ) : undefined}
        </div>
    );
};
