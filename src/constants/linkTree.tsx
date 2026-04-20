import type { ReactElement } from 'react';
import {
    BookOpenText,
    Brush,
    CodeXml,
    Gamepad2,
    LayoutGrid,
    MessagesSquare,
    MonitorPlay,
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
        links: ['eeclass', 'ccxp', 'DB', 'GitLab', 'Past Exam', 'NotebookLM'],
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
            'Vercel',
            'Supabase',
            'Lucide',
            'Font',
            'Coolor',
            'Haikei',
            'Motion',
            'LeetCode',
            'SSTM',
        ],
    },
    {
        category: 'Art',
        icon: <Brush className='icon' />,
        links: [
            'Pinterest',
            'Head Ref',
            'Pose Ref',
            'Line of Action',
            'Quickposes',
            'Hololive Ref',
            'Pixiv',
        ],
    },
    {
        category: 'Tools',
        icon: <ToolCase className='icon' />,
        links: ['HackMD', 'Squoosh', 'OJAD', 'Train'],
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
