interface BrowserGlobal {
    window?: Window;
}

export const isBrowser = (): boolean =>
    (globalThis as unknown as BrowserGlobal).window !== undefined;
