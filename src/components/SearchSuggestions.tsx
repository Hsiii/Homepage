import { Bookmark, Coffee, Search } from 'lucide-react';
import { createPortal } from 'react-dom';

import type { LinkItem, SearchSuggestionsPosition } from '@/utils/search';

interface SearchSuggestionsProps {
    googleSearchResultIndex: number;
    hasChillCommand: boolean;
    highlightedSearchResultIndex?: number;
    id: string;
    onHighlightGoogleSearch: () => void;
    onHighlightSearchResult: (resultIndex: number) => void;
    onSearchGoogle: () => void;
    onSelectChillCommand: () => void;
    onSelectSearchResult: (result: LinkItem) => void;
    position: SearchSuggestionsPosition;
    searchResults: LinkItem[];
    searchResultIndexOffset: number;
    trimmedSearchValue: string;
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
    googleSearchResultIndex,
    hasChillCommand,
    highlightedSearchResultIndex,
    id,
    onHighlightGoogleSearch,
    onHighlightSearchResult,
    onSearchGoogle,
    onSelectChillCommand,
    onSelectSearchResult,
    position,
    searchResults,
    searchResultIndexOffset,
    trimmedSearchValue,
}) =>
    createPortal(
        <div
            className='search-suggestions'
            id={id}
            role='listbox'
            aria-label='Other bookmark matches'
            style={
                {
                    '--suggestion-left': `${position.left}px`,
                    '--suggestion-top': `${position.top}px`,
                    '--suggestion-width': `${position.width}px`,
                } as React.CSSProperties
            }
        >
            {hasChillCommand && (
                <button
                    className={`search-suggestion command-suggestion ${
                        highlightedSearchResultIndex === 0 ? 'selected' : ''
                    }`}
                    id={`${id}-command`}
                    type='button'
                    role='option'
                    aria-selected={highlightedSearchResultIndex === 0}
                    onMouseDown={(event) => {
                        event.preventDefault();
                    }}
                    onFocus={() => {
                        onHighlightSearchResult(0);
                    }}
                    onPointerMove={() => {
                        onHighlightSearchResult(0);
                    }}
                    onClick={onSelectChillCommand}
                >
                    <span className='search-suggestion-icon'>
                        <Coffee className='icon' size={24} />
                    </span>
                    <span className='search-suggestion-text'>/chill</span>
                </button>
            )}
            {searchResults.map((result, resultIndex) => {
                const navigationIndex = resultIndex + searchResultIndexOffset;
                const isSelected =
                    highlightedSearchResultIndex === navigationIndex;

                return (
                    <button
                        key={result.link}
                        className={`search-suggestion ${
                            isSelected ? 'selected' : ''
                        }`}
                        id={`${id}-${resultIndex}`}
                        type='button'
                        role='option'
                        aria-selected={isSelected}
                        onMouseDown={(event) => {
                            event.preventDefault();
                        }}
                        onFocus={() => {
                            onHighlightSearchResult(navigationIndex);
                        }}
                        onPointerMove={() => {
                            onHighlightSearchResult(navigationIndex);
                        }}
                        onClick={() => {
                            onSelectSearchResult(result);
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
                    highlightedSearchResultIndex === googleSearchResultIndex
                        ? 'selected'
                        : ''
                }`}
                type='button'
                role='option'
                aria-selected={
                    highlightedSearchResultIndex === googleSearchResultIndex
                }
                onMouseDown={(event) => {
                    event.preventDefault();
                }}
                onFocus={onHighlightGoogleSearch}
                onPointerMove={onHighlightGoogleSearch}
                onClick={onSearchGoogle}
            >
                <span className='search-suggestion-icon'>
                    <Search className='icon' size={24} />
                </span>
                <span className='search-suggestion-text'>
                    {trimmedSearchValue}
                </span>
            </button>
        </div>,
        globalThis.document.body
    );
