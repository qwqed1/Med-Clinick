// Таблица users: id, login, password (hash), role: 'admin' | 'superadmin'
const { EntitySchema } = require('typeorm');

module.exports = new EntitySchema({
  name: 'User',
  tableName: 'users',
  columns: {
    id: {
      type: Number,
      primary: true,
      generated: true,
    },
    login: {
      type: String,
      unique: true,
      nullable: false,
    },
    password: {
      type: String,
      nullable: false,
    },
    role: {
      type: 'enum',
      enum: ['admin', 'superadmin'],
      enumName: 'user_role_enum',
      default: 'admin',
    },
  },
});
