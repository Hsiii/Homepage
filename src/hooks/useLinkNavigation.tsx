import { useCallback, useEffect, useRef, useState } from 'react';

import { links } from '@/constants/links.ts';
import { linkTree } from '@/constants/linkTree.tsx';

export const useLinkNavigation = (
    isSearchNav: boolean,
    onClearSearch: () => void,
    highlightedCategory?: number
): {
    selectedCategory: number;
    isKeyboardNav: boolean;
    isMouseNav: boolean;
    startMouseNav: () => void;
    endMouseNav: () => void;
} => {
    const hoverExitTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);
    // 1-based indexing
    const [selectedCategory, setSelectedCategory] = useState(0);

    const [prevHighlightedCategory, setPrevHighlightedCategory] =
        useState(highlightedCategory);

    if (highlightedCategory !== prevHighlightedCategory) {
        setPrevHighlightedCategory(highlightedCategory);
        setSelectedCategory(highlightedCategory ?? 0);
    }

    // Shows hotkey hint, expands the base panel, cancels mouse navigation.
    const [isKeyboardNav, setIsKeyboardNav] = useState(false);

    // Hide the hotkey hint, cancels keyboard navigation.
    const [isMouseNav, setIsMouseNav] = useState(false);

    const [prevIsSearchNav, setPrevIsSearchNav] = useState(isSearchNav);

    // Clear nav states
    if (isSearchNav !== prevIsSearchNav) {
        setPrevIsSearchNav(isSearchNav);
        if (isSearchNav) {
            setIsKeyboardNav(false);
            setIsMouseNav(false);
            setSelectedCategory(0);
        }
    }

    useEffect(() => {
        const onClick = () => {
            setIsKeyboardNav(false);
            setSelectedCategory(0);
        };

        const onKeyDown = (e: KeyboardEvent) => {
            // for chinese input method editor
            const key = e.code.slice(-1);

            // activate navigation
            if (!isKeyboardNav) {
                if (key === '1' && !isSearchNav) {
                    setIsKeyboardNav(true);
                    setIsMouseNav(false);
                }
                return;
            }

            // Go to previous layer on escape.
            if (e.key === 'Escape') {
                if (selectedCategory > 0) {
                    setSelectedCategory(0);
                    return;
                }
                setIsKeyboardNav(false);
                return;
            }

            // Keep valid navigation keys.
            if (!/^[1-9]$/.test(key)) {
                return;
            }
            const idx = Number.parseInt(key, 10);
            if (idx > linkTree.length) {
                return;
            }

            // if nothing selected yet, select category
            if (selectedCategory === 0) {
                setSelectedCategory(idx);
                return;
            }

            // else navigate to the selected link
            globalThis.location.href =
                links[linkTree[selectedCategory - 1].links[idx - 1]];
        };

        globalThis.addEventListener('keydown', onKeyDown);
        globalThis.addEventListener('click', onClick);
        return () => {
            globalThis.removeEventListener('keydown', onKeyDown);
            globalThis.removeEventListener('click', onClick);
            // Clean up any pending hover exit timeout.
            if (hoverExitTimeoutRef.current) {
                clearTimeout(hoverExitTimeoutRef.current);
            }
        };
    }, [isKeyboardNav, isMouseNav, selectedCategory, isSearchNav]);

    const startMouseNav = useCallback(() => {
        // Clear any pending exit timeout.
        if (hoverExitTimeoutRef.current) {
            clearTimeout(hoverExitTimeoutRef.current);
            hoverExitTimeoutRef.current = undefined;
        }
        setIsMouseNav(true);
        setIsKeyboardNav(false);
        setSelectedCategory(0);
        onClearSearch();
    }, [onClearSearch]);

    const endMouseNav = useCallback(() => {
        // Add 150ms delay before removing hover state This prevents the panel from flashing when
        // there are minor gaps during animation.
        hoverExitTimeoutRef.current = setTimeout(() => {
            setIsMouseNav(false);
            hoverExitTimeoutRef.current = undefined;
        }, 150);
    }, []);

    return {
        selectedCategory,
        isKeyboardNav,
        isMouseNav,
        startMouseNav,
        endMouseNav,
    };
};
