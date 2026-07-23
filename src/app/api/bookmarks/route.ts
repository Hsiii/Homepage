import { ApiError, createApiErrorResponse } from '@/server/apiError';
import { requireAuthenticatedRequest } from '@/server/auth';
import { getUserBookmarks, saveUserBookmarks } from '@/server/bookmarkStore';

const isRecord = (value: unknown): value is Record<string, unknown> =>
    typeof value === 'object' && value !== null;

const readBookmarkPayload = async (request: Request): Promise<unknown> => {
    const payload = (await request.json().catch(() => undefined)) as unknown;

    if (!isRecord(payload) || !('categories' in payload)) {
        throw new ApiError('Bookmark payload is invalid.', 400);
    }

    return payload.categories;
};

export const GET = async (): Promise<Response> => {
    try {
        const { client, userId } = await requireAuthenticatedRequest();

        return Response.json({
            categories: await getUserBookmarks(client, userId),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
};

export const POST = async (request: Request): Promise<Response> => {
    try {
        const { client, userId } = await requireAuthenticatedRequest();
        const categories = await readBookmarkPayload(request);

        return Response.json({
            categories: await saveUserBookmarks(client, userId, categories),
        });
    } catch (error) {
        return createApiErrorResponse(error);
    }
};
