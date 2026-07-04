import type { CSSProperties, ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import { Quicksand as loadQuicksand } from 'next/font/google';
import { cookies } from 'next/headers';

import '@/index.css';
import '@/components/Controls.css';
import '@/components/Cover.css';
import '@/components/LinkPanel.css';
import '@/components/Main.css';
import '@/components/Mountains.css';
import '@/components/Weather.css';

import type {
    AnimationMode,
    ResolvedTheme,
    ThemeColor,
    ThemeMode,
} from '@/constants/theme';
import {
    animationStorageKey,
    defaultThemeColor,
    isAnimationMode,
    isResolvedTheme,
    isThemeColor,
    isThemeMode,
    normalAnimationMode,
    themeColorStorageKey,
    themePreferenceCookieMaxAgeSeconds,
    themeResolvedStorageKey,
    themeStorageKey,
} from '@/constants/theme';

const clerkPublishableKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;
const quicksand = loadQuicksand({
    display: 'swap',
    subsets: ['latin'],
    variable: '--font-quicksand',
    weight: ['500', '700'],
});

export const metadata: Metadata = {
    description:
        'A fast personal browser homepage for search, bookmarks, weather, and AQI.',
    icons: {
        icon: '/assets/favicon.ico',
    },
    title: 'Homepage',
};

const themeInitScript = `
(function () {
    try {
        var animationStorageKey = ${JSON.stringify(animationStorageKey)};
        var defaultThemeColor = ${JSON.stringify(defaultThemeColor)};
        var themeColorStorageKey = ${JSON.stringify(themeColorStorageKey)};
        var themeResolvedStorageKey = ${JSON.stringify(themeResolvedStorageKey)};
        var themeStorageKey = ${JSON.stringify(themeStorageKey)};
        var cookieMaxAge = ${themePreferenceCookieMaxAgeSeconds};
        var root = document.documentElement;
        var readCookie = function (key) {
            return document.cookie
                .split('; ')
                .reduce(function (value, cookie) {
                    var separatorIndex = cookie.indexOf('=');
                    var cookieKey =
                        separatorIndex === -1
                            ? cookie
                            : cookie.slice(0, separatorIndex);

                    if (value !== null || cookieKey !== key) {
                        return value;
                    }

                    return decodeURIComponent(
                        separatorIndex === -1
                            ? ''
                            : cookie.slice(separatorIndex + 1)
                    );
                }, null);
        };
        var readStorage = function (key) {
            try {
                return localStorage.getItem(key);
            } catch {
                return null;
            }
        };
        var writeCookie = function (key, value) {
            document.cookie =
                key +
                '=' +
                encodeURIComponent(value) +
                '; Path=/; Max-Age=' +
                cookieMaxAge +
                '; SameSite=Lax';
        };
        var clearCookie = function (key) {
            document.cookie = key + '=; Path=/; Max-Age=0; SameSite=Lax';
        };
        var writeStorage = function (key, value) {
            try {
                localStorage.setItem(key, value);
            } catch {}
        };
        var removeStorage = function (key) {
            try {
                localStorage.removeItem(key);
            } catch {}
        };
        var isAnimationMode = function (value) {
            return value === 'normal' || value === 'skip';
        };
        var isThemeColor = function (value) {
            return value === 'amethyst' || value === 'azure';
        };
        var isThemeMode = function (value) {
            return value === 'system' || value === 'light' || value === 'dark';
        };
        var storedAnimationMode = readStorage(animationStorageKey);
        var storedThemeColor = readStorage(themeColorStorageKey);
        var storedThemeMode = readStorage(themeStorageKey);
        var cookieAnimationMode = readCookie(animationStorageKey);
        var cookieThemeColor = readCookie(themeColorStorageKey);
        var cookieThemeMode = readCookie(themeStorageKey);
        var animationMode = isAnimationMode(storedAnimationMode)
            ? storedAnimationMode
            : isAnimationMode(cookieAnimationMode)
              ? cookieAnimationMode
              : 'normal';
        var themeMode = isThemeMode(storedThemeMode)
            ? storedThemeMode
            : isThemeMode(cookieThemeMode)
              ? cookieThemeMode
              : 'system';
        var themeColor = isThemeColor(storedThemeColor)
            ? storedThemeColor
            : isThemeColor(cookieThemeColor)
              ? cookieThemeColor
              : defaultThemeColor;
        var systemDark =
            typeof matchMedia === 'function' &&
            matchMedia('(prefers-color-scheme: dark)').matches;
        var resolvedTheme =
            themeMode === 'dark' || (themeMode === 'system' && systemDark)
                ? 'dark'
                : 'light';

        root.dataset.animationMode = animationMode;
        root.dataset.theme = resolvedTheme;
        root.dataset.themeMode = themeMode;
        root.style.colorScheme = resolvedTheme;
        writeStorage(animationStorageKey, animationMode);
        writeStorage(themeStorageKey, themeMode);
        writeCookie(animationStorageKey, animationMode);
        writeCookie(themeStorageKey, themeMode);
        writeCookie(themeResolvedStorageKey, resolvedTheme);

        if (themeColor === 'azure') {
            root.dataset.themeColor = 'azure';
            writeStorage(themeColorStorageKey, themeColor);
            writeCookie(themeColorStorageKey, themeColor);
        } else {
            delete root.dataset.themeColor;
            removeStorage(themeColorStorageKey);
            clearCookie(themeColorStorageKey);
        }
    } catch {}
})();
`;

interface InitialThemePreferences {
    animationMode: AnimationMode;
    resolvedTheme: ResolvedTheme;
    themeColor?: ThemeColor;
    themeMode: ThemeMode;
}

const getInitialResolvedTheme = (
    themeMode: ThemeMode,
    resolvedThemeCookie: string | undefined
): ResolvedTheme => {
    if (isResolvedTheme(themeMode)) {
        return themeMode;
    }

    if (isResolvedTheme(resolvedThemeCookie)) {
        return resolvedThemeCookie;
    }

    return 'light';
};

const getInitialThemePreferences =
    async (): Promise<InitialThemePreferences> => {
        const cookieStore = await cookies();
        const themeModeCookie = cookieStore.get(themeStorageKey)?.value;
        const resolvedThemeCookie = cookieStore.get(
            themeResolvedStorageKey
        )?.value;
        const animationModeCookie = cookieStore.get(animationStorageKey)?.value;
        const themeColorCookie = cookieStore.get(themeColorStorageKey)?.value;
        const themeMode = isThemeMode(themeModeCookie)
            ? themeModeCookie
            : 'system';
        const resolvedTheme = getInitialResolvedTheme(
            themeMode,
            resolvedThemeCookie
        );
        const themeColor = isThemeColor(themeColorCookie)
            ? themeColorCookie
            : defaultThemeColor;

        return {
            animationMode: isAnimationMode(animationModeCookie)
                ? animationModeCookie
                : normalAnimationMode,
            resolvedTheme,
            themeColor:
                themeColor === defaultThemeColor ? undefined : themeColor,
            themeMode,
        };
    };

export default async function RootLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>): Promise<ReactNode> {
    const themePreferences = await getInitialThemePreferences();
    const htmlStyle = {
        colorScheme: themePreferences.resolvedTheme,
    } satisfies CSSProperties;
    const documentMarkup = (
        <html
            lang='en'
            className={quicksand.variable}
            data-animation-mode={themePreferences.animationMode}
            data-theme={themePreferences.resolvedTheme}
            data-theme-color={themePreferences.themeColor}
            data-theme-mode={themePreferences.themeMode}
            style={htmlStyle}
            suppressHydrationWarning
        >
            <body>
                <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
                {children}
            </body>
        </html>
    );

    if (
        clerkPublishableKey === undefined ||
        clerkPublishableKey.trim() === ''
    ) {
        return documentMarkup;
    }

    return (
        <ClerkProvider publishableKey={clerkPublishableKey}>
            {documentMarkup}
        </ClerkProvider>
    );
}
