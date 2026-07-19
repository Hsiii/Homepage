/* eslint-disable no-nested-ternary -- Visual state branches are clearest inline in this workspace. */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
    Bookmark,
    Check,
    ChevronDown,
    ChevronRight,
    CircleAlert,
    ClipboardPaste,
    Download,
    ExternalLink,
    FolderOpen,
    FolderPlus,
    Link as LinkIcon,
    LoaderCircle,
    Pencil,
    Plus,
    Search,
    Trash2,
    Undo2,
    Upload,
    X,
} from 'lucide-react';
import { createPortal } from 'react-dom';

import {
    categoryIconOptions,
    createBookmarkIcon,
    decorateBookmarkTree,
    normalizeCategoryIconSearch,
    resolveFolderIconName,
} from '@/constants/linkTree';
import type { BookmarkControls } from '@/hooks/useBookmarks';
import { useLocale } from '@/hooks/useLocale';
import type {
    BookmarkCategoryData,
    BookmarkFolderData,
    BookmarkLinkData,
    BookmarkNodeData,
} from '@/types/bookmarks';
import { isBookmarkFolder, isBookmarkLink } from '@/utils/bookmarks';

interface BookmarkManagerDialogProps {
    bookmarkControls: BookmarkControls;
    onClose: () => void;
}

interface BookmarkLocation {
    categoryIndex: number;
    folderPath: string[];
}

interface EditorDraft extends BookmarkLocation {
    bookmarkId?: string;
    destinationKey: string;
    icon: string;
    kind: 'bookmark' | 'category' | 'folder';
    mode: 'add' | 'edit';
    title: string;
    url: string;
}

interface DeleteRequest extends BookmarkLocation {
    bookmarkId?: string;
    kind: EditorDraft['kind'];
    label: string;
}

interface DraggedNode {
    id: string;
    isFolder: boolean;
    source: BookmarkLocation;
}

interface DestinationOption {
    key: string;
    label: string;
    location: BookmarkLocation;
}

interface FormErrors {
    title?: string;
    url?: string;
}

interface PastedBookmark {
    title: string;
    url: string;
}

const defaultIconName = 'Folder';
const folderPathSeparator = ' / ';
const maxVisibleIconOptions = 40;

const normalizeUrl = (value: string): string | undefined => {
    const trimmedValue = value.trim();
    if (trimmedValue === '' || /\s/.test(trimmedValue)) {
        return undefined;
    }

    const candidate = /^[a-z][\d+.a-z-]*:/i.test(trimmedValue)
        ? trimmedValue
        : `https://${trimmedValue}`;

    try {
        const url = new URL(candidate);
        return ['http:', 'https:'].includes(url.protocol) && url.hostname !== ''
            ? url.href
            : undefined;
    } catch {
        return undefined;
    }
};

const getFolderAtPath = (
    nodes: readonly BookmarkNodeData[],
    folderPath: readonly string[]
): BookmarkFolderData | undefined => {
    const folderId = folderPath.at(0);
    const remainingPath = folderPath.slice(1);
    if (folderId === undefined) {
        return undefined;
    }

    const folder = nodes.find(
        (node): node is BookmarkFolderData =>
            isBookmarkFolder(node) && node.id === folderId
    );

    return remainingPath.length === 0 || folder === undefined
        ? folder
        : getFolderAtPath(folder.children, remainingPath);
};

const getNodesAtPath = (
    category: BookmarkCategoryData | undefined,
    folderPath: readonly string[]
): readonly BookmarkNodeData[] => {
    if (category === undefined) {
        return [];
    }

    return folderPath.length === 0
        ? category.children
        : (getFolderAtPath(category.children, folderPath)?.children ?? []);
};

const countBookmarks = (nodes: readonly BookmarkNodeData[]): number =>
    nodes.reduce(
        (count, node) =>
            count + (isBookmarkLink(node) ? 1 : countBookmarks(node.children)),
        0
    );

const nodeMatchesSearch = (
    node: BookmarkNodeData,
    normalizedQuery: string
): boolean => {
    if (isBookmarkLink(node)) {
        return `${node.title} ${node.url}`
            .toLowerCase()
            .includes(normalizedQuery);
    }

    return (
        node.title.toLowerCase().includes(normalizedQuery) ||
        node.children.some((child) => nodeMatchesSearch(child, normalizedQuery))
    );
};

const categoryMatchesSearch = (
    category: BookmarkCategoryData,
    normalizedQuery: string
): boolean =>
    category.category.toLowerCase().includes(normalizedQuery) ||
    category.children.some((node) => nodeMatchesSearch(node, normalizedQuery));

const getLocationKey = (
    categoryIndex: number,
    folderPath: readonly string[]
): string => JSON.stringify([categoryIndex, ...folderPath]);

const collectDestinations = (
    nodes: readonly BookmarkNodeData[],
    categoryIndex: number,
    parentLabel: string,
    folderPath: readonly string[] = []
): DestinationOption[] =>
    nodes.flatMap((node) => {
        if (!isBookmarkFolder(node)) {
            return [];
        }

        const nextPath = [...folderPath, node.id];
        const label = `${parentLabel}${folderPathSeparator}${node.title}`;

        return [
            {
                key: getLocationKey(categoryIndex, nextPath),
                label,
                location: { categoryIndex, folderPath: nextPath },
            },
            ...collectDestinations(
                node.children,
                categoryIndex,
                label,
                nextPath
            ),
        ];
    });

const getDestinationOptions = (
    bookmarkTree: readonly BookmarkCategoryData[]
): DestinationOption[] =>
    bookmarkTree.flatMap((category, categoryIndex) => [
        {
            key: getLocationKey(categoryIndex, []),
            label: category.category,
            location: { categoryIndex, folderPath: [] },
        },
        ...collectDestinations(
            category.children,
            categoryIndex,
            category.category
        ),
    ]);

const serializeDraft = (draft: EditorDraft): string =>
    JSON.stringify({
        destinationKey: draft.destinationKey,
        icon: draft.icon,
        title: draft.title,
        url: draft.url,
    });

const getBookmarkHost = (url: string): string => {
    try {
        return new URL(url).hostname.replace(/^www\./, '');
    } catch {
        return url;
    }
};

const getBookmarkTitleFromUrl = (url: string): string => {
    try {
        const hostname = new URL(url).hostname.replace(/^www\./, '');
        const name = hostname.split('.')[0].replaceAll(/[_-]+/g, ' ');

        return name === ''
            ? hostname
            : name.replace(/^\w/, (character) => character.toUpperCase());
    } catch {
        return url;
    }
};

