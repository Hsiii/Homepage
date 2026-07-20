import { useCallback, useEffect, useRef, useState } from 'react';

import type {
    BookmarkCategoryData,
    BookmarkFolderData,
    BookmarkLinkData,
    BookmarkNodeData,
} from '@/types/bookmarks';
import {
    coerceBookmarkTree,
    parseBrowserBookmarks,
    serializeBrowserBookmarks,
} from '@/utils/bookmarks';
import { isBrowser } from '@/utils/browserEnv';

const bookmarkApiPath = '/api/bookmarks';
const guestBookmarkStorageKey = 'homepage.bookmarks';
const userBookmarkStorageKeyPrefix = 'homepage.bookmarks.user';
const bookmarkStorageVersion = 2;

type BookmarkStatusMessageKey =
    | 'bookmarksExported'
    | 'bookmarksImportEmpty'
    | 'bookmarksImportFailed'
    | 'bookmarksStorageFailed'
    | 'bookmarksSyncFailed';

export interface BookmarkStatus {
    messageKey: BookmarkStatusMessageKey;
    type: 'error' | 'success';
}

export type BookmarkSaveState = 'error' | 'idle' | 'saved' | 'saving';

export interface BookmarkCategoryInput {
    category: string;
    icon?: string;
}

export interface BookmarkFolderInput {
    icon?: string;
    title: string;
}

export interface BookmarkInput {
    title: string;
    url: string;
}

export interface BookmarkLocationInput {
    categoryIndex: number;
    folderPath?: string[];
}

export interface BookmarkControls {
    addBookmark: (categoryIndex: number, bookmark: BookmarkInput) => boolean;
    addBookmarksToLocation: (
        location: BookmarkLocationInput,
        bookmarks: readonly BookmarkInput[]
    ) => number;
    addBookmarkToLocation: (
        location: BookmarkLocationInput,
        bookmark: BookmarkInput
    ) => boolean;
    addCategory: (category: BookmarkCategoryInput) => boolean;
    addFolder: (
        location: BookmarkLocationInput,
        folder: BookmarkFolderInput
    ) => boolean;
    bookmarkTree: BookmarkCategoryData[];
    deleteBookmark: (categoryIndex: number, bookmarkId: string) => boolean;
    deleteCategory: (categoryIndex: number) => boolean;
    deleteFolder: (location: BookmarkLocationInput) => boolean;
    exportBookmarks: () => void;
    importBookmarks: (file: File) => Promise<void>;
    canEdit: boolean;
    isLoading: boolean;
    moveBookmarkNode: (
        source: BookmarkLocationInput,
        nodeId: string,
        destination: BookmarkLocationInput,
        destinationIndex?: number
    ) => boolean;
    replaceBookmarkTree: (
        bookmarkTree: readonly BookmarkCategoryData[]
    ) => boolean;
    saveState: BookmarkSaveState;
    status?: BookmarkStatus;
    updateBookmark: (
        categoryIndex: number,
        bookmarkId: string,
        bookmark: BookmarkInput,
        nextCategoryIndex?: number
    ) => boolean;
    updateBookmarkInLocation: (
        location: BookmarkLocationInput,
        bookmarkId: string,
        bookmark: BookmarkInput,
        nextLocation?: BookmarkLocationInput
    ) => boolean;
    updateCategory: (
        categoryIndex: number,
        category: BookmarkCategoryInput
    ) => boolean;
    updateCategoryIcon: (categoryIndex: number, icon: string) => void;
    updateFolder: (
        location: BookmarkLocationInput,
        folder: BookmarkFolderInput
    ) => boolean;
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
    initialBookmarkTree?: BookmarkCategoryData[];
}

const readStoredBookmarkTree = (
    storageKey: string
): BookmarkCategoryData[] | undefined => {
    if (!isBrowser()) {
        return undefined;
    }

    try {
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
    } catch {
        return undefined;
    }
};

