// server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');
const crypto = require('crypto');

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

// Simple in-memory sessions (demo). Use DB or JWT for production.
const sessions = new Map();

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Signup
app.post('/api/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username & password required' });
  const users = readUsers();
  if (users.find(u => u.username === username)) return res.status(400).json({ error: 'user exists' });
  const hash = await bcrypt.hash(password, 10);
  users.push({ username, passwordHash: hash });
  writeUsers(users);
  return res.json({ ok: true });
});

// Login
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  const users = readUsers();
  const user = users.find(u => u.username === username);
  if (!user) return res.status(401).json({ error: 'invalid' });
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(401).json({ error: 'invalid' });
  const token = crypto.randomBytes(24).toString('hex');
  sessions.set(token, { username, created: Date.now() });
  res.json({ token });
});

// middleware: check auth token header 'x-auth-token'
function requireAuth(req, res, next) {
  const token = req.headers['x-auth-token'] || req.query.token;
  if (!token || !sessions.has(token)) return res.status(401).json({ error: 'unauthorized' });
  req.user = sessions.get(token);
  next();
}

// List movies
app.get('/api/movies', requireAuth, (req, res) => {
  const files = fs.existsSync(MOVIES_DIR) ? fs.readdirSync(MOVIES_DIR) : [];
  const movies = files.filter(f => /\.(mp4|mkv|webm)$/i.test(f)).map(f => ({ name: f, url: `/video/${encodeURIComponent(f)}` }));
  res.json({ movies });
});

// Stream endpoint supporting Range header
app.get('/video/:name', requireAuth, (req, res) => {
  const name = req.params.name;
  const filePath = path.join(MOVIES_DIR, name);
  if (!fs.existsSync(filePath)) return res.status(404).send('Not found');

  const stat = fs.statSync(filePath);
  const total = stat.size;
  const range = req.headers.range;
  if (range) {
    const parts = range.replace(/bytes=/, '').split('-');
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : total - 1;
    if (start >= total || end >= total) {
      res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + total);
      return;
    }
    res.writeHead(206, {
      'Content-Range': `bytes ${start}-${end}/${total}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': (end - start) + 1,
      'Content-Type': 'video/mp4'
    });
    const stream = fs.createReadStream(filePath, { start, end });
    stream.pipe(res);
  } else {
    res.writeHead(200, {
      'Content-Length': total,
      'Content-Type': 'video/mp4'
    });
    fs.createReadStream(filePath).pipe(res);
  }
});

// Static pages: signup/login use /static pages
app.use('/app', express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => console.log(`andhrawala server running on :${PORT}`));
