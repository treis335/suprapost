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
│   │   ├── channels/        → one publisher module per platform
│   │   │   ├── index.js     → registry + broadcastToChannels()
│   │   │   ├── telegram.js  → active
│   │   │   ├── twitter.js   → stub, not implemented yet
│   │   │   ├── instagram.js → stub, not implemented yet
│   │   │   └── discord.js   → stub, not implemented yet
│   │   ├── engine.js        → generation + scoring + broadcast cycle
│   │   ├── scheduler.js      → 24/7 cron loop
│   │   ├── deepseek.js       → text generation
│   │   ├── db.js             → JSON file persistence
│   │   └── server.js         → Express API + serves the built frontend
│   └── data/db.json         → all state lives here (gitignored)
└── frontend/    → React/Vite dashboard (setup, channels, wallet, history)
```

The backend serves the built frontend directly — a single process, a
single port, no CORS issues.

### Adding a new social network

Every channel module exports the same shape:

```js
{ id: "platform_name", isConfigured(), publish(text) }
```

To add a real platform: write a new file in `backend/src/channels/`,
register it in `channels/index.js`, and add its env vars to
`.env.example`. It automatically shows up as a toggleable row in the
dashboard's Setup → Channels card — no frontend changes needed.

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

You'll see the full dashboard immediately — Setup, Generate, Automation,
History.

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

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/settings` | Read the content profile |
| POST | `/api/settings` | Update niche, tone, audience, etc. |
| GET | `/api/channels` | List all platforms and their connected/enabled state |
| POST | `/api/channels/:id` | Toggle a channel on/off, e.g. `{ "enabled": true }` |
| GET | `/api/wallet` | Read SUPRA balance |
| POST | `/api/wallet/topup` | Add balance (simulated for now) |
| POST | `/api/generate` | Generate one post (`{autoPost: true/false}`) — broadcasts to all enabled channels if `autoPost` is true |
| POST | `/api/post` | Publish a specific text to every enabled channel |
| GET | `/api/automation` | Current automation state |
| POST | `/api/automation/settings` | Set cycle length (seconds) and auto-approve |
| POST | `/api/automation/start` | Start the 24/7 engine |
| POST | `/api/automation/stop` | Stop it |
| GET | `/api/posts` | Post history (each post includes per-channel `results`) |
| DELETE | `/api/posts` | Clear history |
| GET | `/api/stats` | General stats |

## Roadmap

- [x] DeepSeek for text generation
- [x] Telegram for test publishing
- [x] 24/7 backend scheduler
- [x] Frontend + backend unified in one project, one port
- [x] Multi-channel broadcast architecture (toggle channels on/off, one engine fans out to all of them)
- [x] Refined responsive design (mobile / tablet / desktop tiers)
- [ ] Real Twitter/X API v2 integration (OAuth 2.0) — stub already in place
- [ ] Real Instagram Graph API integration — stub already in place
- [ ] Real Discord webhook integration — stub already in place
- [ ] Real Supra SDK integration (on-chain transactions instead of simulated balance)
- [ ] Multi-user support (each user with their own wallet, settings, channels)
- [ ] Migrate from `data/db.json` to Postgres
- [ ] Deploy to a VPS (Railway, Render, or self-hosted) for true 24/7 uptime, independent of your own machine

## Tech stack

Node.js · Express · React · Vite · DeepSeek API · Telegram Bot API ·
Supra blockchain (planned)

## License

MIT
