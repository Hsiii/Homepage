import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

const clerkPublishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    process.env.VITE_CLERK_PUBLISHABLE_KEY;
const isClerkConfigured =
    clerkPublishableKey !== undefined && clerkPublishableKey.trim() !== '';

const passThrough = () => NextResponse.next();

export default isClerkConfigured ? clerkMiddleware() : passThrough;

export const config = {
    matcher: [
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        '/(api|trpc)(.*)',
        '/__clerk/(.*)',
    ],
};
