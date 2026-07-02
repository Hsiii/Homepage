import type { BookmarkCategoryData, BookmarkLinkData } from '@/types/bookmarks';

const defaultCategoryName = 'Bookmarks';
const folderSeparator = ' / ';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const normalizeText = (value: string): string =>
    value.replaceAll(/\s+/g, ' ').trim();

const createFallbackId = (index: number): string => `bookmark-${index}`;

const createUniqueIdGetter = (): ((id: string) => string) => {
    const usedIds = new Set<string>();

    return (id: string): string => {
        if (!usedIds.has(id)) {
            usedIds.add(id);
            return id;
        }

        let index = 2;
        let nextId = `${id}-${index}`;
        while (usedIds.has(nextId)) {
            index++;
            nextId = `${id}-${index}`;
        }

        usedIds.add(nextId);
        return nextId;
    };
};

export const normalizeBookmarkTree = (
    bookmarkTree: readonly BookmarkCategoryData[]
): BookmarkCategoryData[] => {
    const getUniqueId = createUniqueIdGetter();
    let bookmarkIndex = 0;

    return bookmarkTree
        .map((categoryData) => {
            const category =
                normalizeText(categoryData.category) || defaultCategoryName;
            const icon =
                categoryData.icon === undefined
                    ? undefined
                    : normalizeText(categoryData.icon);
            const links = categoryData.links
                .map((bookmark): BookmarkLinkData | undefined => {
                    const title = normalizeText(bookmark.title);
                    const url = bookmark.url.trim();

                    if (title === '' || url === '') {
                        return undefined;
                    }

                    const id =
                        normalizeText(bookmark.id) ||
                        createFallbackId(bookmarkIndex);
                    bookmarkIndex++;

                    return {
                        id: getUniqueId(id),
                        title,
                        url,
                    };
                })
                .filter(
                    (bookmark): bookmark is BookmarkLinkData =>
                        bookmark !== undefined
                );

            return {
                category,
                ...(icon === undefined || icon === '' ? {} : { icon }),
                links,
            };
        })
        .filter((categoryData) => categoryData.links.length > 0);
};

export const coerceBookmarkTree = (
    value: unknown
): BookmarkCategoryData[] | undefined => {
    if (!Array.isArray(value)) {
        return undefined;
    }

    const bookmarkTree = value
        .map((categoryValue): BookmarkCategoryData | undefined => {
            if (!isRecord(categoryValue)) {
                return undefined;
            }

            const category =
                typeof categoryValue.category === 'string'
                    ? categoryValue.category
                    : defaultCategoryName;
            const linksValue = categoryValue.links;
            if (!Array.isArray(linksValue)) {
                return undefined;
            }
            const icon =
                typeof categoryValue.icon === 'string'
                    ? categoryValue.icon
                    : undefined;

            const links = linksValue
                .map((bookmarkValue): BookmarkLinkData | undefined => {
                    if (!isRecord(bookmarkValue)) {
                        return undefined;
                    }

                    const title =
                        typeof bookmarkValue.title === 'string'
                            ? bookmarkValue.title
                            : '';
                    const url =
                        typeof bookmarkValue.url === 'string'
                            ? bookmarkValue.url
                            : '';
                    const id =
                        typeof bookmarkValue.id === 'string'
                            ? bookmarkValue.id
                            : '';

                    return { id, title, url };
                })
                .filter(
                    (bookmark): bookmark is BookmarkLinkData =>
                        bookmark !== undefined
                );

            return {
                category,
                ...(icon === undefined ? {} : { icon }),
                links,
            };
        })
        .filter(
            (categoryData): categoryData is BookmarkCategoryData =>
                categoryData !== undefined
        );

    const normalizedBookmarkTree = normalizeBookmarkTree(bookmarkTree);

    return normalizedBookmarkTree.length > 0
        ? normalizedBookmarkTree
        : undefined;
};

const isElementTag = <TagName extends keyof HTMLElementTagNameMap>(
    element: Element | null | undefined,
    tagName: TagName
): element is HTMLElementTagNameMap[TagName] =>
    element?.tagName.toLowerCase() === tagName;

const getDirectChild = <TagName extends keyof HTMLElementTagNameMap>(
    element: Element,
    tagName: TagName
): HTMLElementTagNameMap[TagName] | undefined => {
    for (const child of element.children) {
        if (isElementTag(child, tagName)) {
            return child;
        }
    }

    return undefined;
};

