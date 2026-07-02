export class ApiError extends Error {
    readonly statusCode: number;

    constructor(message: string, statusCode: number) {
        super(message);
        this.name = 'ApiError';
        this.statusCode = statusCode;
    }
}

export const createApiErrorResponse = (error: unknown): Response => {
    if (error instanceof ApiError) {
        return Response.json(
            { error: error.message },
            { status: error.statusCode }
        );
    }

    console.error(error);
    return Response.json(
        { error: 'Unexpected server error.' },
        { status: 500 }
    );
};
