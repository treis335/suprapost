# SupraPost

**AI-powered social content automation, paid for per post in SUPRA.**

SupraPost generates posts with AI (DeepSeek), self-critiques them for
quality, and publishes automatically — currently to Telegram, with
Twitter/X and Instagram planned next. The whole engine runs 24/7 on the
server, completely independent of whether a browser is open or your
computer is on.

You configure your content profile and posting cycle once from the
dashboard. From then on, the server takes over: it generates, scores,
charges SUPRA, and publishes on its own schedule.

## Architecture

```
suprapost/
├── backend/
│   ├── src/
│   │   ├── auth.js          → wallet sign-in: nonce, Ed25519 verify, JWT
│   │   ├── channels/        → one publisher module per platform
│   │   │   ├── index.js     → registry + broadcastToChannels(text, perUserChannels)
│   │   │   ├── telegram.js  → active, per-user bot token + chat id
│   │   │   ├── twitter.js   → stub, will use per-user OAuth tokens
│   │   │   ├── instagram.js → stub, will use per-user OAuth tokens
│   │   │   └── discord.js   → stub, per-user webhook URL
│   │   ├── engine.js        → generation + scoring + broadcast cycle (per user)
│   │   ├── scheduler.js      → 24/7 cron loop, one timer per wallet address
│   │   ├── deepseek.js       → text generation
│   │   ├── db.js             → JSON file persistence, keyed by wallet address
│   │   └── server.js         → Express API + serves the built frontend
│   └── data/db.json         → all state lives here (gitignored)
└── frontend/
    ├── src/
    │   ├── wallet.js  → StarKey connect + sign-in-with-wallet flow
    │   └── App.jsx    → dashboard (setup, channels, wallet, history) + login screen
    └── ...
```

The backend serves the built frontend directly — a single process, a
single port, no CORS issues.

### How sign-in works (no passwords, no emails)

A user's Supra wallet address **is** their account. There's no
separate accounts table, no email/password form, nothing to leak in a
breach beyond what's already public on-chain.

```
1. Frontend: user clicks "Connect Wallet"
   -> window.starkey.supra.connect() -> returns their address

2. Frontend: POST /api/auth/nonce { address }
   -> backend generates a one-time message, e.g.
      "Sign in to SupraPost\nWallet: 0x...\nNonce: <uuid>"

3. Frontend: window.starkey.supra.signMessage(message)
   -> wallet extension prompts the user, returns a signature
   -> this is a free signature, NOT a transaction — no gas, no on-chain action

4. Frontend: POST /api/auth/verify { address, signature }
   -> backend verifies the Ed25519 signature really came from that
      address's private key, then issues a JWT session token

5. Frontend: stores the JWT, sends it as "Authorization: Bearer <token>"
   on every subsequent request. The backend uses it to look up
   db.forUser(address) — so every user's settings, wallet balance,
   channels, and post history are fully isolated from each other.
```

See `backend/src/auth.js` for the implementation and
`frontend/src/wallet.js` for the client side. One thing worth knowing:
`auth.js` currently trusts that the public key supplied alongside the
signature corresponds to the claimed address — tightening this against
`supra-l1-sdk`'s own address-derivation helper is flagged as a TODO in
that file, worth doing before this goes anywhere near real funds.

### Adding a new social network

Every channel module exports the same shape:

```js
{ id: "platform_name", isConfigured(creds), publish(text, creds) }
```

`creds` is that specific user's credentials for the platform — for
Telegram/Discord, pasted directly into the Setup → Channels card; for
Twitter/Instagram (once implemented), per-user OAuth tokens obtained
through a proper authorization flow. To add a real platform: write a
new file in `backend/src/channels/`, register it in
`channels/index.js`, and (for non-OAuth platforms) add its fields to
`CHANNEL_FIELDS` in `frontend/src/App.jsx`. It automatically shows up
as a configurable row in the dashboard — no other frontend changes
needed.

## Quick start

```bash
npm run install:all
```

This installs both backend and frontend dependencies in one go.

### Configure your API keys

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```
DEEPSEEK_API_KEY=sk-...
TELEGRAM_BOT_TOKEN=123456:ABC-DEF...
TELEGRAM_CHAT_ID=987654321
PORT=3001
```

**Finding your `TELEGRAM_CHAT_ID`:**
1. Send any message to your bot on Telegram
2. Open in your browser: `https://api.telegram.org/bot<YOUR_TOKEN>/getUpdates`
3. Look for `"chat":{"id": 123456789, ...}` — that number is your chat ID

### Run everything together (local production mode)

