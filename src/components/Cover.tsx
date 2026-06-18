import React, { lazy, Suspense } from 'react';
import { Search } from 'lucide-react';

import { useBookmarkSearch } from '@/hooks/useBookmarkSearch';
import { useHideLinks } from '@/hooks/useHideLinks';
import { useTime } from '@/hooks/useTime';
import { Controls } from './Controls';
import { Mountains } from './Mountains';
import { SearchSuggestions } from './SearchSuggestions';

import './Cover.css';

const LinkPanel = lazy(
    async () =>
        await import('./LinkPanel').then((module) => ({
            default: module.LinkPanel,
        }))
);

const Weather = lazy(
    async () =>
        await import('./Weather').then((module) => ({
            default: module.Weather,
        }))
);

export const Cover: React.FC = () => {
    const { time } = useTime();
    const { hideLinks } = useHideLinks();
    const {
        clearSearch,
        focusSearchInput,
        googleSearchResultIndex,
        hasChillCommand,
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
        searchGoogleCurrentValue,
        searchInputValue,
        searchResultIndexOffset,
        searchRef,
        searchResults,
        searchSuggestionsId,
        searchSuggestionsPosition,
        selectedSearchResult,
        trimmedSearchValue,
    } = useBookmarkSearch();

    return (
        <section className='cover'>
            <Mountains />
            <Controls />
            <div className={`cover-content ${inputFocused ? 'focused' : ''}`}>
                <div className='title-container'>
                    <div className='weather-slot'>
                        <Suspense fallback={undefined}>
                            <Weather />
                        </Suspense>
                    </div>
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
                        onClick={focusSearchInput}
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
                            onChange={handleSearchChange}
                            onFocus={handleSearchFocus}
                            onBlur={handleSearchBlur}
                        />
                    </form>
                </div>
            </div>
            {hasSearchSuggestions && searchSuggestionsPosition && (
                <SearchSuggestions
                    googleSearchResultIndex={googleSearchResultIndex}
                    hasChillCommand={hasChillCommand}
                    highlightedSearchResultIndex={highlightedSearchResultIndex}
                    id={searchSuggestionsId}
                    onHighlightGoogleSearch={highlightGoogleSearch}
                    onHighlightSearchResult={highlightSearchResult}
                    onSearchGoogle={searchGoogleCurrentValue}
                    onSelectSearchResult={navigateToSearchResult}
                    position={searchSuggestionsPosition}
                    searchResults={searchResults}
                    searchResultIndexOffset={searchResultIndexOffset}
                    trimmedSearchValue={trimmedSearchValue}
                />
            )}

            <Suspense fallback={undefined}>
                <LinkPanel
                    hidden={hideLinks}
                    isSearchNav={inputFocused}
                    highlightedLink={selectedSearchResult?.link}
                    highlightedCategory={selectedSearchResult?.category}
                    onClearSearch={clearSearch}
                />
            </Suspense>
        </section>
    );
};
