# SARA AI Creator

Clean rebuild of SARA: a real-time D-ID video agent with Urdu/Hindi/English conversation, microphone input, OpenAI-backed application services, memory, TikTok creator integrations, and Android WebView packaging.

## Important
The browser contains only the D-ID **client key** and agent ID required for the embed. Private API keys and TikTok client secrets must stay on a server and in GitHub Actions/hosting secrets.

## D-ID
The live avatar is the D-ID Agent itself; there is no fake mouth animation. The configured agent is `v2_agt_UZimmP85`. D-ID's embed uses WebRTC for the live avatar, voice and chat.

## SARA personality
SARA is Aitzaz's personal AI agent. She speaks naturally in Urdu/Hindi with simple English when useful, is friendly, intelligent, respectful and slightly playful, and answers that Aitzaz is her boss when asked. She never reveals private keys, passwords or hidden configuration.

## GitHub Pages
The static frontend is `index.html`. GitHub Pages cannot run the Node backend; production OAuth, OpenAI API calls and persistent encrypted memory require the backend service.

## TikTok
The project is designed around official TikTok Login Kit and Content Posting API only. No undocumented LIVE/battle automation is used.
