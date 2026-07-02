import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Check,
    ChevronDown,
    Image,
    Monitor,
    Moon,
    Settings,
    Sun,
    Trash2,
    Upload,
    X,
} from 'lucide-react';
import { flushSync } from 'react-dom';

import { isAppLocale, localeOptions } from '@/constants/i18n';
import { getLocationLabel, taiwanLocations } from '@/constants/taiwanLocations';
import { useLocale } from '@/hooks/useLocale';
import { useTaiwanLocation } from '@/hooks/useTaiwanLocation';
import type { WallpaperControls } from '@/hooks/useWallpaper';
import { runThemeTransition } from '@/utils/themeTransition';
import { wallpaperAcceptedContentTypes } from '../../shared/wallpaper';

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
        labelKey: 'amethyst',
        value: 'amethyst',
    },
    {
        labelKey: 'azure',
        value: 'azure',
    },
] as const;

type AnimationMode = typeof normalAnimationMode | typeof skipAnimationMode;
type ThemeColor = (typeof themeColorOptions)[number]['value'];
type ThemeMode = 'system' | 'light' | 'dark';

interface SettingsDropdownOption {
    readonly disabled?: boolean;
    readonly label: string;
    readonly searchText?: string;
    readonly value: string;
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

const isAnimationMode = (value: string | null): value is AnimationMode =>
    value === normalAnimationMode || value === skipAnimationMode;

const isThemeMode = (value: string | null): value is ThemeMode =>
    value === 'system' || value === 'light' || value === 'dark';

const getInitialAnimationMode = (): AnimationMode => {
    const savedAnimationMode =
        globalThis.document.documentElement.dataset.animationMode ??
        globalThis.localStorage.getItem(animationStorageKey);

    return isAnimationMode(savedAnimationMode)
        ? savedAnimationMode
        : normalAnimationMode;
};

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
    const typeaheadRef = useRef('');
    const typeaheadTimeRef = useRef(0);

    const searchMatchingOption = useCallback(
        (key: string) => {
            const now = Date.now();
            if (now - typeaheadTimeRef.current > 700) {
                typeaheadRef.current = '';
            }

            typeaheadRef.current =
                `${typeaheadRef.current}${key}`.toLowerCase();
            typeaheadTimeRef.current = now;

            const matchingOption = options.find((option) => {
                if (option.disabled) {
                    return false;
                }

                const searchText = option.searchText ?? option.label;

                return searchText
                    .toLowerCase()
                    .startsWith(typeaheadRef.current);
            });

            if (matchingOption !== undefined) {
                onChange(matchingOption.value);
                onOpenChange(false);
            }
        },
        [onChange, onOpenChange, options]
    );

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

