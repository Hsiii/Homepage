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
        amethyst: 'Amethyst',
        animations: 'Animations',
        aqi: 'AQI',
        azure: 'Azure',
        bookmarks: 'Bookmarks',
        bookmarksExported: 'Bookmarks exported',
        bookmarksImportEmpty: 'No bookmarks found',
        bookmarksImportFailed: 'Could not import bookmarks',
        bookmarksImported: 'Bookmarks imported',
        bookmarksReset: 'Default bookmarks restored',
        bookmarksStorageFailed: 'Could not save bookmarks',
        dark: 'Dark',
        exportBookmarks: 'Export bookmarks',
        importBookmarks: 'Import bookmarks',
        language: 'Language',
        light: 'Light',
        location: 'Location',
        myLocation: 'My location',
        normal: 'Normal',
        removeWallpaper: 'Remove wallpaper',
        resetBookmarks: 'Reset bookmarks',
        settings: 'Settings',
        skip: 'Skip',
        syncing: 'Syncing',
        skipRiseAnimations: 'Skip rise animations',
        system: 'System',
        theme: 'Theme',
        uploadWallpaper: 'Upload wallpaper',
        useNormalAnimations: 'Use normal animations',
        wallpaper: 'Wallpaper',
        wallpaperUnavailable: 'Sign in to upload wallpaper',
        wallpaperUploading: 'Uploading wallpaper',
    },
    'zh-TW': {
        accent: '強調色',
        amethyst: '紫晶',
        animations: '動畫',
        aqi: 'AQI',
        azure: '天藍',
        bookmarks: '書籤',
        bookmarksExported: '書籤已匯出',
        bookmarksImportEmpty: '找不到書籤',
        bookmarksImportFailed: '無法匯入書籤',
        bookmarksImported: '書籤已匯入',
        bookmarksReset: '已還原預設書籤',
        bookmarksStorageFailed: '無法儲存書籤',
        dark: '深色',
        exportBookmarks: '匯出書籤',
        importBookmarks: '匯入書籤',
        language: '語言',
        light: '淺色',
        location: '位置',
        myLocation: '我的位置',
        normal: '一般',
        removeWallpaper: '移除桌布',
        resetBookmarks: '重設書籤',
        settings: '設定',
        skip: '略過',
        syncing: '同步中',
        skipRiseAnimations: '略過進場動畫',
        system: '系統',
        theme: '主題',
        uploadWallpaper: '上傳桌布',
        useNormalAnimations: '使用一般動畫',
        wallpaper: '桌布',
        wallpaperUnavailable: '登入後上傳桌布',
        wallpaperUploading: '桌布上傳中',
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
