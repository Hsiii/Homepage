import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Check,
    ChevronDown,
    Languages,
    MapPin,
    Monitor,
    Moon,
    Palette,
    Play,
    PlayOff,
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
const myLocationOptionValue = 'my-location';

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

interface SettingsDropdownOption {
    disabled?: boolean;
    label: string;
    value: string;
}

interface SettingsDropdownProps {
    id: string;
    isOpen: boolean;
    labelledBy: string;
    onChange: (value: string) => void;
    onOpenChange: (isOpen: boolean) => void;
    options: SettingsDropdownOption[];
    value: string;
}

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

const SettingsDropdown: React.FC<SettingsDropdownProps> = ({
    id,
    isOpen,
    labelledBy,
    onChange,
    onOpenChange,
    options,
    value,
}) => {
    const selectedOption =
        options.find((option) => option.value === value) ?? options[0];

    return (
        <span
            className={['settings-select-control', isOpen && 'open']
                .filter(Boolean)
                .join(' ')}
        >
            <button
                className='settings-select'
                type='button'
                id={id}
                aria-haspopup='listbox'
                aria-expanded={isOpen}
                aria-controls={`${id}-listbox`}
                aria-labelledby={labelledBy}
                onClick={() => {
                    onOpenChange(!isOpen);
                }}
                onKeyDown={(event) => {
                    if (event.key === 'Escape') {
                        event.preventDefault();
                        onOpenChange(false);
                    }

                    if (event.key === 'ArrowDown' && !isOpen) {
                        event.preventDefault();
                        onOpenChange(true);
                    }
                }}
            >
                <span className='settings-select-value'>
                    {selectedOption.label}
                </span>
                <ChevronDown
                    className='settings-select-chevron'
                    size={16}
                    aria-hidden
                />
            </button>
            {isOpen ? (
                <div
                    className='settings-dropdown'
                    id={`${id}-listbox`}
                    role='listbox'
                    aria-labelledby={labelledBy}
                >
                    {options.map((option) => {
                        const isSelected = option.value === value;

                        return (
                            <button
                                className='settings-dropdown-option'
                                type='button'
                                role='option'
                                aria-selected={isSelected}
                                data-value={option.value}
                                disabled={option.disabled}
                                key={option.value}
                                onClick={() => {
                                    if (option.disabled) {
                                        return;
                                    }

                                    onChange(option.value);
                                    onOpenChange(false);
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Escape') {
                                        event.preventDefault();
                                        onOpenChange(false);
                                    }
                                }}
                            >
                                <span>{option.label}</span>
                                {isSelected ? (
                                    <Check
                                        className='settings-dropdown-check'
                                        size={16}
                                        aria-hidden
                                    />
                                ) : undefined}
                            </button>
                        );
                    })}
                </div>
            ) : undefined}
        </span>
    );
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
    const [openDropdownId, setOpenDropdownId] = useState<string>();
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
        if (!isOpen) {
            setOpenDropdownId(undefined);
        }
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

    const themeModeOptions: SettingsDropdownOption[] = [
        { label: t.system, value: 'system' },
        { label: t.light, value: 'light' },
        { label: t.dark, value: 'dark' },
    ];

    const locationOptions: SettingsDropdownOption[] = [
        {
            disabled: isSyncingLocation,
            label: isSyncingLocation ? t.syncing : t.myLocation,
            value: myLocationOptionValue,
        },
        ...taiwanLocations.map((location) => ({
            label: getLocationLabel(location, locale),
            value: location.id,
        })),
    ];

    const languageOptions: SettingsDropdownOption[] = localeOptions.map(
        (option) => ({
            label: option.label,
            value: option.value,
        })
    );

    const getDropdownOpenHandler = (id: string) => (nextIsOpen: boolean) => {
        setOpenDropdownId(nextIsOpen ? id : undefined);
    };

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
                    onClickCapture={(event) => {
                        const { target } = event;

                        if (
                            target instanceof Element &&
                            !target.closest('.settings-select-control')
                        ) {
                            setOpenDropdownId(undefined);
                        }
                    }}
                >
                    <div className='settings-section'>
                        <div className='settings-row settings-select-row'>
                            <span className='settings-row-icon'>
                                {getThemeModeIcon(themeMode)}
                            </span>
                            <span
                                className='settings-row-label'
                                id='theme-picker-label'
                            >
                                {t.theme}
                            </span>
                            <SettingsDropdown
                                id='theme-picker'
                                labelledBy='theme-picker-label'
                                value={themeMode}
                                options={themeModeOptions}
                                isOpen={openDropdownId === 'theme-picker'}
                                onOpenChange={getDropdownOpenHandler(
                                    'theme-picker'
                                )}
                                onChange={(nextThemeMode) => {
                                    if (isThemeMode(nextThemeMode)) {
                                        updateThemeMode(nextThemeMode);
                                    }
                                }}
                            />
                        </div>

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

                    <div className='settings-section'>
                        <div className='settings-row settings-select-row'>
                            <span className='settings-row-icon'>
                                <MapPin className='icon' size={20} />
                            </span>
                            <span
                                className='settings-row-label'
                                id='location-picker-label'
                            >
                                {t.location}
                            </span>
                            <SettingsDropdown
                                id='location-picker'
                                labelledBy='location-picker-label'
                                value={selectedLocation.id}
                                options={locationOptions}
                                isOpen={openDropdownId === 'location-picker'}
                                onOpenChange={getDropdownOpenHandler(
                                    'location-picker'
                                )}
                                onChange={(nextLocationId) => {
                                    if (
                                        nextLocationId === myLocationOptionValue
                                    ) {
                                        syncCurrentLocation();
                                        return;
                                    }

                                    selectLocationId(nextLocationId);
                                }}
                            />
                        </div>
                    </div>

                    <div className='settings-section'>
                        <div className='settings-row settings-select-row'>
                            <span className='settings-row-icon'>
                                <Languages className='icon' size={20} />
                            </span>
                            <span
                                className='settings-row-label'
                                id='language-picker-label'
                            >
                                {t.language}
                            </span>
                            <SettingsDropdown
                                id='language-picker'
                                labelledBy='language-picker-label'
                                value={locale}
                                options={languageOptions}
                                isOpen={openDropdownId === 'language-picker'}
                                onOpenChange={getDropdownOpenHandler(
                                    'language-picker'
                                )}
                                onChange={(nextLocale) => {
                                    if (isAppLocale(nextLocale)) {
                                        setLocale(nextLocale);
                                    }
                                }}
                            />
                        </div>
                    </div>
                </div>
            ) : undefined}
        </div>
    );
};
