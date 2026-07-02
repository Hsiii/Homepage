import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@clerk/react';
import { upload } from '@vercel/blob/client';

import type {
    WallpaperAsset,
    WallpaperContentType,
} from '../../shared/wallpaper';
import {
    getWallpaperUploadPath,
    wallpaperMaxDimensionPx,
    wallpaperMaxFileSizeBytes,
} from '../../shared/wallpaper';

interface WallpaperApiResponse {
    wallpaper?: WallpaperAsset;
}

interface ProcessedWallpaper {
    blob: Blob;
    contentType: WallpaperContentType;
    height: number;
    width: number;
}

export interface WallpaperControls {
    clearWallpaper: () => Promise<void>;
    error: string | undefined;
    isAvailable: boolean;
    isBusy: boolean;
    progress: number | undefined;
    uploadWallpaper: (file: File) => Promise<void>;
    wallpaper: WallpaperAsset | undefined;
}

type CanvasSource = {
    cleanup: () => void;
    height: number;
    source: CanvasImageSource;
    width: number;
};

const wallpaperApiPath = '/api/wallpaper';
const wallpaperUploadApiPath = '/api/wallpaper-upload';
const wallpaperCacheKeyPrefix = 'homepage.wallpaper';
const outputContentType = 'image/webp' satisfies WallpaperContentType;
const outputQualities = [0.92, 0.86, 0.8] as const;

const getWallpaperCacheKey = (userId: string): string =>
    `${wallpaperCacheKeyPrefix}.${userId}`;

const backslashCharacter = String.fromCodePoint(92);
const escapedBackslash = `${backslashCharacter}${backslashCharacter}`;
const escapedDoubleQuote = `${backslashCharacter}"`;

const escapeCssUrl = (url: string): string =>
    url
        .replaceAll(backslashCharacter, escapedBackslash)
        .replaceAll('"', escapedDoubleQuote);

const applyWallpaper = (wallpaper: WallpaperAsset | undefined): void => {
    const root = globalThis.document.documentElement;

    if (wallpaper === undefined) {
        delete root.dataset.wallpaper;
        root.style.removeProperty('--wallpaper-image');
        return;
    }

    root.dataset.wallpaper = 'custom';
    root.style.setProperty(
        '--wallpaper-image',
        `url("${escapeCssUrl(wallpaper.url)}")`
    );
};

const readCachedWallpaper = (userId: string): WallpaperAsset | undefined => {
    try {
        const cached = globalThis.localStorage.getItem(
            getWallpaperCacheKey(userId)
        );

        return cached === null
            ? undefined
            : (JSON.parse(cached) as WallpaperAsset);
    } catch {
        return undefined;
    }
};

const writeCachedWallpaper = (
    userId: string,
    wallpaper: WallpaperAsset | undefined
): void => {
    try {
        const key = getWallpaperCacheKey(userId);

        if (wallpaper === undefined) {
            globalThis.localStorage.removeItem(key);
            return;
        }

        globalThis.localStorage.setItem(key, JSON.stringify(wallpaper));
    } catch {
        // Ignore private-mode or storage permission failures.
    }
};

const loadCanvasSource = async (file: File): Promise<CanvasSource> => {
    if ('createImageBitmap' in globalThis) {
        const bitmap = await globalThis.createImageBitmap(file);

        return {
            cleanup: () => {
                bitmap.close();
            },
            height: bitmap.height,
            source: bitmap,
            width: bitmap.width,
        };
    }

    const url = URL.createObjectURL(file);

    return await new Promise<CanvasSource>((resolve, reject) => {
        const image = new Image();
        const removeListeners = () => {
            image.removeEventListener('load', handleLoad);
            image.removeEventListener('error', handleError);
        };
        const cleanupUrl = () => {
            URL.revokeObjectURL(url);
        };
        const handleLoad = () => {
            removeListeners();
            resolve({
                cleanup: cleanupUrl,
                height: image.naturalHeight,
                source: image,
                width: image.naturalWidth,
            });
        };
        const handleError = () => {
            removeListeners();
            cleanupUrl();
            reject(new Error('Wallpaper image could not be decoded.'));
        };

        image.addEventListener('load', handleLoad, { once: true });
        image.addEventListener('error', handleError, { once: true });
        image.src = url;
    });
};

const writeCanvasBlob = async (
    canvas: HTMLCanvasElement,
    quality: number
): Promise<Blob> =>
    await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
            (blob) => {
                if (!(blob instanceof Blob)) {
                    reject(new Error('Wallpaper image could not be encoded.'));
                    return;
                }

                resolve(blob);
            },
            outputContentType,
            quality
        );
    });

const encodeWallpaperBlob = async (
    canvas: HTMLCanvasElement,
    qualityIndex = 0
): Promise<Blob> => {
    if (qualityIndex >= outputQualities.length) {
        throw new Error('Wallpaper image is too large after compression.');
    }

    const quality = outputQualities[qualityIndex];
    const blob = await writeCanvasBlob(canvas, quality);

    if (blob.size <= wallpaperMaxFileSizeBytes) {
        return blob;
    }

    return await encodeWallpaperBlob(canvas, qualityIndex + 1);
};

