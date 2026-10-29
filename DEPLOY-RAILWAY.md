# Supabase + GitHub + Railway (free-tier setup)

```
GitHub (code)  -->  Railway (runs the app, gets the public https address)  -->  Supabase (database + private media bucket)
```
Phones talk only to the Railway address. Only the app talks to Supabase.

## 1. Supabase
1. supabase.com > New project. Pick a region close to your users (Europe or South Africa). Choose a database password with **letters and numbers only** and save it.
2. Click **Connect** (top of the project) > **Session pooler** > copy the URI. It looks like
   `postgresql://postgres.PROJECTREF:[YOUR-PASSWORD]@aws-0-REGION.pooler.supabase.com:5432/postgres`
   Replace `[YOUR-PASSWORD]` with your password. Use the **Session pooler** (port 5432): Railway cannot reach Supabase's direct address because that is IPv6 only.
3. **Storage** > New bucket > name `kazavibe-media` > keep it **Private** (do not tick "public").
4. **Project Settings > API Keys**: copy the **Project URL** and the **secret / service_role** key. The secret key is a password. It goes only into Railway's variables, never into code or chat.

## 2. Create the tables in Supabase (from your laptop)
Make sure your migration files are up to date first:
```powershell
cd C:\Users\User\kazavibe
npx prisma migrate dev          # if it offers a name, e.g. "latest"; skip if it says already in sync
npx prisma migrate status       # must say: Database schema is up to date
```
Then point Prisma at Supabase for this one window only (your `.env` stays on your local database):
```powershell
$env:DATABASE_URL="postgresql://postgres.PROJECTREF:YOURPASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
npx prisma migrate deploy
npm run db:secure
Remove-Item Env:DATABASE_URL
```
`db:secure` switches on Row Level Security so Supabase's automatic public REST API cannot read your tables. KazaVibe's own server is not affected. Run it again after any future migration that adds tables.

### 2b. Optional: also copy your local data and uploaded files
Skip this if you are happy to register fresh accounts on the live site. Otherwise, with the tables already created and the `kazavibe-media` bucket made:
```powershell
$env:TARGET_DATABASE_URL="postgresql://postgres.PROJECTREF:PASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
$env:SUPABASE_URL="https://PROJECTREF.supabase.co"
$env:SUPABASE_SERVICE_KEY="your secret key"
npm run db:copy              # shows what would be copied, changes nothing
node scripts/copy-to-supabase.mjs --yes
```
The local database is read from your `.env`, so it can never be mixed up with Supabase. Existing rows are skipped, never overwritten.

## 3. GitHub
Install Git if `git --version` fails (git-scm.com). Create a **private** repository on github.com (empty, no README). Then:
```powershell
cd C:\Users\User\kazavibe
git init
git add .
git ls-files | Select-String "\.env"
```
That last command must show only `.env.example` and `.env.production.example`. **If `.env` appears, stop** and tell me. Then:
```powershell
git commit -m "KazaVibe"
git branch -M main
git remote add origin https://github.com/YOUR-USERNAME/kazavibe.git
git push -u origin main
```
A browser window may ask you to sign in to GitHub. The `prisma/migrations` folder must be in the repository.

## 4. Railway
1. railway.com > sign in with GitHub > **New Project > Deploy from GitHub repo** > pick `kazavibe`. It finds the Dockerfile and builds it.
2. Open the service > **Variables** and add (paste values without quotes):
```
DATABASE_URL          the Supabase Session pooler URI from step 1
SESSION_SECRET        a long random string (32+ characters)
OTP_SECRET            another long random string
STORAGE_DRIVER        supabase
SUPABASE_URL          https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_KEY  the secret key
SUPABASE_BUCKET       kazavibe-media
MAIL_MODE             smtp
SMTP_HOST             smtp.gmail.com
SMTP_PORT             587
SMTP_USER             your Gmail address
SMTP_PASS             your NEW Gmail app password
MAIL_FROM_NAME        KazaVibe
```
   Later: `PAYSTACK_SECRET_KEY`, `PLUS_PRICE_NGN`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_SUPPORT_EMAIL`.
3. **Settings > Networking > Generate Domain.** Copy the address (like `https://kazavibe-production.up.railway.app`) and add it as variable `APP_URL`. Railway redeploys.
4. **Settings > Deploy > Healthcheck path:** `/api/health`.
5. When the deploy is green, open `https://YOUR-ADDRESS/api/health`. You should see `{"ok":true}`.

## 5. First use
Register on the live site, then make yourself admin from your laptop (Supabase URL set for that window, as in step 2):
```powershell
$env:DATABASE_URL="postgresql://postgres.PROJECTREF:YOURPASSWORD@aws-0-REGION.pooler.supabase.com:5432/postgres"
npm run make-admin -- you@example.com
Remove-Item Env:DATABASE_URL
```
Test an upload (a photo and a voice note). It should appear in Supabase > Storage > kazavibe-media.

## 6. Updating later
Change code, then `git add . ; git commit -m "what changed" ; git push`. Railway redeploys by itself and applies migrations on start. If you changed `prisma/schema.prisma`: run `npx prisma migrate dev --name something` locally first, commit the new `prisma/migrations` folder, push, then run `npm run db:secure` against Supabase.

## 7. Honest limits of the free tiers
- **Railway:** its free allowance has changed several times. Check the pricing page and the usage tab. An app that is always on, and that checks the server every few seconds for messages and calls, uses its credit steadily. If credit runs out the app stops. If that happens, the same repository runs on Render, Fly.io or a $5 server (see DEPLOY.md).
- **Supabase free:** the project **pauses after about a week without activity** (click Restore in the dashboard). 500 MB database, 1 GB media, 50 MB per file, so large video will fill it quickly.
- **Calls** need a TURN relay, which free hosting does not include, so calls will work on some networks and fail on others.
- **If you see "prepared statement ... already exists"** you used the Transaction pooler (port 6543). Use the Session pooler (5432) as above.
- **If the build runs out of memory** on Railway, tell me and I will slim the build.

## 8. Android APK later
Once the Railway address works, follow section C of DEPLOY.md (PWABuilder) using the Railway address.
