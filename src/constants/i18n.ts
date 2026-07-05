export const defaultLocale = 'en';
export const localeCookieName = 'homepage_locale';
export const localeStorageKey = 'homepage_locale';

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
        addBookmark: 'Add',
        addCategory: 'Add category',
        addFolder: 'Add folder',
        bookmarkTitle: 'Title',
        bookmarkUrl: 'URL',
        bookmarkUrlInvalid: 'Enter a valid URL',
        bookmarks: 'Bookmarks',
        bookmarksCleared: 'Bookmarks cleared',
        bookmarksEmpty: 'No bookmarks yet',
        bookmarksExported: 'Bookmarks exported',
        bookmarksImportEmpty: 'No bookmarks found',
        bookmarksImportFailed: 'Could not import bookmarks',
        bookmarksImported: 'Bookmarks imported',
        bookmarksReset: 'Default bookmarks restored',
        bookmarksStorageFailed: 'Could not save bookmarks',
        bookmarksSyncFailed: 'Saved on this device only',
        cancel: 'Cancel',
        categories: 'Categories',
        categoryIcon: 'Icon',
        categoryName: 'Name',
        dark: 'Dark',
        deleteBookmark: 'Delete bookmark',
        deleteCategory: 'Delete category',
        deleteCategoryConfirm: 'Delete this category?',
        editBookmark: 'Edit bookmark',
        editCategory: 'Edit category',
        editFolder: 'Edit folder',
        exportBookmarks: 'Export bookmarks',
        deleteFolder: 'Delete folder',
        folderName: 'Folder name',
        folders: 'Folders',
        importBookmarks: 'Import bookmarks',
        language: 'Language',
        light: 'Light',
        location: 'Location',
        manageBookmarks: 'Manage bookmarks',
        myLocation: 'My location',
        normal: 'Normal',
        removeWallpaper: 'Remove wallpaper',
        resetBookmarks: 'Reset bookmarks',
        save: 'Save',
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
        addBookmark: '新增',
        addCategory: '新增分類',
        addFolder: '新增資料夾',
        bookmarkTitle: '標題',
        bookmarkUrl: '網址',
        bookmarkUrlInvalid: '請輸入有效網址',
        bookmarks: '書籤',
        bookmarksCleared: '書籤已清除',
        bookmarksEmpty: '尚無書籤',
        bookmarksExported: '書籤已匯出',
        bookmarksImportEmpty: '找不到書籤',
        bookmarksImportFailed: '無法匯入書籤',
        bookmarksImported: '書籤已匯入',
        bookmarksReset: '已還原預設書籤',
        bookmarksStorageFailed: '無法儲存書籤',
        bookmarksSyncFailed: '僅儲存在此裝置',
        cancel: '取消',
        categories: '分類',
        categoryIcon: '圖示',
        categoryName: '名稱',
        dark: '深色',
        deleteBookmark: '刪除書籤',
        deleteCategory: '刪除分類',
        deleteCategoryConfirm: '刪除此分類？',
        editBookmark: '編輯書籤',
        editCategory: '編輯分類',
        editFolder: '編輯資料夾',
        exportBookmarks: '匯出書籤',
        deleteFolder: '刪除資料夾',
        folderName: '資料夾名稱',
        folders: '資料夾',
        importBookmarks: '匯入書籤',
        language: '語言',
        light: '淺色',
        location: '位置',
        manageBookmarks: '管理書籤',
        myLocation: '我的位置',
        normal: '一般',
        removeWallpaper: '移除桌布',
        resetBookmarks: '重設書籤',
        save: '儲存',
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

export function isAppLocale(
    value: string | null | undefined
): value is AppLocale {
    return localeOptions.some((option) => option.value === value);
}

export function getMessages(locale: AppLocale): I18nMessages {
    return messages[locale];
}

export function getDateLocale(locale: AppLocale): string {
    return locale === 'zh-TW' ? 'zh-TW' : 'en-US';
}
