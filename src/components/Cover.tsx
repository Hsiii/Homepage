import React, {
    lazy,
    Suspense,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import { links, linkTree } from '@constants';
import Fuse from 'fuse.js';
import { useHideLinks, useTime } from 'hooks';
import { Search } from 'lucide-react';

import { Help } from './Help.js';
import { Mountains } from './Mountains.js';
import { Weather } from './Weather.js';

import 'components/Cover.css';

const LinkPanel = lazy(
    async () =>
        await import('./LinkPanel.js').then((module) => ({
            default: module.LinkPanel,
        }))
);

interface LinkItem {
    category: number;
    link: string;
}

export const Cover: React.FC = () => {
    const inputRef = useRef<HTMLInputElement>(null);
    const { time } = useTime();
    const { hideLinks } = useHideLinks();
    const [inputFocused, setInputFocused] = useState(false);

    const [searchValue, setSearchValue] = useState('');

    const flattenedLinks = useMemo<LinkItem[]>(
        () =>
            linkTree.flatMap((category, categoryIndex) =>
                category.links.map((link) => ({
                    link,
                    category: categoryIndex + 1,
                }))
            ),
        []
    );

    const fuse = useMemo(
        () =>
            new Fuse(flattenedLinks, {
                keys: ['link'],
                threshold: 0.4,
            }),
        [flattenedLinks]
    );

    const match = useMemo(() => {
        if (searchValue === '') {
            return undefined;
        }
        const results = fuse.search(searchValue);
        return results.length > 0 ? results[0].item : undefined;
    }, [searchValue, fuse]);

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
        };

        globalThis.addEventListener('keydown', handleKeyDown);
        return () => {
            globalThis.removeEventListener('keydown', handleKeyDown);
        };
    }, [inputFocused]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (match?.link !== undefined && match.link in links) {
            globalThis.location.href =
                links[match.link as keyof typeof links];
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
        if (inputRef.current) {
            inputRef.current.value = '';
        }
    };

    return (
        <section className='cover'>
            <Mountains />
            <Help />
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
