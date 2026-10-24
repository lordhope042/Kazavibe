import nodemailer from 'nodemailer';

let transport: nodemailer.Transporter | null = null;

/** MAIL_MODE=smtp sends real email. MAIL_MODE=console prints it to the server terminal (for local testing). */
export async function sendMail(to: string, subject: string, text: string, html: string) {
  if ((process.env.MAIL_MODE ?? 'smtp') === 'console') { console.log(`\n[mail -> ${to}] ${subject}\n${text}\n`); return; }
  const user = process.env.SMTP_USER, pass = process.env.SMTP_PASS?.replace(/\s/g, '');
  if (!user || !pass) throw new Error('SMTP_USER and SMTP_PASS are not set in .env');
  const port = Number(process.env.SMTP_PORT ?? 587);
  transport ??= nodemailer.createTransport({ host: process.env.SMTP_HOST ?? 'smtp.gmail.com', port, secure: port === 465, auth: { user, pass } });
  await transport.sendMail({ from: `"${process.env.MAIL_FROM_NAME || 'KazaVibe'}" <${user}>`, to, subject, text, html });
}
