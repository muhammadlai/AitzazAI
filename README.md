# SARA AI Creator v2

SARA is a production-oriented AI creator foundation: real-time D-ID avatar, OpenAI conversation brain, persistent SQLite memory, TikTok OAuth/creator tools, responsive web dashboard, Docker backend and Android packaging.

## What is included

- Real D-ID WebRTC avatar embed and official runtime methods/events.
- Voice/microphone controls, speaking button and fullscreen.
- OpenAI Responses API with GPT-5.6 Luna by default.
- Persistent conversation memory in SQLite.
- Urdu, Hindi, Roman Urdu and English personality/system instructions.
- TikTok OAuth state validation, server-side token exchange and encrypted token storage.
- TikTok creator-info endpoint and official Content Posting API URL flow.
- Responsive creator dashboard with chat, memory, TikTok and settings panels.
- Dockerfile for backend hosting.
- GitHub Pages static deployment and Android APK workflow.

## Security

Only the D-ID client key and agent ID are exposed to the browser. OpenAI and TikTok secrets stay server-side. TikTok access/refresh tokens are encrypted when `TIKTOK_TOKEN_ENCRYPTION_KEY` is configured.

## Deployment

GitHub Pages can host the static UI, but it cannot run Node.js. For the complete app, deploy `server.js`/`Dockerfile` to a Node/Docker host and set the environment variables from `.env.example`. Set `SARA_CORS_ORIGIN` to the exact frontend origin when frontend and backend are on different domains.

## D-ID requirement

The configured agent must be healthy/ready in D-ID Studio and its client key must allow the deployed domain. The embed itself uses D-ID WebRTC; it does not fake lip-sync in the browser.

## TikTok requirement

Only official TikTok APIs are used. Direct posting requires the appropriate approved scope. TikTok states that unaudited clients are restricted to private viewing for Direct Post until the client passes audit. Undocumented LIVE/battle automation is intentionally not included.
