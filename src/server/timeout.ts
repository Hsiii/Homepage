import 'server-only';

export class ServerTimeoutError extends Error {
    constructor(label: string, timeoutMs: number) {
        super(`${label} timed out after ${timeoutMs}ms.`);
        this.name = 'ServerTimeoutError';
    }
}

export const withServerTimeout = async <T>(
    label: string,
    promise: Promise<T>,
    timeoutMs: number
): Promise<T> => {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    try {
        return await Promise.race([
            promise,
            new Promise<never>((_, reject) => {
                timeoutId = setTimeout(() => {
                    reject(new ServerTimeoutError(label, timeoutMs));
                }, timeoutMs);
            }),
        ]);
    } finally {
        if (timeoutId !== undefined) {
            clearTimeout(timeoutId);
        }
    }
};
