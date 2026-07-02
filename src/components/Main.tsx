import React from 'react';

import { footerCredit, footerLink } from '@/constants/footer';
import { Cover } from './Cover';

interface MainProps {
    isClerkEnabled: boolean;
}

export const Main: React.FC<MainProps> = ({ isClerkEnabled }) => (
    <>
        <main>
            <Cover isClerkEnabled={isClerkEnabled} />
        </main>
        <footer>
            <a href={footerLink}>{footerCredit}</a>
        </footer>
    </>
);
