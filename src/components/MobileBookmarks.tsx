import { useCallback, useEffect, useRef, useState } from 'react';
import { Bookmark, ChevronLeft } from 'lucide-react';

import { links } from '@/constants/links';
import { linkTree } from '@/constants/linkTree';

interface MobileBookmarksProps {
    disabled: boolean;
    hidden: boolean;
    onClearSearch: () => void;
    onOpenChange: (isOpen: boolean) => void;
}

const closeSwipeThreshold = 72;

export const MobileBookmarks: React.FC<MobileBookmarksProps> = ({
    disabled,
    hidden,
    onClearSearch,
    onOpenChange,
}) => {
    const swipeStartXRef = useRef<number | undefined>(undefined);
    const [isOpen, setIsOpen] = useState(false);
    const [swipeOffset, setSwipeOffset] = useState(0);

    const setPanelOpen = useCallback(
        (nextIsOpen: boolean) => {
            setIsOpen(nextIsOpen);
            onOpenChange(nextIsOpen);

            if (!nextIsOpen) {
                setSwipeOffset(0);
                swipeStartXRef.current = undefined;
            }
        },
        [onOpenChange]
    );

    useEffect(() => {
        if (disabled) {
            setPanelOpen(false);
        }
    }, [disabled, setPanelOpen]);

    return (
        <>
            <button
                className={`mobile-bookmark-button ${
                    hidden || disabled ? 'hidden' : ''
                }`}
                type='button'
                aria-label='Open bookmarks'
                onClick={() => {
                    onClearSearch();
                    setPanelOpen(true);
                }}
            >
                <Bookmark className='icon' size={24} />
            </button>
            <div
                className={`mobile-bookmark-page ${isOpen ? 'open' : ''}`}
                style={
                    {
                        '--mobile-swipe-offset': `${swipeOffset}px`,
                    } as React.CSSProperties
                }
                aria-hidden={!isOpen}
                onTouchStart={(event) => {
                    swipeStartXRef.current = event.touches[0].clientX;
                    setSwipeOffset(0);
                }}
                onTouchMove={(event) => {
                    const startX = swipeStartXRef.current;
                    if (startX === undefined) {
                        return;
                    }
                    const currentX = event.touches[0].clientX;
                    setSwipeOffset(Math.max(0, currentX - startX));
                }}
                onTouchEnd={() => {
                    if (swipeOffset >= closeSwipeThreshold) {
                        setPanelOpen(false);
                        return;
                    }
                    setSwipeOffset(0);
                    swipeStartXRef.current = undefined;
                }}
            >
                <div className='mobile-bookmark-header'>
                    <button
                        className='mobile-bookmark-back'
                        type='button'
                        aria-label='Close bookmarks'
                        onClick={() => {
                            setPanelOpen(false);
                        }}
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
    );
};
