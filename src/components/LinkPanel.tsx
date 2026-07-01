import { useEffect, useMemo, useState } from 'react';
import { Bookmark } from 'lucide-react';

import { mobileViewportQuery } from '@/constants/breakpoints';
import { linkTree } from '@/constants/linkTree';
import { useLinkNavigation } from '@/hooks/useLinkNavigation';
import { useMediaQuery } from '@/hooks/useMediaQuery';
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
    const { selectedCategory, isMouseNav, startMouseNav, endMouseNav } =
        useLinkNavigation(isSearchNav, onClearSearch, highlightedCategory);

    const [windowHeight, setWindowHeight] = useState(globalThis.innerHeight);
    const [isMobileOpen, setIsMobileOpen] = useState(false);
    const isMobileViewport = useMediaQuery(mobileViewportQuery);
    const isExpanded = selectedCategory !== 0;

    useEffect(() => {
        const onResize = () => {
            setWindowHeight(globalThis.innerHeight);
        };
        globalThis.addEventListener('resize', onResize);
        return () => {
            globalThis.removeEventListener('resize', onResize);
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
                        padding={panelPaddings[i]}
                        highlightedLink={highlightedLink}
                    />
                ))}
            </div>
        </nav>
    );
};
