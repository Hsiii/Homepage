import React, {
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useId,
    useLayoutEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Search } from 'lucide-react';
import { createPortal } from 'react-dom';

import type { LinkName } from '@/constants/links';
import { links } from '@/constants/links';
import { linkTree } from '@/constants/linkTree';
import { useHideLinks } from '@/hooks/useHideLinks';
import { useTime } from '@/hooks/useTime';
import { Controls } from './Controls';
import { Mountains } from './Mountains';
import { Weather } from './Weather';

import './Cover.css';

const LinkPanel = lazy(
    async () =>
        await import('./LinkPanel').then((module) => ({
            default: module.LinkPanel,
        }))
);

interface LinkItem {
    category: number;
    link: LinkName;
}

interface SearchResult {
    item: LinkItem;
    score?: number;
}

interface SearchIndex {
    search: (query: string) => SearchResult[];
}

interface SearchSuggestionsPosition {
    left: number;
    top: number;
    width: number;
}

const maxSearchResults = 4;
const secondaryResultScoreLimit = 0.25;

const chillLinks = [
    'Instagram',
    'Messenger',
    'Twitter',
    'Facebook',
    'GitHub',
    'Crx',
    'YouTube',
    'Anigamer',
] as const;

const isChillSearch = (value: string): boolean =>
    value.trim().toLowerCase() === 'chill';

const openChillLinks = () => {
    for (const linkName of chillLinks) {
        globalThis.open(links[linkName], '_blank');
    }
};

const getSearchResults = (results: readonly SearchResult[]): LinkItem[] => {
    if (results.length === 0) {
        return [];
    }

    const [primaryResult, ...secondaryResults] = results;
    const strongSecondaryResults = secondaryResults.filter(
        ({ score }) => score !== undefined && score <= secondaryResultScoreLimit
    );

    return [
        primaryResult,
        ...strongSecondaryResults.slice(0, maxSearchResults - 1),
    ].map(({ item }) => item);
};

const getGoogleSearchUrl = (value: string): string =>
    `https://www.google.com/search?q=${encodeURIComponent(value.trim())}`;

const getSearchInputValue = (
    searchValue: string,
    selectedSearchResult?: LinkItem
): string =>
    searchValue.trim() !== '' && selectedSearchResult
        ? selectedSearchResult.link
        : searchValue;

const getAutocompleteSelectionStart = (
    searchValue: string,
    selectedSearchResult: LinkItem
): number => {
    const query = searchValue.trim();
    const selectedLink = selectedSearchResult.link;

    if (selectedLink.toLowerCase().startsWith(query.toLowerCase())) {
        return query.length;
    }

    return 0;
};

const isSameSearchSuggestionsPosition = (
    a: SearchSuggestionsPosition | undefined,
    b: SearchSuggestionsPosition
): boolean =>
    a !== undefined &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5;

