# GitHub + Vercel + Supabase

```
phone / laptop --https--> Vercel (runs the app) --> Supabase (database + private media bucket)
                     \--- uploads go straight to Supabase (Vercel rejects request bodies over 4.5 MB)
```
`vercel.json` runs the app in Dublin (`dub1`), next to your Supabase project (eu-west-1, Ireland).

## 0. Read this first
- **Vercel's free Hobby plan is for non-commercial use only.** Fine for testing. Before you start charging for Plus you need the Pro plan (about $20 a month).
- **Every check the app makes is a billable server call.** The app already pauses its checks while a tab is in the background. Hobby gives about 1 million calls a month, so a few hundred daily users would outgrow it.
- **Calls** still need a TURN relay (Vercel cannot run one).
- **Web push, email codes, Paystack webhooks and the installable app all work** on Vercel.

## 1. Supabase (once)
1. Bucket `kazavibe-media` (Private) and the secret key, as in DEPLOY-RAILWAY.md step 1.
2. Two connection strings from **Connect**:
   - **Session pooler, port 5432.** Only for creating tables from your laptop.
   - **Transaction pooler, port 6543.** This one goes into Vercel. Add `?pgbouncer=true&connection_limit=1` at the end:
     `postgresql://postgres.ctbsrtrscfqvdxwxbjdj:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`

## 2. Create or update the tables (from your laptop, whenever migrations change)
After pulling this version, create the new migration for the rate-limit table and check status. Stop `npm run dev` first.
```powershell
cd C:\Users\User\kazavibe
npx prisma generate
npx prisma migrate dev --name rate_limit
```
Then apply everything to Supabase with the **session pooler** string:
```powershell
$env:DATABASE_URL="postgresql://postgres.ctbsrtrscfqvdxwxbjdj:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
npx prisma migrate deploy
npm run db:secure
Remove-Item Env:DATABASE_URL
```
Vercel does not run migrations for you. Do this step each time you add one.

## 3. Push to GitHub
```powershell
git add .
git ls-files | Select-String "\.env"      # must show only .env.example and .env.production.example
git commit -m "Vercel"
git push
```

## 4. Vercel
1. vercel.com > sign in with GitHub > **Add New > Project** > import `Kazavibe`.
2. Framework: **Next.js** (detected). Keep the default build and install commands.
3. **Environment Variables** (paste values without quotes). Add them for **Production**:
```
DATABASE_URL          transaction pooler string from step 1 (port 6543, with ?pgbouncer=true&connection_limit=1)
SESSION_SECRET        long random string
OTP_SECRET            another long random string
STORAGE_DRIVER        supabase
SUPABASE_URL          https://ctbsrtrscfqvdxwxbjdj.supabase.co
SUPABASE_SERVICE_KEY  the secret key
SUPABASE_BUCKET       kazavibe-media
MAIL_MODE             smtp
SMTP_HOST             smtp.gmail.com
SMTP_PORT             587
SMTP_USER             your Gmail address
SMTP_PASS             your NEW Gmail app password
MAIL_FROM_NAME        KazaVibe
APP_URL               https://YOUR-PROJECT.vercel.app   (add after the first deploy, then redeploy)
```
   Later: `PAYSTACK_SECRET_KEY`, `PLUS_PRICE_NGN`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `NEXT_PUBLIC_SUPPORT_EMAIL`.
4. **Deploy.** When it finishes, copy the address (like `https://kazavibe.vercel.app`), set `APP_URL` to it, and **Redeploy** (Deployments tab, three dots, Redeploy).
5. Open `https://YOUR-ADDRESS/api/health`. You want `{"ok":true}`.

## 5. Check uploads (the part most likely to need attention)
Register, then upload a **photo larger than 5 MB** and record a voice note. In Supabase > Storage > kazavibe-media they should appear. If an upload fails:
- Open the browser's developer tools (F12) > Network and look at the red request.
- `/api/uploads/sign` failing means the Supabase URL or secret key variable is wrong.
- The request to `supabase.co` failing means the bucket name is wrong or the bucket does not exist.
- Send me the exact status and message.

## 6. Make yourself admin
Same as before, from your laptop, using the **session pooler** string:
```powershell
$env:DATABASE_URL="postgresql://postgres.ctbsrtrscfqvdxwxbjdj:PASSWORD@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
npm run make-admin -- you@example.com
Remove-Item Env:DATABASE_URL
```

## 7. Updating later
Change code, `git add . ; git commit -m "..." ; git push`. Vercel redeploys by itself. New migrations: step 2 first.
Vercel also builds a **preview** for every branch. Give the environment variables to **Production** only, so previews cannot touch your real database.

## 8. Android APK and iPhone
Same as DEPLOY.md sections C and D, using your Vercel address.

## Known limits on Vercel
- The first request after a quiet period is slower (a cold start).
- Files you upload but never post (for example, you close the upload window) stay in storage. A cleanup job can be added later.
- Rate limits for logins, codes, SMS, email and payments are stored in the database. Limits for posting, commenting and messaging are in memory, so on Vercel they are best-effort only.
