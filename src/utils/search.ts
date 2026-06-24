import type { LinkName } from '@/constants/links';
import { linkTree } from '@/constants/linkTree';

export interface LinkItem {
    category: number;
    link: LinkName;
}

export interface SearchSuggestionsPosition {
    left: number;
    top: number;
    width: number;
}

export interface FeedsLink {
    link: LinkName;
    url: string;
}

export interface SlashCommandItem {
    command: 'feeds';
    label: string;
}

const maxSearchResults = 4;

export const slashCommands = [
    {
        command: 'feeds',
        label: '/feeds',
    },
] as const satisfies readonly SlashCommandItem[];

export const getSearchItems = (): LinkItem[] =>
    linkTree.flatMap((category, categoryIndex) => {
        const categoryId = categoryIndex + 1;

        return category.links.map((link) => ({
            category: categoryId,
            link,
        }));
    });

export const isFeedsSearch = (value: string): boolean =>
    value.trim().toLowerCase() === '/feeds';

export const isSlashCommandSearch = (value: string): boolean =>
    value.trim().startsWith('/');

export const getSlashCommandResults = (value: string): SlashCommandItem[] => {
    const query = value.trim().toLowerCase();
    if (!isSlashCommandSearch(query)) {
        return [];
    }

    return slashCommands.filter((command) =>
        command.label.toLowerCase().startsWith(query)
    );
};

const getSearchScore = (link: LinkName, query: string): number | undefined => {
    const normalizedLink = link.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    const includesIndex = normalizedLink.indexOf(normalizedQuery);

    if (normalizedLink === normalizedQuery) {
        return 0;
    }

    if (normalizedLink.startsWith(normalizedQuery)) {
        return 1 + normalizedLink.length / 100;
    }

    const wordStartIndex = normalizedLink
        .split(/\s+/)
        .findIndex((word) => word.startsWith(normalizedQuery));

    if (wordStartIndex !== -1) {
        return 2 + wordStartIndex / 100;
    }

    if (includesIndex !== -1) {
        return 3 + includesIndex / 100;
    }

    let queryIndex = 0;
    for (const char of normalizedLink) {
        if (char === normalizedQuery[queryIndex]) {
            queryIndex++;
        }
    }

    if (queryIndex === normalizedQuery.length) {
        return 4 + normalizedLink.length / 100;
    }

    return undefined;
};

export const getSearchResults = (
    items: readonly LinkItem[],
    query: string
): LinkItem[] => {
    const trimmedQuery = query.trim();
    if (trimmedQuery === '') {
        return [];
    }

    return items
        .map((item) => ({
            item,
            score: getSearchScore(item.link, trimmedQuery),
        }))
        .filter(
            (result): result is { item: LinkItem; score: number } =>
                result.score !== undefined
        )
        .toSorted(
            (a, b) =>
                a.score - b.score || a.item.link.localeCompare(b.item.link)
        )
        .slice(0, maxSearchResults)
        .map(({ item }) => item);
};

export const getGoogleSearchUrl = (value: string): string =>
    `https://www.google.com/search?q=${encodeURIComponent(value.trim())}`;

export const isSameSearchSuggestionsPosition = (
    a: SearchSuggestionsPosition | undefined,
    b: SearchSuggestionsPosition
): boolean =>
    a !== undefined &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5;
