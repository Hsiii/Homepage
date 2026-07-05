import React, { Fragment, useCallback, useEffect, useRef } from 'react';
import { ChevronRight } from 'lucide-react';

import { createBookmarkIcon } from '@/constants/linkTree';
import type { CategoryData } from '@/constants/linkTree';
import type {
    BookmarkFolderData,
    BookmarkLinkData,
    BookmarkNodeData,
} from '@/types/bookmarks';
import { isBookmarkFolder } from '@/utils/bookmarks';

interface LinkCategoryProps {
    categoryData: CategoryData;
    index: number;
    selectedCategory?: number;
    isMouseNav: boolean;
    padding: string;
    highlightedLinkId?: string;
    highlightedFolderPath?: string[];
}

interface BookmarkNodeListProps {
    depth: number;
    highlightedFolderPath?: string[];
    highlightedLinkId?: string;
    isMouseNav: boolean;
    nodes: readonly BookmarkNodeData[];
}

interface BookmarkFolderNodeProps {
    depth: number;
    highlightedFolderPath?: string[];
    highlightedLinkId?: string;
    isMouseNav: boolean;
    node: BookmarkFolderData;
}

const maxCascadeDepth = 2;
const folderTitleSeparator = ' / ';
const submenuViewportPadding = 16;

const getFlattenedBookmarkLinks = (
    nodes: readonly BookmarkNodeData[],
    path: readonly string[] = []
): BookmarkLinkData[] =>
    nodes.flatMap((node) => {
        if (node.type === 'link') {
            const titlePrefix = path.join(folderTitleSeparator);

            return [
                {
                    ...node,
                    title:
                        titlePrefix === ''
                            ? node.title
                            : `${titlePrefix}${folderTitleSeparator}${node.title}`,
                },
            ];
        }

        return getFlattenedBookmarkLinks(node.children, [...path, node.title]);
    });

const BookmarkFolderNode: React.FC<BookmarkFolderNodeProps> = ({
    depth,
    highlightedFolderPath,
    highlightedLinkId,
    isMouseNav,
    node,
}) => {
    const submenuRef = useRef<HTMLDivElement>(null);
    const isExpanded = highlightedFolderPath?.[depth] === node.id;
    const updateSubmenuPlacement = useCallback(() => {
        const submenu = submenuRef.current;

        if (submenu === null) {
            return;
        }

        submenu.style.setProperty('--submenu-offset-y', '0px');

        const viewport = globalThis.visualViewport;
        const viewportTop = viewport?.offsetTop ?? 0;
        const viewportHeight = viewport?.height ?? globalThis.innerHeight;
        const topLimit = viewportTop + submenuViewportPadding;
        const bottomLimit =
            viewportTop + viewportHeight - submenuViewportPadding;
        const rect = submenu.getBoundingClientRect();
        let offset = 0;

        if (rect.bottom > bottomLimit) {
            offset = bottomLimit - rect.bottom;
        }

        if (rect.top + offset < topLimit) {
            offset = topLimit - rect.top;
        }

        submenu.style.setProperty(
            '--submenu-offset-y',
            `${Math.round(offset)}px`
        );
    }, []);

    useEffect(() => {
        if (!isExpanded) {
            return undefined;
        }

        const frame = globalThis.requestAnimationFrame(updateSubmenuPlacement);

        return () => {
            globalThis.cancelAnimationFrame(frame);
        };
    }, [isExpanded, updateSubmenuPlacement]);

    return (
        <div
            className={[
                'bookmark-node',
                'folder-node',
                isExpanded && 'expanded',
            ]
                .filter(Boolean)
                .join(' ')}
            key={node.id}
            onFocusCapture={updateSubmenuPlacement}
            onPointerEnter={updateSubmenuPlacement}
        >
            <button
                className={[
                    'link',
                    'folder-link',
                    isMouseNav && 'hoverEffective',
                ]
                    .filter(Boolean)
                    .join(' ')}
                type='button'
            >
                {createBookmarkIcon(node.icon, 'icon folder-icon-display')}
                <span>{node.title}</span>
                <ChevronRight
                    className='icon folder-chevron'
                    size={16}
                    aria-hidden
                />
            </button>
            <div className='bookmark-submenu' ref={submenuRef}>
                <div className='submenu-panel' />
                <BookmarkNodeList
                    depth={depth + 1}
                    highlightedFolderPath={highlightedFolderPath}
                    highlightedLinkId={highlightedLinkId}
                    isMouseNav={isMouseNav}
                    nodes={node.children}
                />
            </div>
        </div>
    );
};

const BookmarkNodeList: React.FC<BookmarkNodeListProps> = ({
    depth,
    highlightedFolderPath,
    highlightedLinkId,
    isMouseNav,
    nodes,
}) => {
    const visibleNodes =
        depth >= maxCascadeDepth ? getFlattenedBookmarkLinks(nodes) : nodes;

    return (
        <>
            {visibleNodes.map((node) => {
                if (isBookmarkFolder(node)) {
                    return (
                        <BookmarkFolderNode
                            depth={depth}
                            highlightedFolderPath={highlightedFolderPath}
                            highlightedLinkId={highlightedLinkId}
                            isMouseNav={isMouseNav}
                            key={node.id}
                            node={node}
                        />
                    );
                }

                const isDisabled = node.url.trim() === '';
                const isHighlighted = highlightedLinkId === node.id;

                const linkClassName = [
                    'link',
                    isDisabled && 'disabled',
                    isMouseNav && 'hoverEffective',
                    isHighlighted && 'highlighted',
                ]
                    .filter(Boolean)
                    .join(' ');

                return (
                    <div
                        className='bookmark-node'
                        key={`${node.id}-${node.title}`}
                    >
                        <a
                            data-bookmark-id={node.id}
                            href={isDisabled ? undefined : node.url}
                            className={linkClassName}
                        >
                            <span>{node.title}</span>
                        </a>
                    </div>
                );
            })}
        </>
    );
};

export const LinkCategory: React.FC<LinkCategoryProps> = ({
    categoryData,
    index,
    selectedCategory,
    isMouseNav,
    padding,
    highlightedLinkId,
    highlightedFolderPath,
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
                <span className='category-title'>{categoryData.category}</span>
            </div>
            <div
                className={`links ${isMouseNav ? 'hoverEffective' : ''}`}
                style={{ '--padding': padding } as React.CSSProperties}
            >
                <div className='panel' />
                <BookmarkNodeList
                    depth={0}
                    highlightedFolderPath={highlightedFolderPath}
                    highlightedLinkId={highlightedLinkId}
                    isMouseNav={isMouseNav}
                    nodes={categoryData.children}
                />
            </div>
        </Fragment>
    );
};
