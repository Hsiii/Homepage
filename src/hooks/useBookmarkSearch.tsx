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

import type { BookmarkCategoryData, BookmarkLinkData } from '@/types/bookmarks';
import type {
    FeedsLink,
    LinkItem,
    SearchSuggestionsPosition,
    SlashCommandItem,
} from '@/utils/search';
import {
    getGoogleSearchUrl,
    getSearchItems,
    getSearchResults,
    getSlashCommandResults,
    isSameSearchSuggestionsPosition,
    isSlashCommandSearch,
} from '@/utils/search';

const defaultMotionTrackingMs = 2000;

const getSearchKeySequenceInput = (
    e: React.KeyboardEvent<HTMLInputElement>
): string | undefined => {
    if (e.metaKey || e.ctrlKey || e.altKey) {
        return undefined;
    }

    const keyCodeMatch = /^Key(?<key>[A-Z])$/.exec(e.code);
    if (keyCodeMatch?.groups?.key) {
        return keyCodeMatch.groups.key.toLowerCase();
    }

    if (e.key.length === 1) {
        return e.key.toLowerCase();
    }

    return undefined;
};

const feedLinks = [
    'Instagram',
    'Messenger',
    'Twitter',
    'Facebook',
    'GitHub',
    'Crx',
    'YouTube',
    'Anigamer',
] as const;

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

const findBookmarkByTitle = (
    bookmarkTree: readonly BookmarkCategoryData[],
    title: string
): BookmarkLinkData | undefined => {
    for (const categoryData of bookmarkTree) {
        const bookmark = categoryData.links.find(
            (link) => link.title === title
        );
        if (bookmark !== undefined) {
            return bookmark;
        }
    }

    return undefined;
};

