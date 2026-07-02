import { useEffect, useState } from 'react';

import { isBrowser } from '@/utils/browserEnv';

const getMediaQueryMatch = (query: string): boolean =>
    isBrowser() && globalThis.matchMedia(query).matches;

export const useMediaQuery = (query: string): boolean => {
    const [matches, setMatches] = useState(() => getMediaQueryMatch(query));

    useEffect(() => {
        const mediaQueryList = globalThis.matchMedia(query);

        const updateMatches = () => {
            setMatches(mediaQueryList.matches);
        };

        updateMatches();
        mediaQueryList.addEventListener('change', updateMatches);
        return () => {
            mediaQueryList.removeEventListener('change', updateMatches);
        };
    }, [query]);

    return matches;
};
