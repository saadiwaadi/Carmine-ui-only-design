const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const prisma = require('../prisma');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
});

router.post('/login', loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const admin = await prisma.admin.findUnique({ where: { email: String(email).toLowerCase() } });
  if (!admin) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const valid = await bcrypt.compare(password, admin.passwordHash);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }

  const token = jwt.sign({ sub: admin.id, email: admin.email }, process.env.JWT_SECRET, {
    expiresIn: '12h',
  });

  res.json({ token, email: admin.email });
});

router.get('/me', requireAdmin, (req, res) => {
  res.json({ email: req.admin.email });
});

module.exports = router;