const getElementText = (element: Element): string =>
    normalizeText(element.textContent);

const findFolderList = (heading: Element): HTMLDListElement | undefined => {
    const parent = heading.parentElement;
    if (parent === null) {
        return undefined;
    }

    const childList = getDirectChild(parent, 'dl');
    if (childList !== undefined) {
        return childList;
    }

    let sibling = parent.nextElementSibling;
    while (sibling !== null) {
        if (isElementTag(sibling, 'dl')) {
            return sibling;
        }

        const nestedList = getDirectChild(sibling, 'dl');
        if (nestedList !== undefined) {
            return nestedList;
        }

        if (!isElementTag(sibling, 'p')) {
            return undefined;
        }

        sibling = sibling.nextElementSibling;
    }

    return undefined;
};

export const parseBrowserBookmarks = (html: string): BookmarkCategoryData[] => {
    const document = new DOMParser().parseFromString(html, 'text/html');
    const rootList = document.querySelector('dl');
    const visitedLists = new WeakSet<HTMLDListElement>();
    const categories: BookmarkCategoryData[] = [];
    let importedBookmarkIndex = 0;

    const createBookmark = (anchor: HTMLAnchorElement): BookmarkLinkData => {
        const url = anchor.getAttribute('href')?.trim() ?? '';
        const title = getElementText(anchor) || url;
        importedBookmarkIndex++;

        return {
            id: `imported-${importedBookmarkIndex}`,
            title,
            url,
        };
    };

    const parseList = (list: HTMLDListElement, path: readonly string[]) => {
        if (visitedLists.has(list)) {
            return;
        }

        visitedLists.add(list);

        const directLinks: BookmarkLinkData[] = [];

        for (const child of list.children) {
            if (isElementTag(child, 'dt')) {
                const heading = getDirectChild(child, 'h3');
                if (heading !== undefined) {
                    const folderName = getElementText(heading);
                    const folderList = findFolderList(heading);

                    if (folderList !== undefined) {
                        parseList(folderList, [
                            ...path,
                            folderName || defaultCategoryName,
                        ]);
                    }

                    continue;
                }

                const anchor =
                    getDirectChild(child, 'a') ??
                    child.querySelector('a[href]');
                if (anchor instanceof HTMLAnchorElement) {
                    directLinks.push(createBookmark(anchor));
                }

                continue;
            }

            if (child instanceof HTMLAnchorElement) {
                directLinks.push(createBookmark(child));
                continue;
            }

            if (isElementTag(child, 'dl')) {
                parseList(child, path);
            }
        }

        if (directLinks.length > 0) {
            categories.push({
                category:
                    path.length > 0
                        ? path.join(folderSeparator)
                        : defaultCategoryName,
                links: directLinks,
            });
        }
    };

    if (rootList !== null) {
        parseList(rootList, []);
    }

    if (categories.length === 0) {
        const links = [
            ...document.querySelectorAll<HTMLAnchorElement>('a[href]'),
        ].map((anchor) => createBookmark(anchor));

        if (links.length > 0) {
            categories.push({
                category: defaultCategoryName,
                links,
            });
        }
    }

    return normalizeBookmarkTree(categories);
};

const escapeHtml = (value: string): string =>
    value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');

export const serializeBrowserBookmarks = (
    bookmarkTree: readonly BookmarkCategoryData[],
    date = new Date()
): string => {
    const timestamp = Math.floor(date.getTime() / 1000).toString();
    const normalizedBookmarkTree = normalizeBookmarkTree(bookmarkTree);
    const lines = [
        '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
        '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
        '<TITLE>Bookmarks</TITLE>',
        '<H1>Bookmarks</H1>',
        '<DL><p>',
    ];

    for (const categoryData of normalizedBookmarkTree) {
        lines.push(
            `    <DT><H3 ADD_DATE="${timestamp}" LAST_MODIFIED="${timestamp}">${escapeHtml(
                categoryData.category
            )}</H3>`,
            '    <DL><p>'
        );

        for (const bookmark of categoryData.links) {
            lines.push(
                `        <DT><A HREF="${escapeHtml(
                    bookmark.url
                )}" ADD_DATE="${timestamp}">${escapeHtml(bookmark.title)}</A>`
            );
        }

        lines.push('    </DL><p>');
    }

    lines.push('</DL><p>');

    return `${lines.join('\n')}\n`;
};
