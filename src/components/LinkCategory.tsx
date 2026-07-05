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
    clickedCategory?: number;
    clickedFolderPath: readonly string[];
    clickedLinkId?: string;
    index: number;
    isMouseNav: boolean;
    highlightedLinkId?: string;
    highlightedFolderPath?: string[];
    onSelectCategory: (categoryIndex: number) => void;
    onSelectFolder: (
        categoryIndex: number,
        folderPath: readonly string[]
    ) => void;
    onSelectLink: (
        categoryIndex: number,
        folderPath: readonly string[],
        linkId: string
    ) => void;
    padding: string;
    selectedCategory?: number;
}

interface BookmarkNodeListProps {
    categoryIndex: number;
    clickedFolderPath: readonly string[];
    clickedLinkId?: string;
    currentFolderPath: readonly string[];
    depth: number;
    highlightedFolderPath?: string[];
    highlightedLinkId?: string;
    isMouseNav: boolean;
    nodes: readonly BookmarkNodeData[];
    onSelectFolder: (
        categoryIndex: number,
        folderPath: readonly string[]
    ) => void;
    onSelectLink: (
        categoryIndex: number,
        folderPath: readonly string[],
        linkId: string
    ) => void;
}

interface BookmarkFolderNodeProps {
    categoryIndex: number;
    clickedFolderPath: readonly string[];
    clickedLinkId?: string;
    currentFolderPath: readonly string[];
    depth: number;
    highlightedFolderPath?: string[];
    highlightedLinkId?: string;
    isMouseNav: boolean;
    node: BookmarkFolderData;
    onSelectFolder: (
        categoryIndex: number,
        folderPath: readonly string[]
    ) => void;
    onSelectLink: (
        categoryIndex: number,
        folderPath: readonly string[],
        linkId: string
    ) => void;
}

const maxCascadeDepth = 2;
const folderTitleSeparator = ' / ';
const submenuViewportPadding = 16;

const isFolderPathPrefix = (
    folderPath: readonly string[],
    candidatePath: readonly string[]
): boolean =>
    candidatePath.length >= folderPath.length &&
    folderPath.every((folderId, index) => folderId === candidatePath[index]);

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
    categoryIndex,
    clickedFolderPath,
    clickedLinkId,
    currentFolderPath,
    depth,
    highlightedFolderPath,
    highlightedLinkId,
    isMouseNav,
    node,
    onSelectFolder,
    onSelectLink,
}) => {
    const folderNodeRef = useRef<HTMLDivElement>(null);
    const submenuRef = useRef<HTMLDivElement>(null);
    const folderPath = [...currentFolderPath, node.id];
    const isClicked = isFolderPathPrefix(folderPath, clickedFolderPath);
    const isHighlighted = highlightedFolderPath?.[depth] === node.id;
    const isExpanded = isHighlighted || isClicked;
    const updateSubmenuPlacement = useCallback(() => {
        const folderNode = folderNodeRef.current;
        const submenu = submenuRef.current;

        if (folderNode === null || submenu === null) {
            return;
        }

        const viewport = globalThis.visualViewport;
        const viewportTop = viewport?.offsetTop ?? 0;
        const viewportHeight = viewport?.height ?? globalThis.innerHeight;
        const topLimit = viewportTop + submenuViewportPadding;
        const bottomLimit =
            viewportTop + viewportHeight - submenuViewportPadding;
        const availableHeight = bottomLimit - topLimit;
        const anchorTop = folderNode.getBoundingClientRect().top;
        const submenuHeight = Math.min(submenu.scrollHeight, availableHeight);
        const maxTop = Math.max(topLimit, bottomLimit - submenuHeight);
        const submenuTop = Math.min(Math.max(anchorTop, topLimit), maxTop);
        const offset = submenuTop - anchorTop;

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
                isClicked && 'clicked',
            ]
                .filter(Boolean)
                .join(' ')}
            key={node.id}
            onFocusCapture={updateSubmenuPlacement}
            onPointerEnter={updateSubmenuPlacement}
            ref={folderNodeRef}
        >
            <button
                className={[
                    'link',
                    'folder-link',
                    isMouseNav && 'hoverEffective',
                ]
                    .filter(Boolean)
                    .join(' ')}
                aria-expanded={isExpanded}
                aria-pressed={isClicked}
                onClick={() => {
                    onSelectFolder(categoryIndex, folderPath);
                }}
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
                    categoryIndex={categoryIndex}
                    clickedFolderPath={clickedFolderPath}
                    clickedLinkId={clickedLinkId}
                    currentFolderPath={folderPath}
                    depth={depth + 1}
                    highlightedFolderPath={highlightedFolderPath}
                    highlightedLinkId={highlightedLinkId}
                    isMouseNav={isMouseNav}
                    nodes={node.children}
                    onSelectFolder={onSelectFolder}
                    onSelectLink={onSelectLink}
                />
            </div>
        </div>
    );
};

