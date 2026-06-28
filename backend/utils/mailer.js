import nodemailer from "nodemailer";

/**
 * Reusable mail transport.
 * Configure via environment variables:
 *   EMAIL_HOST, EMAIL_PORT, EMAIL_SECURE, EMAIL_USER, EMAIL_PASS
 *   EMAIL_FROM  (display name + address, e.g. "MyFirm <no-reply@myfirm.com>")
 */
const createTransport = () =>
  nodemailer.createTransport({
    host: process.env.EMAIL_HOST || "smtp.gmail.com",
    port: Number(process.env.EMAIL_PORT || 587),
    secure: process.env.EMAIL_SECURE === "true",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });

/**
 * Send an HTML email.
 * @param {Object} opts
 * @param {string}   opts.to       - Recipient address
 * @param {string}   opts.subject  - Email subject
 * @param {string}   opts.html     - Full HTML body
 * @param {string}  [opts.text]    - Optional plain-text fallback
 */
export const sendMail = async ({ to, subject, html, text }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn("[mailer] EMAIL_USER / EMAIL_PASS not configured — skipping email send");
    return;
  }
  const transporter = createTransport();
  const from = process.env.EMAIL_FROM ||
    `${process.env.COMPANY_NAME || "Your Firm"} <${process.env.EMAIL_USER}>`;

  await transporter.sendMail({ from, to, subject, html, text });
};