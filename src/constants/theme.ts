export const animationStorageKey = 'animation-mode';
export const defaultThemeColor = 'amethyst';
export const normalAnimationMode = 'normal';
export const skipAnimationMode = 'skip';
export const systemThemeQuery = '(prefers-color-scheme: dark)';
export const themeColorStorageKey = 'theme-color';
export const themePreferenceCookieMaxAgeSeconds = 60 * 60 * 24 * 365;
export const themeResolvedStorageKey = 'theme-resolved';
export const themeStorageKey = 'theme';

export const themeColorOptions = [
    {
        labelKey: 'amethyst',
        value: 'amethyst',
    },
    {
        labelKey: 'azure',
        value: 'azure',
    },
] as const;

export type AnimationMode =
    | typeof normalAnimationMode
    | typeof skipAnimationMode;
export type ThemeColor = (typeof themeColorOptions)[number]['value'];
export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = Exclude<ThemeMode, 'system'>;

export const isAnimationMode = (
    value: string | null | undefined
): value is AnimationMode =>
    value === normalAnimationMode || value === skipAnimationMode;

export const isResolvedTheme = (
    value: string | null | undefined
): value is ResolvedTheme => value === 'light' || value === 'dark';

export const isThemeColor = (
    value: string | null | undefined
): value is ThemeColor =>
    themeColorOptions.some((option) => option.value === value);

export const isThemeMode = (
    value: string | null | undefined
): value is ThemeMode => value === 'system' || isResolvedTheme(value);
