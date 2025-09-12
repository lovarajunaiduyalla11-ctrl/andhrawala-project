const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: { user: 'YOUR_EMAIL', pass: 'YOUR_PASSWORD_OR_APP_PASSWORD' }
});

function sendEmail(to, subject, text) {
  return transporter.sendMail({ to, subject, text });
}
module.exports = { sendEmail };
