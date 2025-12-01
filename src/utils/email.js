const nodemailer = require("nodemailer");

exports.sendEmail = async (to, subject, html) => {
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: process.env.SMTP_SECURE === "true",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // 🚀 Accept self-signed certificates
  },
});


  await transporter.sendMail({
    from: `"Order Management" <${process.env.SMTP_USER}>`,
    to,
    subject,
    html,
  });
};
