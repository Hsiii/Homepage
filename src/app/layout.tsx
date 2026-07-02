import type { ReactNode } from 'react';
import { ClerkProvider } from '@clerk/nextjs';
import type { Metadata } from 'next';
import Script from 'next/script';

import '@/index.css';
import '@/components/Controls.css';
import '@/components/Cover.css';
import '@/components/LinkPanel.css';
import '@/components/Main.css';
import '@/components/MobileWarning.css';
import '@/components/Mountains.css';
import '@/components/Weather.css';

const clerkPublishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    process.env.VITE_CLERK_PUBLISHABLE_KEY;

export const metadata: Metadata = {
    description:
        'A fast personal browser homepage for search, bookmarks, weather, and AQI.',
    title: 'Homepage',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: ReactNode;
}>): ReactNode {
    const documentMarkup = (
        <html lang='en'>
            <body>
                <Script src='/theme-init.js' strategy='beforeInteractive' />
                {children}
            </body>
        </html>
    );

    if (
        clerkPublishableKey === undefined ||
        clerkPublishableKey.trim() === ''
    ) {
        return documentMarkup;
    }

    return (
        <ClerkProvider publishableKey={clerkPublishableKey}>
            {documentMarkup}
        </ClerkProvider>
    );
}
