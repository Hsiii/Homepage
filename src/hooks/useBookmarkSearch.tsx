import {
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type React from 'react';

import type { LinkName } from '@/constants/links';
import { links } from '@/constants/links';
import type {
    ChillLink,
    LinkItem,
    SearchSuggestionsPosition,
} from '@/utils/search';
import {
    getAutocompleteSelectionStart,
    getGoogleSearchUrl,
    getSearchInputValue,
    getSearchItems,
    getSearchResults,
    isChillSearch,
    isSameSearchSuggestionsPosition,
    isSlashCommandSearch,
} from '@/utils/search';

const defaultMotionTrackingMs = 2000;

const chillLinks = [
    'Instagram',
    'Messenger',
    'Twitter',
    'Facebook',
    'GitHub',
    'Crx',
    'YouTube',
    'Anigamer',
    'Supercell Store',
] as const satisfies readonly LinkName[];

const getMaxCssTime = (value: string): number =>
    Math.max(
        ...value.split(',').map((part) => {
            const time = part.trim();
            if (time.endsWith('ms')) {
                return Number.parseFloat(time);
            }
            if (time.endsWith('s')) {
                return Number.parseFloat(time) * 1000;
            }
            return 0;
        }),
        0
    );

const getElementMotionDuration = (element: HTMLElement): number => {
    const style = globalThis.getComputedStyle(element);

    return Math.max(
        getMaxCssTime(style.animationDelay) +
            getMaxCssTime(style.animationDuration),
        getMaxCssTime(style.transitionDelay) +
            getMaxCssTime(style.transitionDuration)
    );
};

export const useBookmarkSearch = (): {
    blockedChillLinks: ChillLink[];
    clearSearch: () => void;
    clearBlockedChillLinks: () => void;
    executeChillCommand: () => void;
    focusSearchInput: () => void;
    hasChillCommand: boolean;
    googleSearchResultIndex: number;
    handleSearchBlur: () => void;
    handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSearchFocus: () => void;
    handleSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    handleSubmit: (e: React.FormEvent) => void;
    hasSearchSuggestions: boolean;
    highlightGoogleSearch: () => void;
    highlightSearchResult: (resultIndex: number) => void;
    highlightedSearchResultIndex: number | undefined;
    inputFocused: boolean;
    inputRef: React.RefObject<HTMLInputElement | null>;
    navigateToSearchResult: (result?: LinkItem) => void;
    searchFormRef: React.RefObject<HTMLFormElement | null>;
    searchGoogleCurrentValue: () => void;
    searchInputValue: string;
    searchResultIndexOffset: number;
    searchRef: React.RefObject<HTMLDivElement | null>;
    searchResults: LinkItem[];
    searchSuggestionsId: string;
    searchSuggestionsPosition: SearchSuggestionsPosition | undefined;
    searchGoogle: (value: string) => void;
    selectedSearchResult: LinkItem | undefined;
    trimmedSearchValue: string;
} => {
    const inputRef = useRef<HTMLInputElement>(null);
    const searchFormRef = useRef<HTMLFormElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchSuggestionsId = useId();
    const [inputFocused, setInputFocused] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [searchResults, setSearchResults] = useState<LinkItem[]>([]);
    const [blockedChillLinks, setBlockedChillLinks] = useState<ChillLink[]>([]);
    const [highlightedSearchResultIndex, setHighlightedSearchResultIndex] =
        useState<number | undefined>(undefined);
    const [autocompleteEnabled, setAutocompleteEnabled] = useState(true);
    const [searchSuggestionsPosition, setSearchSuggestionsPosition] = useState<
        SearchSuggestionsPosition | undefined
    >(undefined);
    const searchSuggestionsPositionRef = useRef<
        SearchSuggestionsPosition | undefined
    >(undefined);

    const trimmedSearchValue = searchValue.trim();
    const hasSearchQuery = trimmedSearchValue !== '';
    const hasSearchSuggestions = hasSearchQuery;
    const hasChillCommand = isChillSearch(searchValue);
    const searchResultIndexOffset = hasChillCommand ? 1 : 0;
    const chillCommandResultIndex = hasChillCommand ? 0 : undefined;
    const googleSearchResultIndex =
        searchResultIndexOffset + searchResults.length;
    const searchNavigationItemCount = hasSearchQuery
        ? searchResultIndexOffset + searchResults.length + 1
        : 0;
    const selectedSearchResult =
        highlightedSearchResultIndex === undefined ||
        highlightedSearchResultIndex < searchResultIndexOffset ||
        highlightedSearchResultIndex >= googleSearchResultIndex
            ? undefined
            : searchResults[
                  highlightedSearchResultIndex - searchResultIndexOffset
              ];
    const searchInputValue = getSearchInputValue(
        searchValue,
        selectedSearchResult,
        autocompleteEnabled
    );

    const executeChillCommand = useCallback(() => {
        const nextBlockedLinks: ChillLink[] = [];

        for (const link of chillLinks) {
            const openedTab = globalThis.open(links[link], '_blank');
            if (openedTab) {
                openedTab.opener = undefined;
                continue;
            }

            nextBlockedLinks.push({
                link,
                url: links[link],
            });
        }

        if (nextBlockedLinks.length === 0) {
            globalThis.requestAnimationFrame(() => {
                Reflect.apply(globalThis.close, globalThis, []);
            });
        }

        setBlockedChillLinks(nextBlockedLinks);
    }, []);

    const flattenedSearchItems = useMemo<LinkItem[]>(
        () => getSearchItems(),
        []
    );

    useEffect(() => {
        const query = searchValue.trim();

        if (query === '') {
            setSearchResults([]);
            setHighlightedSearchResultIndex(undefined);
            return undefined;
        }

        if (isSlashCommandSearch(query)) {
            setSearchResults([]);
            setHighlightedSearchResultIndex(hasChillCommand ? 0 : undefined);
            return undefined;
        }

        const nextSearchResults = getSearchResults(flattenedSearchItems, query);

        setSearchResults(nextSearchResults);
        setHighlightedSearchResultIndex(
            nextSearchResults.length > 0 || hasChillCommand ? 0 : undefined
        );
        return undefined;
    }, [flattenedSearchItems, hasChillCommand, searchValue]);

    const updateSearchSuggestionsPosition = useCallback(() => {
        const rect =
            searchFormRef.current?.getBoundingClientRect() ??
            searchRef.current?.getBoundingClientRect();
        if (!rect) {
            searchSuggestionsPositionRef.current = undefined;
            setSearchSuggestionsPosition(undefined);
            return;
        }

        const nextPosition = {
            left: rect.left,
            top: rect.bottom,
            width: rect.width,
        };

        if (
            isSameSearchSuggestionsPosition(
                searchSuggestionsPositionRef.current,
                nextPosition
            )
        ) {
            return;
        }

        searchSuggestionsPositionRef.current = nextPosition;
        setSearchSuggestionsPosition(nextPosition);
    }, []);

    useLayoutEffect(() => {
        if (!hasSearchSuggestions) {
            searchSuggestionsPositionRef.current = undefined;
            setSearchSuggestionsPosition(undefined);
            return undefined;
        }

        updateSearchSuggestionsPosition();

        const motionElements = [
            searchRef.current,
            searchFormRef.current,
        ].filter((element): element is HTMLElement => element !== null);
        let animationFrame: number | undefined;
        let motionTrackingEndsAt = 0;

        const trackMotion = () => {
            updateSearchSuggestionsPosition();

            if (performance.now() >= motionTrackingEndsAt) {
                animationFrame = undefined;
                return;
            }

            animationFrame = globalThis.requestAnimationFrame(trackMotion);
        };

        const startMotionTracking = () => {
            const motionDuration =
                Math.max(...motionElements.map(getElementMotionDuration), 0) ||
                defaultMotionTrackingMs;

            motionTrackingEndsAt = Math.max(
                motionTrackingEndsAt,
                performance.now() + motionDuration
            );

            animationFrame ??= globalThis.requestAnimationFrame(trackMotion);
        };

        const resizeObserver = new ResizeObserver(
            updateSearchSuggestionsPosition
        );
        if (searchFormRef.current) {
            resizeObserver.observe(searchFormRef.current);
        }
        for (const element of motionElements) {
            element.addEventListener('animationstart', startMotionTracking);
            element.addEventListener('transitionstart', startMotionTracking);
        }
        globalThis.addEventListener('resize', updateSearchSuggestionsPosition);
        globalThis.addEventListener('scroll', updateSearchSuggestionsPosition, {
            passive: true,
        });
        startMotionTracking();

        return () => {
            if (animationFrame !== undefined) {
                globalThis.cancelAnimationFrame(animationFrame);
            }
            resizeObserver.disconnect();
            for (const element of motionElements) {
                element.removeEventListener(
                    'animationstart',
                    startMotionTracking
                );
                element.removeEventListener(
                    'transitionstart',
                    startMotionTracking
                );
            }
            globalThis.removeEventListener(
                'resize',
                updateSearchSuggestionsPosition
            );
            globalThis.removeEventListener(
                'scroll',
                updateSearchSuggestionsPosition
            );
        };
    }, [hasSearchSuggestions, updateSearchSuggestionsPosition]);

    useLayoutEffect(() => {
        const input = inputRef.current;

        if (
            !autocompleteEnabled ||
            !inputFocused ||
            !input ||
            !selectedSearchResult ||
            searchValue.trim() === '' ||
            input.value !== searchInputValue
        ) {
            return;
        }

        const selectionStart = getAutocompleteSelectionStart(
            searchValue,
            selectedSearchResult
        );

        input.setSelectionRange(selectionStart, searchInputValue.length);
    }, [
        autocompleteEnabled,
        inputFocused,
        searchInputValue,
        searchValue,
        selectedSearchResult,
    ]);

    const navigateToSearchResult = useCallback((result?: LinkItem) => {
        if (result) {
            globalThis.location.href = links[result.link];
        }
    }, []);

    const searchGoogle = useCallback((value: string) => {
        if (value.trim() !== '') {
            globalThis.location.href = getGoogleSearchUrl(value);
        }
    }, []);

    const searchGoogleCurrentValue = useCallback(() => {
        searchGoogle(searchValue);
    }, [searchGoogle, searchValue]);

    const handleSearchKeyDown = useCallback(
        (e: React.KeyboardEvent<HTMLInputElement>) => {
            if (e.key === 'ArrowDown' && searchNavigationItemCount > 0) {
                e.preventDefault();
                setAutocompleteEnabled(true);
                setHighlightedSearchResultIndex((index) => {
                    const nextIndex =
                        index === undefined
                            ? 0
                            : (index + 1) % searchNavigationItemCount;
                    return nextIndex;
                });
                return;
            }

            if (e.key === 'ArrowUp' && searchNavigationItemCount > 0) {
                e.preventDefault();
                setAutocompleteEnabled(true);
                setHighlightedSearchResultIndex((index) => {
                    const nextIndex =
                        index === undefined
                            ? searchNavigationItemCount - 1
                            : (index - 1 + searchNavigationItemCount) %
                              searchNavigationItemCount;
                    return nextIndex;
                });
                return;
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                setAutocompleteEnabled(true);
                setSearchValue('');
                inputRef.current?.blur();
                return;
            }

            if (e.key !== 'Enter') {
                return;
            }

            if (
                hasChillCommand &&
                highlightedSearchResultIndex === chillCommandResultIndex
            ) {
                e.preventDefault();
                executeChillCommand();
                return;
            }

            if (highlightedSearchResultIndex === googleSearchResultIndex) {
                e.preventDefault();
                searchGoogle(searchValue);
                return;
            }

            if (selectedSearchResult) {
                e.preventDefault();
                navigateToSearchResult(selectedSearchResult);
                return;
            }

            if (hasSearchQuery) {
                e.preventDefault();
                searchGoogle(searchValue);
            }
        },
        [
            googleSearchResultIndex,
            hasChillCommand,
            hasSearchQuery,
            highlightedSearchResultIndex,
            executeChillCommand,
            navigateToSearchResult,
            searchGoogle,
            searchNavigationItemCount,
            searchValue,
            selectedSearchResult,
        ]
    );

    const focusSearchInput = useCallback(() => {
        inputRef.current?.focus({ preventScroll: true });
    }, []);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (inputFocused) {
                return;
            }

            if (e.key === ' ') {
                e.preventDefault();
                setInputFocused(true);
                focusSearchInput();
                return;
            }

            if (e.key === '/') {
                e.preventDefault();
                setAutocompleteEnabled(true);
                setSearchValue('/');
                setBlockedChillLinks([]);
                setInputFocused(true);
                focusSearchInput();
            }
        };

        globalThis.addEventListener('keydown', handleKeyDown);
        return () => {
            globalThis.removeEventListener('keydown', handleKeyDown);
        };
    }, [focusSearchInput, inputFocused]);

    const handleSubmit = useCallback(
        (e: React.FormEvent) => {
            e.preventDefault();
            if (
                hasChillCommand &&
                highlightedSearchResultIndex === chillCommandResultIndex
            ) {
                executeChillCommand();
                return;
            }

            navigateToSearchResult(selectedSearchResult);
            if (!selectedSearchResult) {
                searchGoogle(searchValue);
            }
        },
        [
            navigateToSearchResult,
            hasChillCommand,
            highlightedSearchResultIndex,
            executeChillCommand,
            searchGoogle,
            searchValue,
            selectedSearchResult,
        ]
    );

    const clearSearch = useCallback(() => {
        inputRef.current?.blur();
    }, []);

    const handleSearchBlur = useCallback(() => {
        setInputFocused(false);
        setAutocompleteEnabled(true);
        setSearchValue('');
        setSearchResults([]);
        setHighlightedSearchResultIndex(undefined);
    }, []);

    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            const inputType =
                'inputType' in e.nativeEvent ? e.nativeEvent.inputType : '';

            setAutocompleteEnabled(!inputType.startsWith('delete'));
            setSearchValue(e.target.value);
            setBlockedChillLinks([]);
        },
        []
    );

    const clearBlockedChillLinks = useCallback(() => {
        setBlockedChillLinks([]);
    }, []);

    const handleSearchFocus = useCallback(() => {
        setInputFocused(true);
    }, []);

    const highlightSearchResult = useCallback((resultIndex: number) => {
        setAutocompleteEnabled(true);
        setHighlightedSearchResultIndex(resultIndex);
    }, []);

    const highlightGoogleSearch = useCallback(() => {
        setHighlightedSearchResultIndex(googleSearchResultIndex);
    }, [googleSearchResultIndex]);

    return {
        blockedChillLinks,
        clearSearch,
        clearBlockedChillLinks,
        executeChillCommand,
        focusSearchInput,
        hasChillCommand,
        googleSearchResultIndex,
        handleSearchBlur,
        handleSearchChange,
        handleSearchFocus,
        handleSearchKeyDown,
        handleSubmit,
        hasSearchSuggestions,
        highlightGoogleSearch,
        highlightSearchResult,
        highlightedSearchResultIndex,
        inputFocused,
        inputRef,
        navigateToSearchResult,
        searchFormRef,
        searchGoogle,
        searchGoogleCurrentValue,
        searchInputValue,
        searchResultIndexOffset,
        searchRef,
        searchResults,
        searchSuggestionsId,
        searchSuggestionsPosition,
        selectedSearchResult,
        trimmedSearchValue,
    };
};
