import React, { Fragment } from 'react';

import type { CategoryData } from '@/constants/linkTree';

interface LinkCategoryProps {
    categoryData: CategoryData;
    index: number;
    selectedCategory?: number;
    isMouseNav: boolean;
    padding: string;
    highlightedLinkId?: string;
}

export const LinkCategory: React.FC<LinkCategoryProps> = ({
    categoryData,
    index,
    selectedCategory,
    isMouseNav,
    padding,
    highlightedLinkId,
}) => {
    const isCategorySelected = selectedCategory === index + 1;

    const categoryClassName = [
        'category',
        isCategorySelected && 'selected',
        isMouseNav && 'hoverEffective',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <Fragment>
            <div className={categoryClassName}>
                {categoryData.icon}
                <span>{categoryData.category}</span>
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