```bash
npm start
```

This builds the frontend and starts the backend, which then serves
everything on a single port:

```
http://localhost:3001
```

You'll land on a wallet sign-in screen. Click "Connect Wallet" — this
requires the [StarKey browser extension](https://starkey.app) to be
installed. Approve the connection, then sign the one-time message it
shows you (this is free — it never costs gas or triggers an on-chain
transaction). You're then in: Setup, Generate, Automation, History, all
scoped to your wallet address.

### Run in development mode (hot reload)

```bash
npm run dev
```

This runs backend and frontend together (via `concurrently`), each in
its own colored terminal output. The frontend runs at
`http://localhost:5173` with hot-reload, and automatically proxies
`/api/*` calls to the backend at `localhost:3001` (configured in
`frontend/vite.config.js`).

Prefer two separate terminals?

```bash
# terminal 1
npm run dev:backend

# terminal 2
npm run dev:frontend
```

## How 24/7 automation works

When you hit "Start Automation" in the dashboard:

1. The **backend** (not the browser) takes full control
2. On each cycle (e.g. every 6h), the server independently: charges
   SUPRA, generates a post via DeepSeek, self-critiques it, and
   publishes to Telegram
3. Everything is persisted to `backend/data/db.json`
4. If the server restarts while automation was running, it resumes on
   its own (see `server.js`, "Resuming automation")
5. You can close the browser entirely — as long as the **server keeps
   running somewhere**, automation continues

Right now you run the server on your own machine, so it only works
while the `npm start` terminal stays open. The next step is deploying
to a VPS so this runs truly 24/7, independent of your computer.

## API reference

| Method | Route | Auth | Purpose |
|---|---|---|---|
| POST | `/api/auth/nonce` | public | Get a one-time message for a wallet address to sign |
| POST | `/api/auth/verify` | public | Verify a signed message, get back a session JWT |
| GET | `/api/auth/me` | required | Confirm the current session's wallet address |
| GET | `/api/settings` | required | Read the content profile |
| POST | `/api/settings` | required | Update niche, tone, audience, etc. |
| GET | `/api/channels` | required | List all platforms and their connected/enabled state |
| POST | `/api/channels/:id` | required | Toggle a channel and/or save its credentials |
| GET | `/api/wallet` | required | Read SUPRA balance |
| POST | `/api/wallet/topup` | required | Add balance (simulated for now) |
| POST | `/api/generate` | required | Generate one post (`{autoPost: true/false}`) — broadcasts to all enabled channels if `autoPost` is true |
| POST | `/api/post` | required | Publish a specific text to every enabled channel |
| GET | `/api/automation` | required | Current automation state |
| POST | `/api/automation/settings` | required | Set cycle length (seconds) and auto-approve |
| POST | `/api/automation/start` | required | Start the 24/7 engine for this user |
| POST | `/api/automation/stop` | required | Stop it |
| GET | `/api/posts` | required | Post history (each post includes per-channel `results`) |
| DELETE | `/api/posts` | required | Clear history |
| GET | `/api/stats` | required | General stats |
| GET | `/api/health` | public | Server liveness check |

"required" routes need an `Authorization: Bearer <jwt>` header obtained
from the wallet sign-in flow above.

## Roadmap

- [x] DeepSeek for text generation
- [x] Telegram for test publishing
- [x] 24/7 backend scheduler
- [x] Frontend + backend unified in one project, one port
- [x] Multi-channel broadcast architecture (toggle channels on/off, one engine fans out to all of them)
- [x] Refined responsive design (mobile / tablet / desktop tiers)
- [x] Wallet-based multi-user auth (StarKey sign-in, no passwords) with per-user data isolation
- [x] Per-user channel credentials (each user pastes their own Telegram bot / Discord webhook)
- [ ] Tighten address↔public-key derivation check in auth.js (currently trusts the supplied public key matches the claimed address — fine for local testing, not for production)
- [ ] Real Twitter/X API v2 integration (OAuth 2.0, per-user tokens) — stub already in place
- [ ] Real Instagram Graph API integration — stub already in place
- [ ] Real Discord webhook integration — stub already in place
- [ ] Real Supra SDK integration (on-chain transactions instead of simulated balance)
- [ ] Migrate from `data/db.json` to Postgres
- [ ] Deploy to a VPS (Railway, Render, or self-hosted) for true 24/7 uptime, independent of your own machine, reachable from mobile

## Tech stack

Node.js · Express · React · Vite · DeepSeek API · Telegram Bot API ·
Supra blockchain (planned)

## License

MIT