const BookmarkNodeList: React.FC<BookmarkNodeListProps> = ({
    categoryIndex,
    clickedFolderPath,
    clickedLinkId,
    currentFolderPath,
    depth,
    highlightedFolderPath,
    highlightedLinkId,
    isMouseNav,
    nodes,
    onSelectFolder,
    onSelectLink,
}) => {
    const visibleNodes =
        depth >= maxCascadeDepth ? getFlattenedBookmarkLinks(nodes) : nodes;

    return (
        <>
            {visibleNodes.map((node) => {
                if (isBookmarkFolder(node)) {
                    return (
                        <BookmarkFolderNode
                            categoryIndex={categoryIndex}
                            clickedFolderPath={clickedFolderPath}
                            clickedLinkId={clickedLinkId}
                            currentFolderPath={currentFolderPath}
                            depth={depth}
                            highlightedFolderPath={highlightedFolderPath}
                            highlightedLinkId={highlightedLinkId}
                            isMouseNav={isMouseNav}
                            key={node.id}
                            node={node}
                            onSelectFolder={onSelectFolder}
                            onSelectLink={onSelectLink}
                        />
                    );
                }

                const isDisabled = node.url.trim() === '';
                const isHighlighted = highlightedLinkId === node.id;
                const isClicked = clickedLinkId === node.id;

                const linkClassName = [
                    'link',
                    isDisabled && 'disabled',
                    isMouseNav && 'hoverEffective',
                    isHighlighted && 'highlighted',
                    isClicked && 'clicked',
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
                            aria-current={isClicked ? 'true' : undefined}
                            onClick={(event) => {
                                if (isDisabled) {
                                    event.preventDefault();
                                    return;
                                }

                                onSelectLink(
                                    categoryIndex,
                                    currentFolderPath,
                                    node.id
                                );
                            }}
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
    clickedCategory,
    clickedFolderPath,
    clickedLinkId,
    index,
    isMouseNav,
    highlightedLinkId,
    highlightedFolderPath,
    onSelectCategory,
    onSelectFolder,
    onSelectLink,
    padding,
    selectedCategory,
}) => {
    const categoryIndex = index + 1;
    const isCategoryClicked = clickedCategory === categoryIndex;
    const isCategorySelected = selectedCategory === categoryIndex;
    const isCategoryOpen = isCategorySelected || isCategoryClicked;

    const categoryClassName = [
        'category',
        isCategoryOpen && 'selected',
        isCategoryClicked && 'clicked',
        isMouseNav && 'hoverEffective',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <Fragment>
            <button
                className={categoryClassName}
                type='button'
                aria-expanded={isCategoryOpen}
                aria-pressed={isCategoryClicked}
                onClick={() => {
                    onSelectCategory(categoryIndex);
                }}
            >
                {categoryData.icon}
                <span className='category-title'>{categoryData.category}</span>
            </button>
            <div
                className={`links ${isMouseNav ? 'hoverEffective' : ''}`}
                style={{ '--padding': padding } as React.CSSProperties}
            >
                <div className='panel' />
                <BookmarkNodeList
                    categoryIndex={categoryIndex}
                    clickedFolderPath={clickedFolderPath}
                    clickedLinkId={clickedLinkId}
                    currentFolderPath={[]}
                    depth={0}
                    highlightedFolderPath={highlightedFolderPath}
                    highlightedLinkId={highlightedLinkId}
                    isMouseNav={isMouseNav}
                    nodes={categoryData.children}
                    onSelectFolder={onSelectFolder}
                    onSelectLink={onSelectLink}
                />
            </div>
        </Fragment>
    );
};
