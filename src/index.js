require('dotenv').config();
const express = require('express');
const { dataSource } = require('./db');
const { attachUserIfToken, PUBLIC } = require('./auth/guards');
const authRoutes = require('./auth/routes');
const adminRoutes = require('./admin/routes');
const ensureSuperadminExists = require('./bootstrap');
const doctorsRoutes = require('./doctors/routes');
const bookingRoutes = require('./booking/routes');
const bookingAdminRoutes = require('./booking/admin.routes');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(attachUserIfToken);

app.get('/', PUBLIC, (req, res) => res.send('Hello (public)'));
app.use('/api', authRoutes);
app.use('/api', adminRoutes);
app.use('/api', doctorsRoutes);
app.use('/api', bookingRoutes);
app.use('/api', bookingAdminRoutes);


app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'internal_error' });
});

dataSource.initialize()
  .then(async () => {
    await ensureSuperadminExists(); // <-- теперь это точно функция
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('DB init error:', err);
    process.exit(1);
  });
