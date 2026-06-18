import { Bookmark, Search } from 'lucide-react';
import { createPortal } from 'react-dom';

import type { LinkItem, SearchSuggestionsPosition } from '@/utils/search';

interface SearchSuggestionsProps {
    googleSearchHotkeyLabel: string;
    googleSearchResultIndex: number;
    highlightedSearchResultIndex?: number;
    id: string;
    onHighlightGoogleSearch: () => void;
    onHighlightSearchResult: (resultIndex: number) => void;
    onSearchGoogle: () => void;
    onSelectSearchResult: (result: LinkItem) => void;
    position: SearchSuggestionsPosition;
    searchResults: LinkItem[];
    trimmedSearchValue: string;
}

export const SearchSuggestions: React.FC<SearchSuggestionsProps> = ({
    googleSearchHotkeyLabel,
    googleSearchResultIndex,
    highlightedSearchResultIndex,
    id,
    onHighlightGoogleSearch,
    onHighlightSearchResult,
    onSearchGoogle,
    onSelectSearchResult,
    position,
    searchResults,
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
            {searchResults.map((result, resultIndex) => {
                const isSelected = highlightedSearchResultIndex === resultIndex;

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
                            onHighlightSearchResult(resultIndex);
                        }}
                        onPointerMove={() => {
                            onHighlightSearchResult(resultIndex);
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
                    Search Google for "{trimmedSearchValue}"
                </span>
                <kbd className='search-suggestion-hotkey'>
                    {googleSearchHotkeyLabel}
                </kbd>
            </button>
        </div>,
        globalThis.document.body
    );
