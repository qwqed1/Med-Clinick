const bcrypt = require('bcrypt');
const { usersRepo } = require('./db');

const SUPERADMIN_LOGIN = process.env.SUPERADMIN_LOGIN || 'superadmin';
const SUPERADMIN_PASSWORD = process.env.SUPERADMIN_PASSWORD || 'supersecret';

async function ensureSuperadminExists() {
  const repo = usersRepo();

  // проверяем, есть ли уже супер
  const existingSuper = await repo.findOne({ where: { role: 'superadmin' } });
  if (existingSuper) return;

  // создаём единственного
  const hash = await bcrypt.hash(SUPERADMIN_PASSWORD, 10);
  const sa = repo.create({
    login: SUPERADMIN_LOGIN,
    password: hash,
    role: 'superadmin',
  });
  await repo.save(sa);
  console.log(`[seed] superadmin created: ${SUPERADMIN_LOGIN}`);
}

module.exports = ensureSuperadminExists; // <-- дефолт-экспорт ФУНКЦИИ
