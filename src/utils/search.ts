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
const latinToBopomofoKeyMap: Partial<Record<string, string>> = {
    a: 'ㄇ',
    b: 'ㄖ',
    c: 'ㄏ',
    d: 'ㄎ',
    e: 'ㄍ',
    f: 'ㄑ',
    g: 'ㄕ',
    h: 'ㄘ',
    i: 'ㄛ',
    j: 'ㄨ',
    k: 'ㄜ',
    l: 'ㄠ',
    m: 'ㄩ',
    n: 'ㄙ',
    o: 'ㄟ',
    p: 'ㄣ',
    q: 'ㄆ',
    r: 'ㄐ',
    s: 'ㄋ',
    t: 'ㄔ',
    u: 'ㄧ',
    v: 'ㄒ',
    w: 'ㄊ',
    x: 'ㄌ',
    y: 'ㄗ',
    z: 'ㄈ',
};
const bopomofoInitials = new Set([
    'ㄅ',
    'ㄆ',
    'ㄇ',
    'ㄈ',
    'ㄉ',
    'ㄊ',
    'ㄋ',
    'ㄌ',
    'ㄍ',
    'ㄎ',
    'ㄏ',
    'ㄐ',
    'ㄑ',
    'ㄒ',
    'ㄓ',
    'ㄔ',
    'ㄕ',
    'ㄖ',
    'ㄗ',
    'ㄘ',
    'ㄙ',
]);
const bopomofoMedials = new Set(['ㄧ', 'ㄨ', 'ㄩ']);
const bopomofoFinals = new Set([
    'ㄚ',
    'ㄛ',
    'ㄜ',
    'ㄝ',
    'ㄞ',
    'ㄟ',
    'ㄠ',
    'ㄡ',
    'ㄢ',
    'ㄣ',
    'ㄤ',
    'ㄥ',
    'ㄦ',
]);

type BopomofoSyllable = {
    final: string;
    initial: string;
    medial: string;
};

type BopomofoAliasVariant = {
    alias: string;
    typedLength: number;
};

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

const getBopomofoAliasVariants = (value: string): BopomofoAliasVariant[] => {
    let aliasBase = '';
    let typedLength = 0;
    const variants: BopomofoAliasVariant[] = [];
    const syllable: BopomofoSyllable = {
        final: '',
        initial: '',
        medial: '',
    };

    const flushSyllable = (): void => {
        if (
            syllable.initial === '' &&
            syllable.medial === '' &&
            syllable.final === ''
        ) {
            return;
        }

        aliasBase += syllable.initial + syllable.medial + syllable.final;
        syllable.initial = '';
        syllable.medial = '';
        syllable.final = '';
    };

    const getCurrentAlias = (): string =>
        aliasBase + syllable.initial + syllable.medial + syllable.final;

    for (const char of value.toLowerCase()) {
        const bopomofo = latinToBopomofoKeyMap[char];

        if (bopomofo === undefined) {
            flushSyllable();
            aliasBase += char;
            continue;
        }

        if (bopomofoInitials.has(bopomofo)) {
            syllable.initial = bopomofo;
        } else if (bopomofoMedials.has(bopomofo)) {
            syllable.medial = bopomofo;
        } else if (bopomofoFinals.has(bopomofo)) {
            syllable.final = bopomofo;
        }

        typedLength++;
        variants.push({
            alias: getCurrentAlias(),
            typedLength,
        });
    }

    return variants;
};

const getTextSearchScore = (
    source: string,
    query: string
): number | undefined => {
    const includesIndex = source.indexOf(query);

    if (source === query) {
        return 0;
    }

    if (source.startsWith(query)) {
        return 1 + source.length / 100;
    }

    const wordStartIndex = source
        .split(/\s+/)
        .findIndex((word) => word.startsWith(query));

    if (wordStartIndex !== -1) {
        return 2 + wordStartIndex / 100;
    }

    if (includesIndex !== -1) {
        return 3 + includesIndex / 100;
    }

    let queryIndex = 0;
    for (const char of source) {
        if (char === query[queryIndex]) {
            queryIndex++;
        }
    }

    if (queryIndex === query.length) {
        return 4 + source.length / 100;
    }

    return undefined;
};

const getSearchScore = (link: LinkName, query: string): number | undefined => {
    const normalizedLink = link.toLowerCase();
    const normalizedQuery = query.toLowerCase();
    const directScore = getTextSearchScore(normalizedLink, normalizedQuery);
    let bopomofoAliasScore: number | undefined;

    for (const variant of getBopomofoAliasVariants(normalizedLink)) {
        const score = getTextSearchScore(variant.alias, normalizedQuery);
        const weightedScore =
            score === undefined
                ? undefined
                : score + variant.typedLength / 1000;

        if (weightedScore === undefined) {
            continue;
        }

        bopomofoAliasScore =
            bopomofoAliasScore === undefined
                ? weightedScore
                : Math.min(bopomofoAliasScore, weightedScore);
    }

    if (directScore === undefined) {
        return bopomofoAliasScore;
    }

    if (bopomofoAliasScore === undefined) {
        return directScore;
    }

    return Math.min(directScore, bopomofoAliasScore);
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
