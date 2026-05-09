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

export const Cover: React.FC = () => {
    const inputRef = useRef<HTMLInputElement>(null);
    const searchIndexRef = useRef<SearchIndex | undefined>(undefined);
    const searchIndexLoaderRef = useRef<Promise<SearchIndex> | undefined>(
        undefined
    );
    const { time } = useTime();
    const { hideLinks } = useHideLinks();
    const [inputFocused, setInputFocused] = useState(false);
    const [searchValue, setSearchValue] = useState('');
    const [match, setMatch] = useState<LinkItem | undefined>(undefined);

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
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === ' ' && !inputFocused) {
                e.preventDefault();
                inputRef.current?.focus();
            }

            if (e.key === 'Escape' && inputFocused) {
                e.preventDefault();
                if (inputRef.current) {
                    inputRef.current.value = '';
                    inputRef.current.blur();
                }
            }

            if (
                e.key === 'Enter' &&
                inputFocused &&
                isChillSearch(searchValue)
            ) {
                e.preventDefault();
                openChillLinks();
            }
        };

        globalThis.addEventListener('keydown', handleKeyDown);
        return () => {
            globalThis.removeEventListener('keydown', handleKeyDown);
        };
    }, [inputFocused, searchValue]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (isChillSearch(searchValue)) {
            openChillLinks();
            return;
        }

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
        setInputFocused(false);
        setSearchValue('');
        setMatch(undefined);
        if (inputRef.current) {
            inputRef.current.value = '';
        }
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
