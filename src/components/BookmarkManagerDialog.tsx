import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
    Check,
    ChevronLeft,
    FolderPlus,
    Link as LinkIcon,
    Pencil,
    Plus,
    Search,
    Trash2,
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

interface BookmarkDraft {
    bookmarkId?: string;
    categoryIndex: number;
    folderPath: string[];
    mode: 'add' | 'edit';
    sourceCategoryIndex: number;
    sourceFolderPath: string[];
    title: string;
    url: string;
}

interface BookmarkDestinationOption {
    key: string;
    label: string;
    location: {
        categoryIndex: number;
        folderPath: string[];
    };
}

type BookmarkItemDialog =
    | {
          categoryIndex: number;
          mode: 'category';
      }
    | {
          categoryIndex: number;
          folderPath: string[];
          mode: 'folder';
      };

const defaultIconName = 'Folder';
const maxVisibleIconOptions = 40;
const folderPathSeparator = ' / ';

const normalizeUrl = (value: string): string | undefined => {
    const trimmedValue = value.trim();
    if (trimmedValue === '') {
        return undefined;
    }

    const candidate = /^[a-z][\d+.a-z-]*:/i.test(trimmedValue)
        ? trimmedValue
        : `https://${trimmedValue}`;

    try {
        const url = new URL(candidate);

        const blockedProtocol = 'java'.concat('script:');

        return url.protocol === blockedProtocol ? undefined : url.href;
    } catch {
        return undefined;
    }
};

const getUniqueCategoryName = (categories: readonly string[]): string => {
    const baseName = 'New category';

    if (!categories.includes(baseName)) {
        return baseName;
    }

    let index = 2;
    let name = `${baseName} ${index}`;

    while (categories.includes(name)) {
        index++;
        name = `${baseName} ${index}`;
    }

    return name;
};

const getUniqueFolderName = (nodes: readonly BookmarkNodeData[]): string => {
    const baseName = 'New folder';
    const folderNames = new Set(
        nodes.filter(isBookmarkFolder).map((folder) => folder.title)
    );

    if (!folderNames.has(baseName)) {
        return baseName;
    }

    let index = 2;
    let name = `${baseName} ${index}`;

    while (folderNames.has(name)) {
        index++;
        name = `${baseName} ${index}`;
    }

    return name;
};

const getFolderAtPath = (
    nodes: readonly BookmarkNodeData[],
    folderPath: readonly string[]
): BookmarkFolderData | undefined => {
    if (folderPath.length === 0) {
        return undefined;
    }

    const folderId = folderPath[0];
    const remainingPath = folderPath.slice(1);
    const folder = nodes.find(
        (node): node is BookmarkFolderData =>
            isBookmarkFolder(node) && node.id === folderId
    );

    if (folder === undefined || remainingPath.length === 0) {
        return folder;
    }

    return getFolderAtPath(folder.children, remainingPath);
};

const getNodesAtPath = (
    category: BookmarkCategoryData | undefined,
    folderPath: readonly string[]
): readonly BookmarkNodeData[] => {
    if (category === undefined) {
        return [];
    }

    if (folderPath.length === 0) {
        return category.children;
    }

    return getFolderAtPath(category.children, folderPath)?.children ?? [];
};

const getBookmarkLocationKey = (
    categoryIndex: number,
    folderPath: readonly string[]
): string => JSON.stringify([categoryIndex, ...folderPath]);

const collectDestinationOptions = (
    nodes: readonly BookmarkNodeData[],
    categoryIndex: number,
    parentLabel: string,
    folderPath: readonly string[] = []
): BookmarkDestinationOption[] => {
    const options: BookmarkDestinationOption[] = [];

    for (const node of nodes) {
        if (!isBookmarkFolder(node)) {
            continue;
        }

        const nextFolderPath = [...folderPath, node.id];
        const label = `${parentLabel}${folderPathSeparator}${node.title}`;

        options.push(
            {
                key: getBookmarkLocationKey(categoryIndex, nextFolderPath),
                label,
                location: {
                    categoryIndex,
                    folderPath: nextFolderPath,
                },
            },
            ...collectDestinationOptions(
                node.children,
                categoryIndex,
                label,
                nextFolderPath
            )
        );
    }

    return options;
};

const getBookmarkDestinationOptions = (
    bookmarkTree: readonly BookmarkCategoryData[]
): BookmarkDestinationOption[] =>
    bookmarkTree.flatMap((categoryData, categoryIndex) => [
        {
            key: getBookmarkLocationKey(categoryIndex, []),
            label: categoryData.category,
            location: {
                categoryIndex,
                folderPath: [],
            },
        },
        ...collectDestinationOptions(
            categoryData.children,
            categoryIndex,
            categoryData.category
        ),
    ]);

