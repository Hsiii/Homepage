import React from 'react';

import { footerCredit, footerLink } from '@/constants/footer';
import { Cover } from './Cover';

import './Main.css';

export const Main: React.FC = () => (
    <>
        <main>
            <Cover />
        </main>
        <footer>
            <a href={footerLink}>{footerCredit}</a>
        </footer>
    </>
);
