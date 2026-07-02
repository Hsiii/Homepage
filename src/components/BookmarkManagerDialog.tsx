import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import {
    Check,
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
    decorateBookmarkTree,
    normalizeCategoryIconSearch,
} from '@/constants/linkTree';
import type { BookmarkControls } from '@/hooks/useBookmarks';
import { useLocale } from '@/hooks/useLocale';

interface BookmarkManagerDialogProps {
    bookmarkControls: BookmarkControls;
    onClose: () => void;
}

interface BookmarkDraft {
    bookmarkId?: string;
    categoryIndex: number;
    mode: 'add' | 'edit';
    sourceCategoryIndex: number;
    title: string;
    url: string;
}

const defaultIconName = 'Folder';
const maxVisibleIconOptions = 40;

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

export const BookmarkManagerDialog: React.FC<BookmarkManagerDialogProps> = ({
    bookmarkControls,
    onClose,
}) => {
    const { t } = useLocale();
    const dialogId = useId();
    const dialogRef = useRef<HTMLDivElement>(null);
    const bookmarkTitleInputRef = useRef<HTMLInputElement>(null);
    const [selectedCategoryIndex, setSelectedCategoryIndex] = useState(0);
    const [categoryName, setCategoryName] = useState('');
    const [categoryIconName, setCategoryIconName] = useState(defaultIconName);
    const [iconSearch, setIconSearch] = useState('');
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [bookmarkSearch, setBookmarkSearch] = useState('');
    const [bookmarkDraft, setBookmarkDraft] = useState<BookmarkDraft>();
    const [bookmarkError, setBookmarkError] = useState<string>();
    const [confirmDeleteCategoryIndex, setConfirmDeleteCategoryIndex] =
        useState<number>();
    const { bookmarkTree } = bookmarkControls;
    const decoratedBookmarkTree = useMemo(
        () => decorateBookmarkTree(bookmarkTree),
        [bookmarkTree]
    );
    const selectedCategory = bookmarkTree.at(selectedCategoryIndex);
    const selectedDecoratedCategory = decoratedBookmarkTree.at(
        selectedCategoryIndex
    );
    const selectedIconOption =
        categoryIconOptions.find(
            (iconOption) => iconOption.iconName === categoryIconName
        ) ?? categoryIconOptions[0];
    const SelectedIcon = selectedIconOption.Icon;
    const normalizedBookmarkSearch = bookmarkSearch.trim().toLowerCase();
    const visibleBookmarks =
        selectedCategory === undefined
            ? []
            : selectedCategory.links.filter((bookmark) => {
                  if (normalizedBookmarkSearch === '') {
                      return true;
                  }

                  return `${bookmark.title} ${bookmark.url}`
                      .toLowerCase()
                      .includes(normalizedBookmarkSearch);
              });
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
        selectedCategory !== undefined &&
        (categoryName.trim() !== selectedCategory.category ||
            categoryIconName !== selectedDecoratedCategory?.iconName);

    useEffect(() => {
        dialogRef.current?.focus();
    }, []);

    useEffect(() => {
        setSelectedCategoryIndex((currentIndex) =>
            Math.min(currentIndex, Math.max(bookmarkTree.length - 1, 0))
        );
    }, [bookmarkTree.length]);

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
        if (bookmarkDraft === undefined) {
            return;
        }

        globalThis.requestAnimationFrame(() => {
            bookmarkTitleInputRef.current?.focus();
        });
    }, [bookmarkDraft]);

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
            setSelectedCategoryIndex(bookmarkTree.length);
            setBookmarkDraft(undefined);
            setBookmarkSearch('');
        }
    };

    const saveCategory = () => {
        if (selectedCategory === undefined) {
            return;
        }

        bookmarkControls.updateCategory(selectedCategoryIndex, {
            category: categoryName,
            icon: categoryIconName,
        });
    };

    const deleteCategory = () => {
        if (selectedCategory === undefined) {
            return;
        }

        if (
            confirmDeleteCategoryIndex !== selectedCategoryIndex &&
            selectedCategory.links.length > 0
        ) {
            setConfirmDeleteCategoryIndex(selectedCategoryIndex);
            return;
        }

        if (bookmarkControls.deleteCategory(selectedCategoryIndex)) {
            setSelectedCategoryIndex((currentIndex) =>
                Math.max(0, currentIndex - 1)
            );
            setBookmarkDraft(undefined);
            setBookmarkSearch('');
        }
    };

    const startAddBookmark = () => {
        setBookmarkDraft({
            categoryIndex: selectedCategoryIndex,
            mode: 'add',
            sourceCategoryIndex: selectedCategoryIndex,
            title: '',
            url: '',
        });
        setBookmarkError(undefined);
    };

    const startEditBookmark = (bookmarkId: string) => {
        const bookmark = selectedCategory?.links.find(
            (linkData) => linkData.id === bookmarkId
        );

        if (bookmark === undefined) {
            return;
        }

        setBookmarkDraft({
            bookmarkId,
            categoryIndex: selectedCategoryIndex,
            mode: 'edit',
            sourceCategoryIndex: selectedCategoryIndex,
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
                ? bookmarkControls.addBookmark(
                      bookmarkDraft.categoryIndex,
                      bookmarkInput
                  )
                : bookmarkControls.updateBookmark(
                      bookmarkDraft.sourceCategoryIndex,
                      bookmarkDraft.bookmarkId ?? '',
                      bookmarkInput,
                      bookmarkDraft.categoryIndex
                  );

        if (didSave) {
            setSelectedCategoryIndex(bookmarkDraft.categoryIndex);
            setBookmarkDraft(undefined);
            setBookmarkError(undefined);
        }
    };

    const deleteBookmark = (bookmarkId: string) => {
        if (
            bookmarkControls.deleteBookmark(selectedCategoryIndex, bookmarkId)
        ) {
            setBookmarkDraft((currentDraft) =>
                currentDraft?.bookmarkId === bookmarkId
                    ? undefined
                    : currentDraft
            );
        }
    };

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
                    <div>
                        <span
                            className='bookmark-manager-title'
                            id={`${dialogId}-title`}
                        >
                            {t.manageBookmarks}
                        </span>
                        <span className='bookmark-manager-count'>
                            {bookmarkTree.length} {t.categories}
                        </span>
                    </div>
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
                        <div className='bookmark-manager-section-header'>
                            <span>{t.categories}</span>
                            <button
                                className='bookmark-manager-icon-button'
                                type='button'
                                aria-label={t.addCategory}
                                title={t.addCategory}
                                onClick={createCategory}
                            >
                                <FolderPlus size={18} aria-hidden />
                            </button>
                        </div>
                        <div
                            className='bookmark-manager-category-list'
                            role='listbox'
                            aria-label={t.categories}
                        >
                            {decoratedBookmarkTree.map(
                                (categoryData, categoryIndex) => {
                                    const isSelected =
                                        categoryIndex === selectedCategoryIndex;

                                    return (
                                        <button
                                            className='bookmark-manager-category-option'
                                            type='button'
                                            role='option'
                                            aria-selected={isSelected}
                                            key={`${categoryData.category}-${categoryIndex}`}
                                            onClick={() => {
                                                setSelectedCategoryIndex(
                                                    categoryIndex
                                                );
                                                setBookmarkDraft(undefined);
                                            }}
                                        >
                                            {categoryData.icon}
                                            <span>{categoryData.category}</span>
                                            <span className='bookmark-manager-category-count'>
                                                {categoryData.links.length}
                                            </span>
                                        </button>
                                    );
                                }
                            )}
                        </div>
                    </aside>
                    <main className='bookmark-manager-main'>
                        {selectedCategory === undefined ? undefined : (
                            <>
                                <section className='bookmark-manager-category-editor'>
                                    <label className='bookmark-manager-field bookmark-manager-category-name'>
                                        <span>{t.categoryName}</span>
                                        <input
                                            value={categoryName}
                                            onChange={(event) => {
                                                setCategoryName(
                                                    event.target.value
                                                );
                                            }}
                                        />
                                    </label>
                                    <div className='bookmark-manager-icon-field'>
                                        <button
                                            className='bookmark-manager-icon-picker-trigger'
                                            type='button'
                                            aria-expanded={isIconPickerOpen}
                                            onClick={() => {
                                                setIsIconPickerOpen(
                                                    (current) => !current
                                                );
                                            }}
                                        >
                                            <SelectedIcon
                                                size={18}
                                                aria-hidden
                                            />
                                            <span>
                                                {selectedIconOption.label}
                                            </span>
                                        </button>
                                        {isIconPickerOpen ? (
                                            <div className='bookmark-manager-icon-picker'>
                                                <label className='bookmark-manager-search'>
                                                    <Search
                                                        size={16}
                                                        aria-hidden
                                                    />
                                                    <input
                                                        type='search'
                                                        value={iconSearch}
                                                        placeholder='Search icons'
                                                        onChange={(event) => {
                                                            setIconSearch(
                                                                event.target
                                                                    .value
                                                            );
                                                        }}
                                                    />
                                                </label>
                                                <div className='bookmark-manager-icon-grid'>
                                                    {visibleIconOptions.map(
                                                        (iconOption) => {
                                                            const OptionIcon =
                                                                iconOption.Icon;
                                                            const isSelected =
                                                                iconOption.iconName ===
                                                                categoryIconName;

                                                            return (
                                                                <button
                                                                    className='bookmark-manager-icon-option'
                                                                    type='button'
                                                                    aria-pressed={
                                                                        isSelected
                                                                    }
                                                                    title={
                                                                        iconOption.label
                                                                    }
                                                                    key={
                                                                        iconOption.iconName
                                                                    }
                                                                    onClick={() => {
                                                                        setCategoryIconName(
                                                                            iconOption.iconName
                                                                        );
                                                                        setIsIconPickerOpen(
                                                                            false
                                                                        );
                                                                    }}
                                                                >
                                                                    <OptionIcon
                                                                        size={
                                                                            18
                                                                        }
                                                                        aria-hidden
                                                                    />
                                                                    {isSelected ? (
                                                                        <Check
                                                                            size={
                                                                                12
                                                                            }
                                                                            aria-hidden
                                                                        />
                                                                    ) : undefined}
                                                                </button>
                                                            );
                                                        }
                                                    )}
                                                </div>
                                            </div>
                                        ) : undefined}
                                    </div>
                                    <div className='bookmark-manager-category-actions'>
                                        <button
                                            className='bookmark-manager-action-button'
                                            type='button'
                                            disabled={
                                                !isCategoryDirty ||
                                                categoryName.trim() === ''
                                            }
                                            onClick={saveCategory}
                                        >
                                            <Check size={16} aria-hidden />
                                            <span>{t.save}</span>
                                        </button>
                                        <button
                                            className='bookmark-manager-danger-button'
                                            type='button'
                                            onClick={deleteCategory}
                                        >
                                            <Trash2 size={16} aria-hidden />
                                            <span>{t.deleteCategory}</span>
                                        </button>
                                    </div>
                                    {confirmDeleteCategoryIndex ===
                                    selectedCategoryIndex ? (
                                        <div
                                            className='bookmark-manager-confirm'
                                            role='status'
                                        >
                                            <span>
                                                {t.deleteCategoryConfirm}
                                            </span>
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
                                                    if (
                                                        bookmarkControls.deleteCategory(
                                                            selectedCategoryIndex
                                                        )
                                                    ) {
                                                        setSelectedCategoryIndex(
                                                            (currentIndex) =>
                                                                Math.max(
                                                                    0,
                                                                    currentIndex -
                                                                        1
                                                                )
                                                        );
                                                        setBookmarkDraft(
                                                            undefined
                                                        );
                                                        setBookmarkSearch('');
                                                        setConfirmDeleteCategoryIndex(
                                                            undefined
                                                        );
                                                    }
                                                }}
                                            >
                                                {t.deleteCategory}
                                            </button>
                                        </div>
                                    ) : undefined}
                                </section>
                                <section className='bookmark-manager-bookmarks'>
                                    <div className='bookmark-manager-bookmark-toolbar'>
                                        <label className='bookmark-manager-search'>
                                            <Search size={16} aria-hidden />
                                            <input
                                                type='search'
                                                value={bookmarkSearch}
                                                placeholder={t.searchBookmarks}
                                                onChange={(event) => {
                                                    setBookmarkSearch(
                                                        event.target.value
                                                    );
                                                }}
                                            />
                                        </label>
                                        <button
                                            className='bookmark-manager-action-button'
                                            type='button'
                                            onClick={startAddBookmark}
                                        >
                                            <Plus size={16} aria-hidden />
                                            <span>{t.addBookmark}</span>
                                        </button>
                                    </div>
                                    {bookmarkDraft === undefined ? undefined : (
                                        <form
                                            className='bookmark-manager-bookmark-form'
                                            onSubmit={(event) => {
                                                event.preventDefault();
                                                saveBookmark();
                                            }}
                                        >
                                            <label className='bookmark-manager-field'>
                                                <span>{t.bookmarkTitle}</span>
                                                <input
                                                    ref={bookmarkTitleInputRef}
                                                    value={bookmarkDraft.title}
                                                    onChange={(event) => {
                                                        setBookmarkDraft({
                                                            ...bookmarkDraft,
                                                            title: event.target
                                                                .value,
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
                                                            url: event.target
                                                                .value,
                                                        });
                                                        setBookmarkError(
                                                            undefined
                                                        );
                                                    }}
                                                />
                                            </label>
                                            <select
                                                className='bookmark-manager-category-select'
                                                aria-label={t.categories}
                                                value={
                                                    bookmarkDraft.categoryIndex
                                                }
                                                onChange={(event) => {
                                                    setBookmarkDraft({
                                                        ...bookmarkDraft,
                                                        categoryIndex: Number(
                                                            event.target.value
                                                        ),
                                                    });
                                                }}
                                            >
                                                {bookmarkTree.map(
                                                    (
                                                        categoryData,
                                                        categoryIndex
                                                    ) => (
                                                        <option
                                                            key={`${categoryData.category}-${categoryIndex}`}
                                                            value={
                                                                categoryIndex
                                                            }
                                                        >
                                                            {
                                                                categoryData.category
                                                            }
                                                        </option>
                                                    )
                                                )}
                                            </select>
                                            <div className='bookmark-manager-form-actions'>
                                                <button
                                                    className='bookmark-manager-action-button'
                                                    type='submit'
                                                >
                                                    <Check
                                                        size={16}
                                                        aria-hidden
                                                    />
                                                    <span>{t.save}</span>
                                                </button>
                                                <button
                                                    className='bookmark-manager-secondary-button'
                                                    type='button'
                                                    onClick={() => {
                                                        setBookmarkDraft(
                                                            undefined
                                                        );
                                                        setBookmarkError(
                                                            undefined
                                                        );
                                                    }}
                                                >
                                                    {t.cancel}
                                                </button>
                                            </div>
                                            {bookmarkError ===
                                            undefined ? undefined : (
                                                <div className='bookmark-manager-error'>
                                                    {bookmarkError}
                                                </div>
                                            )}
                                        </form>
                                    )}
                                    <div className='bookmark-manager-link-list'>
                                        {visibleBookmarks.length === 0 ? (
                                            <div className='bookmark-manager-empty'>
                                                {t.bookmarksEmpty}
                                            </div>
                                        ) : (
                                            visibleBookmarks.map((bookmark) => (
                                                <div
                                                    className='bookmark-manager-link-row'
                                                    key={bookmark.id}
                                                >
                                                    <LinkIcon
                                                        size={16}
                                                        aria-hidden
                                                    />
                                                    <div className='bookmark-manager-link-copy'>
                                                        <span>
                                                            {bookmark.title}
                                                        </span>
                                                        <a
                                                            href={bookmark.url}
                                                            target='_blank'
                                                            rel='noreferrer'
                                                        >
                                                            {bookmark.url}
                                                        </a>
                                                    </div>
                                                    <button
                                                        className='bookmark-manager-icon-button'
                                                        type='button'
                                                        aria-label={
                                                            t.editBookmark
                                                        }
                                                        title={t.editBookmark}
                                                        onClick={() => {
                                                            startEditBookmark(
                                                                bookmark.id
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
                                                        aria-label={
                                                            t.deleteBookmark
                                                        }
                                                        title={t.deleteBookmark}
                                                        onClick={() => {
                                                            deleteBookmark(
                                                                bookmark.id
                                                            );
                                                        }}
                                                    >
                                                        <Trash2
                                                            size={16}
                                                            aria-hidden
                                                        />
                                                    </button>
                                                </div>
                                            ))
                                        )}
                                    </div>
                                </section>
                            </>
                        )}
                    </main>
                </div>
            </div>
        </div>,
        document.body
    );
};
