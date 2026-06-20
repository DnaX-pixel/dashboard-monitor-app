const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db/database');
const requireAuth = require('../middleware/auth');

router.post('/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'name, email and password are required' });
  }
  const hash = bcrypt.hashSync(password, 10);
  try {
    const result = db.prepare(
      'INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)'
    ).run([name, email.toLowerCase(), hash]);

    const user = db.prepare(
      'SELECT user_id, name, email, is_admin, created_at FROM users WHERE user_id = ?'
    ).get([result.lastInsertRowid]);

    const token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.status(201).json({ token, user });
  } catch (err) {
    if (err.message && err.message.includes('UNIQUE')) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    throw err;
  }
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'email and password are required' });
  }
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get([email.toLowerCase()]);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  const token = jwt.sign(
    { user_id: user.user_id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
  const { password_hash, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

router.get('/me', requireAuth, (req, res) => {
  const user = db.prepare(
    'SELECT user_id, name, email, is_admin, created_at FROM users WHERE user_id = ?'
  ).get([req.user.user_id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

module.exports = router;
