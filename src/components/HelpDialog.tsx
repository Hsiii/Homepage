import { Bookmark, Keyboard, MousePointerClick, Search } from 'lucide-react';

import { mobileViewportQuery } from '@/constants/breakpoints';
import { useMediaQuery } from '@/hooks/useMediaQuery';

interface HelpDialogProps {
    isMouseMode: boolean;
    onSelectKeyboardMode: () => void;
    onSelectMouseMode: () => void;
}

export const HelpDialog: React.FC<HelpDialogProps> = ({
    isMouseMode,
    onSelectKeyboardMode,
    onSelectMouseMode,
}) => {
    const isMobileViewport = useMediaQuery(mobileViewportQuery);

    return (
        <div className='help-content'>
            <div className='help-switch'>
                <button
                    className={`help-switch-btn ${isMouseMode ? 'active' : ''}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        onSelectMouseMode();
                    }}
                >
                    <MousePointerClick className='icon' size={24} />
                </button>
                <button
                    className={`help-switch-btn ${isMouseMode ? '' : 'active'}`}
                    onClick={(event) => {
                        event.stopPropagation();
                        onSelectKeyboardMode();
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
                                {isMobileViewport
                                    ? 'Open bookmarks from the bookmark button. Swipe right or use back to close.'
                                    : 'Open bookmarks from the side bookmark panel.'}
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
                                Search bookmarks directly, or use the Google row
                                for web search.
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
    );
};
