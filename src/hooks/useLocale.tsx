import { useCallback, useEffect, useState } from 'react';

import type { AppLocale } from '@/constants/i18n';
import { defaultLocale, getMessages, isAppLocale } from '@/constants/i18n';
import { isBrowser } from '@/utils/browserEnv';

const LOCALE_CHANGE_EVENT = 'homepage-locale-change';
const LOCALE_STORAGE_KEY = 'homepage_locale';

function getInitialLocale(): AppLocale {
    if (!isBrowser()) {
        return defaultLocale;
    }

    const savedLocale = globalThis.localStorage.getItem(LOCALE_STORAGE_KEY);

    return isAppLocale(savedLocale) ? savedLocale : defaultLocale;
}

function getLocaleFromEvent(event: Event): AppLocale | undefined {
    if (!(event instanceof CustomEvent) || !isAppLocale(event.detail)) {
        return undefined;
    }

    return event.detail;
}

export const useLocale = (): {
    locale: AppLocale;
    setLocale: (locale: AppLocale) => void;
    t: ReturnType<typeof getMessages>;
} => {
    const [locale, setLocaleState] = useState(getInitialLocale);

    const setLocale = useCallback((nextLocale: AppLocale) => {
        globalThis.localStorage.setItem(LOCALE_STORAGE_KEY, nextLocale);
        globalThis.document.documentElement.lang = nextLocale;
        setLocaleState(nextLocale);
        globalThis.dispatchEvent(
            new CustomEvent(LOCALE_CHANGE_EVENT, { detail: nextLocale })
        );
    }, []);

    useEffect(() => {
        globalThis.document.documentElement.lang = locale;
    }, [locale]);

    useEffect(() => {
        const onLocaleChange = (event: Event) => {
            const nextLocale = getLocaleFromEvent(event);

            if (nextLocale !== undefined) {
                setLocaleState(nextLocale);
            }
        };

        globalThis.addEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
        return () => {
            globalThis.removeEventListener(LOCALE_CHANGE_EVENT, onLocaleChange);
        };
    }, []);

    return {
        locale,
        setLocale,
        t: getMessages(locale),
    };
};
