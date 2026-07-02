/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY?: string;
    readonly VITE_CLERK_PUBLISHABLE_KEY?: string;
}

declare module '*.webp' {
    const value: string;
    export default value;
}