export const useBookmarkSearch = (
    bookmarkTree: readonly BookmarkCategoryData[]
): {
    blockedFeedsLinks: FeedsLink[];
    clearSearch: () => void;
    clearBlockedFeedsLinks: () => void;
    executeSlashCommand: (command: SlashCommandItem) => void;
    focusSearchInput: () => void;
    googleSearchResultIndex: number;
    handleSearchBlur: () => void;
    handleSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleSearchFocus: () => void;
    handleSearchKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    handleSubmit: (e: React.FormEvent) => void;
    hasGoogleSearchResult: boolean;
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
    slashCommandResults: SlashCommandItem[];
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
    const [searchKeySequence, setSearchKeySequence] = useState('');
    const [searchResults, setSearchResults] = useState<LinkItem[]>([]);
    const [blockedFeedsLinks, setBlockedFeedsLinks] = useState<FeedsLink[]>([]);
    const [highlightedSearchResultIndex, setHighlightedSearchResultIndex] =
        useState<number | undefined>(undefined);
    const [searchSuggestionsPosition, setSearchSuggestionsPosition] = useState<
        SearchSuggestionsPosition | undefined
    >(undefined);
    const searchSuggestionsPositionRef = useRef<
        SearchSuggestionsPosition | undefined
    >(undefined);

    const trimmedSearchValue = searchValue.trim();
    const hasSearchQuery = trimmedSearchValue !== '';
    const isSlashCommandQuery = isSlashCommandSearch(trimmedSearchValue);
    const slashCommandResults = getSlashCommandResults(searchValue);
    const hasGoogleSearchResult = hasSearchQuery && !isSlashCommandQuery;
    const hasSearchSuggestions =
        hasGoogleSearchResult || slashCommandResults.length > 0;
    const searchResultIndexOffset = slashCommandResults.length;
    const selectedSlashCommand =
        highlightedSearchResultIndex === undefined ||
        highlightedSearchResultIndex >= slashCommandResults.length
            ? undefined
            : slashCommandResults[highlightedSearchResultIndex];
    const googleSearchResultIndex =
        searchResultIndexOffset + searchResults.length;
    const searchNavigationItemCount = hasSearchSuggestions
        ? searchResultIndexOffset +
          searchResults.length +
          (hasGoogleSearchResult ? 1 : 0)
        : 0;
    const selectedSearchResult =
        highlightedSearchResultIndex === undefined ||
        highlightedSearchResultIndex < searchResultIndexOffset ||
        highlightedSearchResultIndex >= googleSearchResultIndex
            ? undefined
            : searchResults[
                  highlightedSearchResultIndex - searchResultIndexOffset
              ];
    const searchInputValue = searchValue;

    const executeFeedsCommand = useCallback(() => {
        const nextBlockedLinks: FeedsLink[] = [];

        for (const link of feedLinks) {
            const bookmark = findBookmarkByTitle(bookmarkTree, link);
            if (bookmark === undefined) {
                continue;
            }

            const openedTab = globalThis.open(bookmark.url, '_blank');
            if (openedTab) {
                openedTab.opener = undefined;
                continue;
            }

            nextBlockedLinks.push({
                link,
                url: bookmark.url,
            });
        }

        if (nextBlockedLinks.length === 0) {
            globalThis.requestAnimationFrame(() => {
                Reflect.apply(globalThis.close, globalThis, []);
            });
        }

        setBlockedFeedsLinks(nextBlockedLinks);
    }, [bookmarkTree]);

    const executeSlashCommand = useCallback(
        (_command: SlashCommandItem) => {
            executeFeedsCommand();
        },
        [executeFeedsCommand]
    );

    const flattenedSearchItems = useMemo<LinkItem[]>(
        () => getSearchItems(bookmarkTree),
        [bookmarkTree]
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
            setHighlightedSearchResultIndex(
                getSlashCommandResults(query).length > 0 ? 0 : undefined
            );
            return undefined;
        }

        const nextSearchResults = getSearchResults(
            flattenedSearchItems,
            query,
            searchKeySequence
        );

        setSearchResults(nextSearchResults);
        setHighlightedSearchResultIndex(
            nextSearchResults.length > 0 ? 0 : undefined
        );
        return undefined;
    }, [flattenedSearchItems, searchKeySequence, searchValue]);

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
        ].filter(
            (element): element is HTMLDivElement | HTMLFormElement =>
                element !== null
        );
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

    const navigateToSearchResult = useCallback((result?: LinkItem) => {
        if (result) {
            globalThis.location.href = result.url;
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
                setSearchValue('');
                setSearchKeySequence('');
                inputRef.current?.blur();
                return;
            }

            if (e.key === 'Backspace') {
                setSearchKeySequence((value) => value.slice(0, -1));
                return;
            }

            if (e.key === 'Delete') {
                setSearchKeySequence('');
                return;
            }

            if (e.key !== 'Enter') {
                const sequenceInput = getSearchKeySequenceInput(e);
                if (sequenceInput !== undefined) {
                    setSearchKeySequence((value) => value + sequenceInput);
                }
                return;
            }

            if (selectedSlashCommand) {
                e.preventDefault();
                executeSlashCommand(selectedSlashCommand);
                return;
            }

            if (
                hasGoogleSearchResult &&
                highlightedSearchResultIndex === googleSearchResultIndex
            ) {
                e.preventDefault();
                searchGoogle(searchValue);
                return;
            }

            if (selectedSearchResult) {
                e.preventDefault();
                navigateToSearchResult(selectedSearchResult);
                return;
            }

            if (hasGoogleSearchResult) {
                e.preventDefault();
                searchGoogle(searchValue);
            }
        },
        [
            googleSearchResultIndex,
            hasGoogleSearchResult,
            highlightedSearchResultIndex,
            executeSlashCommand,
            navigateToSearchResult,
            searchGoogle,
            searchNavigationItemCount,
            searchValue,
            selectedSearchResult,
            selectedSlashCommand,
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
                setSearchValue('/');
                setSearchKeySequence('/');
                setBlockedFeedsLinks([]);
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
            if (selectedSlashCommand) {
                executeSlashCommand(selectedSlashCommand);
                return;
            }

            navigateToSearchResult(selectedSearchResult);
            if (!selectedSearchResult && hasGoogleSearchResult) {
                searchGoogle(searchValue);
            }
        },
        [
            navigateToSearchResult,
            executeSlashCommand,
            hasGoogleSearchResult,
            searchGoogle,
            searchValue,
            selectedSearchResult,
            selectedSlashCommand,
        ]
    );

    const clearSearch = useCallback(() => {
        inputRef.current?.blur();
    }, []);

    const handleSearchBlur = useCallback(() => {
        setInputFocused(false);
        setSearchValue('');
        setSearchKeySequence('');
        setSearchResults([]);
        setHighlightedSearchResultIndex(undefined);
    }, []);

    const handleSearchChange = useCallback(
        (e: React.ChangeEvent<HTMLInputElement>) => {
            setSearchValue(e.target.value);
            if (e.target.value === '') {
                setSearchKeySequence('');
            }
            setBlockedFeedsLinks([]);
        },
        []
    );

    const clearBlockedFeedsLinks = useCallback(() => {
        setBlockedFeedsLinks([]);
    }, []);

    const handleSearchFocus = useCallback(() => {
        setInputFocused(true);
    }, []);

    const highlightSearchResult = useCallback((resultIndex: number) => {
        setHighlightedSearchResultIndex(resultIndex);
    }, []);

    const highlightGoogleSearch = useCallback(() => {
        setHighlightedSearchResultIndex(googleSearchResultIndex);
    }, [googleSearchResultIndex]);

    return {
        blockedFeedsLinks,
        clearSearch,
        clearBlockedFeedsLinks,
        executeSlashCommand,
        focusSearchInput,
        googleSearchResultIndex,
        handleSearchBlur,
        handleSearchChange,
        handleSearchFocus,
        handleSearchKeyDown,
        handleSubmit,
        hasGoogleSearchResult,
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
        slashCommandResults,
        selectedSearchResult,
        trimmedSearchValue,
    };
};
