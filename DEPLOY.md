# Putting KazaVibe online (so any phone can use it)

```
phones / laptops  --HTTPS-->  your server:  Caddy -> KazaVibe app -> Postgres (private)
```
Phones never talk to the database. They talk to the app, and only the app talks to the database. **Do not open port 5432 to the internet.**

## A. Quick test today (free, no server)
Your laptop stays on and shares the app through a temporary HTTPS address.
1. Run the app: `npm run dev`
2. Install Cloudflare's tunnel once: `winget install Cloudflare.cloudflared`
3. In a second PowerShell window: `cloudflared tunnel --url http://localhost:3000`
4. It prints an address like `https://random-words.trycloudflare.com`. Open it on any phone.
5. Put that address in `.env` as `APP_URL="https://random-words.trycloudflare.com"` and restart `npm run dev`.

The address changes every time, and it stops when your laptop sleeps. Good for showing friends. Not for the APK.

## B. Proper deployment (a small server)
**1. Get a server.** Ubuntu 22.04 or 24.04, at least 2 GB RAM, about $5 a month (Hetzner, DigitalOcean, Contabo, Vultr). With 1 GB RAM the build can run out of memory. You usually need an international or dollar card.

**2. Get an address.** Buy a domain, or use a free one:
- DuckDNS (duckdns.org): free name like `kazavibe.duckdns.org` pointing at your server's IP, or
- sslip.io: if your IP is `203.0.113.5`, use `203-0-113-5.sslip.io` (nothing to sign up for).

If you buy a domain, add an **A record** pointing to your server's IP.

**3. Prepare the server** (from PowerShell: `ssh root@YOUR_SERVER_IP`):
```bash
curl -fsSL https://get.docker.com | sh
ufw allow 22 && ufw allow 80 && ufw allow 443 && ufw --force enable
```

**4. Upload the project.** From your laptop, in the folder that contains the project (it must include your `prisma/migrations` folder):
```powershell
scp -r .\kazavibe root@YOUR_SERVER_IP:/root/
```
Don't upload `node_modules`, `.next` or `.env` (delete them from the copy or use git instead).

**5. Create the secrets file on the server:**
```bash
cd /root/kazavibe
cp .env.production.example .env.production
openssl rand -hex 16      # use for DB_PASSWORD (letters and numbers only)
openssl rand -base64 32   # use for SESSION_SECRET, again for OTP_SECRET
nano .env.production      # fill in DOMAIN, APP_URL, secrets, Gmail app password, Paystack key
```

**6. Start everything:**
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f app
```
The first build takes a few minutes. Open `https://YOUR-DOMAIN/api/health`. You should see `{"ok":true}`. Caddy gets the HTTPS certificate automatically.

**7. Make yourself admin** (after registering on the site):
```bash
docker compose -f docker-compose.prod.yml --env-file .env.production exec app npm run make-admin -- you@example.com
```

**8. Connect the services**
- Paystack dashboard: webhook URL `https://YOUR-DOMAIN/api/billing/webhook`
- Push notifications: run `npm run vapid` on your laptop and paste both keys into `.env.production`

**9. Backups** (do this on day one):
```bash
sh scripts/backup.sh
```
Add it to cron (`crontab -e`): `0 3 * * * cd /root/kazavibe && sh scripts/backup.sh`. Copy the `backups/` folder off the server regularly.

**10. Updating later:** upload the new code, then run the same `up -d --build` command. Database migrations run automatically.

**Calls on mobile data (optional):** set `TURN_SECRET` and `TURN_URLS` in `.env.production`, run `ufw allow 3478` and `ufw allow 49160:49200/udp`, then start with `--profile turn` added to the compose command.

## C. Android APK
The APK is a thin wrapper around your live website (a "Trusted Web Activity"). Build it after step B works.
1. Go to **pwabuilder.com**, enter `https://YOUR-DOMAIN`, then **Package for stores > Android**.
2. Choose a package id (for example `com.kazavibe.app`), name and version. Let it **create a new signing key**.
3. Download the zip. Keep `signing.keystore` and its password safe. You can't update the app without them.
4. The zip contains `assetlinks.json`. Copy its contents into `public/.well-known/assetlinks.json`, redeploy, and the app opens full-screen without a browser bar.
5. Send the `.apk` to testers (WhatsApp, Drive). They allow "install unknown apps" and open it.
6. Google Play later needs a $25 developer account and the `.aab` file from the same zip.

## D. iPhone
There is no APK on iPhone.
- **Free, today:** open your site in **Safari**, tap Share, **Add to Home Screen**. It then installs like an app, and notifications work on iOS 16.4 and newer.
- **App Store/TestFlight:** needs an Apple Developer account ($99 a year) and a wrapper built on a Mac (Capacitor). Worth doing only after the web app has real users.

## Safety checklist
- The old Gmail app password you posted in chat is revoked and replaced.
- `.env.production` exists only on the server.
- Only ports 22, 80 and 443 are open (plus 3478 and 49160-49200/udp if you use calls).
- Backups are copied somewhere else.
- Use Paystack **test** keys until your business is verified.
- Have a Nigerian lawyer review the Privacy Policy and Terms before real launch.
