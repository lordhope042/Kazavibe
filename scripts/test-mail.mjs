// Sends one test email using the SMTP settings in your .env and explains any problem.
// Usage (from the project folder):  node scripts/test-mail.mjs you@example.com
import fs from 'fs';
import nodemailer from 'nodemailer';

try {
  for (const line of fs.readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!m || m[1] in process.env) continue;
    const v = m[2].trim(), q = v.match(/^"([^"]*)"|^'([^']*)'/);
    process.env[m[1]] = q ? (q[1] ?? q[2]) : v.replace(/\s+#.*$/, '');
  }
} catch { console.log('Could not read .env in this folder. Run this from the project folder.'); process.exit(1); }

const to = process.argv[2];
const host = process.env.SMTP_HOST || 'smtp.gmail.com', port = Number(process.env.SMTP_PORT || 587);
const user = process.env.SMTP_USER, pass = (process.env.SMTP_PASS || '').replace(/\s/g, '');
console.log(`MAIL_MODE=${process.env.MAIL_MODE || '(not set)'}  host=${host}  port=${port}`);
console.log(`SMTP_USER: ${user ? user : 'NOT SET'}   SMTP_PASS: ${pass ? pass.length + ' characters' : 'NOT SET'}   OTP_SECRET: ${process.env.OTP_SECRET ? 'set' : 'NOT SET'}`);
if (!to) { console.log('\nAdd an address to send to, e.g.  node scripts/test-mail.mjs you@gmail.com'); process.exit(1); }
if (!user || !pass) { console.log('\nPROBLEM: SMTP_USER and/or SMTP_PASS are empty in .env. Fill them in, save, then restart "npm run dev".'); process.exit(1); }
if (pass.length !== 16) console.log('\nNote: a Gmail App Password is exactly 16 letters. Yours is ' + pass.length + '. Check you copied the whole thing.');

const t = nodemailer.createTransport({ host, port, secure: port === 465, auth: { user, pass }, connectionTimeout: 15000, greetingTimeout: 15000 });
try {
  await t.verify();
  console.log('\nConnected and logged in OK. Sending test email...');
  await t.sendMail({ from: `"KazaVibe" <${user}>`, to, subject: 'KazaVibe test email', text: 'If you can read this, email sending works.' });
  console.log('SENT. Check the inbox (and spam folder) of ' + to);
} catch (e) {
  console.log('\nFAILED:', e.code || '', e.responseCode || '', (e.message || '').split('\n')[0]);
  if (e.code === 'EAUTH' || [534, 535].includes(e.responseCode))
    console.log('\nPROBLEM: Gmail rejected the login.\n- SMTP_PASS must be a Gmail App Password (16 letters), not your normal password.\n- 2-Step Verification must be ON for that Google account: https://myaccount.google.com/security\n- Create the App Password at https://myaccount.google.com/apppasswords and paste it into SMTP_PASS.\n- SMTP_USER must be the same Gmail address that created it.\n- If you revoked the old App Password, you must put the NEW one in .env.\n- Save .env, then restart "npm run dev".');
  else if (['ETIMEDOUT', 'ECONNECTION', 'ESOCKET', 'ECONNREFUSED', 'ENOTFOUND', 'EDNS'].includes(e.code))
    console.log('\nPROBLEM: cannot reach ' + host + ':' + port + '.\n- Check your internet, and turn off any VPN.\n- Antivirus or a firewall may be blocking it. Try SMTP_PORT=465 in .env and run this again.\n- Some networks block email ports. Try a phone hotspot.');
  process.exit(1);
}
