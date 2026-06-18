import React, { useCallback, useState } from 'react';
import { Play, PlayOff } from 'lucide-react';

const animationStorageKey = 'animation-mode';
const skipAnimationMode = 'skip';
const normalAnimationMode = 'normal';

export const AnimationToggle: React.FC = () => {
    const [isSkipAnimation, setIsSkipAnimation] = useState(
        () =>
            globalThis.document.documentElement.dataset.animationMode ===
            skipAnimationMode
    );

    const updateAnimationMode = useCallback((nextSkipAnimation: boolean) => {
        const nextAnimationMode = nextSkipAnimation
            ? skipAnimationMode
            : normalAnimationMode;

        globalThis.document.documentElement.dataset.animationMode =
            nextAnimationMode;
        globalThis.localStorage.setItem(animationStorageKey, nextAnimationMode);
        setIsSkipAnimation(nextSkipAnimation);
    }, []);

    return (
        <button
            className='theme-icon-btn'
            aria-label={
                isSkipAnimation
                    ? 'Use normal animations'
                    : 'Skip rise animations'
            }
            title={
                isSkipAnimation
                    ? 'Use normal animations'
                    : 'Skip rise animations'
            }
            onClick={(event) => {
                event.stopPropagation();
                updateAnimationMode(!isSkipAnimation);
            }}
        >
            {isSkipAnimation ? (
                <PlayOff className='icon' />
            ) : (
                <Play className='icon' />
            )}
        </button>
    );
};
