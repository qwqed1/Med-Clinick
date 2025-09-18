const express = require('express');
const { PUBLIC } = require('../auth/guards');
const { appointmentsRepo } = require('../db');

const router = express.Router();

/** Настройки рабочих слотов*/
const SLOT_MINUTES = 30;
const WORK_START = '09:00'; // включительно
const WORK_END   = '13:00'; // не включительно: последний слот 12:30

function toMinutes(hhmm) { const [h,m]=hhmm.split(':').map(Number); return h*60+m; }
function pad2(n){ return String(n).padStart(2,'0'); }
function minutesToHHMM(min){ const h=Math.floor(min/60), m=min%60; return `${pad2(h)}:${pad2(m)}`; }
function generateDaySlots() {
  const start = toMinutes(WORK_START);
  const end = toMinutes(WORK_END);
  const slots = [];
  for (let t = start; t < end; t += SLOT_MINUTES) slots.push(minutesToHHMM(t));
  return slots;
}
const DAY_SLOTS = generateDaySlots();

/** GET /api/availability?doctorId=1&year=2025&month=9  (month = 1..12) */
router.get('/availability', PUBLIC, async (req, res, next) => {
  try {
    const doctorId = Number(req.query.doctorId);
    const year = Number(req.query.year);
    const month = Number(req.query.month); // 1..12

    if (!doctorId || !year || !month) {
      return res.status(400).json({ error: 'doctorId, year, month are required' });
    }

    // границы месяца
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // последний день

    const repo = appointmentsRepo();
    const rows = await repo.createQueryBuilder('a')
      .select(['a.date', 'COUNT(*)::int AS cnt'])
      .where('a.doctorId = :doctorId', { doctorId })
      .andWhere('a.date BETWEEN :from AND :to', { from: startDate, to: endDate })
      .groupBy('a.date')
      .getRawMany();

    // превращаем в map YYYY-MM-DD -> count
    const counts = new Map(rows.map(r => [r.a_date?.toISOString?.().slice(0,10) ?? r.date, Number(r.cnt)]));

    const daysInMonth = endDate.getDate();
    const today = new Date(); today.setHours(0,0,0,0);

    const out = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const jsDate = new Date(year, month - 1, d);
      const dateStr = jsDate.toISOString().slice(0,10);
      // Выходные делаем недоступными (пример). Пн=1..Вс=0
      const dow = jsDate.getDay(); // 0..6
      const isWeekend = (dow === 0) || (dow === 6);

      let status = 'available';
      if (jsDate < today) status = 'unavailable';
      else if (isWeekend) status = 'unavailable';
      else {
        const booked = counts.get(dateStr) || 0;
        if (booked >= DAY_SLOTS.length) status = 'unavailable';
      }

      out.push({ day: d, status });
    }
    res.json(out);
  } catch (e) { next(e); }
});

/** GET /api/timeslots?doctorId=1&date=YYYY-MM-DD */
router.get('/timeslots', PUBLIC, async (req, res, next) => {
  try {
    const doctorId = Number(req.query.doctorId);
    const date = req.query.date; // YYYY-MM-DD

    if (!doctorId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ error: 'doctorId and date(YYYY-MM-DD) are required' });
    }

    const repo = appointmentsRepo();
    const booked = await repo.find({ where: { doctorId, date } });
    const bookedSet = new Set(booked.map(b => (b.time || '').slice(0,5))); // HH:MM

    const slots = DAY_SLOTS.map(t => ({
      time: t,
      status: bookedSet.has(t) ? 'unavailable' : 'available',
    }));

    res.json(slots);
  } catch (e) { next(e); }
});

/** POST /api/book  (публично)
 * body: { doctorId, date:'YYYY-MM-DD', time:'HH:MM', patientName, patientPhone }
 */
router.post('/book', PUBLIC, async (req, res, next) => {
  try {
    const { doctorId, date, time, patientName, patientPhone } = req.body ?? {};
    if (!doctorId || !date || !time || !patientName || !patientPhone) {
      return res.status(400).json({ success: false, message: 'Missing fields' });
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'date must be YYYY-MM-DD' });
    }
    if (!/^\d{2}:\d{2}$/.test(time)) {
      return res.status(400).json({ success: false, message: 'time must be HH:MM' });
    }
    // валидный слот?
    if (!DAY_SLOTS.includes(time)) {
      return res.status(400).json({ success: false, message: 'Invalid time slot' });
    }

    // запрет брони в прошлом
    const now = new Date(); now.setSeconds(0,0);
    const target = new Date(`${date}T${time}:00`);
    if (target < now) {
      return res.status(400).json({ success: false, message: 'Past time not allowed' });
    }

    const repo = appointmentsRepo();
    // пробуем сохранить — уникальный индекс защитит от гонок
    const appt = repo.create({
      doctorId: Number(doctorId),
      date,
      time: `${time}:00`,
      patientName,
      patientPhone,
    });
    try {
      await repo.save(appt);
    } catch (err) {
      // дубликат (уникальный индекс)
      return res.status(409).json({ success: false, message: 'This slot is already booked' });
    }
    res.json({ success: true, message: 'Запись успешно создана' });
  } catch (e) { next(e); }
});

module.exports = router;