const storeBookmarkTree = (
    storageKey: string,
    bookmarkTree: readonly BookmarkCategoryData[]
): void => {
    globalThis.localStorage.setItem(
        storageKey,
        JSON.stringify({
            categories: bookmarkTree,
            version: bookmarkStorageVersion,
        })
    );
};

const getUserBookmarkStorageKey = (userId: string): string =>
    `${userBookmarkStorageKeyPrefix}.${userId}`;

const readGuestBookmarkTree = (): BookmarkCategoryData[] | undefined =>
    readStoredBookmarkTree(guestBookmarkStorageKey);

const readUserBookmarkTree = (
    userId: string
): BookmarkCategoryData[] | undefined =>
    readStoredBookmarkTree(getUserBookmarkStorageKey(userId));

const storeGuestBookmarkTree = (
    bookmarkTree: readonly BookmarkCategoryData[]
): void => {
    storeBookmarkTree(guestBookmarkStorageKey, bookmarkTree);
};

const storeUserBookmarkTree = (
    userId: string,
    bookmarkTree: readonly BookmarkCategoryData[]
): void => {
    storeBookmarkTree(getUserBookmarkStorageKey(userId), bookmarkTree);
};

const normalizeInputText = (value: string): string =>
    value.replaceAll(/\s+/g, ' ').trim();

const createEntityId = (prefix: string): string => {
    if (typeof globalThis.crypto.randomUUID === 'function') {
        return `${prefix}-${globalThis.crypto.randomUUID()}`;
    }

    return `${prefix}-${Date.now().toString(36)}`;
};

const createBookmarkId = (): string => createEntityId('bookmark');

const createFolderId = (): string => createEntityId('folder');

const fallbackCategory: BookmarkCategoryData = {
    category: 'Bookmarks',
    children: [],
    id: 'fallback-category-bookmarks',
    links: [],
};
const emptyBookmarkTree: BookmarkCategoryData[] = [];

const hasBookmarkNode = (
    nodes: readonly BookmarkNodeData[],
    bookmarkId: string
): boolean =>
    nodes.some((node) =>
        node.type === 'link'
            ? node.id === bookmarkId
            : hasBookmarkNode(node.children, bookmarkId)
    );

const updateBookmarkNodes = (
    nodes: readonly BookmarkNodeData[],
    bookmarkId: string,
    bookmark: BookmarkLinkData
): BookmarkNodeData[] =>
    nodes.map((node) => {
        if (node.type === 'link') {
            return node.id === bookmarkId ? bookmark : node;
        }

        return {
            ...node,
            children: updateBookmarkNodes(node.children, bookmarkId, bookmark),
        };
    });

const deleteBookmarkNodes = (
    nodes: readonly BookmarkNodeData[],
    bookmarkId: string
): BookmarkNodeData[] =>
    nodes.flatMap((node): BookmarkNodeData[] => {
        if (node.type === 'link') {
            return node.id === bookmarkId ? [] : [node];
        }

        return [
            {
                ...node,
                children: deleteBookmarkNodes(node.children, bookmarkId),
            },
        ];
    });

const normalizeFolderPath = (location: BookmarkLocationInput): string[] =>
    location.folderPath ?? [];

const getNodesAtFolderPath = (
    nodes: readonly BookmarkNodeData[],
    folderPath: readonly string[]
): readonly BookmarkNodeData[] | undefined => {
    if (folderPath.length === 0) {
        return nodes;
    }

    const folder = nodes.find(
        (node): node is BookmarkFolderData =>
            node.type === 'folder' && node.id === folderPath[0]
    );

    return folder === undefined
        ? undefined
        : getNodesAtFolderPath(folder.children, folderPath.slice(1));
};

