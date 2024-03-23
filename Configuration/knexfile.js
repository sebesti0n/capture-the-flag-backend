const dotenv = require('dotenv');
dotenv.config();

module.exports = {
  development: {
    client: 'pg',
    connection: {
      connectionString:'postgres://postgres:new_password@db:5432/postgres',
      // ssl: { rejectUnauthorized: false },
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: '../Migrations',
      client: 'pg',
    },
  },
};
