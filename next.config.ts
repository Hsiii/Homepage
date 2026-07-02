import type { NextConfig } from 'next';

const securityHeaders = [
    {
        key: 'Referrer-Policy',
        value: 'strict-origin-when-cross-origin',
    },
    {
        key: 'X-Content-Type-Options',
        value: 'nosniff',
    },
    {
        key: 'X-Frame-Options',
        value: 'DENY',
    },
    {
        key: 'Permissions-Policy',
        value: 'camera=(), microphone=(), geolocation=(self)',
    },
] as const;

const nextConfig: NextConfig = {
    async headers() {
        return [
            {
                headers: [...securityHeaders],
                source: '/:path*',
            },
        ];
    },
    poweredByHeader: false,
    reactStrictMode: true,
};

export default nextConfig;