const parsePastedBookmarkText = (value: string): PastedBookmark[] => {
    const bookmarks: PastedBookmark[] = [];
    const seenUrls = new Set<string>();
    const addBookmark = (urlValue: string, titleValue = '') => {
        const url = normalizeUrl(urlValue.replaceAll(/[),.;]+$/g, ''));
        if (url === undefined || seenUrls.has(url)) {
            return;
        }

        seenUrls.add(url);
        bookmarks.push({
            title: titleValue.trim() || getBookmarkTitleFromUrl(url),
            url,
        });
    };

    for (const line of value.split(/\r?\n/)) {
        const markdownLinks = [
            ...line.matchAll(/\[([^\]]+)]\((https?:\/\/[^)]+)\)/gi),
        ];
        for (const match of markdownLinks) {
            addBookmark(match[2], match[1]);
        }

        const lineWithoutMarkdown = line.replaceAll(
            /\[.+?]\(https?:\/\/[^)]+\)/gi,
            ''
        );
        const urlMatches = [
            ...lineWithoutMarkdown.matchAll(
                /(?:https?:\/\/|www\.)[^\s"'<>]+/gi
            ),
        ];
        for (const match of urlMatches) {
            const matchedUrl = match[0];
            const title =
                urlMatches.length === 1
                    ? lineWithoutMarkdown
                          .replace(matchedUrl, '')
                          .replaceAll(/^[\s:|–—-]+|[\s:|–—-]+$/g, '')
                    : '';
            addBookmark(matchedUrl, title);
        }

        if (markdownLinks.length === 0 && urlMatches.length === 0) {
            addBookmark(line.trim());
        }
    }

    return bookmarks;
};

const parseClipboardBookmarks = (
    clipboardData: DataTransfer
): PastedBookmark[] => {
    const bookmarks = parsePastedBookmarkText(
        clipboardData.getData('text/plain')
    );
    const seenUrls = new Set(bookmarks.map((bookmark) => bookmark.url));
    const html = clipboardData.getData('text/html');
    if (html === '') {
        return bookmarks;
    }

    const document = new DOMParser().parseFromString(html, 'text/html');
    for (const anchor of document.querySelectorAll<HTMLAnchorElement>(
        'a[href]'
    )) {
        const url = normalizeUrl(anchor.href);
        if (url === undefined || seenUrls.has(url)) {
            continue;
        }

        seenUrls.add(url);
        bookmarks.push({
            title: anchor.textContent.trim() || getBookmarkTitleFromUrl(url),
            url,
        });
    }

    return bookmarks;
};

interface InlineBookmarkTitleProps {
    ariaLabel: string;
    onSave: (title: string) => void;
    title: string;
}

const InlineBookmarkTitle: React.FC<InlineBookmarkTitleProps> = ({
    ariaLabel,
    onSave,
    title,
}) => {
    const [value, setValue] = useState(title);

    useEffect(() => {
        setValue(title);
    }, [title]);

    const save = () => {
        const nextTitle = value.replaceAll(/\s+/g, ' ').trim();
        if (nextTitle === '') {
            setValue(title);
        } else if (nextTitle !== title) {
            onSave(nextTitle);
        }
    };

    return (
        <input
            className='bookmark-workspace-inline-title'
            type='text'
            aria-label={ariaLabel}
            value={value}
            onChange={(event) => {
                setValue(event.target.value);
            }}
            onBlur={save}
            onKeyDown={(event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    event.currentTarget.blur();
                } else if (event.key === 'Escape') {
                    setValue(title);
                    event.currentTarget.blur();
                }
            }}
        />
    );
};

