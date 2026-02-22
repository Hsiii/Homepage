import type React from 'react';
import { useCallback, useEffect, useState } from 'react';

import { createBlobPath } from './themeTransitionUtils.js';

export const useThemeTransition = (): {
    isDarkMode: boolean;
    toggleTheme: (e: React.MouseEvent<HTMLButtonElement>) => void;
} => {
    const [isDarkMode, setIsDarkMode] = useState(
        () => globalThis.document.documentElement.dataset.theme === 'dark'
    );

    useEffect(() => {
        const root = globalThis.document.documentElement;
        const isDark = root.dataset.theme === 'dark';
        root.style.colorScheme = isDark ? 'dark' : 'light';
        setIsDarkMode(isDark);
    }, []);

    const toggleTheme = useCallback(
        (e: React.MouseEvent<HTMLButtonElement>) => {
            e.stopPropagation();
            const root = globalThis.document.documentElement;
            const nextDarkMode = !isDarkMode;

            const searchElement = globalThis.document.querySelector('.search');
            const searchRect = searchElement?.getBoundingClientRect();
            let wonkyCenterX = globalThis.innerWidth / 2;
            let wonkyCenterY = globalThis.innerHeight / 2;

            if (searchRect) {
                wonkyCenterX = searchRect.left + searchRect.width / 2;
                wonkyCenterY = searchRect.top + searchRect.height / 2;
            }
            const wonkyMaxRadius = Math.hypot(
                Math.max(wonkyCenterX, globalThis.innerWidth - wonkyCenterX),
                Math.max(wonkyCenterY, globalThis.innerHeight - wonkyCenterY)
            );

            const buttonRect = e.currentTarget.getBoundingClientRect();
            const buttonCenterX = buttonRect.left + buttonRect.width / 2;
            const buttonCenterY = buttonRect.top + buttonRect.height / 2;

            root.style.setProperty('--theme-transition-x', `${wonkyCenterX}px`);
            root.style.setProperty('--theme-transition-y', `${wonkyCenterY}px`);
            root.style.setProperty(
                '--theme-transition-end',
                `${wonkyMaxRadius}px`
            );

            const pathFrames = [
                {
                    clipPath: `path('${createBlobPath(wonkyCenterX, wonkyCenterY, 14, 0.2, 1)}')`,
                    offset: 0,
                },
                {
                    clipPath: `path('${createBlobPath(wonkyCenterX, wonkyCenterY, wonkyMaxRadius * 0.2, 1.35, 1)}')`,
                    offset: 0.08,
                },
                {
                    clipPath: `path('${createBlobPath(wonkyCenterX, wonkyCenterY, wonkyMaxRadius * 0.35, 2.4, 1)}')`,
                    offset: 0.18,
                },
                {
                    clipPath: `path('${createBlobPath(wonkyCenterX, wonkyCenterY, wonkyMaxRadius * 0.56, 1.1, 1)}')`,
                    offset: 0.34,
                },
                {
                    clipPath: `path('${createBlobPath(wonkyCenterX, wonkyCenterY, wonkyMaxRadius * 0.84, 2.9, 1)}')`,
                    offset: 0.52,
                },
                {
                    clipPath: `path('${createBlobPath(wonkyCenterX, wonkyCenterY, wonkyMaxRadius * 1.22, 1.7, 1)}')`,
                    offset: 0.72,
                },
                {
                    clipPath: `path('${createBlobPath(wonkyCenterX, wonkyCenterY, wonkyMaxRadius * 1.95, 0, 0)}')`,
                    offset: 1,
                },
            ];

            const applyTheme = () => {
                root.dataset.theme = nextDarkMode ? 'dark' : 'light';
                root.style.colorScheme = nextDarkMode ? 'dark' : 'light';
                globalThis.localStorage.setItem(
                    'theme',
                    nextDarkMode ? 'dark' : 'light'
                );
                setIsDarkMode(nextDarkMode);
            };

            if ('startViewTransition' in globalThis.document) {
                const transition = (
                    globalThis.document as Document & {
                        startViewTransition: (
                            callback: () => void
                        ) => ViewTransition;
                    }
                ).startViewTransition(applyTheme);

                transition.ready
                    .then(() => {
                        const searchIcon =
                            globalThis.document.querySelector(
                                '.search-icon .icon'
                            );
                        const searchIconRect =
                            searchIcon?.getBoundingClientRect();
                        const searchIconCenterX = searchIconRect
                            ? searchIconRect.left + searchIconRect.width / 2
                            : buttonCenterX;
                        const searchIconCenterY = searchIconRect
                            ? searchIconRect.top + searchIconRect.height / 2
                            : buttonCenterY;
                        const circularMaxRadius = Math.hypot(
                            Math.max(
                                searchIconCenterX,
                                globalThis.innerWidth - searchIconCenterX
                            ),
                            Math.max(
                                searchIconCenterY,
                                globalThis.innerHeight - searchIconCenterY
                            )
                        );
                        const circleFrames = [
                            {
                                clipPath: `circle(0px at ${searchIconCenterX}px ${searchIconCenterY}px)`,
                                offset: 0,
                            },
                            {
                                clipPath: `circle(${(circularMaxRadius * 1.16).toFixed(2)}px at ${searchIconCenterX}px ${searchIconCenterY}px)`,
                                offset: 0.78,
                            },
                            {
                                clipPath: `circle(${(circularMaxRadius * 1.05).toFixed(2)}px at ${searchIconCenterX}px ${searchIconCenterY}px)`,
                                offset: 1,
                            },
                        ];

                        root.animate(nextDarkMode ? pathFrames : circleFrames, {
                            duration: nextDarkMode ? 2400 : 1200,
                            easing: nextDarkMode
                                ? 'linear'
                                : 'cubic-bezier(0.34, 1.56, 0.64, 1)',
                            fill: 'both',
                            pseudoElement: '::view-transition-new(root)',
                        });
                    })
                    .catch(() => undefined);
                return;
            }

            applyTheme();
        },
        [isDarkMode]
    );

    return {
        isDarkMode,
        toggleTheme,
    };
};
