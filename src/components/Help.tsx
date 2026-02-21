import React, { useEffect, useRef, useState } from 'react';
import {
    Bookmark,
    HelpCircle,
    Keyboard,
    Moon,
    MousePointerClick,
    Search,
    Sun,
} from 'lucide-react';

import 'components/Help.css';

export const Help: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMouseMode, setIsMouseMode] = useState(true);
    const [isDarkMode, setIsDarkMode] = useState(
        () => globalThis.document.documentElement.dataset.theme === 'dark'
    );
    const helpRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const root = globalThis.document.documentElement;
        const isDark = root.dataset.theme === 'dark';
        root.style.colorScheme = isDark ? 'dark' : 'light';
        setIsDarkMode(isDark);
    }, []);

    useEffect(() => {
        const onClickOutside = (e: MouseEvent) => {
            if (
                isOpen &&
                helpRef.current?.contains(e.target as Node) === false
            ) {
                setIsOpen(false);
            }
        };
        globalThis.document.addEventListener('click', onClickOutside);
        return () => {
            globalThis.document.removeEventListener('click', onClickOutside);
        };
    }, [isOpen]);

    const toggleTheme = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        const root = globalThis.document.documentElement;
        const nextDarkMode = !isDarkMode;

        const { clientX, clientY } = e;
        const maxRadius = Math.hypot(
            Math.max(clientX, globalThis.innerWidth - clientX),
            Math.max(clientY, globalThis.innerHeight - clientY)
        );

        root.style.setProperty('--theme-transition-x', `${clientX}px`);
        root.style.setProperty('--theme-transition-y', `${clientY}px`);
        root.style.setProperty('--theme-transition-end', `${maxRadius}px`);

        const applyTheme = () => {
            root.dataset.theme = nextDarkMode ? 'dark' : 'light';
            root.style.colorScheme = nextDarkMode ? 'dark' : 'light';
            globalThis.localStorage.setItem(
                'theme',
                nextDarkMode ? 'dark' : 'light'
            );
            setIsDarkMode(nextDarkMode);
        };

        if ('startViewTransition' in globalThis.document) {
            (
                globalThis.document as Document & {
                    startViewTransition: (
                        callback: () => void
                    ) => ViewTransition;
                }
            ).startViewTransition(applyTheme);
            return;
        }

        applyTheme();
    };

    return (
        <div className='help' ref={helpRef}>
            <div className='help-actions'>
                <button
                    className='theme-icon-btn'
                    aria-label={
                        isDarkMode
                            ? 'Switch to light mode'
                            : 'Switch to dark mode'
                    }
                    onClick={toggleTheme}
                >
                    {isDarkMode ? (
                        <Moon className='icon' />
                    ) : (
                        <Sun className='icon' />
                    )}
                </button>
                <button
                    className='help-icon-btn'
                    aria-label='Help'
                    onClick={(e) => {
                        e.stopPropagation();
                        setIsOpen(!isOpen);
                    }}
                >
                    <HelpCircle className='icon' />
                </button>
            </div>

            <div className={`help-dialog ${isOpen ? 'open' : ''}`}>
                <div className='help-content'>
                    <div className='help-switch'>
                        <button
                            className={`help-switch-btn ${isMouseMode ? 'active' : ''}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMouseMode(true);
                            }}
                        >
                            <MousePointerClick className='icon' size={24} />
                        </button>
                        <button
                            className={`help-switch-btn ${isMouseMode ? '' : 'active'}`}
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsMouseMode(false);
                            }}
                        >
                            <Keyboard className='icon' size={24} />
                        </button>
                    </div>
                    <div className='help-desc-list'>
                        <div className='help-desc-item bookmark-desc'>
                            <div className='icon-container'>
                                <Bookmark className='icon' size={20} />
                            </div>
                            <div className='help-desc-text'>
                                {isMouseMode ? (
                                    <p className='key-info'>
                                        Access bookmark panel on the left.
                                    </p>
                                ) : (
                                    <>
                                        <div className='key-info'>
                                            expand panel
                                            <span className='key'>1</span>
                                        </div>
                                        <div className='key-info'>
                                            select / jump to
                                            <span className='key'>1 - 9</span>
                                        </div>
                                        <div className='key-info'>
                                            unselect / close
                                            <span className='key'>ESC</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                        <div className='help-desc-item searchbar-desc'>
                            <div className='icon-container'>
                                <Search className='icon' size={20} />
                            </div>
                            <div className='help-desc-text'>
                                {isMouseMode ? (
                                    <p className='key-info'>
                                        Search bookmarks directly.
                                    </p>
                                ) : (
                                    <>
                                        <div className='key-info'>
                                            start searching
                                            <span className='key'>SPACE</span>
                                        </div>
                                        <div className='key-info'>
                                            cancel search
                                            <span className='key'>ESC</span>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
