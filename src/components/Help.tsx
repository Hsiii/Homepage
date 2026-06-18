import React, {
    lazy,
    Suspense,
    useCallback,
    useEffect,
    useRef,
    useState,
} from 'react';
import { HelpCircle } from 'lucide-react';

import './Help.css';

const loadHelpDialog = async () => await import('./HelpDialog');

const HelpDialog = lazy(
    async () =>
        await loadHelpDialog().then((module) => ({
            default: module.HelpDialog,
        }))
);

export const Help: React.FC = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [isMouseMode, setIsMouseMode] = useState(true);
    const helpRef = useRef<HTMLDivElement>(null);

    const preloadHelpDialog = useCallback(() => {
        loadHelpDialog().catch(() => undefined);
        return undefined;
    }, []);

    useEffect(() => {
        if (!isOpen) {
            return undefined;
        }

        const onClickOutside = (e: MouseEvent) => {
            if (helpRef.current?.contains(e.target as Node) === false) {
                setIsOpen(false);
            }
        };
        globalThis.document.addEventListener('click', onClickOutside);
        return () => {
            globalThis.document.removeEventListener('click', onClickOutside);
        };
    }, [isOpen]);

    return (
        <div className={`help-control ${isOpen ? 'open' : ''}`} ref={helpRef}>
            <button
                className='help-icon-btn'
                aria-label='Help'
                onFocus={preloadHelpDialog}
                onMouseEnter={preloadHelpDialog}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!isOpen) {
                        preloadHelpDialog();
                    }
                    setIsOpen(!isOpen);
                }}
            >
                <HelpCircle className='icon' />
            </button>

            <div className={`help-dialog ${isOpen ? 'open' : ''}`}>
                {isOpen ? (
                    <Suspense fallback={undefined}>
                        <HelpDialog
                            isMouseMode={isMouseMode}
                            onSelectKeyboardMode={() => {
                                setIsMouseMode(false);
                            }}
                            onSelectMouseMode={() => {
                                setIsMouseMode(true);
                            }}
                        />
                    </Suspense>
                ) : undefined}
            </div>
        </div>
    );
};