export const Cover: React.FC = () => {
    const inputRef = useRef<HTMLInputElement>(null);
    const searchFormRef = useRef<HTMLFormElement>(null);
    const searchRef = useRef<HTMLDivElement>(null);
    const searchSuggestionsId = useId();
    const searchIndexRef = useRef<SearchIndex | undefined>(undefined);
    const searchIndexLoaderRef = useRef<Promise<SearchIndex> | undefined>(
        undefined
    );
    const { time } = useTime();
    const { hideLinks } = useHideLinks();
    const [inputFocused, setInputFocused] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [searchResults, setSearchResults] = useState<LinkItem[]>([]);
    const [selectedSearchResultIndex, setSelectedSearchResultIndex] =
        useState(0);
    const [searchSuggestionsPosition, setSearchSuggestionsPosition] = useState<
        SearchSuggestionsPosition | undefined
    >(undefined);
    const searchSuggestionsPositionRef = useRef<
        SearchSuggestionsPosition | undefined
    >(undefined);

    const selectedSearchResult = searchResults.at(selectedSearchResultIndex);
    const alternativeSearchResults = searchResults.slice(1);
    const hasAlternativeSearchResults = alternativeSearchResults.length > 0;
    const searchInputValue = getSearchInputValue(
        searchValue,
        selectedSearchResult
    );

    const flattenedSearchItems = useMemo<LinkItem[]>(
        () =>
            linkTree.flatMap((category, categoryIndex: number) => {
                const categoryId = categoryIndex + 1;

                return category.links.map((link) => ({
                    link,
                    category: categoryId,
                }));
            }),
        []
    );

    const loadSearchIndex = useCallback(async (): Promise<SearchIndex> => {
        if (searchIndexRef.current) {
            return searchIndexRef.current;
        }

        searchIndexLoaderRef.current ??= import('fuse.js').then(
            ({ default: Fuse }) => {
                const searchIndex = new Fuse(flattenedSearchItems, {
                    includeScore: true,
                    keys: ['link'],
                    threshold: 0.4,
                });

                searchIndexRef.current = searchIndex;
                return searchIndex;
            }
        );

        return await searchIndexLoaderRef.current;
    }, [flattenedSearchItems]);

    useEffect(() => {
        const query = searchValue.trim();

        if (query === '') {
            setSearchResults([]);
            setSelectedSearchResultIndex(0);
            return undefined;
        }

        let isCancelled = false;

        loadSearchIndex()
            .then((searchIndex) => {
                if (isCancelled) {
                    return undefined;
                }

                setSearchResults(getSearchResults(searchIndex.search(query)));
                setSelectedSearchResultIndex(0);
            })
            .catch((error: unknown) => {
                console.error('Failed to load search index:', error);
                if (!isCancelled) {
                    setSearchResults([]);
                    setSelectedSearchResultIndex(0);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [loadSearchIndex, searchValue]);

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
        if (!hasAlternativeSearchResults) {
            searchSuggestionsPositionRef.current = undefined;
            setSearchSuggestionsPosition(undefined);
            return undefined;
        }

        updateSearchSuggestionsPosition();

        let animationFrame = globalThis.requestAnimationFrame(
            function trackSearchPosition() {
                updateSearchSuggestionsPosition();
                animationFrame =
                    globalThis.requestAnimationFrame(trackSearchPosition);
            }
        );

        return () => {
            globalThis.cancelAnimationFrame(animationFrame);
        };
    }, [hasAlternativeSearchResults, updateSearchSuggestionsPosition]);

    useLayoutEffect(() => {
        const input = inputRef.current;

        if (
            !inputFocused ||
            !input ||
            !selectedSearchResult ||
            searchValue.trim() === '' ||
            input.value !== selectedSearchResult.link
        ) {
            return;
        }

        const selectionStart = getAutocompleteSelectionStart(
            searchValue,
            selectedSearchResult
        );

        input.setSelectionRange(
            selectionStart,
            selectedSearchResult.link.length
        );
    }, [inputFocused, searchValue, selectedSearchResult]);

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

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ' && !inputFocused) {
                e.preventDefault();
                setInputFocused(true);
                inputRef.current?.focus();
            }

            if (!inputFocused) {
                return;
            }

            if (e.key === 'ArrowDown' && searchResults.length > 1) {
                e.preventDefault();
                setSelectedSearchResultIndex(
                    (index) => (index + 1) % searchResults.length
                );
                return;
            }

            if (e.key === 'ArrowUp' && searchResults.length > 1) {
                e.preventDefault();
                setSelectedSearchResultIndex(
                    (index) =>
                        (index - 1 + searchResults.length) %
                        searchResults.length
                );
                return;
            }

            if (e.key === 'Escape') {
                e.preventDefault();
                setSearchValue('');
                inputRef.current?.blur();
                return;
            }

            if (e.key !== 'Enter') {
                return;
            }

            if (e.metaKey || e.ctrlKey) {
                e.preventDefault();
                searchGoogle(searchValue);
                return;
            }

            if (isChillSearch(searchValue)) {
                e.preventDefault();
                openChillLinks();
                return;
            }

            if (selectedSearchResult) {
                e.preventDefault();
                navigateToSearchResult(selectedSearchResult);
            }
        };

        globalThis.addEventListener('keydown', handleKeyDown);
        return () => {
            globalThis.removeEventListener('keydown', handleKeyDown);
        };
    }, [
        inputFocused,
        navigateToSearchResult,
        searchGoogle,
        searchResults.length,
        searchValue,
        selectedSearchResult,
    ]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isChillSearch(searchValue)) {
            openChillLinks();
            return;
        }

        navigateToSearchResult(selectedSearchResult);
    };

    const handleClearSearch = () => {
        if (inputRef.current) {
            inputRef.current.blur();
        }
    };

    const handleSearchBlur = () => {
        setInputFocused(false);
        setSearchValue('');
        setSearchResults([]);
        setSelectedSearchResultIndex(0);
    };

    const searchSuggestions =
        hasAlternativeSearchResults && searchSuggestionsPosition
            ? createPortal(
                  <div
                      className='search-suggestions'
                      id={searchSuggestionsId}
                      role='listbox'
                      aria-label='Other bookmark matches'
                      style={
                          {
                              '--suggestion-left': `${searchSuggestionsPosition.left}px`,
                              '--suggestion-top': `${searchSuggestionsPosition.top}px`,
                              '--suggestion-width': `${searchSuggestionsPosition.width}px`,
                          } as React.CSSProperties
                      }
                  >
                      {alternativeSearchResults.map((result, index) => {
                          const resultIndex = index + 1;
                          const isSelected =
                              selectedSearchResultIndex === resultIndex;

                          return (
                              <button
                                  key={result.link}
                                  className={`search-suggestion ${isSelected ? 'selected' : ''}`}
                                  id={`${searchSuggestionsId}-${resultIndex}`}
                                  type='button'
                                  role='option'
                                  aria-selected={isSelected}
                                  onMouseDown={(event) => {
                                      event.preventDefault();
                                  }}
                                  onMouseEnter={() => {
                                      setSelectedSearchResultIndex(resultIndex);
                                  }}
                                  onClick={() => {
                                      navigateToSearchResult(result);
                                  }}
                              >
                                  or <span>{result.link}</span>?
                              </button>
                          );
                      })}
                  </div>,
                  globalThis.document.body
              )
            : undefined;

    return (
        <section className='cover'>
            <Mountains />
            <Controls />
            <div className={`cover-content ${inputFocused ? 'focused' : ''}`}>
                <div className='title-container'>
                    <Weather />
                    <span className='title'>{time}</span>
                </div>
                <div
                    className={[
                        'search',
                        inputFocused && 'focused',
                        hasAlternativeSearchResults && 'with-suggestions',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                    ref={searchRef}
                >
                    <form
                        className='search-form'
                        ref={searchFormRef}
                        onSubmit={handleSubmit}
                    >
                        <div className='search-icon'>
                            <Search className='icon' size={24} />
                        </div>
                        <input
                            className='search-input'
                            type='text'
                            placeholder='Search bookmarks'
                            autoComplete='off'
                            value={searchInputValue}
                            ref={inputRef}
                            aria-controls={
                                hasAlternativeSearchResults
                                    ? searchSuggestionsId
                                    : undefined
                            }
                            aria-expanded={hasAlternativeSearchResults}
                            aria-autocomplete='list'
                            onChange={(e) => {
                                setSearchValue(e.target.value);
                            }}
                            onFocus={() => {
                                setInputFocused(true);
                                loadSearchIndex().catch((error: unknown) => {
                                    console.error(
                                        'Failed to preload search index:',
                                        error
                                    );
                                });
                            }}
                            onBlur={handleSearchBlur}
                        />
                    </form>
                </div>
            </div>
            {searchSuggestions}

            <Suspense fallback={undefined}>
                <LinkPanel
                    hidden={hideLinks}
                    isSearchNav={inputFocused}
                    highlightedLink={selectedSearchResult?.link}
                    highlightedCategory={selectedSearchResult?.category}
                    onClearSearch={handleClearSearch}
                />
            </Suspense>
        </section>
    );
};
