import React, { lazy, Suspense } from 'react';
import { Search, X } from 'lucide-react';

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
        blockedChillLinks,
        clearSearch,
        clearBlockedChillLinks,
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
        searchGoogleCurrentValue,
        searchInputValue,
        searchResultIndexOffset,
        searchRef,
        searchResults,
        searchSuggestionsId,
        searchSuggestionsPosition,
        selectedSearchResult,
        slashCommandResults,
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
                    hasGoogleSearchResult={hasGoogleSearchResult}
                    highlightedSearchResultIndex={highlightedSearchResultIndex}
                    id={searchSuggestionsId}
                    onHighlightGoogleSearch={highlightGoogleSearch}
                    onHighlightSearchResult={highlightSearchResult}
                    onSearchGoogle={searchGoogleCurrentValue}
                    onSelectSearchResult={navigateToSearchResult}
                    onSelectSlashCommand={executeSlashCommand}
                    position={searchSuggestionsPosition}
                    searchResults={searchResults}
                    searchResultIndexOffset={searchResultIndexOffset}
                    slashCommandResults={slashCommandResults}
                    trimmedSearchValue={trimmedSearchValue}
                />
            )}

            {blockedChillLinks.length > 0 && (
                <div className='chill-fallback' role='status'>
                    <div className='chill-fallback-header'>
                        <span>Open remaining chill tabs</span>
                        <button
                            className='chill-fallback-close'
                            type='button'
                            aria-label='Dismiss'
                            onClick={clearBlockedChillLinks}
                        >
                            <X className='icon' size={20} />
                        </button>
                    </div>
                    <div className='chill-fallback-links'>
                        {blockedChillLinks.map(({ link, url }) => (
                            <a
                                key={link}
                                href={url}
                                target='_blank'
                                rel='noopener noreferrer'
                            >
                                {link}
                            </a>
                        ))}
                    </div>
                </div>
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
