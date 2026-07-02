import React, {
    Fragment,
    useEffect,
    useId,
    useMemo,
    useRef,
    useState,
} from 'react';
import { Check, Pencil, Search } from 'lucide-react';

import type { CategoryData } from '@/constants/linkTree';
import {
    categoryIconOptions,
    normalizeCategoryIconSearch,
} from '@/constants/linkTree';

interface LinkCategoryProps {
    categoryData: CategoryData;
    index: number;
    selectedCategory?: number;
    isMouseNav: boolean;
    onCategoryIconChange: (categoryIndex: number, iconName: string) => void;
    padding: string;
    highlightedLinkId?: string;
}

const maxVisibleIconOptions = 48;

export const LinkCategory: React.FC<LinkCategoryProps> = ({
    categoryData,
    index,
    selectedCategory,
    isMouseNav,
    onCategoryIconChange,
    padding,
    highlightedLinkId,
}) => {
    const isCategorySelected = selectedCategory === index + 1;
    const [isIconPickerOpen, setIsIconPickerOpen] = useState(false);
    const [iconSearch, setIconSearch] = useState('');
    const iconControlRef = useRef<HTMLDivElement>(null);
    const iconSearchInputRef = useRef<HTMLInputElement>(null);
    const iconPickerId = useId();

    const categoryClassName = [
        'category',
        isCategorySelected && 'selected',
        isMouseNav && 'hoverEffective',
    ]
        .filter(Boolean)
        .join(' ');

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

    useEffect(() => {
        if (!isIconPickerOpen) {
            return undefined;
        }

        const onDocumentClick = (event: MouseEvent) => {
            if (
                iconControlRef.current?.contains(event.target as Node) === false
            ) {
                setIsIconPickerOpen(false);
            }
        };

        globalThis.document.addEventListener('click', onDocumentClick);
        return () => {
            globalThis.document.removeEventListener('click', onDocumentClick);
        };
    }, [isIconPickerOpen]);

    useEffect(() => {
        if (!isIconPickerOpen) {
            setIconSearch('');
            return;
        }

        globalThis.requestAnimationFrame(() => {
            iconSearchInputRef.current?.focus();
        });
    }, [isIconPickerOpen]);

    const selectCategoryIcon = (iconName: string) => {
        onCategoryIconChange(index, iconName);
        setIsIconPickerOpen(false);
    };

    return (
        <Fragment>
            <div className={categoryClassName}>
                <div
                    className='category-icon-control'
                    ref={iconControlRef}
                    onKeyDown={(event) => {
                        if (event.key === 'Escape') {
                            event.stopPropagation();
                            setIsIconPickerOpen(false);
                        }
                    }}
                    onMouseDown={(event) => {
                        event.stopPropagation();
                    }}
                >
                    {categoryData.icon}
                    <button
                        className='category-icon-edit'
                        type='button'
                        aria-controls={
                            isIconPickerOpen ? iconPickerId : undefined
                        }
                        aria-expanded={isIconPickerOpen}
                        aria-label={`Change ${categoryData.category} icon`}
                        onClick={() => {
                            setIsIconPickerOpen((current) => !current);
                        }}
                    >
                        <Pencil
                            className='category-icon-edit-symbol'
                            size={12}
                            aria-hidden
                        />
                    </button>
                    {isIconPickerOpen ? (
                        <div
                            className='category-icon-popover'
                            id={iconPickerId}
                        >
                            <label className='category-icon-search'>
                                <Search
                                    className='category-icon-search-symbol'
                                    size={16}
                                    aria-hidden
                                />
                                <input
                                    ref={iconSearchInputRef}
                                    type='search'
                                    value={iconSearch}
                                    placeholder='Search icons'
                                    aria-label='Search category icons'
                                    onChange={(event) => {
                                        setIconSearch(event.target.value);
                                    }}
                                />
                            </label>
                            <div className='category-icon-grid'>
                                {visibleIconOptions.length === 0 ? (
                                    <div className='category-icon-empty'>
                                        No icons found
                                    </div>
                                ) : (
                                    visibleIconOptions.map((iconOption) => {
                                        const OptionIcon = iconOption.Icon;
                                        const isSelected =
                                            iconOption.iconName ===
                                            categoryData.iconName;

                                        return (
                                            <button
                                                className='category-icon-option'
                                                type='button'
                                                aria-pressed={isSelected}
                                                aria-label={`Use ${iconOption.label} icon`}
                                                key={iconOption.iconName}
                                                title={iconOption.label}
                                                onClick={() => {
                                                    selectCategoryIcon(
                                                        iconOption.iconName
                                                    );
                                                }}
                                            >
                                                <OptionIcon
                                                    className='category-icon-option-symbol'
                                                    size={20}
                                                    aria-hidden
                                                />
                                                {isSelected ? (
                                                    <Check
                                                        className='category-icon-option-check'
                                                        size={12}
                                                        aria-hidden
                                                    />
                                                ) : undefined}
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </div>
                    ) : undefined}
                </div>
                <span className='category-title'>{categoryData.category}</span>
            </div>
            <div
                className={`links ${isMouseNav ? 'hoverEffective' : ''}`}
                style={{ '--padding': padding } as React.CSSProperties}
            >
                <div className='panel' />
                {categoryData.links.map((bookmark) => {
                    const isDisabled = bookmark.url.trim() === '';
                    const isHighlighted = highlightedLinkId === bookmark.id;

                    const linkClassName = [
                        'link',
                        isDisabled && 'disabled',
                        isMouseNav && 'hoverEffective',
                        isHighlighted && 'highlighted',
                    ]
                        .filter(Boolean)
                        .join(' ');

                    return (
                        <a
                            key={bookmark.id}
                            id={bookmark.id}
                            href={isDisabled ? undefined : bookmark.url}
                            className={linkClassName}
                        >
                            <span>{bookmark.title}</span>
                        </a>
                    );
                })}
            </div>
        </Fragment>
    );
};
