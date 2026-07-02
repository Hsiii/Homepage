import type { ReactElement } from 'react';
import {
    BookOpenText,
    Brush,
    CodeXml,
    Folder,
    Gamepad2,
    LayoutGrid,
    MessagesSquare,
    MonitorPlay,
    PenTool,
    ToolCase,
} from 'lucide-react';

import type { LinkName } from '@/constants/links';
import { links } from '@/constants/links';
import type { BookmarkCategoryData, BookmarkLinkData } from '@/types/bookmarks';

export type CategoryData = {
    category: string;
    icon?: ReactElement;
    links: BookmarkLinkData[];
};

type DefaultCategoryData = {
    category: string;
    icon: ReactElement;
    links: LinkName[];
};

const defaultCategoryData = [
    {
        category: 'Study',
        icon: <BookOpenText className='icon' />,
        links: ['eeclass', 'ccxp', 'Past Exam', 'NotebookLM'],
    },
    {
        category: 'SNS',
        icon: <MessagesSquare className='icon' />,
        links: ['Instagram', 'Threads', 'Messenger', 'Twitter', 'Facebook'],
    },
    {
        category: 'Media',
        icon: <MonitorPlay className='icon' />,
        links: ['YouTube', 'Anigamer', 'Spotify', 'Utaten', 'Dam'],
    },
    {
        category: 'Game',
        icon: <Gamepad2 className='icon' />,
        links: ['majsoul', 'Supercell Store', 'Tetr.io', 'maimai', 'maimaiJP'],
    },
    {
        category: 'Dev',
        icon: <CodeXml className='icon' />,
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
        icon: <PenTool className='icon' />,
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
        icon: <Brush className='icon' />,
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
        icon: <ToolCase className='icon' />,
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
        icon: <LayoutGrid className='icon' />,
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
    defaultCategoryData.map((categoryData) => ({
        category: categoryData.category,
        links: categoryData.links.map((link) => ({
            id: link,
            title: link,
            url: links[link],
        })),
    }));

const categoryIconByName = new Map<string, ReactElement>(
    defaultCategoryData.map((categoryData) => [
        categoryData.category,
        categoryData.icon,
    ])
);

const fallbackCategoryIcon = <Folder className='icon' />;

export const decorateBookmarkTree = (
    bookmarkTree: readonly BookmarkCategoryData[]
): CategoryData[] =>
    bookmarkTree.map((categoryData) => ({
        category: categoryData.category,
        icon:
            categoryIconByName.get(categoryData.category) ??
            fallbackCategoryIcon,
        links: [...categoryData.links],
    }));

export const linkTree: CategoryData[] =
    decorateBookmarkTree(defaultBookmarkTree);
