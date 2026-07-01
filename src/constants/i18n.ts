export const defaultLocale = 'en';

export const localeOptions = [
    {
        label: 'English',
        value: 'en',
    },
    {
        label: '繁體中文',
        value: 'zh-TW',
    },
] as const;

export type AppLocale = (typeof localeOptions)[number]['value'];

const messages = {
    'en': {
        accent: 'Accent',
        animations: 'Animations',
        aqi: 'AQI',
        dark: 'Dark',
        language: 'Language',
        light: 'Light',
        location: 'Location',
        normal: 'Normal',
        settings: 'Settings',
        skip: 'Skip',
        skipRiseAnimations: 'Skip rise animations',
        switchToDarkMode: 'Switch to dark mode',
        switchToLightMode: 'Switch to light mode',
        theme: 'Theme',
        useCurrentLocation: 'Sync current location',
        useNormalAnimations: 'Use normal animations',
    },
    'zh-TW': {
        accent: '強調色',
        animations: '動畫',
        aqi: 'AQI',
        dark: '深色',
        language: '語言',
        light: '淺色',
        location: '位置',
        normal: '一般',
        settings: '設定',
        skip: '略過',
        skipRiseAnimations: '略過進場動畫',
        switchToDarkMode: '切換到深色模式',
        switchToLightMode: '切換到淺色模式',
        theme: '主題',
        useCurrentLocation: '同步目前位置',
        useNormalAnimations: '使用一般動畫',
    },
} as const satisfies Record<AppLocale, Record<string, string>>;

export type I18nMessages = (typeof messages)[AppLocale];

export function isAppLocale(value: string | null): value is AppLocale {
    return localeOptions.some((option) => option.value === value);
}

export function getMessages(locale: AppLocale): I18nMessages {
    return messages[locale];
}

export function getDateLocale(locale: AppLocale): string {
    return locale === 'zh-TW' ? 'zh-TW' : 'en-US';
}