export const BookmarkManagerDialog: React.FC<BookmarkManagerDialogProps> = ({
    bookmarkControls,
    onClose,
}) => {
    const { locale, t } = useLocale();
    const titleId = useId();
    const importInputId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const importInputRef = useRef<HTMLInputElement>(null);
    const [location, setLocation] = useState<BookmarkLocation>(() => ({
        categoryIndex: bookmarkControls.bookmarkTree.length === 0 ? -1 : 0,
        folderPath: [],
    }));
    const [expandedKeys, setExpandedKeys] = useState<Set<string>>(
        () =>
            new Set(
                bookmarkControls.bookmarkTree.slice(0, 1).map((item) => item.id)
            )
    );
    const [query, setQuery] = useState('');
    const [editorDraft, setEditorDraft] = useState<EditorDraft>();
    const [draftBaseline, setDraftBaseline] = useState('');
    const [formErrors, setFormErrors] = useState<FormErrors>({});
    const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [isLocationPickerOpen, setIsLocationPickerOpen] = useState(false);
    const [iconQuery, setIconQuery] = useState('');
    const [deleteRequest, setDeleteRequest] = useState<DeleteRequest>();
    const [discardTarget, setDiscardTarget] = useState<'dialog' | 'editor'>();
    const [undoSnapshot, setUndoSnapshot] = useState<{
        label: string;
        tree: readonly BookmarkCategoryData[];
    }>();
    const [draggedNode, setDraggedNode] = useState<DraggedNode>();
    const [dropTargetKey, setDropTargetKey] = useState<string>();
    const [quickAddValue, setQuickAddValue] = useState('');
    const [quickAddMessage, setQuickAddMessage] = useState('');

    const { bookmarkTree } = bookmarkControls;
    const decoratedTree = useMemo(
        () => decorateBookmarkTree(bookmarkTree),
        [bookmarkTree]
    );
    const destinationOptions = useMemo(
        () => getDestinationOptions(bookmarkTree),
        [bookmarkTree]
    );
    const currentCategory = bookmarkTree.at(location.categoryIndex);
    const currentFolder = getFolderAtPath(
        currentCategory?.children ?? [],
        location.folderPath
    );
    const currentNodes = getNodesAtPath(currentCategory, location.folderPath);
    const normalizedQuery = query.trim().toLowerCase();
    const visibleNodes =
        normalizedQuery === ''
            ? currentNodes
            : currentNodes.filter((node) =>
                  nodeMatchesSearch(node, normalizedQuery)
              );
    const visibleCategoryIndexes = bookmarkTree.flatMap(
        (category, categoryIndex) =>
            normalizedQuery === '' ||
            categoryMatchesSearch(category, normalizedQuery)
                ? [categoryIndex]
                : []
    );
    const rootCategoryIndex = bookmarkTree.findIndex(
        (category) =>
            category.category.trim().toLocaleLowerCase(locale) ===
            t.bookmarks.toLocaleLowerCase(locale)
    );
    const visibleTreeCategoryIndexes = visibleCategoryIndexes.filter(
        (categoryIndex) => categoryIndex !== rootCategoryIndex
    );
    const isDraftDirty =
        editorDraft !== undefined &&
        serializeDraft(editorDraft) !== draftBaseline;

    const addPastedBookmarks = (bookmarks: readonly PastedBookmark[]) => {
        if (currentCategory === undefined || bookmarks.length === 0) {
            setQuickAddMessage(t.bookmarkUrlInvalid);
            return;
        }

        const addedCount = bookmarkControls.addBookmarksToLocation(
            location,
            bookmarks
        );
        setQuickAddValue('');
        setQuickAddMessage(
            addedCount === 0
                ? t.bookmarksAlreadySaved
                : locale === 'zh-TW'
                  ? `已新增 ${addedCount} 個連結`
                  : `${addedCount} ${addedCount === 1 ? 'link' : 'links'} added`
        );
    };

    const itemCountLabel = (count: number) =>
        locale === 'zh-TW'
            ? `${count} 個項目`
            : `${count} ${count === 1 ? 'item' : 'items'}`;

    const openDraft = (draft: EditorDraft) => {
        setEditorDraft(draft);
        setDraftBaseline(serializeDraft(draft));
        setFormErrors({});
        setIsIconPickerOpen(false);
        setIconQuery('');
        setIsLocationPickerOpen(false);
        setIsAddMenuOpen(false);
    };

    const navigateToLocation = (nextLocation: BookmarkLocation) => {
        const category = bookmarkTree.at(nextLocation.categoryIndex);
        setLocation(nextLocation);
        setExpandedKeys((current: ReadonlySet<string>) => {
            const next = new Set(current);
            if (category !== undefined) {
                next.add(category.id);
            }
            for (const folderId of nextLocation.folderPath) {
                next.add(folderId);
            }
            return next;
        });
    };

    const navigateToCategory = (categoryIndex: number) => {
        navigateToLocation({ categoryIndex, folderPath: [] });
    };

    const navigateToFolder = (nextLocation: BookmarkLocation) => {
        navigateToLocation(nextLocation);
    };

    const editCategory = (categoryIndex: number) => {
        const category = bookmarkTree.at(categoryIndex);
        const decoratedCategory = decoratedTree.at(categoryIndex);
        if (category === undefined || decoratedCategory === undefined) {
            return;
        }

        navigateToCategory(categoryIndex);
        openDraft({
            categoryIndex,
            destinationKey: '',
            folderPath: [],
            icon: decoratedCategory.iconName,
            kind: 'category',
            mode: 'edit',
            title: category.category,
            url: '',
        });
    };

    const editFolder = (nextLocation: Readonly<BookmarkLocation>) => {
        const category = bookmarkTree.at(nextLocation.categoryIndex);
        const folder = getFolderAtPath(
            category?.children ?? [],
            nextLocation.folderPath
        );
        if (folder === undefined) {
            return;
        }

        navigateToFolder({
            categoryIndex: nextLocation.categoryIndex,
            folderPath: [...nextLocation.folderPath],
        });
        openDraft({
            ...nextLocation,
            destinationKey: '',
            icon: resolveFolderIconName(folder),
            kind: 'folder',
            mode: 'edit',
            title: folder.title,
            url: '',
        });
    };

    const editBookmark = (
        nextLocation: BookmarkLocation,
        bookmark: BookmarkLinkData
    ) => {
        setLocation(nextLocation);
        openDraft({
            ...nextLocation,
            bookmarkId: bookmark.id,
            destinationKey: getLocationKey(
                nextLocation.categoryIndex,
                nextLocation.folderPath
            ),
            icon: '',
            kind: 'bookmark',
            mode: 'edit',
            title: bookmark.title,
            url: bookmark.url,
        });
    };

    const beginAddCategory = () => {
        openDraft({
            categoryIndex: -1,
            destinationKey: '',
            folderPath: [],
            icon: defaultIconName,
            kind: 'category',
            mode: 'add',
            title: '',
            url: '',
        });
    };

    const beginAddFolder = () => {
        if (currentCategory === undefined) {
            beginAddCategory();
            return;
        }

        openDraft({
            ...location,
            destinationKey: '',
            icon: defaultIconName,
            kind: 'folder',
            mode: 'add',
            title: '',
            url: '',
        });
    };

    const beginAddBookmark = () => {
        if (currentCategory === undefined) {
            beginAddCategory();
            return;
        }

        openDraft({
            ...location,
            destinationKey: getLocationKey(
                location.categoryIndex,
                location.folderPath
            ),
            icon: '',
            kind: 'bookmark',
            mode: 'add',
            title: '',
            url: '',
        });
    };

    const saveDraft = () => {
        if (editorDraft === undefined) {
            return;
        }

        const title = editorDraft.title.trim();
        const errors: FormErrors = {};
        if (title === '') {
            errors.title = t.bookmarkTitleRequired;
        }

        const normalizedUrl =
            editorDraft.kind === 'bookmark'
                ? normalizeUrl(editorDraft.url)
                : undefined;
        if (editorDraft.kind === 'bookmark' && normalizedUrl === undefined) {
            errors.url = t.bookmarkUrlInvalid;
        }

        if (Object.keys(errors).length > 0) {
            setFormErrors(errors);
            return;
        }

        let didSave = false;
        if (editorDraft.kind === 'category') {
            didSave =
                editorDraft.mode === 'add'
                    ? bookmarkControls.addCategory({
                          category: title,
                          icon: editorDraft.icon,
                      })
                    : bookmarkControls.updateCategory(
                          editorDraft.categoryIndex,
                          { category: title, icon: editorDraft.icon }
                      );
        } else if (editorDraft.kind === 'folder') {
            const folder = { icon: editorDraft.icon, title };
            didSave =
                editorDraft.mode === 'add'
                    ? bookmarkControls.addFolder(editorDraft, folder)
                    : bookmarkControls.updateFolder(editorDraft, folder);
        } else if (normalizedUrl !== undefined) {
            const destination = destinationOptions.find(
                (option) => option.key === editorDraft.destinationKey
            )?.location;
            if (destination !== undefined) {
                didSave =
                    editorDraft.mode === 'add'
                        ? bookmarkControls.addBookmarkToLocation(destination, {
                              title,
                              url: normalizedUrl,
                          })
                        : bookmarkControls.updateBookmarkInLocation(
                              editorDraft,
                              editorDraft.bookmarkId ?? '',
                              { title, url: normalizedUrl },
                              destination
                          );
            }
        }

        if (!didSave) {
            return;
        }

        if (editorDraft.mode === 'add') {
            setEditorDraft(undefined);
            setDraftBaseline('');
            return;
        }

        const savedDraft = {
            ...editorDraft,
            title,
            url: normalizedUrl ?? editorDraft.url,
        };
        setEditorDraft(savedDraft);
        setDraftBaseline(serializeDraft(savedDraft));
        setFormErrors({});
    };

    const cancelEditor = () => {
        if (isDraftDirty) {
            setDiscardTarget('editor');
            return;
        }

        setEditorDraft(undefined);
    };

    const requestDialogClose = () => {
        if (isDraftDirty) {
            setDiscardTarget('dialog');
            return;
        }

        onClose();
    };

    const confirmDiscard = () => {
        const target = discardTarget;
        setDiscardTarget(undefined);
        setEditorDraft(undefined);
        setDraftBaseline('');
        if (target === 'dialog') {
            onClose();
        }
    };

    const confirmDelete = () => {
        if (deleteRequest === undefined) {
            return;
        }

        const previousTree = bookmarkTree;
        const didDelete = (() => {
            if (deleteRequest.kind === 'category') {
                return bookmarkControls.deleteCategory(
                    deleteRequest.categoryIndex
                );
            }
            if (deleteRequest.kind === 'folder') {
                return bookmarkControls.deleteFolder(deleteRequest);
            }
            return bookmarkControls.deleteBookmark(
                deleteRequest.categoryIndex,
                deleteRequest.bookmarkId ?? ''
            );
        })();

        if (didDelete) {
            setUndoSnapshot({
                label: deleteRequest.label,
                tree: previousTree,
            });
            setEditorDraft(undefined);
            setDraftBaseline('');
            setLocation({
                categoryIndex:
                    deleteRequest.kind === 'category'
                        ? Math.min(
                              deleteRequest.categoryIndex,
                              bookmarkTree.length - 2
                          )
                        : deleteRequest.categoryIndex,
                folderPath: [],
            });
        }
        setDeleteRequest(undefined);
    };

    const undoDelete = () => {
        if (undoSnapshot === undefined) {
            return;
        }

        bookmarkControls.replaceBookmarkTree(undoSnapshot.tree);
        setUndoSnapshot(undefined);
    };

    useEffect(() => {
        dialogRef.current?.focus();
    }, []);

    useEffect(() => {
        if (undoSnapshot === undefined) {
            return undefined;
        }

        const timeout = globalThis.window.setTimeout(
            (_timeoutArgument: undefined) => {
                setUndoSnapshot(undefined);
            },
            6000,
            undefined
        );

        return () => {
            globalThis.clearTimeout(timeout);
        };
    }, [undoSnapshot]);

    useEffect(() => {
        if (location.categoryIndex < bookmarkTree.length) {
            return;
        }

        setLocation({
            categoryIndex: bookmarkTree.length === 0 ? -1 : 0,
            folderPath: [],
        });
    }, [bookmarkTree.length, location.categoryIndex]);

    const toggleExpanded = (key: string) => {
        setExpandedKeys((current: ReadonlySet<string>) => {
            const next = new Set(current);
            if (next.has(key)) {
                next.delete(key);
            } else {
                next.add(key);
            }
            return next;
        });
    };

    const canDropAt = (destination: BookmarkLocation): boolean => {
        if (draggedNode === undefined) {
            return false;
        }

        const isSameLocation =
            getLocationKey(
                draggedNode.source.categoryIndex,
                draggedNode.source.folderPath
            ) ===
            getLocationKey(destination.categoryIndex, destination.folderPath);
        const isOwnDescendant =
            draggedNode.isFolder &&
            destination.folderPath.includes(draggedNode.id);

        return !isSameLocation && !isOwnDescendant;
    };

    const dragOverLocation = (
        event: React.DragEvent<HTMLElement>,
        destination: BookmarkLocation
    ) => {
        if (!canDropAt(destination)) {
            return;
        }

        event.preventDefault();
        const { dataTransfer } = event;
        dataTransfer.dropEffect = 'move';
        setDropTargetKey(
            getLocationKey(destination.categoryIndex, destination.folderPath)
        );
    };

    const leaveDropTarget = (event: React.DragEvent<HTMLElement>) => {
        const nextTarget = event.relatedTarget;
        if (
            nextTarget instanceof Node &&
            event.currentTarget.contains(nextTarget)
        ) {
            return;
        }

        setDropTargetKey(undefined);
    };

    const dropAtLocation = (
        event: React.DragEvent<HTMLElement>,
        destination: BookmarkLocation
    ) => {
        event.preventDefault();
        if (
            draggedNode !== undefined &&
            canDropAt(destination) &&
            bookmarkControls.moveBookmarkNode(
                draggedNode.source,
                draggedNode.id,
                destination
            )
        ) {
            setLocation(destination);
            setEditorDraft(undefined);
        }

        setDraggedNode(undefined);
        setDropTargetKey(undefined);
    };

    const renderFolderTree = (
        nodes: readonly BookmarkNodeData[],
        categoryIndex: number,
        parentPath: readonly string[],
        depth: number
    ): React.ReactNode =>
        nodes.map((node) => {
            if (
                !isBookmarkFolder(node) ||
                (normalizedQuery !== '' &&
                    !nodeMatchesSearch(node, normalizedQuery))
            ) {
                return undefined;
            }

            const folderPath = [...parentPath, node.id];
            const folderLocation = { categoryIndex, folderPath };
            const folderLocationKey = getLocationKey(categoryIndex, folderPath);
            const hasChildFolders = node.children.some(isBookmarkFolder);
            const isExpanded =
                normalizedQuery !== '' || expandedKeys.has(node.id);
            const isSelected =
                location.categoryIndex === categoryIndex &&
                getLocationKey(categoryIndex, location.folderPath) ===
                    getLocationKey(categoryIndex, folderPath);

            return (
                <React.Fragment key={node.id}>
                    <div
                        className='bookmark-workspace-tree-row'
                        data-drop-target={
                            dropTargetKey === folderLocationKey
                                ? 'true'
                                : undefined
                        }
                        style={
                            {
                                '--bookmark-tree-depth': depth,
                            } as React.CSSProperties
                        }
                        onDragOver={(event) => {
                            dragOverLocation(event, folderLocation);
                        }}
                        onDragLeave={leaveDropTarget}
                        onDrop={(event) => {
                            dropAtLocation(event, folderLocation);
                        }}
                    >
                        <button
                            className='bookmark-workspace-tree-item'
                            type='button'
                            aria-current={isSelected ? 'page' : undefined}
                            aria-expanded={
                                hasChildFolders ? isExpanded : undefined
                            }
                            onClick={() => {
                                setLocation(folderLocation);
                                if (hasChildFolders) {
                                    toggleExpanded(node.id);
                                }
                            }}
                        >
                            <span className='bookmark-workspace-tree-chevron'>
                                {hasChildFolders ? (
                                    isExpanded ? (
                                        <ChevronDown aria-hidden='true' />
                                    ) : (
                                        <ChevronRight aria-hidden='true' />
                                    )
                                ) : undefined}
                            </span>
                            {createBookmarkIcon(node.icon, 'icon')}
                            <span>{node.title}</span>
                            <small>{countBookmarks(node.children)}</small>
                        </button>
                    </div>
                    {hasChildFolders && isExpanded
                        ? renderFolderTree(
                              node.children,
                              categoryIndex,
                              folderPath,
                              depth + 1
                          )
                        : undefined}
                </React.Fragment>
            );
        });

    const breadcrumbLabels = [currentCategory?.category ?? ''];
    let breadcrumbNodes = currentCategory?.children ?? [];
    for (const folderId of location.folderPath) {
        const folder = breadcrumbNodes.find(
            (node): node is BookmarkFolderData =>
                isBookmarkFolder(node) && node.id === folderId
        );
        if (folder === undefined) {
            break;
        }
        breadcrumbLabels.push(folder.title);
        breadcrumbNodes = folder.children;
    }

    const selectedKey =
        editorDraft?.mode === 'edit'
            ? editorDraft.kind === 'category'
                ? `category-${editorDraft.categoryIndex}`
                : editorDraft.kind === 'folder'
                  ? `folder-${getLocationKey(
                        editorDraft.categoryIndex,
                        editorDraft.folderPath
                    )}`
                  : `bookmark-${editorDraft.bookmarkId}`
            : undefined;

    const formTitle =
        editorDraft?.kind === 'category'
            ? editorDraft.mode === 'add'
                ? t.newFolder
                : t.editFolder
            : editorDraft?.kind === 'folder'
              ? editorDraft.mode === 'add'
                  ? t.newFolder
                  : t.editFolder
              : editorDraft?.mode === 'add'
                ? t.newBookmark
                : t.editBookmark;

    const filteredIconOptions = categoryIconOptions
        .filter((option) =>
            option.searchText.includes(normalizeCategoryIconSearch(iconQuery))
        )
        .slice(0, maxVisibleIconOptions);
    const selectedDestination = destinationOptions.find(
        (option) => option.key === editorDraft?.destinationKey
    );

    const saveStatus = bookmarkControls.isLoading
        ? {
              icon: <LoaderCircle aria-hidden='true' className='is-spinning' />,
              label: t.bookmarksLoading,
              tone: 'loading',
          }
        : bookmarkControls.saveState === 'saving'
          ? {
                icon: (
                    <LoaderCircle aria-hidden='true' className='is-spinning' />
                ),
                label: t.bookmarkSaving,
                tone: 'loading',
            }
          : bookmarkControls.saveState === 'error'
            ? {
                  icon: <CircleAlert aria-hidden='true' />,
                  label: t.bookmarkSaveFailed,
                  tone: 'error',
              }
            : {
                  icon: <Check aria-hidden='true' />,
                  label: t.bookmarkSaved,
                  tone: 'success',
              };

    return createPortal(
        <div
            className='bookmark-manager-backdrop'
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    requestDialogClose();
                }
            }}
        >
            <div
                ref={dialogRef}
                className='bookmark-manager-dialog bookmark-workspace'
                role='dialog'
                aria-labelledby={titleId}
                aria-modal='true'
                tabIndex={-1}
                onKeyDown={(event) => {
                    if (event.key !== 'Escape') {
                        return;
                    }

                    event.preventDefault();
                    if (deleteRequest !== undefined) {
                        setDeleteRequest(undefined);
                    } else if (discardTarget !== undefined) {
                        setDiscardTarget(undefined);
                    } else if (isLocationPickerOpen) {
                        setIsLocationPickerOpen(false);
                    } else if (isIconPickerOpen) {
                        setIsIconPickerOpen(false);
                    } else if (editorDraft !== undefined) {
                        cancelEditor();
                    } else if (isAddMenuOpen) {
                        setIsAddMenuOpen(false);
                    } else {
                        requestDialogClose();
                    }
                }}
            >
                <header className='bookmark-manager-header'>
                    <div className='bookmark-workspace-title-group'>
                        <Bookmark aria-hidden='true' />
                        <h2 id={titleId}>{t.manageBookmarks}</h2>
                        {bookmarkControls.status?.type === 'error' ? (
                            <span
                                className={`bookmark-workspace-operation-status ${bookmarkControls.status.type}`}
                                role='alert'
                            >
                                <CircleAlert aria-hidden='true' />
                                {t[bookmarkControls.status.messageKey]}
                            </span>
                        ) : undefined}
                    </div>
                    <div className='bookmark-workspace-header-actions'>
                        <input
                            ref={importInputRef}
                            id={importInputId}
                            className='bookmark-workspace-file-input'
                            type='file'
                            accept='.html,text/html'
                            onChange={(event) => {
                                const file = event.target.files?.[0];
                                if (file !== undefined) {
                                    bookmarkControls
                                        .importBookmarks(file)
                                        .catch(() => undefined);
                                }
                                if (importInputRef.current !== null) {
                                    importInputRef.current.value = '';
                                }
                            }}
                        />
                        <button
                            className='bookmark-workspace-header-button'
                            type='button'
                            onClick={() => importInputRef.current?.click()}
                        >
                            <Upload aria-hidden='true' />
                            <span>{t.import}</span>
                        </button>
                        <button
                            className='bookmark-workspace-header-button'
                            type='button'
                            onClick={bookmarkControls.exportBookmarks}
                        >
                            <Download aria-hidden='true' />
                            <span>{t.export}</span>
                        </button>
                        <button
                            className='bookmark-workspace-icon-button'
                            type='button'
                            aria-label={t.cancel}
                            onClick={requestDialogClose}
                        >
                            <X aria-hidden='true' />
                        </button>
                    </div>
                </header>

                <div className='bookmark-manager-body bookmark-workspace-grid'>
                    <aside className='bookmark-workspace-tree-pane'>
                        <div
                            className='bookmark-workspace-search quiet'
                            role='search'
                        >
                            <Search aria-hidden='true' />
                            <input
                                type='search'
                                aria-label={t.bookmarkSearch}
                                placeholder={t.bookmarkSearch}
                                value={query}
                                onChange={(event) => {
                                    setQuery(event.target.value);
                                }}
                            />
                            {query === '' ? undefined : (
                                <button
                                    type='button'
                                    aria-label={t.cancel}
                                    onClick={() => {
                                        setQuery('');
                                    }}
                                >
                                    <X aria-hidden='true' />
                                </button>
                            )}
                        </div>
                        <nav
                            className='bookmark-workspace-tree'
                            aria-label={t.folders}
                        >
                            {bookmarkControls.isLoading ? (
                                <div
                                    className='bookmark-workspace-skeleton-list'
                                    aria-label={t.bookmarksLoading}
                                >
                                    {Array.from({ length: 6 }, (_, index) => (
                                        <span key={index} />
                                    ))}
                                </div>
                            ) : visibleTreeCategoryIndexes.length === 0 &&
                              rootCategoryIndex === -1 ? (
                                <div className='bookmark-workspace-empty compact'>
                                    <Search aria-hidden='true' />
                                    <strong>
                                        {normalizedQuery === ''
                                            ? t.bookmarksEmpty
                                            : t.bookmarkSearchEmpty}
                                    </strong>
                                    <span>
                                        {normalizedQuery === ''
                                            ? t.bookmarksEmptyDescription
                                            : t.bookmarkSearchEmptyDescription}
                                    </span>
                                </div>
                            ) : (
                                visibleTreeCategoryIndexes.map(
                                    (categoryIndex) => {
                                        const category =
                                            bookmarkTree.at(categoryIndex);
                                        const decoratedCategory =
                                            decoratedTree.at(categoryIndex);
                                        if (
                                            category === undefined ||
                                            decoratedCategory === undefined
                                        ) {
                                            return undefined;
                                        }

                                        const isExpanded =
                                            normalizedQuery !== '' ||
                                            expandedKeys.has(category.id);
                                        const hasChildFolders =
                                            category.children.some(
                                                isBookmarkFolder
                                            );
                                        const isSelected =
                                            location.categoryIndex ===
                                                categoryIndex &&
                                            location.folderPath.length === 0;
                                        const categoryLocation = {
                                            categoryIndex,
                                            folderPath: [],
                                        };
                                        const categoryLocationKey =
                                            getLocationKey(categoryIndex, []);

                                        return (
                                            <React.Fragment key={category.id}>
                                                <div
                                                    className='bookmark-workspace-tree-row root'
                                                    data-drop-target={
                                                        dropTargetKey ===
                                                        categoryLocationKey
                                                            ? 'true'
                                                            : undefined
                                                    }
                                                    onDragOver={(event) => {
                                                        dragOverLocation(
                                                            event,
                                                            categoryLocation
                                                        );
                                                    }}
                                                    onDragLeave={
                                                        leaveDropTarget
                                                    }
                                                    onDrop={(event) => {
                                                        dropAtLocation(
                                                            event,
                                                            categoryLocation
                                                        );
                                                    }}
                                                >
                                                    <button
                                                        className='bookmark-workspace-tree-item'
                                                        type='button'
                                                        aria-current={
                                                            isSelected
                                                                ? 'page'
                                                                : undefined
                                                        }
                                                        aria-expanded={
                                                            hasChildFolders
                                                                ? isExpanded
                                                                : undefined
                                                        }
                                                        onClick={() => {
                                                            setLocation(
                                                                categoryLocation
                                                            );
                                                            if (
                                                                hasChildFolders
                                                            ) {
                                                                toggleExpanded(
                                                                    category.id
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <span className='bookmark-workspace-tree-chevron'>
                                                            {hasChildFolders ? (
                                                                isExpanded ? (
                                                                    <ChevronDown aria-hidden='true' />
                                                                ) : (
                                                                    <ChevronRight aria-hidden='true' />
                                                                )
                                                            ) : undefined}
                                                        </span>
                                                        {decoratedCategory.icon}
                                                        <span>
                                                            {category.category}
                                                        </span>
                                                        <small>
                                                            {countBookmarks(
                                                                category.children
                                                            )}
                                                        </small>
                                                    </button>
                                                </div>
                                                {hasChildFolders && isExpanded
                                                    ? renderFolderTree(
                                                          category.children,
                                                          categoryIndex,
                                                          [],
                                                          1
                                                      )
                                                    : undefined}
                                            </React.Fragment>
                                        );
                                    }
                                )
                            )}
                        </nav>
                    </aside>

                    <main
                        className={`bookmark-workspace-list-pane ${
                            breadcrumbLabels.length > 1 ? 'has-breadcrumb' : ''
                        }`}
                    >
                        <div className='bookmark-workspace-list-header'>
                            <div className='bookmark-workspace-list-title'>
                                <h3>
                                    {currentFolder?.title ??
                                        currentCategory?.category ??
                                        t.bookmarks}
                                </h3>
                                {currentCategory === undefined ? undefined : (
                                    <button
                                        className='bookmark-workspace-icon-button'
                                        type='button'
                                        aria-label={t.editFolder}
                                        onClick={() => {
                                            if (currentFolder === undefined) {
                                                editCategory(
                                                    location.categoryIndex
                                                );
                                            } else {
                                                editFolder(location);
                                            }
                                        }}
                                    >
                                        <Pencil aria-hidden='true' />
                                    </button>
                                )}
                            </div>
                            <div className='bookmark-workspace-list-actions'>
                                <button
                                    className='bookmark-workspace-primary-button'
                                    type='button'
                                    aria-haspopup='menu'
                                    aria-expanded={isAddMenuOpen}
                                    onClick={() => {
                                        setIsAddMenuOpen((isOpen) => !isOpen);
                                    }}
                                >
                                    <Plus aria-hidden='true' />
                                    {t.addBookmark}
                                </button>
                                {isAddMenuOpen ? (
                                    <div
                                        className='bookmark-workspace-add-menu'
                                        role='menu'
                                    >
                                        <button
                                            type='button'
                                            role='menuitem'
                                            disabled={
                                                currentCategory === undefined
                                            }
                                            onClick={beginAddBookmark}
                                        >
                                            <Bookmark aria-hidden='true' />
                                            {t.bookmark}
                                        </button>
                                        <button
                                            type='button'
                                            role='menuitem'
                                            onClick={beginAddFolder}
                                        >
                                            <FolderPlus aria-hidden='true' />
                                            {t.folder}
                                        </button>
                                    </div>
                                ) : undefined}
                            </div>
                        </div>
                        {breadcrumbLabels.length > 1 ? (
                            <div className='bookmark-workspace-breadcrumb'>
                                {breadcrumbLabels.slice(1).join(' / ')}
                            </div>
                        ) : undefined}
                        <form
                            className='bookmark-workspace-quick-add'
                            onSubmit={(event) => {
                                event.preventDefault();
                                addPastedBookmarks(
                                    parsePastedBookmarkText(quickAddValue)
                                );
                            }}
                        >
                            <ClipboardPaste aria-hidden='true' />
                            <input
                                type='text'
                                aria-label={t.pasteLinks}
                                placeholder={t.pasteLinks}
                                value={quickAddValue}
                                disabled={currentCategory === undefined}
                                onChange={(event) => {
                                    setQuickAddValue(event.target.value);
                                    setQuickAddMessage('');
                                }}
                                onPaste={(event) => {
                                    const bookmarks = parseClipboardBookmarks(
                                        event.clipboardData
                                    );
                                    if (bookmarks.length === 0) {
                                        return;
                                    }

                                    event.preventDefault();
                                    addPastedBookmarks(bookmarks);
                                }}
                            />
                            <span aria-live='polite'>{quickAddMessage}</span>
                        </form>
                        <div className='bookmark-workspace-list'>
                            {bookmarkControls.isLoading ? (
                                <div className='bookmark-workspace-skeleton-list large'>
                                    {Array.from({ length: 5 }, (_, index) => (
                                        <span key={index} />
                                    ))}
                                </div>
                            ) : currentCategory === undefined ? (
                                <div className='bookmark-workspace-empty'>
                                    <Bookmark aria-hidden='true' />
                                    <strong>{t.bookmarksEmpty}</strong>
                                    <span>{t.bookmarksEmptyDescription}</span>
                                </div>
                            ) : visibleNodes.length === 0 ? (
                                <div className='bookmark-workspace-empty'>
                                    {normalizedQuery === '' ? (
                                        <FolderOpen aria-hidden='true' />
                                    ) : (
                                        <Search aria-hidden='true' />
                                    )}
                                    <strong>
                                        {normalizedQuery === ''
                                            ? t.noItems
                                            : t.bookmarkSearchEmpty}
                                    </strong>
                                    <span>
                                        {normalizedQuery === ''
                                            ? t.noItemsDescription
                                            : t.bookmarkSearchEmptyDescription}
                                    </span>
                                </div>
                            ) : (
                                visibleNodes.map((node) => {
                                    const isFolder = isBookmarkFolder(node);
                                    const rowKey = isFolder
                                        ? `folder-${getLocationKey(
                                              location.categoryIndex,
                                              [...location.folderPath, node.id]
                                          )}`
                                        : `bookmark-${node.id}`;
                                    const folderLocation = {
                                        categoryIndex: location.categoryIndex,
                                        folderPath: [
                                            ...location.folderPath,
                                            node.id,
                                        ],
                                    };

                                    return (
                                        <div
                                            className='bookmark-workspace-list-row'
                                            draggable
                                            data-dragging={
                                                draggedNode?.id === node.id
                                                    ? 'true'
                                                    : undefined
                                            }
                                            data-selected={
                                                selectedKey === rowKey
                                            }
                                            key={node.id}
                                            onDragStart={(event) => {
                                                const { dataTransfer } = event;
                                                dataTransfer.effectAllowed =
                                                    'move';
                                                dataTransfer.setData(
                                                    'text/plain',
                                                    node.id
                                                );
                                                setDraggedNode({
                                                    id: node.id,
                                                    isFolder,
                                                    source: location,
                                                });
                                            }}
                                            onDragEnd={() => {
                                                setDraggedNode(undefined);
                                                setDropTargetKey(undefined);
                                            }}
                                        >
                                            {isFolder ? (
                                                <button
                                                    className='bookmark-workspace-list-item'
                                                    type='button'
                                                    onClick={() => {
                                                        navigateToFolder(
                                                            folderLocation
                                                        );
                                                    }}
                                                >
                                                    <span
                                                        className='bookmark-workspace-item-icon'
                                                        data-kind='folder'
                                                    >
                                                        {createBookmarkIcon(
                                                            node.icon,
                                                            'icon'
                                                        )}
                                                    </span>
                                                    <span className='bookmark-workspace-item-copy'>
                                                        <strong>
                                                            {node.title}
                                                        </strong>
                                                        <small>
                                                            {itemCountLabel(
                                                                countBookmarks(
                                                                    node.children
                                                                )
                                                            )}
                                                        </small>
                                                    </span>
                                                </button>
                                            ) : (
                                                <div className='bookmark-workspace-list-item'>
                                                    <span
                                                        className='bookmark-workspace-item-icon'
                                                        data-kind='bookmark'
                                                    >
                                                        <LinkIcon aria-hidden='true' />
                                                    </span>
                                                    <span className='bookmark-workspace-item-copy'>
                                                        <InlineBookmarkTitle
                                                            ariaLabel={
                                                                t.bookmarkTitle
                                                            }
                                                            title={node.title}
                                                            onSave={(title) => {
                                                                bookmarkControls.updateBookmarkInLocation(
                                                                    location,
                                                                    node.id,
                                                                    {
                                                                        title,
                                                                        url: node.url,
                                                                    }
                                                                );
                                                            }}
                                                        />
                                                        <small>
                                                            {getBookmarkHost(
                                                                node.url
                                                            )}
                                                        </small>
                                                    </span>
                                                </div>
                                            )}
                                            {isFolder ? undefined : (
                                                <div className='bookmark-workspace-row-actions'>
                                                    <button
                                                        className='bookmark-workspace-row-link'
                                                        type='button'
                                                        aria-label={
                                                            t.editBookmark
                                                        }
                                                        onClick={() => {
                                                            editBookmark(
                                                                location,
                                                                node
                                                            );
                                                        }}
                                                    >
                                                        <Pencil aria-hidden='true' />
                                                    </button>
                                                    <a
                                                        className='bookmark-workspace-row-link'
                                                        href={node.url}
                                                        target='_blank'
                                                        rel='noreferrer'
                                                        aria-label={node.title}
                                                    >
                                                        <ExternalLink aria-hidden='true' />
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </main>
                </div>

                {editorDraft === undefined ? undefined : (
                    <div
                        className='bookmark-workspace-editor-backdrop'
                        onMouseDown={(event) => {
                            if (event.target === event.currentTarget) {
                                cancelEditor();
                            }
                        }}
                    >
                        <div
                            className='bookmark-workspace-editor-dialog'
                            role='dialog'
                            aria-label={formTitle}
                            aria-modal='true'
                        >
                            <form
                                className='bookmark-workspace-form'
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    saveDraft();
                                }}
                            >
                                <div className='bookmark-workspace-form-heading'>
                                    <div>
                                        <h3>{formTitle}</h3>
                                    </div>
                                    <button
                                        className='bookmark-workspace-inspector-close'
                                        type='button'
                                        aria-label={t.cancel}
                                        onClick={cancelEditor}
                                    >
                                        <X aria-hidden='true' />
                                    </button>
                                </div>

                                <label className='bookmark-workspace-field'>
                                    <span>
                                        {editorDraft.kind === 'folder'
                                            ? t.folderName
                                            : editorDraft.kind === 'category'
                                              ? t.folderName
                                              : t.bookmarkTitle}
                                    </span>
                                    <input
                                        autoFocus
                                        type='text'
                                        value={editorDraft.title}
                                        aria-invalid={
                                            formErrors.title !== undefined
                                        }
                                        onChange={(event) => {
                                            setEditorDraft({
                                                ...editorDraft,
                                                title: event.target.value,
                                            });
                                            setFormErrors((current) => ({
                                                ...current,
                                                title: undefined,
                                            }));
                                        }}
                                    />
                                    {formErrors.title ===
                                    undefined ? undefined : (
                                        <small role='alert'>
                                            {formErrors.title}
                                        </small>
                                    )}
                                </label>

                                {editorDraft.kind === 'bookmark' ? (
                                    <>
                                        <label className='bookmark-workspace-field'>
                                            <span>{t.bookmarkUrl}</span>
                                            <input
                                                type='text'
                                                inputMode='url'
                                                placeholder='https://'
                                                value={editorDraft.url}
                                                aria-invalid={
                                                    formErrors.url !== undefined
                                                }
                                                onChange={(event) => {
                                                    setEditorDraft({
                                                        ...editorDraft,
                                                        url: event.target.value,
                                                    });
                                                    setFormErrors(
                                                        (current) => ({
                                                            ...current,
                                                            url: undefined,
                                                        })
                                                    );
                                                }}
                                            />
                                            {formErrors.url ===
                                            undefined ? undefined : (
                                                <small role='alert'>
                                                    {formErrors.url}
                                                </small>
                                            )}
                                        </label>
                                        <div className='bookmark-workspace-field'>
                                            <span>{t.location}</span>
                                            <button
                                                className='bookmark-workspace-location-trigger'
                                                type='button'
                                                aria-haspopup='listbox'
                                                aria-expanded={
                                                    isLocationPickerOpen
                                                }
                                                onClick={() => {
                                                    setIsLocationPickerOpen(
                                                        (isOpen) => !isOpen
                                                    );
                                                }}
                                            >
                                                <span>
                                                    {selectedDestination?.label ??
                                                        t.bookmarks}
                                                </span>
                                                <ChevronDown aria-hidden='true' />
                                            </button>
                                            {isLocationPickerOpen ? (
                                                <div
                                                    className='bookmark-workspace-location-options'
                                                    role='listbox'
                                                    aria-label={t.location}
                                                >
                                                    {destinationOptions.map(
                                                        (option) => (
                                                            <button
                                                                key={option.key}
                                                                type='button'
                                                                role='option'
                                                                aria-selected={
                                                                    editorDraft.destinationKey ===
                                                                    option.key
                                                                }
                                                                onClick={() => {
                                                                    setEditorDraft(
                                                                        {
                                                                            ...editorDraft,
                                                                            destinationKey:
                                                                                option.key,
                                                                        }
                                                                    );
                                                                    setIsLocationPickerOpen(
                                                                        false
                                                                    );
                                                                }}
                                                            >
                                                                <FolderOpen aria-hidden='true' />
                                                                <span>
                                                                    {
                                                                        option.label
                                                                    }
                                                                </span>
                                                                {editorDraft.destinationKey ===
                                                                option.key ? (
                                                                    <Check aria-hidden='true' />
                                                                ) : undefined}
                                                            </button>
                                                        )
                                                    )}
                                                </div>
                                            ) : undefined}
                                        </div>
                                    </>
                                ) : (
                                    <div className='bookmark-workspace-field'>
                                        <span>{t.categoryIcon}</span>
                                        <button
                                            className='bookmark-workspace-icon-picker-trigger'
                                            type='button'
                                            aria-expanded={isIconPickerOpen}
                                            onClick={() => {
                                                setIsIconPickerOpen(
                                                    !isIconPickerOpen
                                                );
                                            }}
                                        >
                                            {createBookmarkIcon(
                                                editorDraft.icon,
                                                'icon'
                                            )}
                                            <span>{editorDraft.icon}</span>
                                            <ChevronDown aria-hidden='true' />
                                        </button>
                                        {isIconPickerOpen ? (
                                            <div className='bookmark-workspace-icon-picker'>
                                                <div
                                                    className='bookmark-workspace-search bookmark-workspace-icon-search quiet'
                                                    role='search'
                                                >
                                                    <Search aria-hidden='true' />
                                                    <input
                                                        type='text'
                                                        inputMode='search'
                                                        aria-label={
                                                            t.categoryIconSearch
                                                        }
                                                        placeholder={
                                                            t.categoryIconSearch
                                                        }
                                                        value={iconQuery}
                                                        onChange={(event) => {
                                                            setIconQuery(
                                                                event.target
                                                                    .value
                                                            );
                                                        }}
                                                    />
                                                    {iconQuery ===
                                                    '' ? undefined : (
                                                        <button
                                                            type='button'
                                                            aria-label={t.clear}
                                                            onClick={() => {
                                                                setIconQuery(
                                                                    ''
                                                                );
                                                            }}
                                                        >
                                                            <X aria-hidden='true' />
                                                        </button>
                                                    )}
                                                </div>
                                                {filteredIconOptions.length ===
                                                0 ? (
                                                    <p className='bookmark-workspace-icon-empty'>
                                                        {
                                                            t.categoryIconSearchEmpty
                                                        }
                                                    </p>
                                                ) : (
                                                    <div className='bookmark-workspace-icon-grid'>
                                                        {filteredIconOptions.map(
                                                            (option) => (
                                                                <button
                                                                    key={
                                                                        option.iconName
                                                                    }
                                                                    type='button'
                                                                    aria-label={
                                                                        option.label
                                                                    }
                                                                    aria-pressed={
                                                                        editorDraft.icon ===
                                                                        option.iconName
                                                                    }
                                                                    onClick={() => {
                                                                        setEditorDraft(
                                                                            {
                                                                                ...editorDraft,
                                                                                icon: option.iconName,
                                                                            }
                                                                        );
                                                                        setIsIconPickerOpen(
                                                                            false
                                                                        );
                                                                    }}
                                                                >
                                                                    <option.Icon aria-hidden='true' />
                                                                </button>
                                                            )
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        ) : undefined}
                                    </div>
                                )}

                                <div className='bookmark-workspace-form-spacer' />
                                {bookmarkControls.saveState ===
                                'saved' ? undefined : (
                                    <div
                                        className={`bookmark-workspace-form-save-state ${saveStatus.tone}`}
                                        role='status'
                                    >
                                        {saveStatus.icon}
                                        {saveStatus.label}
                                    </div>
                                )}
                                <div className='bookmark-workspace-form-actions'>
                                    {editorDraft.mode === 'edit' ? (
                                        <button
                                            className='bookmark-workspace-danger-button'
                                            type='button'
                                            onClick={() => {
                                                setDeleteRequest({
                                                    ...editorDraft,
                                                    label: editorDraft.title,
                                                });
                                            }}
                                        >
                                            <Trash2 aria-hidden='true' />
                                            {editorDraft.kind === 'category'
                                                ? t.deleteFolder
                                                : editorDraft.kind === 'folder'
                                                  ? t.deleteFolder
                                                  : t.deleteBookmark}
                                        </button>
                                    ) : undefined}
                                    <span />
                                    <button
                                        className='bookmark-workspace-secondary-button'
                                        type='button'
                                        onClick={cancelEditor}
                                    >
                                        {t.cancel}
                                    </button>
                                    <button
                                        className='bookmark-workspace-primary-button'
                                        type='submit'
                                        disabled={!isDraftDirty}
                                    >
                                        {bookmarkControls.saveState ===
                                        'saving' ? (
                                            <LoaderCircle
                                                aria-hidden='true'
                                                className='is-spinning'
                                            />
                                        ) : (
                                            <Check aria-hidden='true' />
                                        )}
                                        {t.save}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}

                {deleteRequest === undefined ? undefined : (
                    <div className='bookmark-workspace-confirm-backdrop'>
                        <div
                            className='bookmark-workspace-confirm'
                            role='alertdialog'
                            aria-modal='true'
                        >
                            <span className='bookmark-workspace-confirm-icon danger'>
                                <Trash2 aria-hidden='true' />
                            </span>
                            <div>
                                <h3>{t.deleteItemConfirm}</h3>
                                <p>{deleteRequest.label}</p>
                            </div>
                            <div>
                                <button
                                    type='button'
                                    onClick={() => {
                                        setDeleteRequest(undefined);
                                    }}
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    className='danger'
                                    type='button'
                                    onClick={confirmDelete}
                                >
                                    <Trash2 aria-hidden='true' />
                                    {t.deleteBookmark}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {discardTarget === undefined ? undefined : (
                    <div className='bookmark-workspace-confirm-backdrop'>
                        <div
                            className='bookmark-workspace-confirm'
                            role='alertdialog'
                            aria-modal='true'
                        >
                            <span className='bookmark-workspace-confirm-icon'>
                                <CircleAlert aria-hidden='true' />
                            </span>
                            <div>
                                <h3>{t.discardChanges}</h3>
                                <p>{t.discardChangesConfirm}</p>
                            </div>
                            <div>
                                <button
                                    type='button'
                                    onClick={() => {
                                        setDiscardTarget(undefined);
                                    }}
                                >
                                    {t.cancel}
                                </button>
                                <button type='button' onClick={confirmDiscard}>
                                    {t.discardChanges}
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {undoSnapshot === undefined ? undefined : (
                    <div className='bookmark-workspace-toast' role='status'>
                        <span>{undoSnapshot.label}</span>
                        <button type='button' onClick={undoDelete}>
                            <Undo2 aria-hidden='true' />
                            {t.undo}
                        </button>
                    </div>
                )}
            </div>
        </div>,
        globalThis.document.body
    );
};
