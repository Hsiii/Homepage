import React, { useEffect, useRef, useState } from 'react';
import { useThemeTransition } from 'hooks';
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
    const { isDarkMode, toggleTheme } = useThemeTransition();
    const helpRef = useRef<HTMLDivElement>(null);

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
