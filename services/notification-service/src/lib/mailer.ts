import nodemailer from 'nodemailer';

const port = Number(process.env.SMTP_PORT) || 1025;

/** A real mail server is set; without it, mail goes to a local MailHog in dev. */
export const smtpConfigured = () => Boolean(process.env.SMTP_HOST);

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port,
  // 465 is implicit TLS; 587/25 upgrade with STARTTLS automatically.
  secure: port === 465,
  ...(process.env.SMTP_USER ? { auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } } : {}),
});
