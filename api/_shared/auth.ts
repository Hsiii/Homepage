import { verifyToken } from '@clerk/backend';
import type { VercelRequest, VercelResponse } from '@vercel/node';

export class ApiError extends Error {
    readonly statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
    }
}

interface AuthenticatedRequest {
    userId: string;
}

const getHeaderValue = (
    value: string | string[] | number | undefined
): string | undefined => {
    if (Array.isArray(value)) {
        return value[0];
    }

    return typeof value === 'string' ? value : undefined;
};

const getBearerToken = (request: VercelRequest): string | undefined => {
    const authorization = getHeaderValue(request.headers.authorization);
    const match = /^bearer (?<token>.+)$/i.exec(authorization ?? '');

    return match?.groups?.token;
};

export async function authenticateRequest(
    request: VercelRequest
): Promise<AuthenticatedRequest> {
    const token = getBearerToken(request);

    if (token === undefined) {
        throw new ApiError('Sign in is required.', 401);
    }

    const secretKey = process.env.CLERK_SECRET_KEY;
    const jwtKey = process.env.CLERK_JWT_KEY;

    if (secretKey === undefined && jwtKey === undefined) {
        throw new ApiError('Clerk server key is not configured.', 500);
    }

    try {
        const verifiedToken = await verifyToken(token, {
            jwtKey,
            secretKey,
        });

        if (typeof verifiedToken.sub !== 'string') {
            throw new ApiError('Invalid Clerk token.', 401);
        }

        return {
            userId: verifiedToken.sub,
        };
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        throw new ApiError('Invalid Clerk token.', 401);
    }
}

export const sendApiError = (
    response: VercelResponse,
    error: unknown
): void => {
    if (error instanceof ApiError) {
        response.status(error.statusCode).json({ error: error.message });
        return;
    }

    console.error(error);
    response.status(500).json({ error: 'Unexpected server error.' });
};
