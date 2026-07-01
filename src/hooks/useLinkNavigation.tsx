import { useCallback, useEffect, useRef, useState } from 'react';

export const useLinkNavigation = (
    isSearchNav: boolean,
    onClearSearch: () => void,
    highlightedCategory?: number
): {
    selectedCategory: number;
    isMouseNav: boolean;
    startMouseNav: () => void;
    endMouseNav: () => void;
} => {
    const hoverExitTimeoutRef = useRef<
        ReturnType<typeof globalThis.setTimeout> | undefined
    >(undefined);
    const selectedCategory = highlightedCategory ?? 0;
    const [isMouseNav, setIsMouseNav] = useState(false);

    useEffect(() => {
        if (isSearchNav) {
            setIsMouseNav(false);
        }
    }, [isSearchNav]);

    useEffect(
        () => () => {
            if (hoverExitTimeoutRef.current) {
                clearTimeout(hoverExitTimeoutRef.current);
            }
        },
        []
    );

    const startMouseNav = useCallback(() => {
        if (hoverExitTimeoutRef.current) {
            clearTimeout(hoverExitTimeoutRef.current);
            hoverExitTimeoutRef.current = undefined;
        }
        setIsMouseNav(true);
        onClearSearch();
    }, [onClearSearch]);

    const endMouseNav = useCallback(() => {
        if (hoverExitTimeoutRef.current) {
            clearTimeout(hoverExitTimeoutRef.current);
        }
        hoverExitTimeoutRef.current = setTimeout(() => {
            setIsMouseNav(false);
            hoverExitTimeoutRef.current = undefined;
        }, 150);
    }, []);

    return {
        selectedCategory,
        isMouseNav,
        startMouseNav,
        endMouseNav,
    };
};
