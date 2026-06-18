import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, ChevronLeft } from 'lucide-react';

import { links } from '@/constants/links';
import { linkTree } from '@/constants/linkTree';
import { useLinkNavigation } from '@/hooks/useLinkNavigation';
import { LinkCategory } from './LinkCategory';

import './LinkPanel.css';

const mobileBookmarkQuery = '(width < 600px)';

interface LinkPanelProps {
    hidden: boolean;
    isSearchNav: boolean;
    highlightedLink?: string;
    highlightedCategory?: number;
    onClearSearch: () => void;
}

export const LinkPanel: React.FC<LinkPanelProps> = ({
    hidden,
    isSearchNav,
    highlightedLink,
    highlightedCategory,
    onClearSearch,
}) => {
    const swipeStartXRef = useRef<number | undefined>(undefined);
    const {
        selectedCategory,
        isKeyboardNav,
        isMouseNav,
        startMouseNav,
        endMouseNav,
    } = useLinkNavigation(isSearchNav, onClearSearch, highlightedCategory);

    const [windowHeight, setWindowHeight] = useState(globalThis.innerHeight);
    const [isMobileViewport, setIsMobileViewport] = useState(
        () => globalThis.matchMedia(mobileBookmarkQuery).matches
    );
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const [mobileSwipeOffset, setMobileSwipeOffset] = useState(0);
    const isExpanded = isKeyboardNav ? true : selectedCategory !== 0;
    const closeMobilePanel = useCallback(() => {
        setIsMobileOpen(false);
        setMobileSwipeOffset(0);
        swipeStartXRef.current = undefined;
    }, []);

    useEffect(() => {
        const onResize = () => {
            setWindowHeight(globalThis.innerHeight);
        };
        globalThis.addEventListener('resize', onResize);
        return () => {
            globalThis.removeEventListener('resize', onResize);
        };
    }, []);

    useEffect(() => {
        const mediaQuery = globalThis.matchMedia(mobileBookmarkQuery);
        const onChange = () => {
            setIsMobileViewport(mediaQuery.matches);
        };

        onChange();
        mediaQuery.addEventListener('change', onChange);
        return () => {
            mediaQuery.removeEventListener('change', onChange);
        };
    }, []);

    useEffect(() => {
        if (isSearchNav || !isMobileViewport) {
            closeMobilePanel();
        }
    }, [closeMobilePanel, isMobileViewport, isSearchNav]);

    const panelPaddings = useMemo(() => {
        const remToPx = 16;
        const linkHeight = 3.5 * remToPx;

        return linkTree.map((categoryData, categoryIndex) => {
            const headerPosition =
                windowHeight / 2 +
                (categoryIndex + 1 - linkTree.length / 2 - 0.5) * linkHeight;
            const linksHeight = categoryData.links.length * linkHeight;
            let padding: number;
            padding =
                headerPosition + linksHeight / 2 <= windowHeight - remToPx
                    ? headerPosition - linksHeight / 2
                    : windowHeight - linksHeight - remToPx;
            if (padding < remToPx) {
                padding = remToPx;
            }
            return `${padding}px`;
        });
    }, [windowHeight]);

    return (
        <nav
            className={[
                'link-panel',
                isMouseNav && 'hoverEffective',
                isSearchNav && 'search-nav',
            ]
                .filter(Boolean)
                .join(' ')}
            onMouseDown={(e) => {
                e.preventDefault();
            }}
            onMouseMove={startMouseNav}
            onMouseOut={endMouseNav}
            aria-hidden={hidden}
            aria-expanded={isExpanded || (isMobileViewport && isMobileOpen)}
        >
            {isMobileViewport && (
                <>
                    <button
                        className={`mobile-bookmark-button ${hidden ? 'hidden' : ''}`}
                        type='button'
                        aria-label='Open bookmarks'
                        onClick={() => {
                            onClearSearch();
                            setIsMobileOpen(true);
                        }}
                    >
                        <Bookmark className='icon' size={24} />
                    </button>
                    <div
                        className={`mobile-bookmark-page ${
                            isMobileOpen ? 'open' : ''
                        }`}
                        style={
                            {
                                '--mobile-swipe-offset': `${mobileSwipeOffset}px`,
                            } as React.CSSProperties
                        }
                        aria-hidden={!isMobileOpen}
                        onTouchStart={(event) => {
                            swipeStartXRef.current = event.touches[0].clientX;
                            setMobileSwipeOffset(0);
                        }}
                        onTouchMove={(event) => {
                            const startX = swipeStartXRef.current;
                            if (startX === undefined) {
                                return;
                            }
                            const currentX = event.touches[0].clientX;
                            setMobileSwipeOffset(
                                Math.max(0, currentX - startX)
                            );
                        }}
                        onTouchEnd={() => {
                            if (mobileSwipeOffset >= 72) {
                                closeMobilePanel();
                                return;
                            }
                            setMobileSwipeOffset(0);
                            swipeStartXRef.current = undefined;
                        }}
                    >
                        <div className='mobile-bookmark-header'>
                            <button
                                className='mobile-bookmark-back'
                                type='button'
                                aria-label='Close bookmarks'
                                onClick={closeMobilePanel}
                            >
                                <ChevronLeft className='icon' size={24} />
                            </button>
                            <span>Bookmarks</span>
                        </div>
                        <div className='mobile-bookmark-list'>
                            {linkTree.map((categoryData) => (
                                <section
                                    className='mobile-bookmark-category'
                                    key={categoryData.category}
                                >
                                    <div className='mobile-bookmark-category-title'>
                                        {categoryData.icon}
                                        <span>{categoryData.category}</span>
                                    </div>
                                    <div className='mobile-bookmark-links'>
                                        {categoryData.links.map((link) => (
                                            <a
                                                className='mobile-bookmark-link'
                                                href={links[link]}
                                                key={link}
                                            >
                                                {link}
                                            </a>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </div>
                </>
            )}
            <div className={`trigger ${hidden && 'hidden'}`}>
                <div className='indicator' />
                <Bookmark className='icon' />
            </div>
            <div className={`link-tree ${isExpanded && 'expanded'}`}>
                <div className='panel' />
                {linkTree.map((categoryData, i) => (
                    <LinkCategory
                        key={categoryData.category}
                        categoryData={categoryData}
                        index={i}
                        selectedCategory={selectedCategory}
                        isMouseNav={isMouseNav}
                        keyboardNavEnabled={!isSearchNav}
                        padding={panelPaddings[i]}
                        highlightedLink={highlightedLink}
                    />
                ))}
            </div>
        </nav>
    );
};
