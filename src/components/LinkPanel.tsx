import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Bookmark } from 'lucide-react';

import { linkTree } from '@/constants/linkTree';
import { useLinkNavigation } from '@/hooks/useLinkNavigation';
import { LinkCategory } from './LinkCategory';
import { MobileBookmarks } from './MobileBookmarks';

import './LinkPanel.css';

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
    const mobileBreakpointRef = useRef<HTMLSpanElement>(null);
    const {
        selectedCategory,
        isKeyboardNav,
        isMouseNav,
        startMouseNav,
        endMouseNav,
    } = useLinkNavigation(isSearchNav, onClearSearch, highlightedCategory);

    const [windowHeight, setWindowHeight] = useState(globalThis.innerHeight);
    const [isMobileViewport, setIsMobileViewport] = useState(false);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const isExpanded = isKeyboardNav ? true : selectedCategory !== 0;

    useEffect(() => {
        const onResize = () => {
            setWindowHeight(globalThis.innerHeight);
        };
        globalThis.addEventListener('resize', onResize);
        return () => {
            globalThis.removeEventListener('resize', onResize);
        };
    }, []);

    useLayoutEffect(() => {
        const updateMobileViewport = () => {
            const breakpointElement = mobileBreakpointRef.current;
            setIsMobileViewport(
                breakpointElement
                    ? globalThis.getComputedStyle(breakpointElement).display !==
                          'none'
                    : false
            );
        };

        updateMobileViewport();
        globalThis.addEventListener('resize', updateMobileViewport);
        return () => {
            globalThis.removeEventListener('resize', updateMobileViewport);
        };
    }, []);

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
            <span
                className='mobile-bookmark-breakpoint'
                ref={mobileBreakpointRef}
                aria-hidden='true'
            />
            {isMobileViewport && (
                <MobileBookmarks
                    disabled={isSearchNav}
                    hidden={hidden}
                    onClearSearch={onClearSearch}
                    onOpenChange={setIsMobileOpen}
                />
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
