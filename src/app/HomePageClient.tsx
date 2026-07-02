'use client';

import { Main } from '@/components/Main';

interface HomePageClientProps {
    isClerkEnabled: boolean;
}

export const HomePageClient: React.FC<HomePageClientProps> = ({
    isClerkEnabled,
}) => <Main isClerkEnabled={isClerkEnabled} />;
