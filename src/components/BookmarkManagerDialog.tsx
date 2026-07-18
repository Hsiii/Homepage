/* eslint-disable no-nested-ternary -- Visual state branches are clearest inline in this workspace. */
import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
    Bookmark,
    Check,
    ChevronDown,
    ChevronRight,
    CircleAlert,
    Download,
    ExternalLink,
    FolderOpen,
    FolderPlus,
    Link as LinkIcon,
    LoaderCircle,
    MoreVertical,
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

interface DestinationOption {
    key: string;
    label: string;
    location: BookmarkLocation;
}

interface FormErrors {
    title?: string;
    url?: string;
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
    const [openMenuKey, setOpenMenuKey] = useState<string>();
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [iconQuery, setIconQuery] = useState('');
    const [deleteRequest, setDeleteRequest] = useState<DeleteRequest>();
    const [discardTarget, setDiscardTarget] = useState<'dialog' | 'editor'>();
    const [undoSnapshot, setUndoSnapshot] = useState<{
        label: string;
        tree: readonly BookmarkCategoryData[];
    }>();

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
    const isDraftDirty =
        editorDraft !== undefined &&
        serializeDraft(editorDraft) !== draftBaseline;

    const itemCountLabel = (count: number) =>
        locale === 'zh-TW'
            ? `${count} 個項目`
            : `${count} ${count === 1 ? 'item' : 'items'}`;

    const openDraft = (draft: EditorDraft) => {
        setEditorDraft(draft);
        setDraftBaseline(serializeDraft(draft));
        setFormErrors({});
        setIsIconPickerOpen(false);
        setOpenMenuKey(undefined);
    };

