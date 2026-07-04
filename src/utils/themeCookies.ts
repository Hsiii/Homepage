import { themePreferenceCookieMaxAgeSeconds } from '@/constants/theme';

export const clearPreferenceCookie = (key: string): void => {
    // eslint-disable-next-line unicorn/no-document-cookie -- Cookie Store API is not available in all target browsers.
    globalThis.document.cookie = `${key}=; Path=/; Max-Age=0; SameSite=Lax`;
};

export const writePreferenceCookie = (key: string, value: string): void => {
    // eslint-disable-next-line unicorn/no-document-cookie -- Cookie Store API is not available in all target browsers.
    globalThis.document.cookie = `${key}=${encodeURIComponent(value)}; Path=/; Max-Age=${themePreferenceCookieMaxAgeSeconds}; SameSite=Lax`;
};
