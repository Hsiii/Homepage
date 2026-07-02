import { useCallback, useEffect, useState } from 'react';

import { defaultBookmarkTree } from '@/constants/linkTree';
import type { BookmarkCategoryData } from '@/types/bookmarks';
import {
    coerceBookmarkTree,
    parseBrowserBookmarks,
    serializeBrowserBookmarks,
} from '@/utils/bookmarks';
import { isBrowser } from '@/utils/browserEnv';

const bookmarkStorageKey = 'homepage.bookmarks';
const bookmarkStorageVersion = 1;

export type BookmarkStatusMessageKey =
    | 'bookmarksExported'
    | 'bookmarksImportEmpty'
    | 'bookmarksImportFailed'
    | 'bookmarksImported'
    | 'bookmarksReset'
    | 'bookmarksStorageFailed';

export interface BookmarkStatus {
    messageKey: BookmarkStatusMessageKey;
    type: 'error' | 'success';
}

export interface BookmarkControls {
    bookmarkTree: BookmarkCategoryData[];
    exportBookmarks: () => void;
    importBookmarks: (file: File) => Promise<void>;
    isCustom: boolean;
    resetBookmarks: () => void;
    status?: BookmarkStatus;
}

const getStoredBookmarkTree = (): BookmarkCategoryData[] | undefined => {
    if (!isBrowser()) {
        return undefined;
    }

    try {
        const storedValue = globalThis.localStorage.getItem(bookmarkStorageKey);
        if (storedValue === null) {
            return undefined;
        }

        const parsedValue: unknown = JSON.parse(storedValue);
        if (
            typeof parsedValue === 'object' &&
            parsedValue !== null &&
            'categories' in parsedValue
        ) {
            return coerceBookmarkTree(
                (parsedValue as { categories: unknown }).categories
            );
        }

        return coerceBookmarkTree(parsedValue);
    } catch {
        return undefined;
    }
};

const storeBookmarkTree = (bookmarkTree: readonly BookmarkCategoryData[]) => {
    globalThis.localStorage.setItem(
        bookmarkStorageKey,
        JSON.stringify({
            categories: bookmarkTree,
            version: bookmarkStorageVersion,
        })
    );
};

export const useBookmarks = (): BookmarkControls => {
    const [bookmarkTree, setBookmarkTree] =
        useState<BookmarkCategoryData[]>(defaultBookmarkTree);
    const [isCustom, setIsCustom] = useState(false);
    const [status, setStatus] = useState<BookmarkStatus>();

    useEffect(() => {
        const storedBookmarkTree = getStoredBookmarkTree();
        if (storedBookmarkTree === undefined) {
            return;
        }

        setBookmarkTree(storedBookmarkTree);
        setIsCustom(true);
    }, []);

    const exportBookmarks = useCallback(() => {
        const html = serializeBrowserBookmarks(bookmarkTree);
        const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
        const url = globalThis.URL.createObjectURL(blob);
        const anchor = globalThis.document.createElement('a');

        anchor.href = url;
        anchor.download = 'homepage-bookmarks.html';
        anchor.style.display = 'none';

        anchor.click();
        globalThis.requestAnimationFrame(() => {
            globalThis.URL.revokeObjectURL(url);
        });

        setStatus({ messageKey: 'bookmarksExported', type: 'success' });
    }, [bookmarkTree]);

    const importBookmarks = useCallback(async (file: File) => {
        try {
            const nextBookmarkTree = parseBrowserBookmarks(await file.text());
            if (nextBookmarkTree.length === 0) {
                setStatus({
                    messageKey: 'bookmarksImportEmpty',
                    type: 'error',
                });
                return;
            }

            try {
                storeBookmarkTree(nextBookmarkTree);
            } catch {
                setStatus({
                    messageKey: 'bookmarksStorageFailed',
                    type: 'error',
                });
                return;
            }

            setBookmarkTree(nextBookmarkTree);
            setIsCustom(true);
            setStatus({ messageKey: 'bookmarksImported', type: 'success' });
        } catch {
            setStatus({ messageKey: 'bookmarksImportFailed', type: 'error' });
        }
    }, []);

    const resetBookmarks = useCallback(() => {
        try {
            globalThis.localStorage.removeItem(bookmarkStorageKey);
        } catch {
            setStatus({ messageKey: 'bookmarksStorageFailed', type: 'error' });
            return;
        }

        setBookmarkTree(defaultBookmarkTree);
        setIsCustom(false);
        setStatus({ messageKey: 'bookmarksReset', type: 'success' });
    }, []);

    return {
        bookmarkTree,
        exportBookmarks,
        importBookmarks,
        isCustom,
        resetBookmarks,
        status,
    };
};