const updateNodesAtFolderPath = (
    nodes: readonly BookmarkNodeData[],
    folderPath: readonly string[],
    updateNodes: (
        nodes: readonly BookmarkNodeData[]
    ) => BookmarkNodeData[] | undefined
): BookmarkNodeData[] | undefined => {
    if (folderPath.length === 0) {
        return updateNodes(nodes);
    }

    const folderId = folderPath[0];
    const remainingPath = folderPath.slice(1);

    for (const [nodeIndex, node] of nodes.entries()) {
        if (node.type !== 'folder' || node.id !== folderId) {
            continue;
        }

        const nextChildren = updateNodesAtFolderPath(
            node.children,
            remainingPath,
            updateNodes
        );

        if (nextChildren === undefined) {
            return undefined;
        }

        return nodes.map((currentNode, currentIndex) =>
            currentIndex === nodeIndex
                ? {
                      ...node,
                      children: nextChildren,
                  }
                : currentNode
        );
    }

    return undefined;
};

const updateFolderAtPath = (
    nodes: readonly BookmarkNodeData[],
    folderPath: readonly string[],
    updateFolder: (folder: BookmarkFolderData) => BookmarkFolderData
): BookmarkNodeData[] | undefined => {
    if (folderPath.length === 0) {
        return undefined;
    }

    const folderId = folderPath[0];
    const remainingPath = folderPath.slice(1);

    for (const [nodeIndex, node] of nodes.entries()) {
        if (node.type !== 'folder' || node.id !== folderId) {
            continue;
        }

        if (remainingPath.length === 0) {
            return nodes.map((currentNode, currentIndex) =>
                currentIndex === nodeIndex ? updateFolder(node) : currentNode
            );
        }

        const nextChildren = updateFolderAtPath(
            node.children,
            remainingPath,
            updateFolder
        );

        if (nextChildren === undefined) {
            return undefined;
        }

        return nodes.map((currentNode, currentIndex) =>
            currentIndex === nodeIndex
                ? {
                      ...node,
                      children: nextChildren,
                  }
                : currentNode
        );
    }

    return undefined;
};

