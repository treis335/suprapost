# SupraPost

**AI-powered social media automation, paid for per post in SUPRA.**

SupraPost generates posts with AI (DeepSeek for text, ModelsLab for
images), self-critiques them for quality, and publishes automatically
to Telegram, Twitter/X, Discord and Instagram. The engine runs 24/7 on
the server — completely independent of whether a browser is open or
your computer is on.

You connect your wallet, set up your content profile and channels
once, then either generate posts manually or turn on Automation and
let the server take over: it generates, scores, charges SUPRA, and
publishes on its own schedule.

## Features

- **Wallet-based login** — sign in with your Supra wallet (StarKey),
  no passwords or emails. Each wallet address is its own isolated
  account.
- **AI text generation** — DeepSeek writes the post based on your
  niche, tone, audience, and example posts; a self-critique step
  scores it before it goes out.
- **AI image generation** — ModelsLab generates an image matching the
  post, in a chosen style, or you can upload your own image instead.
- **Multi-channel publishing** — Telegram, Twitter/X, Discord and
  Instagram, each with its own per-user credentials. Toggle any
  channel on/off; a **Test** button sends a real test post to confirm
  the connection works.
- **Manual Compose** — pick text mode (write it yourself or generate
  with AI), image mode (upload or generate), which channels to post
  to, a live per-platform preview, and publish with one click.
- **Automation** — pick a posting interval (30 seconds up to once a
  day), turn it on, and the backend posts on its own schedule even
  with the browser closed. The countdown is persisted server-side, so
  it survives restarts and page reloads.
- **SUPRA wallet & payments** — real, non-custodial SUPRA deposits via
  StarKey, plus a simulated top-up mode for local dev. A low-balance
  banner warns before automation would stall. Every
  post/generation deducts a fixed SUPRA cost from the balance.
- **Onboarding checklist** — guides a new user through wallet →
  content profile → channels → first post.
- **History** — every generated post with per-channel publish status,
  plus full deposit history.
- **Responsive UI** — desktop (sidebar + content + overview rail),
  tablet, and mobile (bottom tab bar) layouts.
- **Fully English, non-technical UI** — no API keys, env vars, or
  backend jargon ever shown to the end user.

## Architecture

