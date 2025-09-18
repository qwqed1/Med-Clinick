const express = require('express');
const bcrypt = require('bcrypt');
const { usersRepo } = require('../db');
const { ADMIN, SUPER } = require('../auth/guards');

const router = express.Router();

// Создать админа (любой admin/superadmin)
router.post('/admins', ADMIN, async (req, res, next) => {
  try {
    const { login, password } = req.body ?? {};
    if (!login || !password) return res.status(400).json({ error: 'login and password required' });
    if (password.length < 6) return res.status(400).json({ error: 'password too short' });

    const repo = usersRepo();
    const exists = await repo.findOne({ where: { login } });
    if (exists) return res.status(409).json({ error: 'login_exists' });

    const hash = await bcrypt.hash(password, 10);
    const newAdmin = repo.create({ login, password: hash, role: 'admin' });
    await repo.save(newAdmin);

    res.status(201).json({ id: newAdmin.id, login: newAdmin.login, role: newAdmin.role });
  } catch (e) { next(e); }
});

// Удалить админа (только супер)
router.delete('/admins/:login', SUPER, async (req, res, next) => {
  try {
    const targetLogin = req.params.login;
    const repo = usersRepo();

    const target = await repo.findOne({ where: { login: targetLogin } });
    if (!target) return res.status(404).json({ error: 'user_not_found' });
    if (target.role === 'superadmin') return res.status(400).json({ error: 'superadmin_cannot_be_deleted' });

    await repo.delete({ id: target.id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

// Список админов (любой admin/superadmin)
router.get('/admins', ADMIN, async (req, res, next) => {
  try {
    const repo = usersRepo();
    const list = await repo.find();
    res.json(list.map(u => ({ id: u.id, login: u.login, role: u.role })));
  } catch (e) { next(e); }
});

module.exports = router;
