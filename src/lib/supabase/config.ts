const normalizePublicSetting = (
    value: string | undefined
): string | undefined => {
    const normalizedValue = value?.trim();

    return normalizedValue === undefined || normalizedValue === ''
        ? undefined
        : normalizedValue;
};

const readSupabaseUrl = (): string | undefined =>
    normalizePublicSetting(process.env.NEXT_PUBLIC_SUPABASE_URL);

const readSupabasePublishableKey = (): string | undefined =>
    normalizePublicSetting(process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export const getSupabaseConfig = (): {
    publishableKey: string;
    url: string;
} => {
    const url = readSupabaseUrl();
    const publishableKey = readSupabasePublishableKey();

    if (url === undefined || publishableKey === undefined) {
        throw new Error('Supabase is not configured.');
    }

    return { publishableKey, url };
};

export const isSupabaseConfigured = (): boolean =>
    readSupabaseUrl() !== undefined &&
    readSupabasePublishableKey() !== undefined;
