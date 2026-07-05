import type { ReactElement } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Folder, icons } from 'lucide-react';

import type { LinkName } from '@/constants/links';
import { links } from '@/constants/links';
import type {
    BookmarkCategoryData,
    BookmarkFolderData,
    BookmarkLinkData,
    BookmarkNodeData,
} from '@/types/bookmarks';

export type CategoryData = {
    category: string;
    children: BookmarkNodeData[];
    icon: ReactElement;
    iconName: string;
    links: BookmarkLinkData[];
};

type DefaultCategoryData = {
    category: string;
    iconName: string;
    links: LinkName[];
};

export interface CategoryIconOption {
    Icon: LucideIcon;
    iconName: string;
    label: string;
    searchText: string;
}

const categoryIcons = icons as Partial<Record<string, LucideIcon>>;
const categoryIconNames = new Set(Object.keys(categoryIcons));

const formatIconName = (iconName: string): string =>
    iconName.replaceAll(/([\da-z])([A-Z])/g, '$1 $2');

const normalizeIconSearchText = (value: string): string =>
    value.toLowerCase().replaceAll(/[^\da-z]+/g, '');

export const categoryIconOptions: CategoryIconOption[] = Object.keys(
    categoryIcons
)
    .flatMap((iconName) => {
        const Icon = categoryIcons[iconName];
        if (Icon === undefined) {
            return [];
        }

        const label = formatIconName(iconName);

        return [
            {
                Icon,
                iconName,
                label,
                searchText: `${normalizeIconSearchText(
                    iconName
                )} ${normalizeIconSearchText(label)}`,
            },
        ];
    })
    .toSorted((a, b) => a.label.localeCompare(b.label));

export const normalizeCategoryIconSearch = (value: string): string =>
    normalizeIconSearchText(value);

export const isCategoryIconName = (
    iconName: string | undefined
): iconName is string =>
    iconName !== undefined && categoryIconNames.has(iconName);

const defaultCategoryData = [
    {
        category: 'Study',
        iconName: 'BookOpenText',
        links: ['eeclass', 'ccxp', 'Past Exam', 'NotebookLM'],
    },
    {
        category: 'SNS',
        iconName: 'MessagesSquare',
        links: ['Instagram', 'Threads', 'Messenger', 'Twitter', 'Facebook'],
    },
    {
        category: 'Media',
        iconName: 'MonitorPlay',
        links: ['YouTube', 'Anigamer', 'Spotify', 'Utaten', 'Dam'],
    },
    {
        category: 'Game',
        iconName: 'Gamepad2',
        links: ['majsoul', 'Supercell Store', 'Tetr.io', 'maimai', 'maimaiJP'],
    },
    {
        category: 'Dev',
        iconName: 'CodeXml',
        links: [
            'GitHub',
            'ASC',
            'Vercel',
            'Clerk',
            'Cloudflare',
            'Supabase',
            'Neon',
            'Crx',
            'TDX',
            'Moz Add-on',
            'Search Console',
            'LeetCode',
        ],
    },
    {
        category: 'Design',
        iconName: 'PenTool',
        links: [
            'Awwwards',
            'Figma',
            'Font',
            'Coliss',
            'wordmark',
            'Lucide',
            'Svgl',
            'Coolor',
            'WebGradients',
            'Haikei',
            'React Bits',
            'Motion',
            'SSTM',
        ],
    },
    {
        category: 'Art',
        iconName: 'Brush',
        links: [
            'Pinterest',
            'Pixiv',
            'Head Ref',
            'Pose Ref',
            'Line of Action',
            'Quickposes',
            'Resource Boy',
            'Texturelabs',
            'Hololive Ref',
        ],
    },
    {
        category: 'Tools',
        iconName: 'ToolCase',
        links: [
            'HackMD',
            'Squoosh',
            'AkuMa',
            'OnTrack',
            'Skyscanner',
            'Morning',
            'Badgical',
        ],
    },
    {
        category: 'GSuite',
        iconName: 'LayoutGrid',
        links: [
            'Gemini',
            'Maps',
            'Drive',
            'Doc',
            'Sheet',
            'Slide',
            'Gmail',
            'Calendar',
        ],
    },
] as const satisfies readonly DefaultCategoryData[];

export const defaultBookmarkTree: BookmarkCategoryData[] =
    defaultCategoryData.map((categoryData) => {
        const bookmarkLinks: BookmarkLinkData[] = categoryData.links.map(
            (link) => ({
                id: link,
                title: link,
                type: 'link',
                url: links[link],
            })
        );

        return {
            category: categoryData.category,
            children: bookmarkLinks,
            id: `default-category-${categoryData.category.toLowerCase()}`,
            links: bookmarkLinks,
        };
    });

const categoryIconNameByName = new Map<string, string>(
    defaultCategoryData.map((categoryData) => [
        categoryData.category,
        categoryData.iconName,
    ])
);

const fallbackCategoryIconName = 'Folder';

export const resolveBookmarkIconName = (
    iconName: string | undefined
): string =>
    isCategoryIconName(iconName) ? iconName : fallbackCategoryIconName;

export const resolveFolderIconName = (
    folderData: BookmarkFolderData | undefined
): string => resolveBookmarkIconName(folderData?.icon);

export const createBookmarkIcon = (
    iconName: string | undefined,
    className = 'icon category-icon-display'
): ReactElement => {
    const Icon = categoryIcons[resolveBookmarkIconName(iconName)] ?? Folder;

    return <Icon className={className} />;
};

const resolveCategoryIconName = (
    categoryData: BookmarkCategoryData
): string => {
    if (isCategoryIconName(categoryData.icon)) {
        return categoryData.icon;
    }

    return (
        categoryIconNameByName.get(categoryData.category) ??
        fallbackCategoryIconName
    );
};

export const decorateBookmarkTree = (
    bookmarkTree: readonly BookmarkCategoryData[]
): CategoryData[] =>
    bookmarkTree.map((categoryData) => {
        const iconName = resolveCategoryIconName(categoryData);

        return {
            category: categoryData.category,
            children: [...categoryData.children],
            icon: createBookmarkIcon(iconName),
            iconName,
            links: [...categoryData.links],
        };
    });
