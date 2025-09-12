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
const PORT = process.env.PORT || 7070;

// Environment variables for email
const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

// --- Ensure email credentials exist ---
if (!EMAIL_USER || !EMAIL_PASS) {
  console.error("ERROR: EMAIL_USER or EMAIL_PASS environment variables not set!");
  process.exit(1);
}

// Nodemailer transporter
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: { user: EMAIL_USER, pass: EMAIL_PASS }
});

// --- Middlewares ---
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use('/static', express.static(path.join(__dirname, 'public')));

// --- Ensure data files/folders exist ---
if (!fs.existsSync(DATA_USERS)) fs.writeFileSync(DATA_USERS, JSON.stringify([]));
if (!fs.existsSync(MOVIES_DIR)) fs.mkdirSync(MOVIES_DIR);

// --- Utility functions ---
function readUsers() {
  try { return JSON.parse(fs.readFileSync(DATA_USERS)); }
  catch (e) { return []; }
}
function writeUsers(users) {
  fs.writeFileSync(DATA_USERS, JSON.stringify(users, null, 2));
}

// --- In-memory storage ---
const sessions = new Map();
const otps = new Map();

// --- Routes ---

// Send OTP
app.post('/api/send-otp', async (req, res) => {
  const { contact } = req.body;
  const contactType = validator.isEmail(contact)
    ? 'email'
    : (/^[6-9]\d{9}$/.test(contact) ? 'mobile' : null);

  if (!contactType) return res.status(400).json({ error: "Invalid email or Indian mobile number" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otps.set(contact, { otp, expires: Date.now() + 5 * 60 * 1000 });

  try {
    if (contactType === 'email') {
      const info = await transporter.sendMail({
        to: contact,
        subject: 'Andhrawala OTP',
        text: `Your OTP is: ${otp}`
      });
      console.log(`OTP sent to ${contact} | messageId: ${info.messageId}`);
    } else {
      console.log(`Send OTP ${otp} to mobile ${contact}`);
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send OTP" });
  }
});

// Verify OTP
app.post('/api/verify-otp', (req, res) => {
  const { contact, otp } = req.body;
  const otpData = otps.get(contact);
  if (!otpData) return res.status(400).json({ error: "No OTP sent" });
  if (otpData.otp !== otp) return res.status(400).json({ error: "Invalid OTP" });
  if (Date.now() > otpData.expires) return res.status(400).json({ error: "OTP expired" });
  otps.delete(contact);
  res.json({ ok: true });
});

// Signup
app.post('/api/signup', async (req, res) => {
  const { contact, username, password, dob } = req.body;
  const contactType = validator.isEmail(contact)
    ? "email"
    : (/^[6-9]\d{9}$/.test(contact) ? "mobile" : null);

  if (!contactType) return res.status(400).json({ error: "Invalid email or Indian mobile number" });
  if (!username || !password || !dob) return res.status(400).json({ error: "All fields required" });

  const users = readUsers();
  if (users.find(u => u.contact === contact)) return res.status(400).json({ error: "Contact already registered" });
  if (users.find(u => u.username === username)) return res.status(400).json({ error: "Username taken" });

  const passwordHash = await bcrypt.hash(password, 10);
  users.push({ contact, contactType, username, passwordHash, dob });
  writeUsers(users);

  res.json({ ok: true });
});

// Login
app.post('/api/login', async (req, res) => {
  const { contact, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.contact === contact);
  if (!user) return res.status(401).json({ error: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: "Invalid credentials" });

  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { contact, username: user.username, created: Date.now() });
  res.json({ token });
});

// Auth middleware
function authMiddleware(req, res, next) {
  const token = req.query.token || req.headers['authorization'];
  if (!token || !sessions.has(token)) return res.status(401).json({ error: "Unauthorized" });
  req.user = sessions.get(token);
  next();
}

// Movies API
app.get('/api/movies', authMiddleware, (req, res) => {
  const files = fs.readdirSync(MOVIES_DIR).filter(f => f.endsWith('.mp4'));
  const movies = files.map(f => ({ name: f, url: `/movies/${f}` }));
  res.json({ movies });
});

// Serve movies securely
app.get('/movies/:filename', authMiddleware, (req, res) => {
  const filePath = path.join(MOVIES_DIR, req.params.filename);
  if (!fs.existsSync(filePath)) return res.status(404).send("Not found");
  res.sendFile(filePath);
});

// Start server
app.listen(PORT, '0.0.0.0', () => console.log(`Andhrawala server running on :${PORT}`));
