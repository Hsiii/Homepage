import { useEffect, useState } from 'react';

export const MobileWarning: React.FC = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(window.innerWidth < 600);
    }, []);

    return (
        isVisible && (
            <div
                className='mobile-warning-overlay'
                onClick={() => {
                    setIsVisible(false);
                }}
            >
                <div
                    className='mobile-warning-dialog'
                    onClick={(e) => {
                        e.stopPropagation();
                    }}
                    role='dialog'
                    aria-modal='true'
                >
                    <p>
                        This site is optimized for a desktop browser homepage.
                        For the best experience, please visit on a computer.
                    </p>
                    <button
                        className='mobile-warning-action-btn'
                        onClick={() => {
                            setIsVisible(false);
                        }}
                    >
                        Continue anyway
                    </button>
                </div>
            </div>
        )
    );
};
