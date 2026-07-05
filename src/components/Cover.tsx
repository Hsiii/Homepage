import React, { lazy, Suspense, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { Search, X } from 'lucide-react';

import { useBookmarks } from '@/hooks/useBookmarks';
import type { BookmarkControls } from '@/hooks/useBookmarks';
import { useBookmarkSearch } from '@/hooks/useBookmarkSearch';
import { useHideLinks } from '@/hooks/useHideLinks';
import { useTime } from '@/hooks/useTime';
import type { BookmarkCategoryData } from '@/types/bookmarks';
import type { AqiData, WeatherData } from '@/types/environment';
import type { InitialAppPreferences } from '@/types/preferences';
import type { WallpaperAsset } from '../../shared/wallpaper';
import { Mountains } from './Mountains';
import { SearchSuggestions } from './SearchSuggestions';

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

interface CoverProps {
    initialAqi: AqiData | undefined;
    initialBookmarkTree: BookmarkCategoryData[] | undefined;
    initialPreferences: InitialAppPreferences;
    initialWallpaper: WallpaperAsset | undefined;
    initialWeather: WeatherData | undefined;
    isClerkEnabled: boolean;
    onWallpaperChange: (wallpaper: WallpaperAsset | undefined) => void;
}

interface CoverContentProps extends CoverProps {
    bookmarkControls: BookmarkControls;
}

const CoverContent: React.FC<CoverContentProps> = ({
    bookmarkControls,
    initialAqi,
    initialPreferences,
    initialWallpaper,
    initialWeather,
    isClerkEnabled,
    onWallpaperChange,
}) => {
    const { time } = useTime();
    const { hideLinks } = useHideLinks();
    const [isLinkPanelLocked, setIsLinkPanelLocked] = useState(false);
    const {
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
    } = useBookmarkSearch(bookmarkControls.bookmarkTree);

    return (
        <section className='cover'>
            <Mountains initialWallpaper={initialWallpaper} />
            <div className={`cover-content ${inputFocused ? 'focused' : ''}`}>
                <div className='title-container'>
                    <div className='weather-slot'>
                        <Suspense fallback={undefined}>
                            <Weather
                                initialAqi={initialAqi}
                                initialPreferences={initialPreferences}
                                initialWeather={initialWeather}
                            />
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
                            placeholder='Search...'
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

            {blockedFeedsLinks.length > 0 && (
                <div className='feeds-fallback' role='status'>
                    <div className='feeds-fallback-header'>
                        <span>Open remaining feed tabs</span>
                        <button
                            className='feeds-fallback-close'
                            type='button'
                            aria-label='Dismiss'
                            onClick={clearBlockedFeedsLinks}
                        >
                            <X className='icon' size={20} />
                        </button>
                    </div>
                    <div className='feeds-fallback-links'>
                        {blockedFeedsLinks.map(({ link, url }) => (
                            <a
                                key={`${link}:${url}`}
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
                    bookmarkControls={bookmarkControls}
                    hidden={hideLinks}
                    initialPreferences={initialPreferences}
                    initialWallpaper={initialWallpaper}
                    isClerkEnabled={isClerkEnabled}
                    isLockedOpen={isLinkPanelLocked}
                    isSearchNav={inputFocused}
                    highlightedLink={selectedSearchResult?.id}
                    highlightedFolderPath={selectedSearchResult?.folderPath}
                    highlightedCategory={selectedSearchResult?.category}
                    onClearSearch={clearSearch}
                    onToggleLockedOpen={() => {
                        setIsLinkPanelLocked((current) => !current);
                    }}
                    onWallpaperChange={onWallpaperChange}
                />
            </Suspense>
        </section>
    );
};

const CoverWithRemoteBookmarks: React.FC<CoverProps> = (props) => {
    const { getToken, isLoaded, isSignedIn, userId } = useAuth();
    const bookmarkControls = useBookmarks({
        auth: {
            getToken,
            isLoaded,
            isSignedIn,
            userId,
        },
        initialBookmarkTree: props.initialBookmarkTree,
    });

    return <CoverContent {...props} bookmarkControls={bookmarkControls} />;
};

const CoverWithLocalBookmarks: React.FC<CoverProps> = (props) => {
    const bookmarkControls = useBookmarks();

    return <CoverContent {...props} bookmarkControls={bookmarkControls} />;
};

export const Cover: React.FC<CoverProps> = (props) => {
    if (props.isClerkEnabled) {
        return <CoverWithRemoteBookmarks {...props} />;
    }

    return <CoverWithLocalBookmarks {...props} />;
};
