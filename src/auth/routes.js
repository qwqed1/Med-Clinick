const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { usersRepo } = require('../db');
const { PUBLIC, AUTH } = require('./guards');

const JWT_SECRET = process.env.JWT_SECRET || 'dev_jwt';
const JWT_TTL = process.env.JWT_TTL || '7d';

function signToken(user) {
  return jwt.sign({ sub: user.id, login: user.login, role: user.role }, JWT_SECRET, { expiresIn: JWT_TTL });
}

const router = express.Router();

// Public: логин -> JWT
router.post('/auth/login', PUBLIC, async (req, res, next) => {
  try {
    const { login, password } = req.body ?? {};
    if (!login || !password) return res.status(400).json({ error: 'login and password required' });

    const repo = usersRepo();
    const user = await repo.findOne({ where: { login } });
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: 'invalid_credentials' });

    const token = signToken(user);
    res.json({ token, user: { id: user.id, login: user.login, role: user.role } });
  } catch (e) { next(e); }
});

// Auth: профиль из токена
router.get('/auth/me', AUTH, async (req, res) => {
  res.json({ id: req.user.sub, login: req.user.login, role: req.user.role });
});

module.exports = router;
