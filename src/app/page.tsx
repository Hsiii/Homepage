import type { ReactNode } from 'react';

import { HomePageClient } from './HomePageClient';

const clerkPublishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    process.env.VITE_CLERK_PUBLISHABLE_KEY;

export default function Page(): ReactNode {
    return (
        <HomePageClient
            isClerkEnabled={
                clerkPublishableKey !== undefined &&
                clerkPublishableKey.trim() !== ''
            }
        />
    );
}
