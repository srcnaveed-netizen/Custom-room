# PUBG Custom Room Manager

A full-stack web app for hosting PUBG Mobile custom rooms — the same UI you designed in
Base44, now running on its own independent backend with zero dependency on Base44's
platform. Player and Owner accounts, room management, drag-to-reorder, PIN-gated Owner
panel, and photo uploads all work exactly as before, backed by a real Express + SQLite
server you fully own.

Dark theme, `#0084FF` accent — untouched from the original design.

## What changed from the Base44 export

- **No Base44 SDK, no Base44 platform dependency.** `@base44/sdk` and `@base44/vite-plugin`
  are removed. A new `src/api/client.js` implements the exact same call shapes
  (`db.auth.*`, `db.entities.Room.*`, `db.entities.Signup.*`, `db.integrations.Core.UploadFile`)
  the pages already used, so **no page or component UI code was changed** — only what's
  underneath it.
- **Real backend**: `server/` is an Express app using Node's built-in `node:sqlite` (no
  external database to provision) with sessions, auth, room/signup CRUD, and file uploads.
- **Owner PIN is server-verified**, not hardcoded in the frontend bundle. The old
  `AdminPinGate.jsx` checked a PIN that was visible in plain text in the shipped JS — now
  the PIN is checked server-side against an `OWNER_PIN` environment variable, and the
  unlocked state is a real session, not a spoofable `sessionStorage` flag.
- **Google sign-in removed.** `GoogleIcon.jsx` was present but unused/unwired in the
  export — it's been deleted outright, and there's no Google OAuth flow anywhere in the app.
- **Email OTP verification removed from Register** — the export's sign-up flow expected an
  email provider to send a 6-digit code, which isn't configured here. Registration now logs
  the player in immediately after creating their account. If you want email verification
  later, this is the piece to add back.
- **Player signup data is no longer publicly readable.** In the export, the signup list
  (PUBG UID, Discord tag, squad name, rank, kills, UC payout) was fetched from the public
  home page with no server-side access control. The new backend only returns full signup
  details to the Owner or to the player who submitted it — everyone else gets a redacted
  version with just enough (`room_id`, `created_by_id`) for the join-count and "am I signed
  up" logic the UI already relies on.
- **Room ID/password reveal is enforced server-side.** Previously `reveal_details` was a
  UI-only toggle — the actual values were present in the API response regardless. Now the
  backend only includes `room_id`/`room_password` in the response if you're the Owner, or a
  signed-up player on a room with `reveal_details` turned on.

## How it works

- **Players**: browse rooms → sign up with PUBG IGN + UID (free) → create an account
  (email + PIN) → check their dashboard for rank/kills/UC once the Owner sets it.
- **You (Owner)**: click "Owner" → enter your PIN → **Rooms** tab to create/edit/reorder
  rooms (drag handles included), upload a cover photo, set the prize pool, and reveal the
  in-game Room ID/password → **Players** tab to see everyone signed up, remove players, and
  click a player to set their rank, kills, and UC amount.

## Local setup

```bash
npm install
cp .env.example .env
# edit .env and set OWNER_PIN / SESSION_SECRET
npm run build
npm start
```

Visit `http://localhost:3000`. Click "Owner" and enter your `OWNER_PIN` to reach the Owner
panel. Players register normally via "Sign Up".

For active frontend development with hot reload, run the backend and frontend separately
in two terminals:
```bash
npm run dev:server   # backend on :3000
npm run dev           # Vite dev server on :5173, proxies /api and /uploads to :3000
```

**Requires Node.js 22.5+** (uses the built-in `node:sqlite` module — no native database
dependency to compile).

## Deploying to Railway

1. Push this folder to a GitHub repo (or `railway up` from this folder with the CLI).
2. In Railway, create a new project → **Deploy from GitHub repo**.
3. Railway detects Node via Nixpacks (pinned to Node 22+ via `.nvmrc` /
   `package.json engines`), runs `npm install`, then `npm run build` (builds the React
   frontend into `dist/`), then `npm start` (starts the Express server, which serves both
   the API and the built frontend).
4. In your Railway project → **Variables**, add:
   - `OWNER_PIN` — the PIN for the Owner panel
   - `SESSION_SECRET` — any long random string
   - `PUBLIC_URL` — your Railway app URL (used only in password-reset log lines, see below)
   - Railway sets `PORT` automatically — don't add it yourself.
5. **Add a Volume** so your data survives redeploys: **Settings → Volumes → New Volume**,
   mount it at `/app/data`. This is where the SQLite database *and* uploaded room photos
   live — without this volume, both reset on every redeploy (Railway's default filesystem
   is ephemeral).
6. Deploy. Open the app, click "Owner", enter your `OWNER_PIN`.

## Password reset — one thing to know

Players can request a PIN reset from the login page. Since no email service (SMTP/Resend/
etc.) is configured out of the box, the reset link is written to the **server logs**
instead of emailed — check your Railway deployment logs for a line like:
```
[password reset] player@email.com -> https://yourapp.up.railway.app/reset-password?token=...
```
You'd need to relay that link to the player yourself (Discord, etc.) until an email
provider is wired in. This is a deliberate simplification, not a bug — happy to help wire
up a real email provider (e.g. Resend) later if you want players to self-serve this.

## Notes

- Room ID/password are hidden from players until you flip "Reveal" on for that room, and
  this is enforced by the backend, not just hidden in the UI.
- Removing a player from the Players tab deletes their signup for that room only; their
  account stays intact.
- UC payouts are tracked as Pending/Sent for your own bookkeeping — this app doesn't move
  real money or UC; you still trade UC manually and log it here.
- Sessions are stored in the same SQLite database as everything else, so logins survive
  server restarts and redeploys as long as your `/app/data` volume is attached.
- Uploaded room photos are stored under `data/uploads` (part of the same volume) and served
  at `/uploads/<filename>`.
