const express = require('express');
const { doctorsRepo } = require('../db');
const { PUBLIC, ADMIN } = require('../auth/guards');

const router = express.Router();

// хелпер: корректно считаем полные годы между датами
function fullYearsSince(dateStr) {
  const start = new Date(dateStr);           // YYYY-MM-DD
  const now = new Date();
  let years = now.getFullYear() - start.getFullYear();
  const m = now.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < start.getDate())) years -= 1;
  return Math.max(0, years);
}

/** Публично: список докторов */
router.get('/doctors', PUBLIC, async (req, res, next) => {
  try {
    const repo = doctorsRepo();
    const list = await repo.find({ order: { id: 'ASC' } });
    const shaped = list.map(d => ({
      id: d.id,
      name: d.name,
      specialty: d.specialty,
      // считаем на лету
      experience: `${fullYearsSince(d.startedAt)} лет`,
      degree: d.degree,
      imageUrl: d.imageUrl,
    }));
    res.json(shaped);
  } catch (e) { next(e); }
});

/** Добавить доктора (admin/superadmin)
 * body: { name, specialty, startedAt, degree?, imageUrl? }
 * startedAt — обязательна, строка 'YYYY-MM-DD'
 */
router.post('/doctors', ADMIN, async (req, res, next) => {
  try {
    const { name, specialty, startedAt, degree, imageUrl } = req.body ?? {};
    if (!name || !specialty || !startedAt) {
      return res.status(400).json({ error: 'name, specialty, startedAt are required' });
    }
    // базовая валидация даты
    const d = new Date(startedAt);
    const valid =
      typeof startedAt === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(startedAt) &&
      !Number.isNaN(d.getTime());
    if (!valid) return res.status(400).json({ error: 'startedAt must be YYYY-MM-DD' });

    // нельзя быть «из будущего»
    if (new Date(startedAt) > new Date()) {
      return res.status(400).json({ error: 'startedAt cannot be in the future' });
    }

    const repo = doctorsRepo();
    const doctor = repo.create({
      name,
      specialty,
      startedAt,                 // сохраняем как date
      degree: degree ?? null,
      imageUrl: imageUrl ?? null,
    });
    await repo.save(doctor);

    res.status(201).json({
      id: doctor.id,
      name: doctor.name,
      specialty: doctor.specialty,
      startedAt: doctor.startedAt,           // сырой атрибут (если нужно)
      experience: `${fullYearsSince(doctor.startedAt)} лет`,
      degree: doctor.degree,
      imageUrl: doctor.imageUrl,
    });
  } catch (e) { next(e); }
});

/** Удалить доктора по id (admin/superadmin) */
router.delete('/doctors/:id', ADMIN, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid_id' });
    }
    const repo = doctorsRepo();
    const found = await repo.findOne({ where: { id } });
    if (!found) return res.status(404).json({ error: 'doctor_not_found' });

    await repo.delete({ id });
    res.json({ ok: true });
  } catch (e) { next(e); }
});

router.put('/doctors/:id', ADMIN, async (req, res, next) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ error: 'invalid_id' });
    }

    const { name, specialty, startedAt, degree, imageUrl } = req.body ?? {};
    const repo = doctorsRepo();

    // проверяем, есть ли врач
    const found = await repo.findOne({ where: { id } });
    if (!found) return res.status(404).json({ error: 'doctor_not_found' });

    // если передана startedAt — валидируем
    if (startedAt !== undefined) {
      const d = new Date(startedAt);
      const valid =
        typeof startedAt === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(startedAt) &&
        !Number.isNaN(d.getTime());
      if (!valid) return res.status(400).json({ error: 'startedAt must be YYYY-MM-DD' });

      if (new Date(startedAt) > new Date()) {
        return res.status(400).json({ error: 'startedAt cannot be in the future' });
      }

      found.startedAt = startedAt;
    }

    // обновляем только те поля, что пришли
    if (name !== undefined) found.name = name;
    if (specialty !== undefined) found.specialty = specialty;
    if (degree !== undefined) found.degree = degree;
    if (imageUrl !== undefined) found.imageUrl = imageUrl;

    await repo.save(found);

    res.json({
      id: found.id,
      name: found.name,
      specialty: found.specialty,
      startedAt: found.startedAt,
      experience: `${fullYearsSince(found.startedAt)} лет`,
      degree: found.degree,
      imageUrl: found.imageUrl,
    });
  } catch (e) { next(e); }
});

module.exports = router;