```
suprapost/
├── backend/
│   ├── src/
│   │   ├── auth.js          → wallet sign-in: nonce, Ed25519 verify, JWT
│   │   ├── channels/        → one publisher module per platform
│   │   │   ├── index.js     → registry + publishToChannels(payload, channelsState, targetIds)
│   │   │   ├── telegram.js  → bot token + chat id, text/image/both
│   │   │   ├── twitter.js   → OAuth 1.0a user tokens, text/image via twitter-api-v2
│   │   │   ├── instagram.js → Graph API, needs a public image URL + access token
│   │   │   └── discord.js   → webhook URL, text/image
│   │   ├── engine.js        → generation + self-critique + broadcast cycle (per user)
│   │   ├── scheduler.js     → 24/7 timer loop, one timer per wallet address, persists next-run time
│   │   ├── deepseek.js      → AI text generation + self-critique scoring
│   │   ├── imageGen.js      → AI image generation (ModelsLab) + upload handling
│   │   ├── supraClient.js   → reads on-chain balance / transfers from the Supra RPC
│   │   ├── deposits.js      → non-custodial deposit intent + confirmation flow
│   │   ├── db.js            → JSON file persistence, keyed by wallet address
│   │   └── server.js        → Express API + serves the built frontend
│   └── data/db.json         → all state lives here (gitignored)
└── frontend/
    ├── src/
    │   ├── wallet.js         → StarKey connect + sign-in-with-wallet flow
    │   ├── payment.js        → StarKey deposit transaction (multi-format fallback)
    │   ├── theme.js           → design tokens (the "Pulse" design system)
    │   ├── App.jsx            → main app shell: tabs, layouts, state, all API calls
    │   ├── components/
    │   │   ├── ui/            → Card, Btn, Pill, Switch, Inputs, ImagePanel, DepositModal, Misc (checklist, low-balance banner), etc.
    │   │   ├── layout/        → Sidebar, TopBar, MobileNav, RightPanel
    │   │   └── channels/      → ChannelCard
    │   └── pages/             → SetupPage, ChannelsPage, ComposePage, AutomationPage,
    │                            GeneratePage, HistoryPage, DepositPage
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

### How deposits work (non-custodial)

1. Frontend requests a deposit intent (`POST /api/wallet/deposit/intent`)
   for a chosen SUPRA amount — the backend returns the platform's
   deposit address and a fingerprinted exact amount to send.
2. The user's StarKey wallet sends that exact amount directly,
   wallet-to-wallet (`frontend/src/payment.js` tries several StarKey
   transaction formats until one works).
3. The frontend sends the resulting transaction hash to
   `POST /api/wallet/deposit/confirm`; the backend verifies the
   amount/recipient on-chain via the Supra RPC and credits the
   internal balance. The unique fingerprinted amount prevents
   double-crediting.
4. The backend also polls `SUPRA_DEPOSIT_ADDRESS` every 20s (if set)
   to catch deposits even if the confirm call never arrives.

Set `ALLOW_SIMULATED_TOPUP=true` in `backend/.env` for local dev to
add balance without any real transaction, instead of this flow.

### Adding a new social network

Every channel module exports the same shape:

```js
{ id: "platform_name", isConfigured(creds), publish({ text, imagePath, mode }, creds) }
```

`creds` is that specific user's credentials for the platform, entered
in the Channels tab. To add a new platform: write a new file in
`backend/src/channels/`, register it in `channels/index.js`, and add
its credential fields to `CHANNEL_INFO` in
`frontend/src/pages/ChannelsPage.jsx`. It automatically shows up as a
configurable row in the dashboard.

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

Edit `backend/.env` — see the file for full comments on each variable:

```
DEEPSEEK_API_KEY=sk-...              # required for AI text generation
MODELSLAB_API_KEY=...                # required for AI image generation
SUPRA_RPC_URL=https://rpc-mainnet.supra.com
ALLOW_SIMULATED_TOPUP=false          # true = free dev top-ups, no real tx
SUPRA_DEPOSIT_ADDRESS=...            # your wallet, to receive real deposits
JWT_SECRET=change-me-to-a-long-random-string
PORT=3001
```

Per-channel credentials (Telegram bot token, Discord webhook, Twitter
API keys, Instagram access token) are entered per-user in the
**Channels** tab of the app itself — not in `.env`.

**Finding your Telegram chat ID:**
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
transaction). You're then in: Setup, Channels, Compose, Automation,
History, all scoped to your wallet address.

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
2. On each cycle (from every 30 seconds up to once a day, your
   choice), the server independently: charges SUPRA, generates a
   post (and optionally an image) via AI, self-critiques it, and
   publishes to every enabled channel
3. Everything is persisted to `backend/data/db.json`, including the
   next-run timestamp — so the "next post in" countdown stays
   accurate across server restarts and page reloads
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
| GET | `/api/wallet` | required | Read SUPRA balance |
| POST | `/api/wallet/topup` | required | Add balance (dev only, `ALLOW_SIMULATED_TOPUP=true`) |
| GET | `/api/wallet/deposits` | required | Deposit history |
| POST | `/api/wallet/deposit/intent` | required | Start a real deposit — returns address + exact amount to send |
| POST | `/api/wallet/deposit/confirm` | required | Confirm a sent transaction hash and credit the balance |
| POST | `/api/generate` | required | Generate one post (`{autoPost, mode, imageStyle, ...}`) |
| GET | `/api/channels` | required | List all platforms and their connected/enabled state |
| POST | `/api/channels/:id` | required | Toggle a channel and/or save its credentials |
| POST | `/api/channels/:id/test` | required | Send a real test post to that channel |
| POST | `/api/post` | required | Publish text/image to specific (or all enabled) channels |
| GET | `/api/image/styles` | public | List available AI image styles |
| POST | `/api/image/generate` | required | Generate an image for a given post text |
| POST | `/api/image/upload` | required | Upload your own image instead of generating one |
| GET | `/api/automation` | required | Current automation state, incl. next run time |
| POST | `/api/automation/settings` | required | Set cycle length, auto-approve, mode, image style |
| POST | `/api/automation/start` | required | Start the 24/7 engine for this user |
| POST | `/api/automation/stop` | required | Stop it |
| GET | `/api/posts` | required | Post history (each post includes per-channel `results`) |
| DELETE | `/api/posts` | required | Clear history |
| GET | `/api/stats` | required | General stats |
| GET | `/api/health` | public | Server liveness check |

"required" routes need an `Authorization: Bearer <jwt>` header obtained
from the wallet sign-in flow above.

## Roadmap

- [x] DeepSeek for text generation + self-critique scoring
- [x] ModelsLab AI image generation, plus manual upload
- [x] Telegram, Twitter/X, Discord, Instagram publishing
- [x] Per-channel "Test" button that sends a real test post
- [x] 24/7 backend scheduler with persisted countdown (survives restarts/reloads)
- [x] Frontend + backend unified in one project, one port
- [x] Multi-channel broadcast architecture (toggle channels on/off, one engine fans out to all of them)
- [x] Refined responsive design (mobile / tablet / desktop tiers)
- [x] Wallet-based multi-user auth (StarKey sign-in, no passwords) with per-user data isolation
- [x] Per-user channel credentials (each user pastes their own tokens/webhooks)
- [x] Real, non-custodial SUPRA deposits via StarKey with on-chain confirmation
- [x] Fully English UI, end-user-facing language only (no technical/config jargon)
- [x] Onboarding checklist + low-balance banner
- [x] Per-platform post preview in Compose
- [ ] Tighten address↔public-key derivation check in auth.js (currently trusts the supplied public key matches the claimed address — fine for local testing, not for production)
- [ ] Migrate from `data/db.json` to Postgres
- [ ] Deploy to a VPS (Railway, Render, or self-hosted) for true 24/7 uptime, independent of your own machine, reachable from mobile

## Tech stack

Node.js · Express · React · Vite · DeepSeek API · ModelsLab (image gen) ·
Telegram Bot API · Twitter API v2 · Discord Webhooks · Instagram
Graph API · Supra blockchain (StarKey wallet, on-chain deposits)

## License

MIT
