// src/booking/admin.routes.js
const express = require('express');
const { ADMIN } = require('../auth/guards');
const { appointmentsRepo, doctorsRepo } = require('../db');

const router = express.Router();

// утилиты
const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
function todayISO() {
  const d = new Date();
  d.setHours(0,0,0,0);
  return d.toISOString().slice(0,10);
}

/**
 * [ADMIN] Список записей (с пагинацией и фильтрами)
 * GET /api/appointments?doctorId=&date=YYYY-MM-DD&from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&limit=20
 * По умолчанию: будущие и текущие записи (от сегодня), сортировка по дате/времени.
 */
router.get('/appointments', ADMIN, async (req, res, next) => {
  try {
    const repo = appointmentsRepo();

    const doctorId = req.query.doctorId ? Number(req.query.doctorId) : null;
    const date = req.query.date;
    const from = req.query.from;
    const to = req.query.to;

    let page = Number(req.query.page || 1);
    let limit = Number(req.query.limit || 20);
    if (!Number.isInteger(page) || page < 1) page = 1;
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) limit = 20;

    const qb = repo.createQueryBuilder('a');

    if (doctorId) qb.andWhere('a.doctorId = :doctorId', { doctorId });

    if (date) {
      if (!ISO_DATE.test(date)) return res.status(400).json({ error: 'date must be YYYY-MM-DD' });
      qb.andWhere('a.date = :date', { date });
    } else {
      if (from) {
        if (!ISO_DATE.test(from)) return res.status(400).json({ error: 'from must be YYYY-MM-DD' });
        qb.andWhere('a.date >= :from', { from });
      }
      if (to) {
        if (!ISO_DATE.test(to)) return res.status(400).json({ error: 'to must be YYYY-MM-DD' });
        qb.andWhere('a.date <= :to', { to });
      }
      // если нет ни date, ни from/to — по умолчанию с сегодняшнего дня
      if (!date && !from && !to) {
        const today = todayISO();
        qb.andWhere('a.date >= :today', { today });
      }
    }

    qb.orderBy('a.date', 'ASC').addOrderBy('a.time', 'ASC')
      .skip((page - 1) * limit)
      .take(limit);

    const [rows, total] = await qb.getManyAndCount();

    // подтянем имена докторов
    const docs = await doctorsRepo().find({ select: { id: true, name: true } });
    const nameById = new Map(docs.map(d => [d.id, d.name]));

    const items = rows.map(r => ({
      id: r.id,
      doctorId: r.doctorId,
      doctorName: nameById.get(r.doctorId) || null,
      date: r.date,                          // YYYY-MM-DD
      time: (r.time || '').slice(0,5),       // HH:MM
      patientName: r.patientName,
      patientPhone: r.patientPhone,
      createdAt: r.createdAt                 // ISO-string
    }));

    res.json({ items, page, limit, total });
  } catch (e) { next(e); }
});

/**
 * [ADMIN] Удалить запись (освободить слот)
 * DELETE /api/appointments/:id
 */
router.delete('/appointments/:id', ADMIN, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid_id' });
    }
    const repo = appointmentsRepo();
    const found = await repo.findOne({ where: { id } });
    if (!found) return res.status(404).json({ error: 'appointment_not_found' });

    await repo.delete({ id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

module.exports = router;
