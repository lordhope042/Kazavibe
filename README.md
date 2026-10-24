# KazaVibe

Next.js 14 (App Router) + TypeScript + Tailwind + Prisma + PostgreSQL. One API (Next route handlers). No mock data: everything you see comes from the database.
UI ported from the Gemini template (same colours, layouts and icons) with light/dark mode.

## Run it
```bash
cp .env.example .env            # set SESSION_SECRET (openssl rand -base64 32)
docker compose up -d            # local PostgreSQL (or point DATABASE_URL at your own)
npm install
npx prisma migrate dev --name init
npm run dev                     # http://localhost:3000
npm run make-admin -- you@example.com     # after you register, promote yourself (or add MODERATOR as 2nd arg)
```
`npm run typecheck` passes on this codebase. Uploaded media is stored in `./storage` (see Production notes).

## Screens (all real)
Landing (live counts) · Register (server-side 18+) · Login · Onboarding (photo, about, area, privacy) · Home feed · Clips (vertical, autoplay, comments) ·
Discover · Nearby (by area, with pause switch) · Messages (requests, accept/decline, live polling) · Profile · Notifications · Settings (profile, avatar, requests, blocked, delete account) · Admin dashboard.

## Chat attachments, voice notes, comment replies, calls
- Chat: attach photos, videos, PDF/Word/Excel/PowerPoint (20 MB), record voice notes (up to 2 min). File type is checked from the real bytes; documents download instead of opening. Chat media is only readable by the two people in the chat (moderators cannot open it).
- Comments: one level of replies, delete by comment author or post owner.
- Voice and video calls are planned as PLUS features: the buttons exist in chat and flags `voice_call`/`video_call` are in `src/lib/plan.ts`. Real calls need WebRTC + a signalling server + a TURN service, not built yet.
- Loader: a slim top progress bar (no full-screen overlay) plus a small non-blocking pill for uploads.
- Run `npx prisma migrate dev --name chat_media_replies` after updating.

## Deploying
See `DEPLOY.md`: Docker + Caddy (automatic HTTPS) + private Postgres on a small server, a free laptop tunnel for quick tests, Android APK via PWABuilder, iPhone via Add to Home Screen. `GET /api/health` is the health check.

## Calls, phone sign-in, verification, Hausa, installable app + push
- **Calls (Plus):** WebRTC audio/video. Starting a call needs Plus and an accepted chat; answering is free. Signalling goes through `/api/calls/*` (polling), media is peer-to-peer. For mobile data you need a TURN relay: set `TURN_URLS` + `TURN_USERNAME`/`TURN_CREDENTIAL` (or `TURN_SECRET` for coturn). Needs HTTPS in production.
- **Phone-code sign-in:** add and verify a number in Settings; then `/login/phone`. `SMS_PROVIDER=console` prints codes in the terminal; `termii` sends real SMS (confirm the endpoint, sender ID and route in your Termii dashboard/docs).
- **Verification:** `/verification` (selfie + random code, admin reviews in Dashboard > Verification, selfie deleted on decision, 14-day expiry). Human review, not face recognition. Get legal advice on handling this data under Nigerian data-protection law before launch.
- **Hausa:** language switch in the footer/account menu; strings in `src/lib/i18n.ts` (landing, menus, login/register, footer so far). First draft: get a native speaker to review. Add more keys to translate more screens.
- **Installable app + push:** `public/sw.js`, manifest, Settings > App and notifications. Run `npm run vapid` and put the keys in `.env`. Push needs HTTPS (localhost is fine). Message pushes never include message text.
- Run `npx prisma migrate dev --name calls_phone_verify_push` and `npm install` after updating.

## Payments (Paystack) for Plus
- `/plus`: plans (1/3/12 months), prices set on the server from `PLUS_PRICE_NGN`. Checkout opens Paystack; on return `/billing/callback` and the webhook `POST /api/billing/webhook` both confirm the payment with Paystack's API (amount + currency must match) and grant Plus exactly once. Early renewals add time. Only the reference and amounts are stored, never card details.
- Setup: put your TEST key in `.env` (`PAYSTACK_SECRET_KEY=sk_test_...`, `APP_URL`), and in the Paystack dashboard set the webhook URL to `https://YOUR-DOMAIN/api/billing/webhook` (needs a public URL; on localhost the return page still works). Use Paystack's test cards. Switch to the live key only after your business is verified.
- Run `npx prisma migrate dev --name payments` after updating.

