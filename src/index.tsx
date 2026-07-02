import { StrictMode } from 'react';
import { ClerkProvider } from '@clerk/react';
import { createRoot } from 'react-dom/client';

import { Main } from './components/Main';

import './index.css';

const animationStorageKey = 'animation-mode';
const skipAnimationMode = 'skip';
const normalAnimationMode = 'normal';

const savedAnimationMode = globalThis.localStorage.getItem(animationStorageKey);
globalThis.document.documentElement.dataset.animationMode =
    savedAnimationMode === skipAnimationMode
        ? skipAnimationMode
        : normalAnimationMode;

const root = document.querySelector('#root');
if (!root) {
    throw new Error('Root element not found');
}

const clerkPublishableKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
const isClerkEnabled =
    clerkPublishableKey !== undefined && clerkPublishableKey !== '';
const app = <Main isClerkEnabled={isClerkEnabled} />;

createRoot(root).render(
    <StrictMode>
        {isClerkEnabled ? (
            <ClerkProvider publishableKey={clerkPublishableKey}>
                {app}
            </ClerkProvider>
        ) : (
            app
        )}
    </StrictMode>
);
