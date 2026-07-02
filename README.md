# [Homepage](https://homepage.hsichen.dev)

A personal browser homepage for bookmark search, weather, AQI, routines, and
signed-in wallpaper personalization.

![Homepage](https://raw.githubusercontent.com/Hsiii/homepage/main/docs/demo.webp)

## Use

- Set `https://homepage.hsichen.dev` as the browser homepage or new tab page.
- Press <kbd>Space</kbd> to search, arrow keys to choose, and <kbd>Enter</kbd> to
  open.
- Type `/feeds` to open the daily feed set.
- Use the bookmark panel/drawer for saved links.
- Sign in to upload a wallpaper; guests keep the default mountain scene.
- Click the location control to sync the nearest Taiwan weather and AQI station.

## Privacy

Core features work without an account. Location is requested only after clicking the
location control. The selected Taiwan location is stored in a same-site cookie for
SSR and mirrored in browser storage with weather/AQI caches. Wallpaper sync requires
sign-in and uses Clerk, Neon, and Vercel Blob.

## Development

Architecture takeaway: this is still a client-heavy homepage, but Next now owns first
paint, secrets, auth boundaries, and persistence. Vercel serves the app; Cloudflare
manages DNS.

### Stack Map

- **Runtime:** Bun, Next.js 16 App Router, React 19, TypeScript, Turbopack in dev.
- **UI:** Client components/hooks, component CSS, shared CSS tokens, Quicksand via
  `next/font`, and `lucide-react` icons.
- **SSR:** Dynamic `src/app/page.tsx` hydrates location, weather, AQI, Clerk state,
  and signed-in wallpaper.
- **API/server:** Route handlers in `src/app/api/`; server-only weather/AQI and
  wallpaper modules in `src/server/`.
- **Auth/storage:** Optional Clerk auth, Neon wallpaper metadata, Vercel Blob image
  storage.
- **External data:** OpenWeatherMap or Open-Meteo for weather; Taiwan MOENV for AQI.
- **Security:** Security headers in `next.config.ts`, Clerk middleware in
  `src/proxy.ts`, and user-scoped validated wallpaper uploads.

### Setup

Requires Node.js 20.x and Bun.

```bash
git clone https://github.com/Hsiii/homepage.git
cd homepage
bun i
bun dev
```

The app runs at `http://localhost:3000` by default.

### Environment

Copy `.env.example` to `.env.local` and fill only what you need:

- Weather: `OPENWEATHERMAP_API_KEY` optional; otherwise Open-Meteo is used.
- AQI: `MOENV_API_KEY`.
- Auth: `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`.
- Wallpaper: `BLOB_READ_WRITE_TOKEN`, `DATABASE_URL`.
- Neon/Vercel metadata: `DATABASE_URL_UNPOOLED`, `NEON_BRANCH`.

Legacy `VITE_*` weather, AQI, and Clerk variables still work during rollout.

### Commands

```bash
bun dev       # Local Next dev server
bun run lint  # ESLint
bun run build # Production build
bun run preview
```

### Production

Vercel serves the Next app. Cloudflare owns `hsichen.dev` DNS. Clerk CNAMEs under
`homepage.hsichen.dev` must stay DNS-only: `accounts`, `clerk`, `clk._domainkey`,
`clk2._domainkey`, and `clkmail`.

## Troubleshooting

If weather or AQI is missing, check the relevant API key or upstream API. If location
does not update, re-enable browser geolocation permission and sync again. If
wallpaper controls are unavailable, sign in and confirm Clerk, Neon, and Vercel Blob
environment variables are configured.