const processWallpaperFile = async (
    file: File
): Promise<ProcessedWallpaper> => {
    const image = await loadCanvasSource(file);

    try {
        const scale = Math.min(
            1,
            wallpaperMaxDimensionPx / Math.max(image.width, image.height)
        );
        const width = Math.max(1, Math.round(image.width * scale));
        const height = Math.max(1, Math.round(image.height * scale));
        const canvas = globalThis.document.createElement('canvas');
        const context = canvas.getContext('2d');

        if (context === null) {
            throw new Error('Wallpaper image could not be processed.');
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(image.source, 0, 0, width, height);

        const blob = await encodeWallpaperBlob(canvas);

        return {
            blob,
            contentType: outputContentType,
            height,
            width,
        };
    } finally {
        image.cleanup();
    }
};

const readWallpaperResponse = async (
    response: Response
): Promise<WallpaperApiResponse> => {
    const payload = (await response.json().catch(() => ({}))) as
        | WallpaperApiResponse
        | { error?: string };

    if (!response.ok) {
        throw new Error(
            'error' in payload && typeof payload.error === 'string'
                ? payload.error
                : 'Wallpaper request failed.'
        );
    }

    return payload as WallpaperApiResponse;
};

export const useWallpaper = (): WallpaperControls => {
    const { getToken, isLoaded, isSignedIn, userId } = useAuth();
    const [wallpaper, setWallpaper] = useState<WallpaperAsset>();
    const [error, setError] = useState<string>();
    const [isBusy, setIsBusy] = useState(false);
    const [progress, setProgress] = useState<number>();
    const isAvailable = isLoaded && isSignedIn && typeof userId === 'string';

    const getAuthHeaders = useCallback(async (): Promise<
        Record<'Authorization', string>
    > => {
        const token = await getToken();

        if (typeof token !== 'string') {
            throw new TypeError('Sign in is required.');
        }

        return {
            Authorization: `Bearer ${token}`,
        };
    }, [getToken]);

    useEffect(() => {
        if (!isLoaded) {
            return undefined;
        }

        if (!isSignedIn || typeof userId !== 'string') {
            setWallpaper(undefined);
            applyWallpaper(undefined);
            return undefined;
        }

        const cached = readCachedWallpaper(userId);
        setWallpaper(cached);
        applyWallpaper(cached);

        let isCurrent = true;

        const loadWallpaper = async () => {
            try {
                const response = await fetch(wallpaperApiPath, {
                    headers: await getAuthHeaders(),
                });
                const payload = await readWallpaperResponse(response);

                if (!isCurrent) {
                    return;
                }

                setWallpaper(payload.wallpaper);
                writeCachedWallpaper(userId, payload.wallpaper);
                applyWallpaper(payload.wallpaper);
                setError(undefined);
            } catch (loadError) {
                if (!isCurrent) {
                    return;
                }

                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : 'Wallpaper request failed.'
                );
            }
        };

        loadWallpaper().catch(() => undefined);

        return () => {
            isCurrent = false;
        };
    }, [getAuthHeaders, isLoaded, isSignedIn, userId]);

    const uploadWallpaper = useCallback(
        async (file: File) => {
            if (!isAvailable || typeof userId !== 'string') {
                setError('Sign in is required.');
                return;
            }

            setError(undefined);
            setIsBusy(true);
            setProgress(0);

            try {
                const processed = await processWallpaperFile(file);
                const assetId = globalThis.crypto.randomUUID();
                const pathname = getWallpaperUploadPath(
                    userId,
                    assetId,
                    processed.contentType
                );
                const headers = await getAuthHeaders();
                const blob = await upload(pathname, processed.blob, {
                    access: 'public',
                    contentType: processed.contentType,
                    handleUploadUrl: wallpaperUploadApiPath,
                    headers,
                    onUploadProgress: ({ percentage }) => {
                        setProgress(percentage);
                    },
                });
                const nextWallpaper: WallpaperAsset = {
                    contentType: processed.contentType,
                    downloadUrl: blob.downloadUrl,
                    height: processed.height,
                    pathname: blob.pathname,
                    sizeBytes: processed.blob.size,
                    uploadedAt: new Date().toISOString(),
                    url: blob.url,
                    width: processed.width,
                };
                const response = await fetch(wallpaperApiPath, {
                    body: JSON.stringify(nextWallpaper),
                    headers: {
                        ...headers,
                        'Content-Type': 'application/json',
                    },
                    method: 'POST',
                });
                const payload = await readWallpaperResponse(response);

                setWallpaper(payload.wallpaper);
                writeCachedWallpaper(userId, payload.wallpaper);
                applyWallpaper(payload.wallpaper);
            } catch (uploadError) {
                setError(
                    uploadError instanceof Error
                        ? uploadError.message
                        : 'Wallpaper upload failed.'
                );
            } finally {
                setIsBusy(false);
                setProgress(undefined);
            }
        },
        [getAuthHeaders, isAvailable, userId]
    );

    const clearWallpaper = useCallback(async () => {
        if (!isAvailable || typeof userId !== 'string') {
            setError('Sign in is required.');
            return;
        }

        setError(undefined);
        setIsBusy(true);

        try {
            const response = await fetch(wallpaperApiPath, {
                headers: await getAuthHeaders(),
                method: 'DELETE',
            });

            if (!response.ok) {
                await readWallpaperResponse(response);
            }

            setWallpaper(undefined);
            writeCachedWallpaper(userId, undefined);
            applyWallpaper(undefined);
        } catch (clearError) {
            setError(
                clearError instanceof Error
                    ? clearError.message
                    : 'Wallpaper remove failed.'
            );
        } finally {
            setIsBusy(false);
        }
    }, [getAuthHeaders, isAvailable, userId]);

    return {
        clearWallpaper,
        error,
        isAvailable,
        isBusy,
        progress,
        uploadWallpaper,
        wallpaper,
    };
};