                    if (
                        event.key.length === 1 &&
                        !event.altKey &&
                        !event.ctrlKey &&
                        !event.metaKey
                    ) {
                        event.preventDefault();
                        searchMatchingOption(event.key);
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
                                <span className='settings-option-label'>
                                    {option.label}
                                </span>
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

interface SettingsMenuProps {
    placement?: 'above' | 'below';
    wallpaperControls?: WallpaperControls;
}

export const SettingsMenu: React.FC<SettingsMenuProps> = ({
    placement = 'below',
    wallpaperControls,
}) => {
    const {
        isSyncingLocation,
        selectLocationId,
        selectedLocation,
        syncCurrentLocation,
    } = useTaiwanLocation();
    const { locale, setLocale, t } = useLocale();
    const [isOpen, setIsOpen] = useState(false);
    const [themeMode, setThemeMode] = useState<ThemeMode>(getInitialThemeMode);
    const [animationMode, setAnimationMode] = useState<AnimationMode>(
        getInitialAnimationMode
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
    const wallpaperInputRef = useRef<HTMLInputElement>(null);

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

    const updateThemeMode = useCallback(
        (nextThemeMode: ThemeMode, button?: HTMLButtonElement) => {
            const root = globalThis.document.documentElement;
            const currentDarkMode =
                (root.dataset.theme ?? resolveThemeMode(themeMode)) === 'dark';
            const nextDarkMode = resolveThemeMode(nextThemeMode) === 'dark';
            let hasCommittedThemeMode = false;

            const commitThemeModeState = () => {
                if (hasCommittedThemeMode) {
                    return;
                }

                hasCommittedThemeMode = true;
                flushSync(() => {
                    setThemeMode(nextThemeMode);
                });
            };

            if (button !== undefined && currentDarkMode !== nextDarkMode) {
                runThemeTransition({
                    button,
                    isDarkMode: currentDarkMode,
                    nextDarkMode,
                    onCommit: commitThemeModeState,
                    themeMode: nextThemeMode,
                });
            } else {
                applyThemeMode(nextThemeMode);
                setThemeMode(nextThemeMode);
            }
        },
        [themeMode]
    );

    const selectThemeColor = useCallback((themeColor: ThemeColor) => {
        applyThemeColor(themeColor);
        setSelectedThemeColor(themeColor);
    }, []);

    const updateAnimationMode = useCallback(
        (nextAnimationMode: AnimationMode) => {
            globalThis.document.documentElement.dataset.animationMode =
                nextAnimationMode;
            globalThis.localStorage.setItem(
                animationStorageKey,
                nextAnimationMode
            );
            setAnimationMode(nextAnimationMode);
        },
        []
    );

    const themeModeOptions: SettingsDropdownOption[] = [
        { label: t.system, value: 'system' },
        { label: t.light, value: 'light' },
        { label: t.dark, value: 'dark' },
    ];

    const locationOptions: SettingsDropdownOption[] = [
        {
            disabled: isSyncingLocation,
            label: isSyncingLocation ? t.syncing : t.myLocation,
            searchText: 'my location',
            value: myLocationOptionValue,
        },
        ...taiwanLocations.map((location) => ({
            label: getLocationLabel(location, locale),
            searchText: getLocationLabel(location, 'en'),
            value: location.id,
        })),
    ];

    const languageOptions: SettingsDropdownOption[] = localeOptions.map(
        (option) => ({
            label: option.label,
            value: option.value,
        })
    );
    const dropdownOptionGroups: ReadonlyArray<
        readonly SettingsDropdownOption[]
    > = [locationOptions, languageOptions];
    const maxDropdownValueLength = Math.max(
        ...dropdownOptionGroups.flatMap((options) =>
            options.map((option) => option.label.length)
        )
    );
    const settingsMenuStyle = {
        '--settings-select-width': `max(10rem, calc(${maxDropdownValueLength}ch + 3rem))`,
    } as React.CSSProperties & Record<'--settings-select-width', string>;

    const getDropdownOpenHandler = (id: string) => (nextIsOpen: boolean) => {
        setOpenDropdownId(nextIsOpen ? id : undefined);
    };
    const wallpaperProgress =
        wallpaperControls?.progress === undefined
            ? undefined
            : Math.round(wallpaperControls.progress);

    return (
        <div className={`settings-control ${placement}`} ref={menuRef}>
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
                <span className='settings-trigger-icons' aria-hidden>
                    <Settings
                        className='settings-trigger-icon settings-trigger-icon-settings'
                        size={20}
                    />
                    <X
                        className='settings-trigger-icon settings-trigger-icon-close'
                        size={20}
                    />
                </span>
            </button>
            {isOpen ? (
                <div
                    className='settings-menu'
                    role='dialog'
                    aria-label={t.settings}
                    style={settingsMenuStyle}
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
                        <div className='settings-row settings-choice-row'>
                            <span className='settings-row-label'>
                                {t.theme}
                            </span>
                            <div
                                className='settings-choice-group settings-theme-group'
                                role='radiogroup'
                                aria-label={t.theme}
                                style={
                                    {
                                        '--settings-theme-index':
                                            themeModeOptions.findIndex(
                                                (option) =>
                                                    option.value === themeMode
                                            ),
                                    } as React.CSSProperties &
                                        Record<'--settings-theme-index', number>
                                }
                            >
                                {themeModeOptions.map((option) => {
                                    const isSelected =
                                        option.value === themeMode;

                                    return (
                                        <button
                                            className={[
                                                'settings-icon-choice',
                                                isSelected && 'selected',
                                            ]
                                                .filter(Boolean)
                                                .join(' ')}
                                            key={option.value}
                                            type='button'
                                            role='radio'
                                            aria-checked={isSelected}
                                            aria-label={option.label}
                                            title={option.label}
                                            onClick={(event) => {
                                                if (isThemeMode(option.value)) {
                                                    updateThemeMode(
                                                        option.value,
                                                        event.currentTarget
                                                    );
                                                }
                                            }}
                                        >
                                            {getThemeModeIcon(
                                                option.value as ThemeMode
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className='settings-section'>
                        <div className='settings-row settings-choice-row'>
                            <span className='settings-row-label'>
                                {t.accent}
                            </span>
                            <div
                                className='settings-choice-group'
                                role='radiogroup'
                                aria-label={t.accent}
                            >
                                {themeColorOptions.map((option) => {
                                    const isSelected =
                                        option.value === selectedThemeColor;

                                    return (
                                        <button
                                            className={[
                                                'settings-color-choice',
                                                `settings-swatch-${option.value}`,
                                                isSelected && 'selected',
                                            ]
                                                .filter(Boolean)
                                                .join(' ')}
                                            key={option.value}
                                            type='button'
                                            role='radio'
                                            aria-checked={isSelected}
                                            aria-label={t[option.labelKey]}
                                            title={t[option.labelKey]}
                                            onClick={() => {
                                                selectThemeColor(option.value);
                                            }}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>

                    <div className='settings-section'>
                        <div className='settings-row settings-choice-row'>
                            <span className='settings-row-label'>
                                {t.animations}
                            </span>
                            <button
                                className='settings-animation-switch'
                                type='button'
                                role='switch'
                                aria-checked={
                                    animationMode === normalAnimationMode
                                }
                                aria-label={t.animations}
                                title={
                                    animationMode === normalAnimationMode
                                        ? t.normal
                                        : t.skip
                                }
                                onClick={() => {
                                    updateAnimationMode(
                                        animationMode === normalAnimationMode
                                            ? skipAnimationMode
                                            : normalAnimationMode
                                    );
                                }}
                            >
                                <span
                                    className='settings-switch-track'
                                    aria-hidden
                                >
                                    <span className='settings-switch-thumb' />
                                </span>
                            </button>
                        </div>
                    </div>

                    {wallpaperControls === undefined ? undefined : (
                        <div className='settings-section'>
                            <div className='settings-row settings-wallpaper-row'>
                                <span className='settings-row-label'>
                                    {t.wallpaper}
                                </span>
                                <div className='settings-wallpaper-actions'>
                                    <input
                                        className='settings-wallpaper-input'
                                        type='file'
                                        accept={wallpaperAcceptedContentTypes.join(
                                            ','
                                        )}
                                        ref={wallpaperInputRef}
                                        onChange={(event) => {
                                            const file =
                                                event.currentTarget.files?.[0];
                                            if (
                                                wallpaperInputRef.current !==
                                                null
                                            ) {
                                                wallpaperInputRef.current.value =
                                                    '';
                                            }

                                            if (file !== undefined) {
                                                wallpaperControls
                                                    .uploadWallpaper(file)
                                                    .catch(() => undefined);
                                            }
                                        }}
                                    />
                                    <button
                                        className={[
                                            'settings-wallpaper-preview',
                                            wallpaperControls.wallpaper !==
                                                undefined && 'has-wallpaper',
                                        ]
                                            .filter(Boolean)
                                            .join(' ')}
                                        type='button'
                                        aria-label={
                                            wallpaperControls.wallpaper ===
                                            undefined
                                                ? t.wallpaper
                                                : `${t.wallpaper}: ${wallpaperControls.wallpaper.width}x${wallpaperControls.wallpaper.height}`
                                        }
                                        title={
                                            wallpaperControls.wallpaper ===
                                            undefined
                                                ? t.wallpaper
                                                : `${wallpaperControls.wallpaper.width}x${wallpaperControls.wallpaper.height}`
                                        }
                                        style={
                                            wallpaperControls.wallpaper ===
                                            undefined
                                                ? undefined
                                                : ({
                                                      '--settings-wallpaper-preview': `url("${wallpaperControls.wallpaper.url}")`,
                                                  } as React.CSSProperties &
                                                      Record<
                                                          '--settings-wallpaper-preview',
                                                          string
                                                      >)
                                        }
                                        disabled
                                    >
                                        <Image className='icon' size={18} />
                                    </button>
                                    <button
                                        className='settings-icon-choice'
                                        type='button'
                                        aria-label={t.uploadWallpaper}
                                        title={
                                            wallpaperControls.isAvailable
                                                ? t.uploadWallpaper
                                                : t.wallpaperUnavailable
                                        }
                                        disabled={
                                            !wallpaperControls.isAvailable ||
                                            wallpaperControls.isBusy
                                        }
                                        onClick={() => {
                                            wallpaperInputRef.current?.click();
                                        }}
                                    >
                                        <Upload className='icon' size={18} />
                                    </button>
                                    <button
                                        className='settings-icon-choice'
                                        type='button'
                                        aria-label={t.removeWallpaper}
                                        title={t.removeWallpaper}
                                        disabled={
                                            wallpaperControls.wallpaper ===
                                                undefined ||
                                            wallpaperControls.isBusy
                                        }
                                        onClick={() => {
                                            wallpaperControls
                                                .clearWallpaper()
                                                .catch(() => undefined);
                                        }}
                                    >
                                        <Trash2 className='icon' size={18} />
                                    </button>
                                </div>
                            </div>
                            {wallpaperControls.isBusy ? (
                                <div
                                    className='settings-wallpaper-meter'
                                    role='progressbar'
                                    aria-label={t.wallpaperUploading}
                                    aria-valuemin={0}
                                    aria-valuemax={100}
                                    aria-valuenow={wallpaperProgress ?? 0}
                                    style={
                                        {
                                            '--settings-wallpaper-progress': `${wallpaperProgress ?? 0}%`,
                                        } as React.CSSProperties &
                                            Record<
                                                '--settings-wallpaper-progress',
                                                string
                                            >
                                    }
                                />
                            ) : undefined}
                            {wallpaperControls.error ===
                            undefined ? undefined : (
                                <div
                                    className='settings-wallpaper-status'
                                    role='status'
                                >
                                    {wallpaperControls.error}
                                </div>
                            )}
                        </div>
                    )}

                    <div className='settings-section'>
                        <div className='settings-row settings-select-row'>
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
