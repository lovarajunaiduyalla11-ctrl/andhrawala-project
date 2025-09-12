const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const validator = require('validator');
const app = express();

const DATA_USERS = path.join(__dirname, 'users.json');
const MOVIES_DIR = path.join(__dirname, 'movies');
const PORT = process.env.PORT || 80;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/static', express.static(path.join(__dirname, 'public')));

// Ensure users.json exists
if (!fs.existsSync(DATA_USERS)) fs.writeFileSync(DATA_USERS, JSON.stringify([]));

// Utility: read/write users
function readUsers() {
  try { return JSON.parse(fs.readFileSync(DATA_USERS)); }
  catch (e) { return []; }
}
function writeUsers(users) {
  fs.writeFileSync(DATA_USERS, JSON.stringify(users, null, 2));
}

// Simple in-memory session and OTP storage
const sessions = new Map();
const otps = new Map();

// Email transporter setup - replace YOUR_EMAIL and YOUR_PASSWORD_OR_APP_PASSWORD
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'YOUR_EMAIL',
    pass: 'YOUR_PASSWORD_OR_APP_PASSWORD'
  }
});

// API: Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { contact } = req.body;
  let contactType = null;
  if (validator.isEmail(contact)) contactType = 'email';
  else if (/^[6-9]\d{9}$/.test(contact)) contactType = 'mobile';
  else return res.status(400).json({ error: "Invalid email or Indian mobile number" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otps.set(contact, { otp, expires: Date.now() + 5 * 60 * 1000 });

  try {
    if (contactType === 'email') {
      await transporter.sendMail({
        to: contact,
        subject: 'Your Andhrawala OTP',
        text: `Your OTP is: ${otp}`
      });
    } else {
      // TODO: Integrate real SMS service here. For now log OTP to console.
      console.log(`Send OTP ${otp} to mobile ${contact}`);
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// API: Verify OTP
app.post('/api/verify-otp', (req, res) => {
  const { contact, otp } = req.body;
  const otpData = otps.get(contact);
  if (!otpData) return res.status(400).json({ error: "No OTP sent to this contact" });
  if (otpData.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });
  if (Date.now() > otpData.expires) return res.status(400).json({ error: "OTP expired" });
  otps.delete(contact);
  res.json({ ok: true });
});

// API: Signup
app.post('/api/signup', async (req, res) => {
  const { contact, username, password, dob } = req.body;
  let contactType;
  if (validator.isEmail(contact)) contactType = "email";
  else if (/^[6-9]\d{9}$/.test(contact)) contactType = "mobile";
  else return res.status(400).json({ error: "Invalid email or Indian mobile number" });

  if (!username || !password || !dob) return res.status(400).json({ error: "All fields are required" });

  const users = readUsers();
  if (users.find(u => u.contact === contact)) return res.status(400).json({ error: "Contact already registered" });
  if (users.find(u => u.username === username)) return res.status(400).json({ error: "Username already taken" });

  const passwordHash = await bcrypt.hash(password, 10);
  users.push({ contact, contactType, username, passwordHash, dob });
  writeUsers(users);

  res.json({ ok: true });
});

// API: Login
app.post('/api/login', async (req, res) => {
  const { contact, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.contact === contact);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });

  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { contact, username: user.username, created: Date.now() });
  res.json({ token });
});

// Keep your existing movie streaming and static file serving API below here...

app.listen(PORT, () => console.log(`andhrawala server running on :${PORT}`));

