# SARA — Real-Time AI Creator

SARA is a browser dashboard for a real-time D-ID talking avatar plus a server-side foundation for memory, TikTok OAuth, and live-host sessions.

## What is included
- `index.html` — GitHub Pages test dashboard.
- `server.js` — local Node server for memory, D-ID config, live sessions and TikTok OAuth foundation.
- `public/index.html` — local-server frontend.
- `data/sara-store.json` — local memory store template.
- `.env.example` — safe configuration template. Never commit `.env` or TikTok secrets.
- `.github/workflows/pages.yml` — GitHub Pages deployment.

## GitHub Pages
The Pages site is static. D-ID client keys are entered in the browser and stored locally; TikTok client secrets stay server-side. GitHub Pages cannot run the Node backend.

## Local run
1. Copy `.env.example` to `.env`.
2. Put the D-ID client key in `.env` if testing the local server.
3. Run `npm start`.
4. Open `http://localhost:3000`.

## D-ID
The configured Agent ID is the user-supplied SARA agent. The actual avatar/presenter is controlled by the D-ID Agent configuration; the public page does not fake a mouth or static talking animation.

## TikTok
The repository contains an OAuth foundation only. TikTok approval/scopes and server-side token exchange are required before production posting or analytics automation. Never publish the TikTok client secret.