## Admin: payments and revenue
- Dashboard > Overview shows Plus members and (admins only) revenue for 30 days and payments under review.
- Dashboard > Payments (admins only): filter by status, re-check a payment with Paystack, and for payments held as REVIEW (amount mismatch) approve (grants Plus) or reject. Every action is written to the audit log.
- Refunds are done in the Paystack dashboard, not in the app.

## WhatsApp-style chat
- Ticks: sent (1 grey) -> delivered (2 grey, set when the recipient's app is open: chat list, header heartbeat or the chat itself) -> read (2 blue, set when they open the chat).
- Press-and-hold (touch), right-click or hover arrow on a message: Copy, Pin (max 3 per chat), Delete for me, Delete for everyone (author only, 48 h, erases the file). On a chat row: Pin chat (max 3), Archive. A new message un-archives the chat for the recipient.
- Custom voice-note player (waveform, seek, 1x/1.5x/2x). Day separators, pinned-message banner, unread badge on the Messages tab.
- Run `npx prisma migrate dev --name chat_receipts_pins` after updating.

## Email verification + password reset
- Register needs an email. A 6-digit code (valid 10 min, 5 tries, HMAC-hashed with OTP_SECRET) is emailed via SMTP (nodemailer). Unverified accounts are redirected to /verify-email and blocked from the API.
- Forgot password: /forgot-password -> emailed code -> new password. Same response whether or not the email exists. A reset signs out all other sessions.
- Configure in `.env` (see `.env.example`). Use `MAIL_MODE="console"` to print codes in the terminal while testing. Never commit `.env`.
- Run `npx prisma migrate dev --name email_otp` after updating, then `npm install` (adds nodemailer).

## Footer, info pages, spinner, icons
- `Footer` (full on landing/info pages, compact in the app). Pages `/about /safety /guidelines /privacy /terms /help` live in `src/lib/info.ts`. Privacy and Terms are DRAFTS: have a Nigerian lawyer review before launch. Set `NEXT_PUBLIC_SUPPORT_EMAIL` in `.env` to show a support email on the Help page.
- `GlobalSpinner`: full-screen branded spinner for any write request or page change that takes longer than 200 ms.
- Favicon/app icons: `src/app/icon.svg`, `favicon.ico`, `apple-icon.png`, `public/icon-192.png`, `public/icon-512.png`, `manifest.ts`.

## Connect (dating) + plans
- Opt-in `Connect` tab: Meet (cards ranked by shared interests/area), Likes you, Matches. Likes are private until both people like each other; a match opens an accepted chat.
- Plans (`src/lib/plan.ts`, checked on the server): FREE vs PLUS. Plus = hide profile photo until match (file is withheld, not just blurred), see who liked you, 50 likes/day (free: 10).
- Always free: block, report, private profile, pause Nearby, message requests, delete account.
- No payment provider yet. An ADMIN grants Plus (30 days) from Dashboard > Users. Paystack/Flutterwave comes later and must verify payments on the server.
- After pulling this update run `npx prisma migrate dev --name connections` (stop the dev server first).

## How the rules from the spec are enforced (server-side)
- Posts, clips, comments and media files are checked against: author active, no block either way, public vs private profile, followers-only audience. Media URLs are private (`/api/media/*` needs a session and re-checks access; Range requests supported for video).
- Uploads: file type is detected from the real bytes (JPEG/PNG/WebP/MP4/MOV/WebM), 8 MB photo / 50 MB video limit, rate-limited.
- Messaging: mutual followers chat directly; anyone else sends a request (1 message until accepted). Following is never consent.
- Reports -> moderation queue -> dismiss / resolve / remove post / suspend (admin only). Every privileged action is written to the audit log. Moderators cannot read messages.

## Not built yet / known limits
- **30-second clip limit** is checked in the browser only. Server-side duration needs ffprobe/a video service.
- Contact verification (needs SMS/email provider), password reset, face verification, real map/GPS distance bands, stories, Google/Facebook sign-in, followers/following list pages, creator analytics, ads/monetisation.
- Chat updates by polling every 3s (swap for Socket.IO or SSE later).

## Production notes
- `storage/` is local disk: use a VPS with a persistent volume, or swap `src/lib/media.ts` for R2/S3 and signed URLs. It will not work on serverless hosting as-is.
- Rate limiter is in-memory: use Redis when running more than one instance.
- Sessions are 30-day signed JWTs; add a session table for per-device revoke.
- Keep SESSION_SECRET and DATABASE_URL in your host's secrets and serve over HTTPS.
