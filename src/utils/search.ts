import type { LinkName } from '@/constants/links';
import { links } from '@/constants/links';
import { linkTree } from '@/constants/linkTree';

export interface LinkItem {
    category: number;
    link: LinkName;
}

export interface SearchResult {
    item: LinkItem;
    score?: number;
}

export interface SearchIndex {
    search: (query: string) => SearchResult[];
}

export interface SearchSuggestionsPosition {
    left: number;
    top: number;
    width: number;
}

const maxSearchResults = 4;
const secondaryResultScoreLimit = 0.25;

const chillLinks = [
    'Instagram',
    'Messenger',
    'Twitter',
    'Facebook',
    'GitHub',
    'Crx',
    'YouTube',
    'Anigamer',
] as const satisfies readonly LinkName[];

export const getSearchItems = (): LinkItem[] =>
    linkTree.flatMap((category, categoryIndex) => {
        const categoryId = categoryIndex + 1;

        return category.links.map((link) => ({
            category: categoryId,
            link,
        }));
    });

export const isChillSearch = (value: string): boolean =>
    value.trim().toLowerCase() === 'chill';

export const openChillLinks = (): void => {
    for (const linkName of chillLinks) {
        globalThis.open(links[linkName], '_blank');
    }
};

export const getSearchResults = (
    results: readonly SearchResult[]
): LinkItem[] => {
    if (results.length === 0) {
        return [];
    }

    const [primaryResult, ...secondaryResults] = results;
    const strongSecondaryResults = secondaryResults.filter(
        ({ score }) => score !== undefined && score <= secondaryResultScoreLimit
    );

    return [
        primaryResult,
        ...strongSecondaryResults.slice(0, maxSearchResults - 1),
    ].map(({ item }) => item);
};

export const getGoogleSearchUrl = (value: string): string =>
    `https://www.google.com/search?q=${encodeURIComponent(value.trim())}`;

export const getSearchInputValue = (
    searchValue: string,
    selectedSearchResult: LinkItem | undefined,
    autocompleteEnabled: boolean
): string => {
    if (
        !autocompleteEnabled ||
        searchValue.trim() === '' ||
        !selectedSearchResult
    ) {
        return searchValue;
    }

    const query = searchValue.trim();
    const selectedLink = selectedSearchResult.link;
    const normalizedSelectedLink = selectedLink.toLowerCase();

    if (normalizedSelectedLink.startsWith(query.toLowerCase())) {
        return `${query}${normalizedSelectedLink.slice(query.length)}`;
    }

    return normalizedSelectedLink;
};

export const getAutocompleteSelectionStart = (
    searchValue: string,
    selectedSearchResult: LinkItem
): number => {
    const query = searchValue.trim();
    const selectedLink = selectedSearchResult.link;

    if (selectedLink.toLowerCase().startsWith(query.toLowerCase())) {
        return query.length;
    }

    return 0;
};

export const isSameSearchSuggestionsPosition = (
    a: SearchSuggestionsPosition | undefined,
    b: SearchSuggestionsPosition
): boolean =>
    a !== undefined &&
    Math.abs(a.left - b.left) < 0.5 &&
    Math.abs(a.top - b.top) < 0.5 &&
    Math.abs(a.width - b.width) < 0.5;
