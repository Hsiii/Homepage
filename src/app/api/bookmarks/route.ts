import { auth } from '@clerk/nextjs/server';

import { ApiError, createApiErrorResponse } from '@/server/apiError';
import {
    clearUserBookmarks,
    getUserBookmarks,
    saveUserBookmarks,
} from '@/server/bookmarkStore';

const clerkPublishableKey =
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ??
    process.env.VITE_CLERK_PUBLISHABLE_KEY;
const isClerkEnabled =
    clerkPublishableKey !== undefined && clerkPublishableKey.trim() !== '';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const requireUserId = async (): Promise<string> => {
    if (!isClerkEnabled) {
        throw new ApiError('Bookmark sync is not configured.', 503);
    }

    const { userId } = await auth();

    if (userId === null) {
        throw new ApiError('Sign in is required.', 401);
    }

    return userId;
};

const readBookmarkPayload = async (request: Request): Promise<unknown> => {
    const payload = (await request.json().catch(() => undefined)) as unknown;

    if (!isRecord(payload) || !('categories' in payload)) {
        throw new ApiError('Bookmark payload is invalid.', 400);
    }

    return payload.categories;
};

export const GET = async (): Promise<Response> => {
    try {
        const userId = await requireUserId();

        return Response.json({
            categories: await getUserBookmarks(userId),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
};

export const POST = async (request: Request): Promise<Response> => {
    try {
        const userId = await requireUserId();
        const categories = await readBookmarkPayload(request);

        return Response.json({
            categories: await saveUserBookmarks(userId, categories),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
};

export const DELETE = async (): Promise<Response> => {
    try {
        const userId = await requireUserId();
        await clearUserBookmarks(userId);

        return Response.json({ categories: undefined });
    } catch (error) {
        return createApiErrorResponse(error);
    }
};
