# LAN and offline operation

Namakdan can serve menus and orders without internet when the browser can still
reach the local Next.js server, Go API, and database over restaurant WiFi.
This is LAN operation, not disconnected-device operation.

## Windows LAN setup (HTTP development mode)

Use the PC's WiFi/LAN IPv4 address (for example `192.168.1.20`) and keep the
backend out of production mode. Set these values in the environment of **both**
processes, or in the `.env` loader used by your terminals:

```powershell
$env:ENV = "development"
$env:PUBLIC_URL = "http://192.168.1.20:3000"
$env:API_URL = "http://192.168.1.20:8080/api/v1"
$env:INTERNAL_API_URL = "http://127.0.0.1:8080/api/v1"
$env:ALLOWED_ORIGINS = "http://192.168.1.20:3000"
$env:COOKIE_DOMAIN = ""
$env:COOKIE_SECURE = "auto"
```

In the backend directory, run `go run .\cmd\app` (the API binds to all
interfaces on port 8080 by default; `PORT` changes that port). In the frontend
directory, run `npm.cmd run dev -- --hostname 0.0.0.0` (port 3000). The browser
API URL must use the PC's LAN IP, not `localhost`; `INTERNAL_API_URL` is only
for server-side Next.js calls from that same PC. Host-only cookies
(`COOKIE_DOMAIN` empty) work across these ports. `COOKIE_SECURE=auto` follows
HTTPS and retains Secure cookies in production; an explicit `false` is accepted
only outside production.

Allow inbound TCP 3000 and 8080 on the Windows **Private** firewall profile.
Keep database port 5432 local; do not expose it to WiFi clients. Clients must be
on the same LAN, and WiFi client isolation must be off.

To test, keep WiFi enabled but disconnect the router's WAN/internet. On a phone
connected to that WiFi, open `http://192.168.1.20:3000/t/<table-code>`, load a
menu, submit a cash/manual order, then sign in as staff and check the order.
The browser's API requests should go to `192.168.1.20:8080`; ordering must not
depend on an internet provider.

## Dependency audit and offline behavior

- Fonts/icons — `frontend/src/app/layout.tsx`, `frontend/public/fonts/`,
  `frontend/public/images/` — **needed offline: yes; fixed/already local**:
  DM Sans and DM Serif Display use bundled woff2 files; no Google Fonts import,
  CDN styles/scripts, CAPTCHA, social embed, or map-tile SDK was found.
  **TODO:** Vazirmatn is not present locally. Obtain
  `Vazirmatn[wght].woff2` and put it at
  `frontend/public/fonts/vazirmatn/Vazirmatn[wght].woff2`; add its `@font-face`
  in `frontend/src/app/globals.css`. No download was made.
- API and realtime — `frontend/src/config/publicConfig.ts`,
  `frontend/src/hooks/useSSEEvents.ts`, `backend/cmd/app/main.go` —
  **needed offline: yes; fixed/configurable**: API base, CORS allowlist and
  cookie domain are env-driven; set the LAN values above. SSE is served by the
  local backend and reconnects on interruption; there is no WebSocket
  dependency.
- Telemetry — `frontend/src/lib/sentry/config.ts`,
  `backend/internal/observability/config.go`, `backend/cmd/app/main.go` —
  **needed offline: no; fixed**: Sentry and PostHog are disabled unless their
  `*_ENABLED=true` flag is explicitly set. Frontend PostHog is not initialized.
- Customer image URLs — `frontend/src/config/imageOrigins.json`,
  `frontend/src/components/guest/` — **needed offline: no**: external menu
  image hosts will not load. Use local uploads (`STORAGE_DRIVER=local`) for
  images needed in a LAN-only restaurant; local icons and bundled assets work.
- Exchange rates / Google services — `backend/internal/services/exchange_rate.go`,
  `backend/internal/services/google_places.go`,
  `backend/internal/services/translation.go` — **needed offline: no**:
  Coinbase refresh is bounded and cached rates may remain usable; stale/missing
  rates can prevent conversion/crypto quotes. Google Places lookups and
  Google Translate fail/are unavailable; enter addresses and translations
  manually.
- AI — `backend/internal/llm/`, `backend/internal/server/ai_waiter_handler.go` —
  **needed offline: no**: hosted LLM calls cannot answer. Configure a local
  OpenAI-compatible endpoint such as Ollama on the LAN and pre-load its model,
  or leave AI disabled. AI requests are separate from order submission.
- Auth and messaging — `backend/internal/auth/`, `backend/internal/emails/`,
  `backend/internal/plugins/telegram/` — **needed offline: mixed**: existing
  local email/password accounts work; Google OAuth needs internet, and
  the default `log` email provider does not deliver messages. The existing
  durable email outbox retries failed sends when a real provider/LAN SMTP relay
  is configured. Telegram/WhatsApp notifications need their internet
  services; no active SMS gateway was found. Use existing local accounts and
  configure a LAN SMTP relay for mail.
- Payments — `backend/internal/plugins/{stripe,paypal,mercadopago}/`,
  `backend/internal/blockchain/` — **needed offline: no**: online cards,
  provider redirects/webhooks, and USDC chain verification cannot settle
  without their providers/RPC. Offer cash or manually recorded payment; do not
  mark an unverified online payment as paid.
- PWA/service worker — `frontend/src/providers/PwaInstallProvider.tsx`,
  `frontend/public/sw.js` — **needed offline: partial**: the worker is
  registered when supported and serves a small cached offline HTML page for
  failed navigations; it does not cache the app/API or queue orders. Browsers
  do not allow service workers on plain HTTP LAN IPs (only localhost is a
  secure context), so this URL will not install/work as a PWA. Options are
  HTTPS with a certificate trusted by each device, or a local hostname served
  over trusted HTTPS. Neither is configured here.

Production preflight intentionally permits HTTP only on loopback; a plain-HTTP
LAN install must use development mode as above. Use trusted HTTPS before
exposing the service beyond a private, controlled LAN.
