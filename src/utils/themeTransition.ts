import type { ThemeMode } from '@/constants/theme';
import { themeResolvedStorageKey, themeStorageKey } from '@/constants/theme';
import { createBlobPath } from '@/hooks/themeTransitionUtils';
import { writePreferenceCookie } from '@/utils/themeCookies';

interface ThemeTransitionOptions {
    button: HTMLButtonElement;
    isDarkMode: boolean;
    nextDarkMode?: boolean;
    onCommit?: () => void;
    themeMode?: ThemeMode;
}

const applyTheme = (
    nextDarkMode: boolean,
    themeMode: ThemeTransitionOptions['themeMode'],
    onCommit?: ThemeTransitionOptions['onCommit']
) => {
    const nextTheme = nextDarkMode ? 'dark' : 'light';
    const root = globalThis.document.documentElement;

    root.dataset.theme = nextTheme;
    if (themeMode !== undefined) {
        root.dataset.themeMode = themeMode;
    }
    root.style.colorScheme = nextTheme;
    globalThis.localStorage.setItem(themeStorageKey, themeMode ?? nextTheme);
    writePreferenceCookie(themeStorageKey, themeMode ?? nextTheme);
    writePreferenceCookie(themeResolvedStorageKey, nextTheme);
    onCommit?.();
};

export const runThemeTransition = ({
    button,
    isDarkMode,
    nextDarkMode: requestedNextDarkMode,
    onCommit,
    themeMode,
}: ThemeTransitionOptions): boolean => {
    const darkTheme = 'dark';
    const lightTheme = 'light';
    const searchSelector = '.search';
    const searchIconSelector = '.search-icon .icon';
    const transitionXVar = '--theme-transition-x';
    const transitionYVar = '--theme-transition-y';
    const transitionEndVar = '--theme-transition-end';
    const blobStartRadius = 14;
    const blobStartIrregularity = 0.2;
    const blobFrameConfigs = [
        { radiusMultiplier: 0.2, irregularity: 1.35, offset: 0.08 },
        { radiusMultiplier: 0.35, irregularity: 2.4, offset: 0.18 },
        { radiusMultiplier: 0.56, irregularity: 1.1, offset: 0.34 },
        { radiusMultiplier: 0.84, irregularity: 2.9, offset: 0.52 },
        { radiusMultiplier: 1.22, irregularity: 1.7, offset: 0.72 },
        { radiusMultiplier: 1.95, irregularity: 0, offset: 1 },
    ];
    const circleScalePeak = 1.16;
    const circleScaleEnd = 1.05;
    const circleMidScale = 0.52;
    const circleMidOffset = 0.56;
    const darkModeDuration = 1600;
    const lightModeDuration = 800;
    const darkModeEasing = 'linear';
    const lightBaseEasing = 'linear';
    const lightMidExpandEasing = 'cubic-bezier(0.33, 0.6, 0.4, 1)';
    const lightFinalExpandEasing = 'cubic-bezier(0.16, 0.9, 0.22, 1)';

    const root = globalThis.document.documentElement;
    const nextDarkMode = requestedNextDarkMode ?? !isDarkMode;
    const nextTheme = nextDarkMode ? darkTheme : lightTheme;
    const searchElement = globalThis.document.querySelector(searchSelector);
    const searchRect = searchElement?.getBoundingClientRect();
    let transitionCenterX = globalThis.innerWidth / 2;
    let transitionCenterY = globalThis.innerHeight / 2;

    if (searchRect) {
        transitionCenterX = searchRect.left + searchRect.width / 2;
        transitionCenterY = searchRect.top + searchRect.height / 2;
    }

    const transitionMaxRadius = Math.hypot(
        Math.max(transitionCenterX, globalThis.innerWidth - transitionCenterX),
        Math.max(transitionCenterY, globalThis.innerHeight - transitionCenterY)
    );

    const buttonRect = button.getBoundingClientRect();
    const buttonCenterX = buttonRect.left + buttonRect.width / 2;
    const buttonCenterY = buttonRect.top + buttonRect.height / 2;

    root.style.setProperty(transitionXVar, `${transitionCenterX}px`);
    root.style.setProperty(transitionYVar, `${transitionCenterY}px`);
    root.style.setProperty(transitionEndVar, `${transitionMaxRadius}px`);

    const pathFrames = [
        {
            clipPath: `path('${createBlobPath(transitionCenterX, transitionCenterY, blobStartRadius, blobStartIrregularity, 1)}')`,
            offset: 0,
        },
        ...blobFrameConfigs.map(
            ({ radiusMultiplier, irregularity, offset }) => ({
                clipPath: `path('${createBlobPath(transitionCenterX, transitionCenterY, transitionMaxRadius * radiusMultiplier, irregularity, 1)}')`,
                offset,
            })
        ),
    ];

    const commitTheme = () => {
        root.dataset.theme = nextTheme;
        if (themeMode !== undefined) {
            root.dataset.themeMode = themeMode;
        }
        root.style.colorScheme = nextTheme;
        globalThis.localStorage.setItem(
            themeStorageKey,
            themeMode ?? nextTheme
        );
        writePreferenceCookie(themeStorageKey, themeMode ?? nextTheme);
        writePreferenceCookie(themeResolvedStorageKey, nextTheme);
        onCommit?.();
    };

    if ('startViewTransition' in globalThis.document) {
        const transition = (
            globalThis.document as Document & {
                startViewTransition: (callback: () => void) => ViewTransition;
            }
        ).startViewTransition(commitTheme);

        transition.ready
            .then(() => {
                const searchIcon =
                    globalThis.document.querySelector(searchIconSelector);
                const searchIconRect = searchIcon?.getBoundingClientRect();
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
                        easing: lightMidExpandEasing,
                    },
                    {
                        clipPath: `circle(${(circularMaxRadius * circleMidScale).toFixed(2)}px at ${searchIconCenterX}px ${searchIconCenterY}px)`,
                        offset: circleMidOffset,
                        easing: lightFinalExpandEasing,
                    },
                    {
                        clipPath: `circle(${(circularMaxRadius * circleScalePeak).toFixed(2)}px at ${searchIconCenterX}px ${searchIconCenterY}px)`,
                        offset: 0.9,
                    },
                    {
                        clipPath: `circle(${(circularMaxRadius * circleScaleEnd).toFixed(2)}px at ${searchIconCenterX}px ${searchIconCenterY}px)`,
                        offset: 1,
                    },
                ];

                root.animate(nextDarkMode ? pathFrames : circleFrames, {
                    duration: nextDarkMode
                        ? darkModeDuration
                        : lightModeDuration,
                    easing: nextDarkMode ? darkModeEasing : lightBaseEasing,
                    fill: 'both',
                    pseudoElement: '::view-transition-new(root)',
                });
            })
            .catch(() => {
                applyTheme(nextDarkMode, themeMode, onCommit);
            });

        return nextDarkMode;
    }

    applyTheme(nextDarkMode, themeMode, onCommit);
    return nextDarkMode;
};
