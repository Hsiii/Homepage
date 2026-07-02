# [Homepage](https://homepage.hsichen.dev)

A fast personal browser homepage for search, bookmarks, weather, and quick daily links.

![Homepage](https://raw.githubusercontent.com/Hsiii/homepage/main/docs/demo.webp)

## What it does

- Opens with the current time, local weather, and Taiwan AQI at a glance.
- Searches saved bookmarks instantly, with Google fallback when no bookmark matches.
- Keeps bookmark groups close by in a hoverable, lockable side panel and a mobile-friendly drawer.
- Supports slash commands for repeat routines, including opening daily feed tabs.
- Lets signed-in users upload a personal wallpaper while keeping the default mountain scene for guests.

## Development

### Current stack

- **Runtime and package manager:** Bun.
- **Frontend:** React 19, TypeScript, Vite, and component-level CSS files.
- **Icons:** lucide-react.
- **Auth and personalization:** Clerk for optional sign-in and user identity.
- **Storage:** Neon Postgres for wallpaper records and Vercel Blob for wallpaper files.
- **API layer:** Vercel Node functions in `api/`, with Vite dev middleware for weather and AQI.
- **External data:** OpenWeatherMap for weather and Taiwan MOENV AQI data.
- **Deployment:** Vercel.

### Setup

Requires Node.js 20.x and Bun.

```bash
git clone https://github.com/Hsiii/homepage.git
cd homepage
bun i
bun dev
```

The app runs at `http://localhost:3000` by default.

### Optional environment

Copy `.env.example` to `.env.local` and fill only the services you want locally:

- `OPENWEATHERMAP_API_KEY` for weather.
- `MOENV_API_KEY` for AQI.
- `VITE_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, and `CLERK_JWT_KEY` for sign-in.
- `BLOB_READ_WRITE_TOKEN`, `DATABASE_URL`, `DATABASE_URL_UNPOOLED`, and `NEON_BRANCH` for wallpaper persistence.

### Production

```bash
bun run build
bun run preview
```
