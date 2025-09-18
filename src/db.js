require('dotenv').config();
const { DataSource } = require('typeorm');
const User = require('./entities/user');
const Doctor = require('./entities/doctor');
const Appointment = require('./entities/appointment');

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: Number(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: true,
  logging: false,
  entities: [User, Doctor, Appointment],
});

// функция-обёртка: всегда возвращает репозиторий User
function usersRepo() {
  return dataSource.getRepository('User'); // имя как в EntitySchema.name
}
function doctorsRepo() {
  return dataSource.getRepository('Doctor');   // имя = 'Doctor'
}
function appointmentsRepo() { return dataSource.getRepository('Appointment'); }

module.exports = {
  dataSource,
  usersRepo,
  doctorsRepo,
  appointmentsRepo
};
