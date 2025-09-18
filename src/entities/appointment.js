const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'Appointment',
  tableName: 'appointments',
  columns: {
    id: { type: Number, primary: true, generated: true },
    doctorId: { type: Number, nullable: false },
    date: { type: 'date', nullable: false },     // YYYY-MM-DD
    time: { type: 'time', nullable: false },     // HH:MM:SS
    patientName: { type: String, nullable: false },
    patientPhone: { type: String, nullable: false },
    createdAt: { type: 'timestamptz', createDate: true },
  },
  indices: [
    { columns: ['doctorId', 'date', 'time'], unique: true }, // один пациент на слот
  ],
});