export const BookmarkManagerDialog: React.FC<BookmarkManagerDialogProps> = ({
    bookmarkControls,
    onClose,
}) => {
    const { t } = useLocale();
    const dialogId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const bookmarkTitleInputRef = useRef<HTMLInputElement>(null);
    const [selectedCategoryIndex, setSelectedCategoryIndex] =
        useState<number>();
    const [selectedFolderPath, setSelectedFolderPath] = useState<string[]>([]);
    const [selectedBookmarkId, setSelectedBookmarkId] = useState<string>();
    const [categoryName, setCategoryName] = useState('');
    const [categoryIconName, setCategoryIconName] = useState(defaultIconName);
    const [folderName, setFolderName] = useState('');
    const [folderIconName, setFolderIconName] = useState(defaultIconName);
    const [iconSearch, setIconSearch] = useState('');
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [itemDialog, setItemDialog] = useState<BookmarkItemDialog>();
    const [bookmarkDraft, setBookmarkDraft] = useState<BookmarkDraft>();
    const [bookmarkError, setBookmarkError] = useState<string>();
    const [confirmDeleteCategoryIndex, setConfirmDeleteCategoryIndex] =
        useState<number>();
    const { bookmarkTree } = bookmarkControls;
    const decoratedBookmarkTree = useMemo(
        () => decorateBookmarkTree(bookmarkTree),
        [bookmarkTree]
    );
    const isRootLocation = selectedCategoryIndex === undefined;
    const selectedCategory =
        selectedCategoryIndex === undefined
            ? undefined
            : bookmarkTree.at(selectedCategoryIndex);
    const selectedDecoratedCategory =
        selectedCategoryIndex === undefined
            ? undefined
            : decoratedBookmarkTree.at(selectedCategoryIndex);
    const selectedFolder = getFolderAtPath(
        selectedCategory?.children ?? [],
        selectedFolderPath
    );
    const dialogCategory =
        itemDialog?.mode === 'category'
            ? bookmarkTree.at(itemDialog.categoryIndex)
            : undefined;
    const dialogDecoratedCategory =
        itemDialog?.mode === 'category'
            ? decoratedBookmarkTree.at(itemDialog.categoryIndex)
            : undefined;
    const dialogFolderCategory =
        itemDialog?.mode === 'folder'
            ? bookmarkTree.at(itemDialog.categoryIndex)
            : undefined;
    const dialogFolder =
        itemDialog?.mode === 'folder'
            ? getFolderAtPath(
                  dialogFolderCategory?.children ?? [],
                  itemDialog.folderPath
              )
            : undefined;
    const selectedNodes = getNodesAtPath(selectedCategory, selectedFolderPath);
    const selectedBookmarks = selectedNodes.filter(isBookmarkLink);
    const selectedBookmark = selectedBookmarks.find(
        (bookmark) => bookmark.id === selectedBookmarkId
    );
    const selectedLocation =
        selectedCategoryIndex === undefined
            ? undefined
            : {
                  categoryIndex: selectedCategoryIndex,
                  folderPath: selectedFolderPath,
              };
    const currentTitle =
        selectedFolder?.title ?? selectedCategory?.category ?? t.bookmarks;
    const selectedFolderPathKey = selectedFolderPath.join('\n');
    const destinationOptions = useMemo(
        () => getBookmarkDestinationOptions(bookmarkTree),
        [bookmarkTree]
    );
    const selectedCategoryIconOption =
        categoryIconOptions.find(
            (iconOption) => iconOption.iconName === categoryIconName
        ) ?? categoryIconOptions[0];
    const SelectedCategoryIcon = selectedCategoryIconOption.Icon;
    const selectedFolderIconOption =
        categoryIconOptions.find(
            (iconOption) => iconOption.iconName === folderIconName
        ) ?? categoryIconOptions[0];
    const SelectedFolderIcon = selectedFolderIconOption.Icon;
    const confirmDeleteCategoryData =
        confirmDeleteCategoryIndex === undefined
            ? undefined
            : decoratedBookmarkTree.at(confirmDeleteCategoryIndex);
    const visibleIconOptions = useMemo(() => {
        const normalizedSearch = normalizeCategoryIconSearch(iconSearch);
        const filteredIconOptions =
            normalizedSearch === ''
                ? categoryIconOptions
                : categoryIconOptions.filter((iconOption) =>
                      iconOption.searchText.includes(normalizedSearch)
                  );

        return filteredIconOptions.slice(0, maxVisibleIconOptions);
    }, [iconSearch]);
    const isCategoryDirty =
        itemDialog?.mode === 'category' &&
        dialogCategory !== undefined &&
        (categoryName.trim() !== dialogCategory.category ||
            categoryIconName !== dialogDecoratedCategory?.iconName);
    const isFolderDirty =
        itemDialog?.mode === 'folder' &&
        dialogFolder !== undefined &&
        (folderName.trim() !== dialogFolder.title ||
            folderIconName !== resolveFolderIconName(dialogFolder));

    useEffect(() => {
        dialogRef.current?.focus();
    }, []);

    useEffect(() => {
        if (
            selectedCategoryIndex !== undefined &&
            selectedCategoryIndex >= bookmarkTree.length
        ) {
            setSelectedCategoryIndex(undefined);
            setSelectedFolderPath([]);
            setSelectedBookmarkId(undefined);
            setBookmarkDraft(undefined);
        }
    }, [bookmarkTree.length, selectedCategoryIndex]);

    useEffect(() => {
        if (
            selectedFolderPath.length > 0 &&
            (selectedCategory === undefined || selectedFolder === undefined)
        ) {
            setSelectedFolderPath([]);
            setSelectedBookmarkId(undefined);
            setBookmarkDraft(undefined);
        }
    }, [
        selectedCategory,
        selectedFolder,
        selectedFolderPath.length,
        selectedFolderPathKey,
    ]);

    useEffect(() => {
        setCategoryName(selectedCategory?.category ?? '');
        setCategoryIconName(
            selectedDecoratedCategory?.iconName ?? defaultIconName
        );
        setConfirmDeleteCategoryIndex(undefined);
        setIconSearch('');
        setIsIconPickerOpen(false);
    }, [
        selectedCategory?.category,
        selectedCategoryIndex,
        selectedDecoratedCategory?.iconName,
    ]);

    useEffect(() => {
        setFolderName(selectedFolder?.title ?? '');
        setFolderIconName(resolveFolderIconName(selectedFolder));
        setIconSearch('');
        setIsIconPickerOpen(false);
    }, [selectedFolder, selectedFolder?.title, selectedFolderPathKey]);

    useEffect(() => {
        if (
            selectedBookmarkId !== undefined &&
            selectedBookmark === undefined
        ) {
            setSelectedBookmarkId(undefined);
        }
    }, [selectedBookmark, selectedBookmarkId]);

    useEffect(() => {
        if (
            (itemDialog?.mode === 'category' && dialogCategory === undefined) ||
            (itemDialog?.mode === 'folder' && dialogFolder === undefined)
        ) {
            setItemDialog(undefined);
            setIconSearch('');
            setIsIconPickerOpen(false);
        }
    }, [dialogCategory, dialogFolder, itemDialog]);

    useEffect(() => {
        if (bookmarkDraft === undefined) {
            return;
        }

        globalThis.requestAnimationFrame(() => {
            bookmarkTitleInputRef.current?.focus();
        });
    }, [bookmarkDraft]);

    const closeDraft = () => {
        setBookmarkDraft(undefined);
        setBookmarkError(undefined);
    };

    const closeItemDialog = () => {
        setItemDialog(undefined);
        setIconSearch('');
        setIsIconPickerOpen(false);
    };

    const openRoot = () => {
        setSelectedCategoryIndex(undefined);
        setSelectedFolderPath([]);
        setSelectedBookmarkId(undefined);
        closeDraft();
        closeItemDialog();
    };

    const openCategory = (categoryIndex: number) => {
        setSelectedCategoryIndex(categoryIndex);
        setSelectedFolderPath([]);
        setSelectedBookmarkId(undefined);
        closeDraft();
        closeItemDialog();
    };

    const openFolder = (folderId: string) => {
        setSelectedFolderPath([...selectedFolderPath, folderId]);
        setSelectedBookmarkId(undefined);
        closeDraft();
        closeItemDialog();
    };

    const goUp = () => {
        if (selectedFolderPath.length > 0) {
            setSelectedFolderPath(selectedFolderPath.slice(0, -1));
            setSelectedBookmarkId(undefined);
            closeDraft();
            closeItemDialog();
            return;
        }

        openRoot();
    };

    const createCategory = () => {
        const category = getUniqueCategoryName(
            bookmarkTree.map((categoryData) => categoryData.category)
        );

        if (
            bookmarkControls.addCategory({
                category,
                icon: defaultIconName,
            })
        ) {
            openCategory(bookmarkTree.length);
        }
    };

    const openEditCategory = (categoryIndex: number) => {
        const categoryData = bookmarkTree.at(categoryIndex);
        const decoratedCategoryData = decoratedBookmarkTree.at(categoryIndex);
        if (categoryData === undefined) {
            return;
        }

        setCategoryName(categoryData.category);
        setCategoryIconName(decoratedCategoryData?.iconName ?? defaultIconName);
        setItemDialog({ categoryIndex, mode: 'category' });
        closeDraft();
        setIconSearch('');
        setIsIconPickerOpen(false);
    };

    const saveCategory = () => {
        if (itemDialog?.mode !== 'category') {
            return;
        }

        if (
            bookmarkControls.updateCategory(itemDialog.categoryIndex, {
                category: categoryName,
                icon: categoryIconName,
            })
        ) {
            closeItemDialog();
        }
    };

    const createFolder = () => {
        if (selectedLocation === undefined) {
            return;
        }

        bookmarkControls.addFolder(selectedLocation, {
            icon: defaultIconName,
            title: getUniqueFolderName(selectedNodes),
        });
        setSelectedBookmarkId(undefined);
        closeDraft();
    };

    const openEditFolder = (
        categoryIndex: number,
        folderPath: readonly string[],
        folder: BookmarkFolderData
    ) => {
        setFolderName(folder.title);
        setFolderIconName(resolveFolderIconName(folder));
        setItemDialog({
            categoryIndex,
            folderPath: [...folderPath],
            mode: 'folder',
        });
        closeDraft();
        setIconSearch('');
        setIsIconPickerOpen(false);
    };

    const saveFolder = () => {
        if (itemDialog?.mode !== 'folder') {
            return;
        }

        if (
            bookmarkControls.updateFolder(
                {
                    categoryIndex: itemDialog.categoryIndex,
                    folderPath: itemDialog.folderPath,
                },
                {
                    icon: folderIconName,
                    title: folderName,
                }
            )
        ) {
            closeItemDialog();
        }
    };

    const deleteFolder = (folderPath: readonly string[]) => {
        if (selectedCategoryIndex === undefined) {
            return;
        }

        if (
            bookmarkControls.deleteFolder({
                categoryIndex: selectedCategoryIndex,
                folderPath: [...folderPath],
            })
        ) {
            if (
                selectedFolderPath.length >= folderPath.length &&
                folderPath.every(
                    (folderId, index) => selectedFolderPath[index] === folderId
                )
            ) {
                setSelectedFolderPath(folderPath.slice(0, -1));
            }
            setSelectedBookmarkId(undefined);
            closeDraft();
            closeItemDialog();
        }
    };

    const openDeleteCategoryConfirm = (categoryIndex: number) => {
        setConfirmDeleteCategoryIndex(categoryIndex);
    };

    const confirmDeleteCategory = (categoryIndex: number) => {
        if (
            categoryIndex < 0 ||
            categoryIndex >= decoratedBookmarkTree.length
        ) {
            return;
        }

        if (bookmarkControls.deleteCategory(categoryIndex)) {
            if (selectedCategoryIndex === categoryIndex) {
                openRoot();
            } else if (
                selectedCategoryIndex !== undefined &&
                categoryIndex < selectedCategoryIndex
            ) {
                setSelectedCategoryIndex(selectedCategoryIndex - 1);
            }
            if (
                itemDialog?.mode === 'category' &&
                itemDialog.categoryIndex === categoryIndex
            ) {
                closeItemDialog();
            }
            setConfirmDeleteCategoryIndex(undefined);
        }
    };

    const startAddBookmark = () => {
        if (selectedCategoryIndex === undefined) {
            return;
        }

        setSelectedBookmarkId(undefined);
        closeItemDialog();
        setBookmarkDraft({
            categoryIndex: selectedCategoryIndex,
            folderPath: [...selectedFolderPath],
            mode: 'add',
            sourceCategoryIndex: selectedCategoryIndex,
            sourceFolderPath: [...selectedFolderPath],
            title: '',
            url: '',
        });
        setBookmarkError(undefined);
    };

    const startEditBookmark = (bookmark: BookmarkLinkData) => {
        if (selectedCategoryIndex === undefined) {
            return;
        }

        setSelectedBookmarkId(bookmark.id);
        closeItemDialog();
        setBookmarkDraft({
            bookmarkId: bookmark.id,
            categoryIndex: selectedCategoryIndex,
            folderPath: [...selectedFolderPath],
            mode: 'edit',
            sourceCategoryIndex: selectedCategoryIndex,
            sourceFolderPath: [...selectedFolderPath],
            title: bookmark.title,
            url: bookmark.url,
        });
        setBookmarkError(undefined);
    };

    const saveBookmark = () => {
        if (bookmarkDraft === undefined) {
            return;
        }

        const url = normalizeUrl(bookmarkDraft.url);
        if (url === undefined) {
            setBookmarkError(t.bookmarkUrlInvalid);
            return;
        }

        const bookmarkInput = {
            title: bookmarkDraft.title,
            url,
        };
        const didSave =
            bookmarkDraft.mode === 'add'
                ? bookmarkControls.addBookmarkToLocation(
                      {
                          categoryIndex: bookmarkDraft.categoryIndex,
                          folderPath: bookmarkDraft.folderPath,
                      },
                      bookmarkInput
                  )
                : bookmarkControls.updateBookmarkInLocation(
                      {
                          categoryIndex: bookmarkDraft.sourceCategoryIndex,
                          folderPath: bookmarkDraft.sourceFolderPath,
                      },
                      bookmarkDraft.bookmarkId ?? '',
                      bookmarkInput,
                      {
                          categoryIndex: bookmarkDraft.categoryIndex,
                          folderPath: bookmarkDraft.folderPath,
                      }
                  );

        if (didSave) {
            setSelectedCategoryIndex(bookmarkDraft.categoryIndex);
            setSelectedFolderPath(bookmarkDraft.folderPath);
            setSelectedBookmarkId(bookmarkDraft.bookmarkId);
            closeDraft();
        }
    };

    const deleteBookmark = (bookmarkId: string) => {
        if (
            selectedCategoryIndex !== undefined &&
            bookmarkControls.deleteBookmark(selectedCategoryIndex, bookmarkId)
        ) {
            if (selectedBookmarkId === bookmarkId) {
                setSelectedBookmarkId(undefined);
            }
            closeDraft();
        }
    };

    const renderIconField = (
        iconName: string,
        selectedOption: (typeof categoryIconOptions)[number],
        SelectedIcon: (typeof categoryIconOptions)[number]['Icon'],
        setIconName: React.Dispatch<React.SetStateAction<string>>
    ) => (
        <div className='bookmark-manager-icon-field'>
            <span className='bookmark-manager-field-label'>
                {t.categoryIcon}
            </span>
            <button
                className='bookmark-manager-icon-picker-trigger'
                type='button'
                aria-label={`${t.categoryIcon}: ${selectedOption.label}`}
                title={selectedOption.label}
                aria-expanded={isIconPickerOpen}
                onClick={() => {
                    setIsIconPickerOpen((current) => !current);
                }}
            >
                <SelectedIcon size={18} aria-hidden />
            </button>
            {isIconPickerOpen ? (
                <div className='bookmark-manager-icon-picker'>
                    <label className='bookmark-manager-search'>
                        <Search size={16} aria-hidden />
                        <input
                            type='search'
                            value={iconSearch}
                            placeholder='Search icons'
                            onChange={(event) => {
                                setIconSearch(event.target.value);
                            }}
                        />
                    </label>
                    <div className='bookmark-manager-icon-grid'>
                        {visibleIconOptions.map((iconOption) => {
                            const OptionIcon = iconOption.Icon;
                            const isSelected = iconOption.iconName === iconName;

                            return (
                                <button
                                    className='bookmark-manager-icon-option'
                                    type='button'
                                    aria-pressed={isSelected}
                                    title={iconOption.label}
                                    key={iconOption.iconName}
                                    onClick={() => {
                                        setIconName(iconOption.iconName);
                                        setIsIconPickerOpen(false);
                                    }}
                                >
                                    <OptionIcon size={18} aria-hidden />
                                    {isSelected ? (
                                        <Check size={12} aria-hidden />
                                    ) : undefined}
                                </button>
                            );
                        })}
                    </div>
                </div>
            ) : undefined}
        </div>
    );

    if (typeof document === 'undefined') {
        return undefined;
    }

    return createPortal(
        <div
            className='bookmark-manager-backdrop'
            onClick={onClose}
            onKeyDown={(event) => {
                if (event.key === 'Escape') {
                    event.stopPropagation();
                    onClose();
                }
            }}
        >
            <div
                className='bookmark-manager-dialog'
                role='dialog'
                aria-modal='true'
                aria-labelledby={`${dialogId}-title`}
                tabIndex={-1}
                ref={dialogRef}
                onClick={(event) => {
                    event.stopPropagation();
                }}
            >
                <header className='bookmark-manager-header'>
                    <span
                        className='bookmark-manager-title'
                        id={`${dialogId}-title`}
                    >
                        {t.manageBookmarks}
                    </span>
                    <button
                        className='bookmark-manager-icon-button'
                        type='button'
                        aria-label='Close'
                        onClick={onClose}
                    >
                        <X size={18} aria-hidden />
                    </button>
                </header>
                <div className='bookmark-manager-body'>
                    <aside className='bookmark-manager-sidebar'>
                        <div className='bookmark-manager-browser-header'>
                            {isRootLocation ? undefined : (
                                <button
                                    className='bookmark-manager-icon-button'
                                    type='button'
                                    aria-label='Back'
                                    onClick={goUp}
                                >
                                    <ChevronLeft size={18} aria-hidden />
                                </button>
                            )}
                            <div className='bookmark-manager-location-group'>
                                <button
                                    className='bookmark-manager-location-button'
                                    type='button'
                                    onClick={openRoot}
                                >
                                    {currentTitle}
                                </button>
                            </div>
                            {isRootLocation ? (
                                <button
                                    className='bookmark-manager-icon-button'
                                    type='button'
                                    aria-label={t.addCategory}
                                    title={t.addCategory}
                                    onClick={createCategory}
                                >
                                    <FolderPlus size={18} aria-hidden />
                                </button>
                            ) : (
                                <>
                                    <button
                                        className='bookmark-manager-icon-button'
                                        type='button'
                                        aria-label={t.addFolder}
                                        title={t.addFolder}
                                        onClick={createFolder}
                                    >
                                        <FolderPlus size={18} aria-hidden />
                                    </button>
                                    <button
                                        className='bookmark-manager-icon-button'
                                        type='button'
                                        aria-label={t.addBookmark}
                                        title={t.addBookmark}
                                        onClick={startAddBookmark}
                                    >
                                        <Plus size={18} aria-hidden />
                                    </button>
                                </>
                            )}
                        </div>
                        <div
                            className='bookmark-manager-browser-list'
                            role='listbox'
                            aria-label={currentTitle}
                        >
                            {isRootLocation
                                ? decoratedBookmarkTree.map(
                                      (categoryData, categoryIndex) => (
                                          <div
                                              className='bookmark-manager-browser-row'
                                              key={`${categoryData.category}-${categoryIndex}`}
                                          >
                                              <button
                                                  className='bookmark-manager-browser-option'
                                                  type='button'
                                                  role='option'
                                                  aria-selected={false}
                                                  onClick={() => {
                                                      openCategory(
                                                          categoryIndex
                                                      );
                                                  }}
                                              >
                                                  {categoryData.icon}
                                                  <span>
                                                      {categoryData.category}
                                                  </span>
                                                  <span className='bookmark-manager-category-count'>
                                                      {
                                                          categoryData.links
                                                              .length
                                                      }
                                                  </span>
                                              </button>
                                              <div className='bookmark-manager-row-actions'>
                                                  <button
                                                      className='bookmark-manager-icon-button'
                                                      type='button'
                                                      aria-label={`${t.editCategory}: ${categoryData.category}`}
                                                      title={t.editCategory}
                                                      onClick={() => {
                                                          openEditCategory(
                                                              categoryIndex
                                                          );
                                                      }}
                                                  >
                                                      <Pencil
                                                          size={16}
                                                          aria-hidden
                                                      />
                                                  </button>
                                                  <button
                                                      className='bookmark-manager-icon-button danger'
                                                      type='button'
                                                      aria-label={`${t.deleteCategory}: ${categoryData.category}`}
                                                      title={t.deleteCategory}
                                                      onClick={() => {
                                                          openDeleteCategoryConfirm(
                                                              categoryIndex
                                                          );
                                                      }}
                                                  >
                                                      <Trash2
                                                          size={16}
                                                          aria-hidden
                                                      />
                                                  </button>
                                              </div>
                                          </div>
                                      )
                                  )
                                : selectedNodes.map((node) => {
                                      if (isBookmarkFolder(node)) {
                                          const folderPath = [
                                              ...selectedFolderPath,
                                              node.id,
                                          ];

                                          return (
                                              <div
                                                  className='bookmark-manager-browser-row'
                                                  key={node.id}
                                              >
                                                  <button
                                                      className='bookmark-manager-browser-option'
                                                      type='button'
                                                      role='option'
                                                      aria-selected={false}
                                                      onClick={() => {
                                                          openFolder(node.id);
                                                      }}
                                                  >
                                                      {createBookmarkIcon(
                                                          node.icon,
                                                          'icon bookmark-manager-folder-icon'
                                                      )}
                                                      <span>{node.title}</span>
                                                      <span className='bookmark-manager-category-count'>
                                                          {node.children.length}
                                                      </span>
                                                  </button>
                                                  <div className='bookmark-manager-row-actions'>
                                                      <button
                                                          className='bookmark-manager-icon-button'
                                                          type='button'
                                                          aria-label={`${t.editFolder}: ${node.title}`}
                                                          title={t.editFolder}
                                                          onClick={() => {
                                                              openEditFolder(
                                                                  selectedCategoryIndex,
                                                                  folderPath,
                                                                  node
                                                              );
                                                          }}
                                                      >
                                                          <Pencil
                                                              size={16}
                                                              aria-hidden
                                                          />
                                                      </button>
                                                      <button
                                                          className='bookmark-manager-icon-button danger'
                                                          type='button'
                                                          aria-label={`${t.deleteFolder}: ${node.title}`}
                                                          title={t.deleteFolder}
                                                          onClick={() => {
                                                              deleteFolder(
                                                                  folderPath
                                                              );
                                                          }}
                                                      >
                                                          <Trash2
                                                              size={16}
                                                              aria-hidden
                                                          />
                                                      </button>
                                                  </div>
                                              </div>
                                          );
                                      }

                                      return (
                                          <div
                                              className='bookmark-manager-browser-row'
                                              key={node.id}
                                          >
                                              <button
                                                  className='bookmark-manager-browser-option'
                                                  type='button'
                                                  role='option'
                                                  aria-selected={
                                                      selectedBookmarkId ===
                                                      node.id
                                                  }
                                                  onClick={() => {
                                                      startEditBookmark(node);
                                                  }}
                                              >
                                                  <LinkIcon
                                                      size={16}
                                                      aria-hidden
                                                  />
                                                  <span>{node.title}</span>
                                                  <span className='bookmark-manager-browser-url'>
                                                      {node.url}
                                                  </span>
                                              </button>
                                              <div className='bookmark-manager-row-actions'>
                                                  <button
                                                      className='bookmark-manager-icon-button danger'
                                                      type='button'
                                                      aria-label={`${t.deleteBookmark}: ${node.title}`}
                                                      title={t.deleteBookmark}
                                                      onClick={() => {
                                                          deleteBookmark(
                                                              node.id
                                                          );
                                                      }}
                                                  >
                                                      <Trash2
                                                          size={16}
                                                          aria-hidden
                                                      />
                                                  </button>
                                              </div>
                                          </div>
                                      );
                                  })}
                        </div>
                    </aside>
                </div>
                {itemDialog === undefined ? undefined : (
                    <div
                        className='bookmark-manager-editor-backdrop'
                        onClick={closeItemDialog}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                                event.stopPropagation();
                                closeItemDialog();
                            }
                        }}
                    >
                        <form
                            className='bookmark-manager-editor-dialog'
                            role='dialog'
                            aria-modal='true'
                            aria-labelledby={`${dialogId}-item-title`}
                            onSubmit={(event) => {
                                event.preventDefault();
                                if (itemDialog.mode === 'category') {
                                    saveCategory();
                                    return;
                                }

                                saveFolder();
                            }}
                            onClick={(event) => {
                                event.stopPropagation();
                            }}
                        >
                            <header className='bookmark-manager-editor-header'>
                                <span id={`${dialogId}-item-title`}>
                                    {itemDialog.mode === 'category'
                                        ? t.editCategory
                                        : t.editFolder}
                                </span>
                                <button
                                    className='bookmark-manager-icon-button'
                                    type='button'
                                    aria-label='Close'
                                    onClick={closeItemDialog}
                                >
                                    <X size={18} aria-hidden />
                                </button>
                            </header>
                            <div className='bookmark-manager-editor-grid'>
                                {itemDialog.mode === 'category'
                                    ? renderIconField(
                                          categoryIconName,
                                          selectedCategoryIconOption,
                                          SelectedCategoryIcon,
                                          setCategoryIconName
                                      )
                                    : renderIconField(
                                          folderIconName,
                                          selectedFolderIconOption,
                                          SelectedFolderIcon,
                                          setFolderIconName
                                      )}
                                <label className='bookmark-manager-field'>
                                    <span>
                                        {itemDialog.mode === 'category'
                                            ? t.categoryName
                                            : t.folderName}
                                    </span>
                                    <input
                                        value={
                                            itemDialog.mode === 'category'
                                                ? categoryName
                                                : folderName
                                        }
                                        onChange={(event) => {
                                            if (
                                                itemDialog.mode === 'category'
                                            ) {
                                                setCategoryName(
                                                    event.target.value
                                                );
                                                return;
                                            }

                                            setFolderName(event.target.value);
                                        }}
                                    />
                                </label>
                            </div>
                            <div className='bookmark-manager-form-actions'>
                                <button
                                    className='bookmark-manager-action-button'
                                    type='submit'
                                    disabled={
                                        itemDialog.mode === 'category'
                                            ? !isCategoryDirty ||
                                              categoryName.trim() === ''
                                            : !isFolderDirty ||
                                              folderName.trim() === ''
                                    }
                                >
                                    <Check size={16} aria-hidden />
                                    <span>{t.save}</span>
                                </button>
                                <button
                                    className='bookmark-manager-secondary-button'
                                    type='button'
                                    onClick={closeItemDialog}
                                >
                                    {t.cancel}
                                </button>
                            </div>
                        </form>
                    </div>
                )}
                {bookmarkDraft === undefined ? undefined : (
                    <div
                        className='bookmark-manager-editor-backdrop'
                        onClick={closeDraft}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                                event.stopPropagation();
                                closeDraft();
                            }
                        }}
                    >
                        <form
                            className='bookmark-manager-editor-dialog'
                            role='dialog'
                            aria-modal='true'
                            aria-labelledby={`${dialogId}-bookmark-title`}
                            onSubmit={(event) => {
                                event.preventDefault();
                                saveBookmark();
                            }}
                            onClick={(event) => {
                                event.stopPropagation();
                            }}
                        >
                            <header className='bookmark-manager-editor-header'>
                                <span id={`${dialogId}-bookmark-title`}>
                                    {bookmarkDraft.mode === 'add'
                                        ? t.addBookmark
                                        : t.editBookmark}
                                </span>
                                <button
                                    className='bookmark-manager-icon-button'
                                    type='button'
                                    aria-label='Close'
                                    onClick={closeDraft}
                                >
                                    <X size={18} aria-hidden />
                                </button>
                            </header>
                            <label className='bookmark-manager-field'>
                                <span>{t.bookmarkTitle}</span>
                                <input
                                    ref={bookmarkTitleInputRef}
                                    value={bookmarkDraft.title}
                                    onChange={(event) => {
                                        setBookmarkDraft({
                                            ...bookmarkDraft,
                                            title: event.target.value,
                                        });
                                    }}
                                />
                            </label>
                            <label className='bookmark-manager-field'>
                                <span>{t.bookmarkUrl}</span>
                                <input
                                    value={bookmarkDraft.url}
                                    onChange={(event) => {
                                        setBookmarkDraft({
                                            ...bookmarkDraft,
                                            url: event.target.value,
                                        });
                                        setBookmarkError(undefined);
                                    }}
                                />
                            </label>
                            <select
                                className='bookmark-manager-category-select'
                                aria-label={t.categories}
                                value={getBookmarkLocationKey(
                                    bookmarkDraft.categoryIndex,
                                    bookmarkDraft.folderPath
                                )}
                                onChange={(event) => {
                                    const nextDestination =
                                        destinationOptions.find(
                                            (option) =>
                                                option.key ===
                                                event.target.value
                                        );
                                    if (nextDestination === undefined) {
                                        return;
                                    }

                                    setBookmarkDraft({
                                        ...bookmarkDraft,
                                        categoryIndex:
                                            nextDestination.location
                                                .categoryIndex,
                                        folderPath: [
                                            ...nextDestination.location
                                                .folderPath,
                                        ],
                                    });
                                }}
                            >
                                {destinationOptions.map((option) => (
                                    <option key={option.key} value={option.key}>
                                        {option.label}
                                    </option>
                                ))}
                            </select>
                            <div className='bookmark-manager-form-actions'>
                                <button
                                    className='bookmark-manager-action-button'
                                    type='submit'
                                >
                                    <Check size={16} aria-hidden />
                                    <span>{t.save}</span>
                                </button>
                                <button
                                    className='bookmark-manager-secondary-button'
                                    type='button'
                                    onClick={closeDraft}
                                >
                                    {t.cancel}
                                </button>
                            </div>
                            {bookmarkError === undefined ? undefined : (
                                <div className='bookmark-manager-error'>
                                    {bookmarkError}
                                </div>
                            )}
                        </form>
                    </div>
                )}
                {confirmDeleteCategoryIndex === undefined ||
                confirmDeleteCategoryData === undefined ? undefined : (
                    <div
                        className='bookmark-manager-category-confirm-backdrop'
                        onClick={() => {
                            setConfirmDeleteCategoryIndex(undefined);
                        }}
                        onKeyDown={(event) => {
                            if (event.key === 'Escape') {
                                event.stopPropagation();
                                setConfirmDeleteCategoryIndex(undefined);
                            }
                        }}
                    >
                        <div
                            className='bookmark-manager-category-confirm-dialog'
                            role='dialog'
                            aria-modal='true'
                            aria-label={`${t.deleteCategory}: ${confirmDeleteCategoryData.category}`}
                            onClick={(event) => {
                                event.stopPropagation();
                            }}
                        >
                            <span>{t.deleteCategoryConfirm}</span>
                            <div className='bookmark-manager-category-confirm-actions'>
                                <button
                                    type='button'
                                    onClick={() => {
                                        setConfirmDeleteCategoryIndex(
                                            undefined
                                        );
                                    }}
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    type='button'
                                    onClick={() => {
                                        confirmDeleteCategory(
                                            confirmDeleteCategoryIndex
                                        );
                                    }}
                                >
                                    {t.deleteCategory}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>,
        document.body
    );
};
