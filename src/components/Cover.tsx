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
import { Bookmark, Search } from 'lucide-react';
import { createPortal } from 'react-dom';

import { links } from '@/constants/links';
import { useHideLinks } from '@/hooks/useHideLinks';
import { useTime } from '@/hooks/useTime';
import type {
    LinkItem,
    SearchIndex,
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
    openChillLinks,
} from '@/utils/search';
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

const isAppleKeyboardPlatform = (): boolean => {
    const userAgent = globalThis.navigator.userAgent.toLowerCase();

    return (
        userAgent.includes('macintosh') ||
        userAgent.includes('mac os') ||
        userAgent.includes('iphone') ||
        userAgent.includes('ipad') ||
        userAgent.includes('ipod')
    );
};

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
    const googleSearchHotkeyLabel = useMemo(
        () => (isAppleKeyboardPlatform() ? '⌘ ↵' : 'Ctrl ↵'),
        []
    );
    const [inputFocused, setInputFocused] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [searchResults, setSearchResults] = useState<LinkItem[]>([]);
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
    const googleSearchResultIndex = searchResults.length;
    const searchNavigationItemCount = hasSearchQuery
        ? searchResults.length + 1
        : 0;
    const selectedSearchResult =
        highlightedSearchResultIndex === undefined ||
        highlightedSearchResultIndex >= searchResults.length
            ? undefined
            : searchResults[highlightedSearchResultIndex];
    const searchInputValue = getSearchInputValue(
        searchValue,
        selectedSearchResult,
        autocompleteEnabled
    );

    const flattenedSearchItems = useMemo<LinkItem[]>(
        () => getSearchItems(),
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
            setHighlightedSearchResultIndex(undefined);
            return undefined;
        }

        let isCancelled = false;

        loadSearchIndex()
            .then((searchIndex) => {
                if (isCancelled) {
                    return undefined;
                }

                const nextSearchResults = getSearchResults(
                    searchIndex.search(query)
                );

                setSearchResults(nextSearchResults);
                setHighlightedSearchResultIndex(
                    nextSearchResults.length > 0 ? 0 : undefined
                );
            })
            .catch((error: unknown) => {
                console.error('Failed to load search index:', error);
                if (!isCancelled) {
                    setSearchResults([]);
                    setHighlightedSearchResultIndex(undefined);
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
        if (!hasSearchSuggestions) {
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
            hasSearchQuery,
            highlightedSearchResultIndex,
            navigateToSearchResult,
            searchGoogle,
            searchNavigationItemCount,
            searchResults.length,
            searchValue,
            selectedSearchResult,
        ]
    );

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ' && !inputFocused) {
                e.preventDefault();
                setInputFocused(true);
                inputRef.current?.focus({ preventScroll: true });
            }
        };

        globalThis.addEventListener('keydown', handleKeyDown);
        return () => {
            globalThis.removeEventListener('keydown', handleKeyDown);
        };
    }, [inputFocused]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isChillSearch(searchValue)) {
            openChillLinks();
            return;
        }

        navigateToSearchResult(selectedSearchResult);
        if (!selectedSearchResult) {
            searchGoogle(searchValue);
        }
    };

    const handleClearSearch = () => {
        if (inputRef.current) {
            inputRef.current.blur();
        }
    };

    const handleSearchBlur = () => {
        setInputFocused(false);
        setAutocompleteEnabled(true);
        setSearchValue('');
        setSearchResults([]);
        setHighlightedSearchResultIndex(undefined);
    };

    const searchSuggestions =
        hasSearchSuggestions && searchSuggestionsPosition
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
                      {searchResults.map((result, resultIndex) => {
                          const isSelected =
                              highlightedSearchResultIndex === resultIndex;

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
                                  onFocus={() => {
                                      setAutocompleteEnabled(true);
                                      setHighlightedSearchResultIndex(
                                          resultIndex
                                      );
                                  }}
                                  onPointerMove={() => {
                                      setAutocompleteEnabled(true);
                                      setHighlightedSearchResultIndex(
                                          resultIndex
                                      );
                                  }}
                                  onClick={() => {
                                      navigateToSearchResult(result);
                                  }}
                              >
                                  <span className='search-suggestion-icon'>
                                      <Bookmark className='icon' size={24} />
                                  </span>
                                  <span className='search-suggestion-text'>
                                      {result.link}
                                  </span>
                              </button>
                          );
                      })}
                      <button
                          className={`search-suggestion google-search-suggestion ${
                              highlightedSearchResultIndex ===
                              googleSearchResultIndex
                                  ? 'selected'
                                  : ''
                          }`}
                          type='button'
                          role='option'
                          aria-selected={
                              highlightedSearchResultIndex ===
                              googleSearchResultIndex
                          }
                          onMouseDown={(event) => {
                              event.preventDefault();
                          }}
                          onFocus={() => {
                              setHighlightedSearchResultIndex(
                                  googleSearchResultIndex
                              );
                          }}
                          onPointerMove={() => {
                              setHighlightedSearchResultIndex(
                                  googleSearchResultIndex
                              );
                          }}
                          onClick={() => {
                              searchGoogle(searchValue);
                          }}
                      >
                          <span className='search-suggestion-icon'>
                              <Search className='icon' size={24} />
                          </span>
                          <span className='search-suggestion-text'>
                              Search Google for "{trimmedSearchValue}"
                          </span>
                          <kbd className='search-suggestion-hotkey'>
                              {googleSearchHotkeyLabel}
                          </kbd>
                      </button>
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
                        hasSearchSuggestions && 'with-suggestions',
                    ]
                        .filter(Boolean)
                        .join(' ')}
                    ref={searchRef}
                >
                    <form
                        className='search-form'
                        ref={searchFormRef}
                        onSubmit={handleSubmit}
                        onClick={() => {
                            inputRef.current?.focus({ preventScroll: true });
                        }}
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
                                hasSearchSuggestions
                                    ? searchSuggestionsId
                                    : undefined
                            }
                            aria-expanded={hasSearchSuggestions}
                            aria-autocomplete='list'
                            onKeyDown={handleSearchKeyDown}
                            onChange={(e) => {
                                const inputType =
                                    'inputType' in e.nativeEvent
                                        ? e.nativeEvent.inputType
                                        : '';

                                setAutocompleteEnabled(
                                    !inputType.startsWith('delete')
                                );
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
