import type { ReactElement } from 'react';
import {
    BookOpenText,
    Brush,
    CodeXml,
    Gamepad2,
    LayoutGrid,
    MessagesSquare,
    MonitorPlay,
    PenTool,
    ToolCase,
} from 'lucide-react';

import type { LinkName } from '@/constants/links';

export type CategoryData = {
    category: string;
    icon?: ReactElement;
    links: LinkName[];
};

export const linkTree: CategoryData[] = [
    {
        category: 'Study',
        icon: <BookOpenText className='icon' />,
        links: ['eeclass', 'ccxp', 'Past Exam', 'NotebookLM'],
    },
    {
        category: 'SNS',
        icon: <MessagesSquare className='icon' />,
        links: ['Instagram', 'Messenger', 'Twitter', 'Facebook'],
    },
    {
        category: 'Media',
        icon: <MonitorPlay className='icon' />,
        links: ['YouTube', 'Anigamer', 'Spotify', 'Utaten', 'Dam'],
    },
    {
        category: 'Game',
        icon: <Gamepad2 className='icon' />,
        links: ['Supercell Store', 'Tetr.io', 'maimai', 'maimaiJP'],
    },
    {
        category: 'Dev',
        icon: <CodeXml className='icon' />,
        links: [
            'GitHub',
            'Repomux',
            'Vercel',
            'Cloudflare',
            'Supabase',
            'Crx',
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
            'Train',
            'Skyscanner',
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
];
