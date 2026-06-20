const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

async function sendEmail(to, subject, text, attachments) {
  if (!process.env.SMTP_HOST) throw new Error('SMTP not configured');
  const mailOpts = {
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
    to,
    subject,
    text,
  };
  // attachments can be a single path string or array of paths
  if (attachments) {
    const paths = Array.isArray(attachments) ? attachments : [attachments];
    mailOpts.attachments = paths.map((p, i) => ({
      filename: paths.length > 1 ? `screenshot_${i + 1}.png` : 'screenshot.png',
      path: p,
    }));
  }
  await getTransporter().sendMail(mailOpts);
}

module.exports = { sendEmail };