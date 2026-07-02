import { useCallback, useEffect, useRef, useState } from 'react';

import { defaultBookmarkTree } from '@/constants/linkTree';
import type { BookmarkCategoryData } from '@/types/bookmarks';
import {
    coerceBookmarkTree,
    parseBrowserBookmarks,
    serializeBrowserBookmarks,
} from '@/utils/bookmarks';
import { isBrowser } from '@/utils/browserEnv';

const bookmarkApiPath = '/api/bookmarks';
const bookmarkStorageKey = 'homepage.bookmarks';
const bookmarkUserStorageKeyPrefix = 'homepage.bookmarks.user';
const bookmarkStorageVersion = 1;

export type BookmarkStatusMessageKey =
    | 'bookmarksExported'
    | 'bookmarksImportEmpty'
    | 'bookmarksImportFailed'
    | 'bookmarksImported'
    | 'bookmarksReset'
    | 'bookmarksStorageFailed'
    | 'bookmarksSyncFailed';

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
    updateCategoryIcon: (categoryIndex: number, icon: string) => void;
}

interface BookmarkApiResponse {
    categories?: BookmarkCategoryData[];
}

interface BookmarkAuthState {
    getToken: () => Promise<null | string>;
    isLoaded: boolean;
    isSignedIn: boolean | undefined;
    userId: null | string | undefined;
}

interface UseBookmarksOptions {
    auth?: BookmarkAuthState;
}

const getBookmarkStorageKey = (userId: string | undefined): string =>
    userId === undefined
        ? bookmarkStorageKey
        : `${bookmarkUserStorageKeyPrefix}.${userId}`;

const readStoredBookmarkTree = (
    storageKey: string
): BookmarkCategoryData[] | undefined => {
    const storedValue = globalThis.localStorage.getItem(storageKey);
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
};

const getStoredBookmarkTree = (
    userId?: string
): BookmarkCategoryData[] | undefined => {
    if (!isBrowser()) {
        return undefined;
    }

    try {
        return (
            (userId === undefined
                ? undefined
                : readStoredBookmarkTree(getBookmarkStorageKey(userId))) ??
            readStoredBookmarkTree(bookmarkStorageKey)
        );
    } catch {
        return undefined;
    }
};

const storeBookmarkTree = (
    bookmarkTree: readonly BookmarkCategoryData[],
    userId?: string
) => {
    globalThis.localStorage.setItem(
        getBookmarkStorageKey(userId),
        JSON.stringify({
            categories: bookmarkTree,
            version: bookmarkStorageVersion,
        })
    );
};

const removeStoredBookmarkTree = (userId?: string): void => {
    globalThis.localStorage.removeItem(getBookmarkStorageKey(userId));
};

const readBookmarkResponse = async (
    response: Response
): Promise<BookmarkApiResponse> => {
    const payload = (await response.json().catch(() => ({}))) as
        | BookmarkApiResponse
        | { error?: string };

    if (!response.ok) {
        throw new Error(
            'error' in payload && typeof payload.error === 'string'
                ? payload.error
                : 'Bookmark request failed.'
        );
    }

    if (!('categories' in payload) || payload.categories === undefined) {
        return {};
    }

    const categories = coerceBookmarkTree(payload.categories);
    if (categories === undefined) {
        throw new Error('Bookmark data is invalid.');
    }

    return { categories };
};

