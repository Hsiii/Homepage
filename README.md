# Homepage

A personal browser homepage for fast bookmark access across browsers with instant search.

![Homepage](https://raw.githubusercontent.com/Hsiii/homepage/main/docs/demo.webp)

## Use

- Set your browser homepage as <https://homepage.hsichen.dev>.
- Press <kbd>Space</kbd> to start searching, and <kbd>Enter</kbd> to
  open.
- Sign in to upload a wallpaper; guests keep the default mountain scene.
- Click the location control to sync the nearest Taiwan weather and AQI station.

## Privacy

Core features work without an account. Location is requested only after clicking the
location control. The selected Taiwan location is stored in a same-site cookie for
SSR and mirrored in browser storage with weather/AQI caches. Guest bookmarks stay in
browser local storage; signed-in bookmarks sync to Neon under the Clerk account.
Wallpaper sync requires sign-in and uses Clerk, Neon, and Vercel Blob.

## Development

### Quick Start

Requires Node.js 22+ and Bun.

```bash
git clone https://github.com/Hsiii/homepage.git
cd homepage
bun i
bun dev
```

### Stack Map

- **Runtime:** Bun, Next.js 16 App Router, React 19, TypeScript, Turbopack in dev,
  Node.js standalone server in production.
- **SSR:** Hydrates location, weather, AQI, Clerk state, and signed-in wallpaper.
- **Auth:** Clerk auth
- **Storage:** Neon bookmarks and wallpaper metadata, Vercel Blob image storage.
- **External data:** OpenWeatherMap or Open-Meteo for weather; Taiwan MOENV for AQI.

### Oracle Deployment

Production runs on the Oracle VM behind Caddy. Every push to `main` publishes
`ghcr.io/hsiii/homepage` for Linux AMD64 and ARM64. Dependencies and standalone
output are built inside the target Linux image, so production never receives
native modules from the development Mac.

Changes reach `main` through a pull request. Deploy from a clean local `main`
that matches `origin/main`; the command waits for that commit's image and asks
the Oracle platform to pull it. It never pushes code:

```bash
bun run deploy
```

The container listens on `0.0.0.0:3102` and exposes `/api/health` for health
checks.