const deleteFolderAtPath = (
    nodes: readonly BookmarkNodeData[],
    folderPath: readonly string[]
): BookmarkNodeData[] | undefined => {
    if (folderPath.length === 0) {
        return undefined;
    }

    const folderId = folderPath[0];
    const remainingPath = folderPath.slice(1);

    if (remainingPath.length === 0) {
        const nextNodes = nodes.filter(
            (node) => node.type !== 'folder' || node.id !== folderId
        );

        return nextNodes.length === nodes.length ? undefined : nextNodes;
    }

    return updateFolderAtPath(nodes, [folderId], (folder) => {
        const nextChildren = deleteFolderAtPath(folder.children, remainingPath);

        return nextChildren === undefined
            ? folder
            : {
                  ...folder,
                  children: nextChildren,
              };
    });
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
    const { initialBookmarkTree } = options;
    const hasAuth = options.auth !== undefined;
    const getToken = options.auth?.getToken;
    const isAuthLoaded = options.auth?.isLoaded === true;
    const remoteUserId =
        isAuthLoaded &&
        options.auth?.isSignedIn === true &&
        typeof options.auth.userId === 'string'
            ? options.auth.userId
            : undefined;
    const [bookmarkTree, setBookmarkTree] = useState<BookmarkCategoryData[]>(
        initialBookmarkTree ?? emptyBookmarkTree
    );
    const [status, setStatus] = useState<BookmarkStatus>();
    const [isLoading, setIsLoading] = useState(
        hasAuth && initialBookmarkTree === undefined
    );
    const [saveState, setSaveState] = useState<BookmarkSaveState>(
        hasAuth ? 'idle' : 'saved'
    );
    const mutationVersionRef = useRef(0);
    const saveOperationRef = useRef(0);
    const remoteSaveQueueRef = useRef<Promise<void>>(Promise.resolve());

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
            shouldReportError = true,
            saveOperation?: number
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
                    storeUserBookmarkTree(
                        remoteUserId,
                        payload.categories ?? nextBookmarkTree
                    );
                } catch {
                    // The remote copy remains authoritative if the cache fails.
                }

                if (saveOperation === saveOperationRef.current) {
                    setSaveState('saved');
                }

                return true;
            } catch {
                if (saveOperation === saveOperationRef.current) {
                    setSaveState('error');
                }
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

    const commitBookmarkTree = useCallback(
        (nextBookmarkTree: readonly BookmarkCategoryData[]) => {
            if (hasAuth && !isAuthLoaded) {
                return false;
            }

            const normalizedBookmarkTree =
                coerceBookmarkTree(nextBookmarkTree) ?? [];

            mutationVersionRef.current++;
            setBookmarkTree([...normalizedBookmarkTree]);
            if (remoteUserId === undefined) {
                try {
                    storeGuestBookmarkTree(normalizedBookmarkTree);
                } catch {
                    setSaveState('error');
                    setStatus({
                        messageKey: 'bookmarksStorageFailed',
                        type: 'error',
                    });
                    return false;
                }
                setSaveState('saved');
            } else {
                try {
                    storeUserBookmarkTree(remoteUserId, normalizedBookmarkTree);
                } catch {
                    // Saving remotely should not depend on the local cache.
                }
                saveOperationRef.current++;
                const saveOperation = saveOperationRef.current;
                setSaveState('saving');
                remoteSaveQueueRef.current = remoteSaveQueueRef.current.then(
                    async () => {
                        await saveRemoteBookmarkTree(
                            normalizedBookmarkTree,
                            true,
                            saveOperation
                        );
                    }
                );
            }
            return true;
        },
        [hasAuth, isAuthLoaded, remoteUserId, saveRemoteBookmarkTree]
    );

    useEffect(() => {
        if (hasAuth && !isAuthLoaded) {
            setIsLoading(true);
            return undefined;
        }

        if (remoteUserId === undefined) {
            const storedBookmarkTree = readGuestBookmarkTree();

            setBookmarkTree(storedBookmarkTree ?? emptyBookmarkTree);
            setIsLoading(false);
            setSaveState('saved');
            return undefined;
        }

        if (initialBookmarkTree !== undefined) {
            setBookmarkTree(initialBookmarkTree);
            setIsLoading(false);
            setSaveState('saved');
            return undefined;
        }

        const cachedBookmarkTree = readUserBookmarkTree(remoteUserId);

        setBookmarkTree(cachedBookmarkTree ?? emptyBookmarkTree);

        let isCurrent = true;
        const loadMutationVersion = mutationVersionRef.current;
        setIsLoading(true);

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

                    try {
                        storeUserBookmarkTree(remoteUserId, payload.categories);
                    } catch {
                        // The fresh remote data can still be used without caching.
                    }
                }
            } catch {
                if (isCurrent) {
                    setSaveState('error');
                    setStatus({
                        messageKey: 'bookmarksSyncFailed',
                        type: 'error',
                    });
                }
            } finally {
                if (isCurrent) {
                    setIsLoading(false);
                }
            }
        };

        loadRemoteBookmarkTree().catch(() => undefined);

        return () => {
            isCurrent = false;
        };
    }, [
        getAuthHeaders,
        getToken,
        hasAuth,
        initialBookmarkTree,
        isAuthLoaded,
        remoteUserId,
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
            setIsLoading(true);
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

                commitBookmarkTree(nextBookmarkTree);
            } catch {
                setStatus({
                    messageKey: 'bookmarksImportFailed',
                    type: 'error',
                });
            } finally {
                setIsLoading(false);
            }
        },
        [commitBookmarkTree]
    );

    const addCategory = useCallback(
        (categoryInput: BookmarkCategoryInput) => {
            const category = normalizeInputText(categoryInput.category);
            const icon = normalizeInputText(categoryInput.icon ?? '');

            if (category === '') {
                return false;
            }

            return commitBookmarkTree([
                ...bookmarkTree,
                {
                    category,
                    children: [],
                    id: createEntityId('category'),
                    ...(icon === '' ? {} : { icon }),
                    links: [],
                },
            ]);
        },
        [bookmarkTree, commitBookmarkTree]
    );

    const updateCategory = useCallback(
        (categoryIndex: number, categoryInput: BookmarkCategoryInput) => {
            const category = normalizeInputText(categoryInput.category);
            const icon = normalizeInputText(categoryInput.icon ?? '');

            if (
                category === '' ||
                categoryIndex < 0 ||
                categoryIndex >= bookmarkTree.length
            ) {
                return false;
            }

            return commitBookmarkTree(
                bookmarkTree.map((categoryData, currentIndex) =>
                    currentIndex === categoryIndex
                        ? {
                              ...categoryData,
                              category,
                              ...(icon === '' ? {} : { icon }),
                          }
                        : categoryData
                )
            );
        },
        [bookmarkTree, commitBookmarkTree]
    );

    const deleteCategory = useCallback(
        (categoryIndex: number) => {
            if (categoryIndex < 0 || categoryIndex >= bookmarkTree.length) {
                return false;
            }

            const nextBookmarkTree = bookmarkTree.filter(
                (_categoryData, currentIndex) => currentIndex !== categoryIndex
            );

            return commitBookmarkTree(
                nextBookmarkTree.length === 0
                    ? [fallbackCategory]
                    : nextBookmarkTree
            );
        },
        [bookmarkTree, commitBookmarkTree]
    );

    const updateBookmarkLocation = useCallback(
        (
            location: BookmarkLocationInput,
            updateNodes: (
                nodes: readonly BookmarkNodeData[]
            ) => BookmarkNodeData[] | undefined
        ) => {
            const categoryData = bookmarkTree.at(location.categoryIndex);
            if (categoryData === undefined) {
                return false;
            }

            const nextChildren = updateNodesAtFolderPath(
                categoryData.children,
                normalizeFolderPath(location),
                updateNodes
            );

            if (nextChildren === undefined) {
                return false;
            }

            return commitBookmarkTree(
                bookmarkTree.map((currentCategoryData, currentIndex) =>
                    currentIndex === location.categoryIndex
                        ? {
                              ...currentCategoryData,
                              children: nextChildren,
                          }
                        : currentCategoryData
                )
            );
        },
        [bookmarkTree, commitBookmarkTree]
    );

    const addFolder = useCallback(
        (location: BookmarkLocationInput, folderInput: BookmarkFolderInput) => {
            const icon = normalizeInputText(folderInput.icon ?? '');
            const title = normalizeInputText(folderInput.title);
            if (title === '') {
                return false;
            }

            return updateBookmarkLocation(location, (nodes) => [
                ...nodes,
                {
                    children: [],
                    id: createFolderId(),
                    ...(icon === '' ? {} : { icon }),
                    title,
                    type: 'folder',
                },
            ]);
        },
        [updateBookmarkLocation]
    );

    const updateFolder = useCallback(
        (location: BookmarkLocationInput, folderInput: BookmarkFolderInput) => {
            const icon = normalizeInputText(folderInput.icon ?? '');
            const title = normalizeInputText(folderInput.title);
            const folderPath = normalizeFolderPath(location);

            if (title === '' || folderPath.length === 0) {
                return false;
            }

            const categoryData = bookmarkTree.at(location.categoryIndex);
            if (categoryData === undefined) {
                return false;
            }

            const nextChildren = updateFolderAtPath(
                categoryData.children,
                folderPath,
                (folder) => ({
                    ...folder,
                    ...(icon === '' ? {} : { icon }),
                    title,
                })
            );

            if (nextChildren === undefined) {
                return false;
            }

            return commitBookmarkTree(
                bookmarkTree.map((currentCategoryData, currentIndex) =>
                    currentIndex === location.categoryIndex
                        ? {
                              ...currentCategoryData,
                              children: nextChildren,
                          }
                        : currentCategoryData
                )
            );
        },
        [bookmarkTree, commitBookmarkTree]
    );

    const deleteFolder = useCallback(
        (location: BookmarkLocationInput) => {
            const folderPath = normalizeFolderPath(location);

            if (folderPath.length === 0) {
                return false;
            }

            const categoryData = bookmarkTree.at(location.categoryIndex);
            if (categoryData === undefined) {
                return false;
            }

            const nextChildren = deleteFolderAtPath(
                categoryData.children,
                folderPath
            );

            if (nextChildren === undefined) {
                return false;
            }

            return commitBookmarkTree(
                bookmarkTree.map((currentCategoryData, currentIndex) =>
                    currentIndex === location.categoryIndex
                        ? {
                              ...currentCategoryData,
                              children: nextChildren,
                          }
                        : currentCategoryData
                )
            );
        },
        [bookmarkTree, commitBookmarkTree]
    );

    const moveBookmarkNode = useCallback(
        (
            source: BookmarkLocationInput,
            nodeId: string,
            destination: BookmarkLocationInput,
            destinationIndex?: number
        ) => {
            const sourceFolderPath = normalizeFolderPath(source);
            const destinationFolderPath = normalizeFolderPath(destination);
            const isSameLocation =
                source.categoryIndex === destination.categoryIndex &&
                sourceFolderPath.join('\n') ===
                    destinationFolderPath.join('\n');
            if (isSameLocation && destinationIndex === undefined) {
                return false;
            }

            const sourceCategory = bookmarkTree.at(source.categoryIndex);
            const destinationCategory = bookmarkTree.at(
                destination.categoryIndex
            );
            if (
                sourceCategory === undefined ||
                destinationCategory === undefined
            ) {
                return false;
            }

            const movedNode = getNodesAtFolderPath(
                sourceCategory.children,
                sourceFolderPath
            )?.find((node) => node.id === nodeId);
            if (
                movedNode === undefined ||
                (movedNode.type === 'folder' &&
                    destinationFolderPath.includes(movedNode.id))
            ) {
                return false;
            }

            if (isSameLocation) {
                const sourceNodes = getNodesAtFolderPath(
                    sourceCategory.children,
                    sourceFolderPath
                );
                const sourceIndex = sourceNodes?.findIndex(
                    (node) => node.id === nodeId
                );
                if (
                    sourceNodes === undefined ||
                    sourceIndex === undefined ||
                    sourceIndex < 0
                ) {
                    return false;
                }

                let insertionIndex = Math.max(
                    0,
                    Math.min(
                        destinationIndex ?? sourceNodes.length,
                        sourceNodes.length
                    )
                );
                if (sourceIndex < insertionIndex) {
                    insertionIndex--;
                }
                if (insertionIndex === sourceIndex) {
                    return false;
                }

                return updateBookmarkLocation(source, (nodes) => {
                    const nextNodes = nodes.filter(
                        (node) => node.id !== nodeId
                    );
                    nextNodes.splice(insertionIndex, 0, movedNode);
                    return nextNodes;
                });
            }

            const sourceChildren = updateNodesAtFolderPath(
                sourceCategory.children,
                sourceFolderPath,
                (nodes) => nodes.filter((node) => node.id !== nodeId)
            );

            if (sourceChildren === undefined) {
                return false;
            }

            const withoutSource = bookmarkTree.map((category, categoryIndex) =>
                categoryIndex === source.categoryIndex
                    ? { ...category, children: sourceChildren }
                    : category
            );
            const nextDestinationCategory = withoutSource.at(
                destination.categoryIndex
            );
            if (nextDestinationCategory === undefined) {
                return false;
            }

            const destinationChildren = updateNodesAtFolderPath(
                nextDestinationCategory.children,
                destinationFolderPath,
                (nodes) => {
                    const nextNodes = [...nodes];
                    const insertionIndex = Math.max(
                        0,
                        Math.min(
                            destinationIndex ?? nextNodes.length,
                            nextNodes.length
                        )
                    );
                    nextNodes.splice(insertionIndex, 0, movedNode);
                    return nextNodes;
                }
            );
            if (destinationChildren === undefined) {
                return false;
            }

            return commitBookmarkTree(
                withoutSource.map((category, categoryIndex) =>
                    categoryIndex === destination.categoryIndex
                        ? { ...category, children: destinationChildren }
                        : category
                )
            );
        },
        [bookmarkTree, commitBookmarkTree, updateBookmarkLocation]
    );

    const addBookmarkToLocation = useCallback(
        (location: BookmarkLocationInput, bookmarkInput: BookmarkInput) => {
            const title = normalizeInputText(bookmarkInput.title);
            const url = bookmarkInput.url.trim();

            if (title === '' || url === '') {
                return false;
            }

            const bookmark: BookmarkLinkData = {
                id: createBookmarkId(),
                title,
                type: 'link',
                url,
            };

            return updateBookmarkLocation(location, (nodes) => [
                ...nodes,
                bookmark,
            ]);
        },
        [updateBookmarkLocation]
    );

    const addBookmarksToLocation = useCallback(
        (
            location: BookmarkLocationInput,
            bookmarkInputs: readonly BookmarkInput[]
        ) => {
            const existingUrls = new Set(
                bookmarkTree.flatMap((category) =>
                    category.links.map((bookmark) => bookmark.url.trim())
                )
            );
            const bookmarks = bookmarkInputs.flatMap(
                (bookmarkInput): BookmarkLinkData[] => {
                    const title = normalizeInputText(bookmarkInput.title);
                    const url = bookmarkInput.url.trim();
                    if (title === '' || url === '' || existingUrls.has(url)) {
                        return [];
                    }

                    existingUrls.add(url);
                    return [
                        {
                            id: createBookmarkId(),
                            title,
                            type: 'link',
                            url,
                        },
                    ];
                }
            );

            if (bookmarks.length === 0) {
                return 0;
            }

            return updateBookmarkLocation(location, (nodes) => [
                ...nodes,
                ...bookmarks,
            ])
                ? bookmarks.length
                : 0;
        },
        [bookmarkTree, updateBookmarkLocation]
    );

    const addBookmark = useCallback(
        (categoryIndex: number, bookmarkInput: BookmarkInput) =>
            addBookmarkToLocation(
                {
                    categoryIndex,
                },
                bookmarkInput
            ),
        [addBookmarkToLocation]
    );

    const updateBookmarkInLocation = useCallback(
        (
            location: BookmarkLocationInput,
            bookmarkId: string,
            bookmarkInput: BookmarkInput,
            nextLocation = location
        ) => {
            const title = normalizeInputText(bookmarkInput.title);
            const url = bookmarkInput.url.trim();
            const sourceCategory = bookmarkTree.at(location.categoryIndex);
            const targetCategory = bookmarkTree.at(nextLocation.categoryIndex);
            const bookmark = sourceCategory?.links.find(
                (linkData) => linkData.id === bookmarkId
            );

            if (
                title === '' ||
                url === '' ||
                sourceCategory === undefined ||
                targetCategory === undefined ||
                bookmark === undefined
            ) {
                return false;
            }

            const sourceFolderPath = normalizeFolderPath(location);
            const targetFolderPath = normalizeFolderPath(nextLocation);
            const nextBookmark = {
                ...bookmark,
                title,
                url,
            };

            if (
                location.categoryIndex === nextLocation.categoryIndex &&
                sourceFolderPath.join('\n') === targetFolderPath.join('\n')
            ) {
                return updateBookmarkLocation(
                    location,
                    (nodes): BookmarkNodeData[] =>
                        updateBookmarkNodes(nodes, bookmarkId, nextBookmark)
                );
            }

            const nextBookmarkTree = bookmarkTree.map(
                (categoryData, currentIndex) => {
                    if (
                        currentIndex !== location.categoryIndex &&
                        currentIndex !== nextLocation.categoryIndex
                    ) {
                        return categoryData;
                    }

                    if (location.categoryIndex === nextLocation.categoryIndex) {
                        const withoutBookmark = updateNodesAtFolderPath(
                            categoryData.children,
                            sourceFolderPath,
                            (nodes) => deleteBookmarkNodes(nodes, bookmarkId)
                        );

                        if (withoutBookmark === undefined) {
                            return categoryData;
                        }

                        const withBookmark = updateNodesAtFolderPath(
                            withoutBookmark,
                            targetFolderPath,
                            (nodes) => [...nodes, nextBookmark]
                        );

                        return {
                            ...categoryData,
                            children: withBookmark ?? categoryData.children,
                        };
                    }

                    if (currentIndex === location.categoryIndex) {
                        const nextChildren = updateNodesAtFolderPath(
                            categoryData.children,
                            sourceFolderPath,
                            (nodes) => deleteBookmarkNodes(nodes, bookmarkId)
                        );

                        return {
                            ...categoryData,
                            children: nextChildren ?? categoryData.children,
                        };
                    }

                    const nextChildren = updateNodesAtFolderPath(
                        categoryData.children,
                        targetFolderPath,
                        (nodes) => [...nodes, nextBookmark]
                    );

                    return {
                        ...categoryData,
                        children: nextChildren ?? categoryData.children,
                    };
                }
            );

            return commitBookmarkTree(nextBookmarkTree);
        },
        [bookmarkTree, commitBookmarkTree, updateBookmarkLocation]
    );

    const updateBookmark = useCallback(
        (
            categoryIndex: number,
            bookmarkId: string,
            bookmarkInput: BookmarkInput,
            nextCategoryIndex = categoryIndex
        ) =>
            updateBookmarkInLocation(
                {
                    categoryIndex,
                },
                bookmarkId,
                bookmarkInput,
                {
                    categoryIndex: nextCategoryIndex,
                }
            ),
        [updateBookmarkInLocation]
    );

    const deleteBookmark = useCallback(
        (categoryIndex: number, bookmarkId: string) => {
            const categoryData = bookmarkTree.at(categoryIndex);

            if (
                categoryData === undefined ||
                !hasBookmarkNode(categoryData.children, bookmarkId)
            ) {
                return false;
            }

            return commitBookmarkTree(
                bookmarkTree.map((currentCategoryData, currentIndex) =>
                    currentIndex === categoryIndex
                        ? {
                              ...currentCategoryData,
                              children: deleteBookmarkNodes(
                                  currentCategoryData.children,
                                  bookmarkId
                              ),
                          }
                        : currentCategoryData
                )
            );
        },
        [bookmarkTree, commitBookmarkTree]
    );

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

            commitBookmarkTree(nextBookmarkTree);
        },
        [bookmarkTree, commitBookmarkTree]
    );

    const replaceBookmarkTree = useCallback(
        (nextBookmarkTree: readonly BookmarkCategoryData[]) =>
            commitBookmarkTree(nextBookmarkTree),
        [commitBookmarkTree]
    );

    return {
        addBookmark,
        addBookmarksToLocation,
        addBookmarkToLocation,
        addCategory,
        addFolder,
        bookmarkTree,
        canEdit: !hasAuth || isAuthLoaded,
        deleteBookmark,
        deleteCategory,
        deleteFolder,
        exportBookmarks,
        importBookmarks,
        isLoading,
        moveBookmarkNode,
        replaceBookmarkTree,
        saveState,
        status,
        updateBookmark,
        updateBookmarkInLocation,
        updateCategory,
        updateCategoryIcon,
        updateFolder,
    };
};
