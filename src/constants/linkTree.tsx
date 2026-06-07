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
        links: ['eeclass', 'ccxp', 'DB', 'DBHW', 'Past Exam', 'NotebookLM'],
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
        links: ['Tetr.io', 'maimai'],
    },
    {
        category: 'Dev',
        icon: <CodeXml className='icon' />,
        links: [
            'GitHub',
            'Crx',
            'Moz Add-on',
            'Vercel',
            'Supabase',
            'Cloudflare',
            'Lucide',
            'LeetCode',
            'SSTM',
        ],
    },
    {
        category: 'Design',
        icon: <PenTool className='icon' />,
        links: [
            'Figma',
            'Font',
            'Coliss',
            'wordmark',
            'Coolor',
            'WebGradients',
            'Haikei',
            'Motion',
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
        links: ['HackMD', 'Squoosh', 'AkuMa', 'Train'],
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
