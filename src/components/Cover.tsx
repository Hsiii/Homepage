import React, {
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Search } from 'lucide-react';

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
    link: string;
}

interface SearchResult {
    item: LinkItem;
}

interface SearchIndex {
    search: (query: string) => SearchResult[];
}

export const Cover: React.FC = () => {
    const inputRef = useRef<HTMLInputElement>(null);
    const inputFocusedRef = useRef(false);
    const pendingInputRef = useRef('');
    const searchIndexRef = useRef<SearchIndex | undefined>(undefined);
    const searchIndexLoaderRef = useRef<Promise<SearchIndex> | undefined>(
        undefined
    );
    const { time } = useTime();
    const { hideLinks } = useHideLinks();
    const [inputFocused, setInputFocused] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [match, setMatch] = useState<LinkItem | undefined>(undefined);

    const syncSearchValue = useCallback((nextValue: string) => {
        if (inputRef.current && inputRef.current.value !== nextValue) {
            inputRef.current.value = nextValue;
        }

        setSearchValue(nextValue);
    }, []);

    const flushPendingInput = useCallback(() => {
        if (pendingInputRef.current === '') {
            return;
        }

        const nextValue = `${inputRef.current?.value ?? searchValue}${pendingInputRef.current}`;
        pendingInputRef.current = '';
        syncSearchValue(nextValue);
    }, [searchValue, syncSearchValue]);

    const flattenedLinks = useMemo<LinkItem[]>(
        () =>
            linkTree.flatMap((category, categoryIndex: number) =>
                category.links.map((link: string) => ({
                    link,
                    category: categoryIndex + 1,
                }))
            ),
        []
    );

    const loadSearchIndex = useCallback(async (): Promise<SearchIndex> => {
        if (searchIndexRef.current) {
            return searchIndexRef.current;
        }

        searchIndexLoaderRef.current ??= import('fuse.js').then(
            ({ default: Fuse }) => {
                const searchIndex = new Fuse(flattenedLinks, {
                    keys: ['link'],
                    threshold: 0.4,
                });

                searchIndexRef.current = searchIndex;
                return searchIndex;
            }
        );

        return await searchIndexLoaderRef.current;
    }, [flattenedLinks]);

    useEffect(() => {
        if (searchValue === '') {
            setMatch(undefined);
            return undefined;
        }

        let isCancelled = false;

        loadSearchIndex()
            .then((searchIndex) => {
                if (isCancelled) {
                    return undefined;
                }

                const results = searchIndex.search(searchValue);
                setMatch(results[0]?.item);
            })
            .catch((error: unknown) => {
                console.error('Failed to load search index:', error);
                if (!isCancelled) {
                    setMatch(undefined);
                }
            });

        return () => {
            isCancelled = true;
        };
    }, [loadSearchIndex, searchValue]);

    useEffect(() => {
        inputFocusedRef.current = inputFocused;
    }, [inputFocused]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isPrintableKey =
                e.key.length === 1 && !e.altKey && !e.ctrlKey && !e.metaKey;

            if (e.key === 'Escape' && inputFocusedRef.current) {
                e.preventDefault();
                pendingInputRef.current = '';
                syncSearchValue('');
                inputRef.current?.blur();
                return;
            }

            if (inputFocusedRef.current) {
                return;
            }

            if (e.key === ' ') {
                e.preventDefault();
                inputRef.current?.focus();
                return;
            }

            if (!isPrintableKey) {
                return;
            }

            e.preventDefault();
            pendingInputRef.current += e.key;
            inputRef.current?.focus();
            flushPendingInput();
        };

        globalThis.addEventListener('keydown', handleKeyDown);
        return () => {
            globalThis.removeEventListener('keydown', handleKeyDown);
        };
    }, [flushPendingInput, syncSearchValue]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (match?.link !== undefined && match.link in links) {
            globalThis.location.href = links[match.link as keyof typeof links];
        }
    };

    const handleClearSearch = () => {
        if (inputRef.current) {
            inputRef.current.blur();
        }
    };

    const handleSearchBlur = () => {
        inputFocusedRef.current = false;
        pendingInputRef.current = '';
        setInputFocused(false);
        syncSearchValue('');
        setMatch(undefined);
    };

    const handleSearchFocus = () => {
        inputFocusedRef.current = true;
        setInputFocused(true);
        flushPendingInput();
        loadSearchIndex().catch((error: unknown) => {
            console.error('Failed to preload search index:', error);
        });
    };

    return (
        <section className='cover'>
            <Mountains />
            <Controls />
            <div className={`cover-content ${inputFocused ? 'focused' : ''}`}>
                <div className='title-container'>
                    <Weather />
                    <span className='title'>{time}</span>
                </div>
                <div className='search'>
                    <form className='search-form' onSubmit={handleSubmit}>
                        <div className='search-icon'>
                            <Search className='icon' size={24} />
                        </div>
                        <input
                            className='search-input'
                            type='text'
                            placeholder='Search bookmarks'
                            autoComplete='off'
                            ref={inputRef}
                            value={searchValue}
                            onChange={(e) => {
                                setSearchValue(e.target.value);
                            }}
                            onFocus={handleSearchFocus}
                            onBlur={handleSearchBlur}
                        />
                    </form>
                </div>
            </div>

            <Suspense fallback={undefined}>
                <LinkPanel
                    hidden={hideLinks}
                    isSearchNav={inputFocused}
                    highlightedLink={match?.link}
                    highlightedCategory={match?.category}
                    onClearSearch={handleClearSearch}
                />
            </Suspense>
        </section>
    );
};
