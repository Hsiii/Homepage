import { links } from '@/constants/links';
import type {
    BookmarkCategoryData,
    BookmarkLinkData,
    BookmarkNodeData,
} from '@/types/bookmarks';
import { getBookmarkLinks } from '@/utils/bookmarks';

export const bookmarkAccountRevision = 1;

interface BookmarkAddition {
    category: string;
    links: BookmarkLinkData[];
}

const createBookmarkLink = (title: keyof typeof links): BookmarkLinkData => ({
    id: title,
    title,
    type: 'link',
    url: links[title],
});

const recentLinkTreeAdditions: BookmarkAddition[] = [
    {
        category: 'SNS',
        links: [createBookmarkLink('LinkedIn')],
    },
    {
        category: 'Media',
        links: [createBookmarkLink('Crunchyroll')],
    },
    {
        category: 'Dev',
        links: [
            createBookmarkLink('Oracle'),
            createBookmarkLink('Artificial Analysis'),
            createBookmarkLink('DeepSWE'),
        ],
    },
];

const normalizeUrl = (value: string): string =>
    value.trim().replace(/\/$/, '').toLowerCase();

const addMissingBookmarks = (
    bookmarkTree: readonly BookmarkCategoryData[],
    additions: readonly BookmarkAddition[]
): BookmarkCategoryData[] => {
    const existingUrls = new Set(
        bookmarkTree.flatMap((category) =>
            getBookmarkLinks(category.children).map((bookmark) =>
                normalizeUrl(bookmark.url)
            )
        )
    );
    const additionsByCategory = new Map(
        additions.map((addition) => [addition.category.toLowerCase(), addition])
    );
    const mergedCategories = bookmarkTree.map((category) => {
        const addition = additionsByCategory.get(
            category.category.toLowerCase()
        );
        if (addition === undefined) {
            return category;
        }

        additionsByCategory.delete(category.category.toLowerCase());
        const missingLinks = addition.links.filter((bookmark) => {
            const normalizedUrl = normalizeUrl(bookmark.url);
            if (existingUrls.has(normalizedUrl)) {
                return false;
            }

            existingUrls.add(normalizedUrl);
            return true;
        });

        return missingLinks.length === 0
            ? category
            : {
                  ...category,
                  children: [...category.children, ...missingLinks],
              };
    });

    const missingCategories = [...additionsByCategory.values()].flatMap(
        (addition): BookmarkCategoryData[] => {
            const missingLinks = addition.links.filter((bookmark) => {
                const normalizedUrl = normalizeUrl(bookmark.url);
                if (existingUrls.has(normalizedUrl)) {
                    return false;
                }

                existingUrls.add(normalizedUrl);
                return true;
            });

            return missingLinks.length === 0
                ? []
                : [
                      {
                          category: addition.category,
                          children: missingLinks as BookmarkNodeData[],
                          id: `default-category-${addition.category.toLowerCase()}`,
                          links: missingLinks,
                      },
                  ];
        }
    );

    return [...mergedCategories, ...missingCategories];
};

export const applyBookmarkAccountMigrations = (
    bookmarkTree: readonly BookmarkCategoryData[],
    fromRevision: number
): BookmarkCategoryData[] => {
    if (fromRevision >= bookmarkAccountRevision) {
        return [...bookmarkTree];
    }

    return addMissingBookmarks(bookmarkTree, recentLinkTreeAdditions);
};