    const editCategory = (categoryIndex: number) => {
        const category = bookmarkTree.at(categoryIndex);
        const decoratedCategory = decoratedTree.at(categoryIndex);
        if (category === undefined || decoratedCategory === undefined) {
            return;
        }

        setLocation({ categoryIndex, folderPath: [] });
        setExpandedKeys((current: ReadonlySet<string>) =>
            new Set(current).add(category.id)
        );
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
                        style={
                            {
                                '--bookmark-tree-depth': depth,
                            } as React.CSSProperties
                        }
                    >
                        <button
                            className='bookmark-workspace-tree-toggle'
                            type='button'
                            aria-label={node.title}
                            aria-expanded={isExpanded}
                            onClick={() => {
                                toggleExpanded(node.id);
                            }}
                        >
                            {isExpanded ? (
                                <ChevronDown aria-hidden='true' />
                            ) : (
                                <ChevronRight aria-hidden='true' />
                            )}
                        </button>
                        <button
                            className='bookmark-workspace-tree-item'
                            type='button'
                            aria-current={isSelected ? 'page' : undefined}
                            onClick={() => {
                                editFolder({ categoryIndex, folderPath });
                            }}
                        >
                            {createBookmarkIcon(node.icon, 'icon')}
                            <span>{node.title}</span>
                            <small>{countBookmarks(node.children)}</small>
                        </button>
                    </div>
                    {isExpanded
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
                ? t.newCategory
                : t.editCategory
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
                data-inspector-open={editorDraft !== undefined}
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
                    } else if (openMenuKey === undefined) {
                        requestDialogClose();
                    } else {
                        setOpenMenuKey(undefined);
                    }
                }}
            >
                <header className='bookmark-manager-header'>
                    <div className='bookmark-workspace-title-group'>
                        <Bookmark aria-hidden='true' />
                        <h2 id={titleId}>{t.manageBookmarks}</h2>
                    </div>
                    <div className='bookmark-workspace-header-actions'>
                        <span
                            className={`bookmark-workspace-save-status ${saveStatus.tone}`}
                            role='status'
                        >
                            {saveStatus.icon}
                            {saveStatus.label}
                        </span>
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
                            <span>{t.importBookmarks}</span>
                        </button>
                        <button
                            className='bookmark-workspace-header-button'
                            type='button'
                            onClick={bookmarkControls.exportBookmarks}
                        >
                            <Download aria-hidden='true' />
                            <span>{t.exportBookmarks}</span>
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

                {bookmarkControls.status === undefined ? undefined : (
                    <div
                        className={`bookmark-workspace-banner ${bookmarkControls.status.type}`}
                        role={
                            bookmarkControls.status.type === 'error'
                                ? 'alert'
                                : 'status'
                        }
                    >
                        {bookmarkControls.status.type === 'error' ? (
                            <CircleAlert aria-hidden='true' />
                        ) : (
                            <Check aria-hidden='true' />
                        )}
                        {t[bookmarkControls.status.messageKey]}
                    </div>
                )}

                <div className='bookmark-manager-body bookmark-workspace-grid'>
                    <aside className='bookmark-workspace-tree-pane'>
                        <label className='bookmark-workspace-search'>
                            <Search aria-hidden='true' />
                            <span className='sr-only'>{t.bookmarkSearch}</span>
                            <input
                                type='search'
                                placeholder={t.bookmarkSearch}
                                value={query}
                                onChange={(event) => {
                                    setQuery(event.target.value);
                                }}
                            />
                        </label>
                        <div className='bookmark-workspace-tree-heading'>
                            <span>{t.bookmarks}</span>
                            <button
                                type='button'
                                aria-label={t.addCategory}
                                onClick={beginAddCategory}
                            >
                                <Plus aria-hidden='true' />
                            </button>
                        </div>
                        <nav
                            className='bookmark-workspace-tree'
                            aria-label={t.categories}
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
                            ) : visibleCategoryIndexes.length === 0 ? (
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
                                    {normalizedQuery === '' ? (
                                        <button
                                            type='button'
                                            onClick={beginAddCategory}
                                        >
                                            <Plus aria-hidden='true' />
                                            {t.addCategory}
                                        </button>
                                    ) : undefined}
                                </div>
                            ) : (
                                visibleCategoryIndexes.map((categoryIndex) => {
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
                                    const isSelected =
                                        location.categoryIndex ===
                                            categoryIndex &&
                                        location.folderPath.length === 0;

                                    return (
                                        <React.Fragment key={category.id}>
                                            <div className='bookmark-workspace-tree-row root'>
                                                <button
                                                    className='bookmark-workspace-tree-toggle'
                                                    type='button'
                                                    aria-label={
                                                        category.category
                                                    }
                                                    aria-expanded={isExpanded}
                                                    onClick={() => {
                                                        toggleExpanded(
                                                            category.id
                                                        );
                                                    }}
                                                >
                                                    {isExpanded ? (
                                                        <ChevronDown aria-hidden='true' />
                                                    ) : (
                                                        <ChevronRight aria-hidden='true' />
                                                    )}
                                                </button>
                                                <button
                                                    className='bookmark-workspace-tree-item'
                                                    type='button'
                                                    aria-current={
                                                        isSelected
                                                            ? 'page'
                                                            : undefined
                                                    }
                                                    onClick={() => {
                                                        editCategory(
                                                            categoryIndex
                                                        );
                                                    }}
                                                >
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
                                            {isExpanded
                                                ? renderFolderTree(
                                                      category.children,
                                                      categoryIndex,
                                                      [],
                                                      1
                                                  )
                                                : undefined}
                                        </React.Fragment>
                                    );
                                })
                            )}
                        </nav>
                    </aside>

                    <main className='bookmark-workspace-list-pane'>
                        <div className='bookmark-workspace-list-header'>
                            <div>
                                <h3>
                                    {currentFolder?.title ??
                                        currentCategory?.category ??
                                        t.bookmarks}
                                </h3>
                                <span>
                                    {itemCountLabel(visibleNodes.length)}
                                </span>
                            </div>
                            <div className='bookmark-workspace-list-actions'>
                                <button
                                    className='bookmark-workspace-primary-button'
                                    type='button'
                                    disabled={currentCategory === undefined}
                                    onClick={beginAddBookmark}
                                >
                                    <Plus aria-hidden='true' />
                                    {t.addBookmark}
                                </button>
                                <button
                                    className='bookmark-workspace-icon-button'
                                    type='button'
                                    aria-label={t.addFolder}
                                    disabled={currentCategory === undefined}
                                    onClick={beginAddFolder}
                                >
                                    <FolderPlus aria-hidden='true' />
                                </button>
                            </div>
                        </div>
                        <div className='bookmark-workspace-breadcrumb'>
                            {breadcrumbLabels.filter(Boolean).join(' / ')}
                        </div>
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
                                    <button
                                        type='button'
                                        onClick={beginAddCategory}
                                    >
                                        <Plus aria-hidden='true' />
                                        {t.addCategory}
                                    </button>
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
                                    {normalizedQuery === '' ? (
                                        <div>
                                            <button
                                                type='button'
                                                onClick={beginAddBookmark}
                                            >
                                                <Plus aria-hidden='true' />
                                                {t.addBookmark}
                                            </button>
                                            <button
                                                type='button'
                                                onClick={beginAddFolder}
                                            >
                                                <FolderPlus aria-hidden='true' />
                                                {t.addFolder}
                                            </button>
                                        </div>
                                    ) : undefined}
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
                                            data-selected={
                                                selectedKey === rowKey
                                            }
                                            key={node.id}
                                        >
                                            <button
                                                className='bookmark-workspace-list-item'
                                                type='button'
                                                onClick={() => {
                                                    if (isFolder) {
                                                        editFolder(
                                                            folderLocation
                                                        );
                                                    } else {
                                                        editBookmark(
                                                            location,
                                                            node
                                                        );
                                                    }
                                                }}
                                            >
                                                <span className='bookmark-workspace-item-icon'>
                                                    {isFolder ? (
                                                        createBookmarkIcon(
                                                            node.icon,
                                                            'icon'
                                                        )
                                                    ) : (
                                                        <LinkIcon aria-hidden='true' />
                                                    )}
                                                </span>
                                                <span className='bookmark-workspace-item-copy'>
                                                    <strong>
                                                        {node.title}
                                                    </strong>
                                                    <small>
                                                        {isFolder
                                                            ? itemCountLabel(
                                                                  countBookmarks(
                                                                      node.children
                                                                  )
                                                              )
                                                            : getBookmarkHost(
                                                                  node.url
                                                              )}
                                                    </small>
                                                </span>
                                            </button>
                                            {isFolder ? undefined : (
                                                <a
                                                    className='bookmark-workspace-row-link'
                                                    href={node.url}
                                                    target='_blank'
                                                    rel='noreferrer'
                                                    aria-label={node.title}
                                                >
                                                    <ExternalLink aria-hidden='true' />
                                                </a>
                                            )}
                                            <button
                                                className='bookmark-workspace-row-menu-button'
                                                type='button'
                                                aria-label={t.moreActions}
                                                aria-haspopup='menu'
                                                aria-expanded={
                                                    openMenuKey === rowKey
                                                }
                                                onClick={() => {
                                                    setOpenMenuKey(
                                                        openMenuKey === rowKey
                                                            ? undefined
                                                            : rowKey
                                                    );
                                                }}
                                            >
                                                <MoreVertical aria-hidden='true' />
                                            </button>
                                            {openMenuKey === rowKey ? (
                                                <div
                                                    className='bookmark-workspace-row-menu'
                                                    role='menu'
                                                >
                                                    <button
                                                        type='button'
                                                        role='menuitem'
                                                        onClick={() => {
                                                            if (isFolder) {
                                                                editFolder(
                                                                    folderLocation
                                                                );
                                                            } else {
                                                                editBookmark(
                                                                    location,
                                                                    node
                                                                );
                                                            }
                                                        }}
                                                    >
                                                        <Pencil aria-hidden='true' />
                                                        {t.edit}
                                                    </button>
                                                    <button
                                                        className='danger'
                                                        type='button'
                                                        role='menuitem'
                                                        onClick={() => {
                                                            setDeleteRequest({
                                                                ...(isFolder
                                                                    ? folderLocation
                                                                    : location),
                                                                bookmarkId:
                                                                    isFolder
                                                                        ? undefined
                                                                        : node.id,
                                                                kind: isFolder
                                                                    ? 'folder'
                                                                    : 'bookmark',
                                                                label: node.title,
                                                            });
                                                            setOpenMenuKey(
                                                                undefined
                                                            );
                                                        }}
                                                    >
                                                        <Trash2 aria-hidden='true' />
                                                        {isFolder
                                                            ? t.deleteFolder
                                                            : t.deleteBookmark}
                                                    </button>
                                                </div>
                                            ) : undefined}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </main>

                    <aside
                        className={`bookmark-workspace-inspector ${
                            editorDraft === undefined ? '' : 'is-open'
                        }`}
                    >
                        {bookmarkControls.isLoading ? (
                            <div className='bookmark-workspace-inspector-loading'>
                                <LoaderCircle
                                    aria-hidden='true'
                                    className='is-spinning'
                                />
                                <span>{t.bookmarksLoading}</span>
                            </div>
                        ) : editorDraft === undefined ? (
                            <div className='bookmark-workspace-empty inspector'>
                                <Pencil aria-hidden='true' />
                                <strong>{t.selectBookmarkItem}</strong>
                                <span>{t.selectBookmarkItemDescription}</span>
                            </div>
                        ) : (
                            <form
                                className='bookmark-workspace-form'
                                onSubmit={(event) => {
                                    event.preventDefault();
                                    saveDraft();
                                }}
                            >
                                <div className='bookmark-workspace-form-heading'>
                                    <div>
                                        <span className='bookmark-workspace-kind-chip'>
                                            {editorDraft.kind === 'bookmark'
                                                ? t.bookmarks
                                                : editorDraft.kind === 'folder'
                                                  ? t.folders
                                                  : t.categories}
                                        </span>
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
                                              ? t.categoryName
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
                                        <label className='bookmark-workspace-field'>
                                            <span>{t.location}</span>
                                            <select
                                                value={
                                                    editorDraft.destinationKey
                                                }
                                                onChange={(event) => {
                                                    setEditorDraft({
                                                        ...editorDraft,
                                                        destinationKey:
                                                            event.target.value,
                                                    });
                                                }}
                                            >
                                                {destinationOptions.map(
                                                    (option) => (
                                                        <option
                                                            key={option.key}
                                                            value={option.key}
                                                        >
                                                            {option.label}
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                        </label>
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
                                                <label className='bookmark-workspace-search'>
                                                    <Search aria-hidden='true' />
                                                    <span className='sr-only'>
                                                        {t.categoryIcon}
                                                    </span>
                                                    <input
                                                        type='search'
                                                        value={iconQuery}
                                                        onChange={(event) => {
                                                            setIconQuery(
                                                                event.target
                                                                    .value
                                                            );
                                                        }}
                                                    />
                                                </label>
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
                                            </div>
                                        ) : undefined}
                                    </div>
                                )}

                                <div className='bookmark-workspace-form-spacer' />
                                <div
                                    className={`bookmark-workspace-form-save-state ${saveStatus.tone}`}
                                    role='status'
                                >
                                    {saveStatus.icon}
                                    {bookmarkControls.saveState === 'saved'
                                        ? t.allChangesSaved
                                        : saveStatus.label}
                                </div>
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
                                                ? t.deleteCategory
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
                        )}
                    </aside>
                </div>

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
