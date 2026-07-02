import { useCallback, useEffect, useRef, useState } from 'react';

import { isBrowser } from '@/utils/browserEnv';

export const useHideLinks = (): { hideLinks: boolean } => {
    const ticking = useRef(false);
    const [hideLinks, setHideLinks] = useState(
        () => isBrowser() && globalThis.scrollY !== 0
    );

    const handleScroll = useCallback(() => {
        setHideLinks(globalThis.scrollY !== 0);
    }, []);

    const onScroll = useCallback(() => {
        if (!ticking.current) {
            globalThis.requestAnimationFrame(() => {
                handleScroll();
                ticking.current = false;
            });
            ticking.current = true;
        }
    }, [handleScroll]);

    useEffect(() => {
        globalThis.addEventListener('scroll', onScroll, { passive: true });
        return () => {
            globalThis.removeEventListener('scroll', onScroll);
        };
    }, [onScroll]);

    return { hideLinks };
};