export const useBookmarks = (
    options: UseBookmarksOptions = {}
): BookmarkControls => {
    const getToken = options.auth?.getToken;
    const isAuthLoaded = options.auth?.isLoaded === true;
    const remoteUserId =
        isAuthLoaded &&
        options.auth?.isSignedIn === true &&
        typeof options.auth.userId === 'string'
            ? options.auth.userId
            : undefined;
    const [bookmarkTree, setBookmarkTree] =
        useState<BookmarkCategoryData[]>(defaultBookmarkTree);
    const [isCustom, setIsCustom] = useState(false);
    const [status, setStatus] = useState<BookmarkStatus>();
    const mutationVersionRef = useRef(0);

    useEffect(() => {
        const storedBookmarkTree = getStoredBookmarkTree();
        if (storedBookmarkTree === undefined) {
            return;
        }

        setBookmarkTree(storedBookmarkTree);
        setIsCustom(true);
    }, []);

    const getAuthHeaders = useCallback(async (): Promise<
        Record<'Authorization', string> | undefined
    > => {
        if (getToken === undefined || remoteUserId === undefined) {
            return undefined;
        }

        const token = await getToken();

        if (typeof token !== 'string') {
            return undefined;
        }

        return {
            Authorization: `Bearer ${token}`,
        };
    }, [getToken, remoteUserId]);

    const saveRemoteBookmarkTree = useCallback(
        async (
            nextBookmarkTree: readonly BookmarkCategoryData[],
            shouldReportError = true
        ): Promise<boolean> => {
            try {
                const headers = await getAuthHeaders();
                if (headers === undefined || remoteUserId === undefined) {
                    return false;
                }

                const response = await fetch(bookmarkApiPath, {
                    body: JSON.stringify({ categories: nextBookmarkTree }),
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json',
                    },
                    method: 'POST',
                });
                const payload = await readBookmarkResponse(response);

                try {
                    storeBookmarkTree(
                        payload.categories ?? nextBookmarkTree,
                        remoteUserId
                    );
                } catch {
                    // Local cache failures should not invalidate a remote save.
                }

                return true;
            } catch {
                if (shouldReportError) {
                    setStatus({
                        messageKey: 'bookmarksSyncFailed',
                        type: 'error',
                    });
                }

                return false;
            }
        },
        [getAuthHeaders, remoteUserId]
    );

    const clearRemoteBookmarks = useCallback(async (): Promise<boolean> => {
        try {
            const headers = await getAuthHeaders();
            if (headers === undefined) {
                return false;
            }

            const response = await fetch(bookmarkApiPath, {
                headers,
                method: 'DELETE',
            });

            if (!response.ok) {
                await readBookmarkResponse(response);
            }

            return true;
        } catch {
            setStatus({
                messageKey: 'bookmarksSyncFailed',
                type: 'error',
            });
            return false;
        }
    }, [getAuthHeaders]);

    useEffect(() => {
        if (getToken === undefined || !isAuthLoaded) {
            return undefined;
        }

        if (remoteUserId === undefined) {
            const storedBookmarkTree = getStoredBookmarkTree();

            setBookmarkTree(storedBookmarkTree ?? defaultBookmarkTree);
            setIsCustom(storedBookmarkTree !== undefined);
            return undefined;
        }

        const cachedBookmarkTree = getStoredBookmarkTree(remoteUserId);
        if (cachedBookmarkTree !== undefined) {
            setBookmarkTree(cachedBookmarkTree);
            setIsCustom(true);
        }

        let isCurrent = true;
        const loadMutationVersion = mutationVersionRef.current;

        const loadRemoteBookmarkTree = async () => {
            try {
                const headers = await getAuthHeaders();
                if (headers === undefined) {
                    return;
                }

                const response = await fetch(bookmarkApiPath, { headers });
                const payload = await readBookmarkResponse(response);

                if (
                    !isCurrent ||
                    mutationVersionRef.current !== loadMutationVersion
                ) {
                    return;
                }

                if (payload.categories !== undefined) {
                    setBookmarkTree(payload.categories);
                    setIsCustom(true);

                    try {
                        storeBookmarkTree(payload.categories, remoteUserId);
                    } catch {
                        // Keep the remote copy as the source of truth.
                    }
                    return;
                }

                if (cachedBookmarkTree !== undefined) {
                    await saveRemoteBookmarkTree(cachedBookmarkTree, false);
                }
            } catch {
                // Keep the cached or anonymous localStorage bookmarks as fallback.
            }
        };

        loadRemoteBookmarkTree().catch(() => undefined);

        return () => {
            isCurrent = false;
        };
    }, [
        getAuthHeaders,
        getToken,
        isAuthLoaded,
        remoteUserId,
        saveRemoteBookmarkTree,
    ]);

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

    const importBookmarks = useCallback(
        async (file: File) => {
            try {
                const nextBookmarkTree = parseBrowserBookmarks(
                    await file.text()
                );
                if (nextBookmarkTree.length === 0) {
                    setStatus({
                        messageKey: 'bookmarksImportEmpty',
                        type: 'error',
                    });
                    return;
                }

                try {
                    storeBookmarkTree(nextBookmarkTree, remoteUserId);
                } catch {
                    setStatus({
                        messageKey: 'bookmarksStorageFailed',
                        type: 'error',
                    });
                    return;
                }

                mutationVersionRef.current++;
                setBookmarkTree(nextBookmarkTree);
                setIsCustom(true);
                setStatus({ messageKey: 'bookmarksImported', type: 'success' });
                await saveRemoteBookmarkTree(nextBookmarkTree);
            } catch {
                setStatus({
                    messageKey: 'bookmarksImportFailed',
                    type: 'error',
                });
            }
        },
        [remoteUserId, saveRemoteBookmarkTree]
    );

    const resetBookmarks = useCallback(() => {
        try {
            removeStoredBookmarkTree(remoteUserId);
            if (remoteUserId !== undefined) {
                removeStoredBookmarkTree();
            }
        } catch {
            setStatus({ messageKey: 'bookmarksStorageFailed', type: 'error' });
            return;
        }

        mutationVersionRef.current++;
        setBookmarkTree(defaultBookmarkTree);
        setIsCustom(false);
        setStatus({ messageKey: 'bookmarksReset', type: 'success' });
        clearRemoteBookmarks().catch(() => undefined);
    }, [clearRemoteBookmarks, remoteUserId]);

    const updateCategoryIcon = useCallback(
        (categoryIndex: number, icon: string) => {
            if (
                categoryIndex < 0 ||
                categoryIndex >= bookmarkTree.length ||
                bookmarkTree[categoryIndex]?.icon === icon
            ) {
                return;
            }

            const nextBookmarkTree = bookmarkTree.map(
                (categoryData, currentIndex) =>
                    currentIndex === categoryIndex
                        ? { ...categoryData, icon }
                        : categoryData
            );

            try {
                storeBookmarkTree(nextBookmarkTree, remoteUserId);
            } catch {
                setStatus({
                    messageKey: 'bookmarksStorageFailed',
                    type: 'error',
                });
                return;
            }

            mutationVersionRef.current++;
            setBookmarkTree(nextBookmarkTree);
            setIsCustom(true);
            saveRemoteBookmarkTree(nextBookmarkTree).catch(() => undefined);
        },
        [bookmarkTree, remoteUserId, saveRemoteBookmarkTree]
    );

    return {
        bookmarkTree,
        exportBookmarks,
        importBookmarks,
        isCustom,
        resetBookmarks,
        status,
        updateCategoryIcon,
    };
};
