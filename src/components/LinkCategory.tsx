import React, { Fragment } from 'react';

import { links } from '@/constants/links';
import type { CategoryData } from '@/constants/linkTree';

interface LinkCategoryProps {
    categoryData: CategoryData;
    index: number;
    selectedCategory?: number;
    isMouseNav: boolean;
    keyboardNavEnabled: boolean;
    padding: string;
    highlightedLink?: string;
}

export const LinkCategory: React.FC<LinkCategoryProps> = ({
    categoryData,
    index,
    selectedCategory,
    isMouseNav,
    keyboardNavEnabled,
    padding,
    highlightedLink,
}) => {
    const isCategorySelected = selectedCategory === index + 1;

    const isCategoryHotkeyHidden =
        isMouseNav ||
        selectedCategory !== 0 ||
        index + 1 > 9 ||
        !keyboardNavEnabled;

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
                <code
                    className={`hint ${isCategoryHotkeyHidden ? 'hidden' : ''}`}
                >
                    [{index + 1}]
                </code>
                <span>{categoryData.category}</span>
            </div>
            <div
                className={`links ${isMouseNav ? 'hoverEffective' : ''}`}
                style={{ '--padding': padding } as React.CSSProperties}
            >
                <div className='panel' />
                {categoryData.links.map((link, j) => {
                    const isDisabled = !(link in links);
                    const isHighlighted = highlightedLink === link;

                    // Hint visibility logic for Link.
                    const isLinkHotkeyHidden =
                        isMouseNav ||
                        selectedCategory === 0 ||
                        j + 1 > 9 ||
                        isDisabled ||
                        !keyboardNavEnabled;

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
                            key={link}
                            id={link}
                            href={links[link]}
                            className={linkClassName}
                        >
                            <code
                                className={`hint ${
                                    isLinkHotkeyHidden ? 'hidden' : ''
                                }`}
                            >
                                [{j + 1}]
                            </code>
                            <span>{link}</span>
                        </a>
                    );
                })}
            </div>
        </Fragment>
    );
};
