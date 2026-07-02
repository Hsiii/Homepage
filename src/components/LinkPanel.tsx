import { useEffect, useMemo, useState } from 'react';
import { PanelLeft, PanelLeftClose } from 'lucide-react';

import { mobileViewportQuery } from '@/constants/breakpoints';
import { linkTree } from '@/constants/linkTree';
import { useLinkNavigation } from '@/hooks/useLinkNavigation';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { isBrowser } from '@/utils/browserEnv';
import { LinkCategory } from './LinkCategory';
import { MobileBookmarks } from './MobileBookmarks';
import { UserFloatingBar } from './UserFloatingBar';

interface LinkPanelProps {
    hidden: boolean;
    isClerkEnabled: boolean;
    isLockedOpen: boolean;
    isSearchNav: boolean;
    highlightedLink?: string;
    highlightedCategory?: number;
    onClearSearch: () => void;
    onToggleLockedOpen: () => void;
}

export const LinkPanel: React.FC<LinkPanelProps> = ({
    hidden,
    isClerkEnabled,
    isLockedOpen,
    isSearchNav,
    highlightedLink,
    highlightedCategory,
    onClearSearch,
    onToggleLockedOpen,
}) => {
    const {
        selectedCategory,
        isMouseNav,
        mouseLeaveCloseSignal,
        startMouseNav,
        endMouseNav,
    } = useLinkNavigation(isSearchNav, onClearSearch, highlightedCategory);

    const [windowHeight, setWindowHeight] = useState(() =>
        isBrowser() ? globalThis.innerHeight : 768
    );
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
            onMouseLeave={endMouseNav}
            aria-hidden={hidden}
            aria-expanded={
                isLockedOpen || isExpanded || (isMobileViewport && isMobileOpen)
            }
        >
            {isMobileViewport && (
                <MobileBookmarks
                    disabled={isSearchNav}
                    hidden={hidden}
                    onClearSearch={onClearSearch}
                    onOpenChange={setIsMobileOpen}
                />
            )}
            <div className={`trigger ${hidden && 'hidden'}`} />
            <div className='panel-lock-control'>
                <button
                    className='panel-lock-trigger'
                    type='button'
                    aria-label={
                        isLockedOpen
                            ? 'Unlock bookmark panel'
                            : 'Lock bookmark panel open'
                    }
                    aria-pressed={isLockedOpen}
                    onClick={onToggleLockedOpen}
                >
                    {isLockedOpen ? (
                        <PanelLeftClose className='icon' size={20} />
                    ) : (
                        <PanelLeft className='icon' size={20} />
                    )}
                </button>
            </div>
            <div
                className={[
                    'link-tree',
                    (isExpanded || isLockedOpen) && 'expanded',
                ]
                    .filter(Boolean)
                    .join(' ')}
            >
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
                <UserFloatingBar
                    closeMenusSignal={mouseLeaveCloseSignal}
                    isClerkEnabled={isClerkEnabled}
                />
            </div>
        </nav>
    );
};
