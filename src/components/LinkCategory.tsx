import React, { Fragment } from 'react';

import { links } from '@/constants/links';
import type { CategoryData } from '@/constants/linkTree';

interface LinkCategoryProps {
    categoryData: CategoryData;
    index: number;
    selectedCategory?: number;
    isMouseNav: boolean;
    padding: string;
    highlightedLink?: string;
}

export const LinkCategory: React.FC<LinkCategoryProps> = ({
    categoryData,
    index,
    selectedCategory,
    isMouseNav,
    padding,
    highlightedLink,
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
                {categoryData.links.map((link) => {
                    const isDisabled = !(link in links);
                    const isHighlighted = highlightedLink === link;

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
                            <span>{link}</span>
                        </a>
                    );
                })}
            </div>
        </Fragment>
    );
};
