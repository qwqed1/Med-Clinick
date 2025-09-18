// src/entities/doctor.js
const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Doctor',
  tableName: 'doctors',
  columns: {
    id: { type: Number, primary: true, generated: true },
    name: { type: String, nullable: false },
    specialty: { type: String, nullable: false },

    // Храним ТОЛЬКО дату начала практики
    // Формат ожидаем ISO (YYYY-MM-DD), в БД это date
    startedAt: { type: 'date', nullable: false },

    degree: { type: String, nullable: true },
    imageUrl: { type: String, nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
});
