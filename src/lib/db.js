import { Sequelize } from 'sequelize';
import dotenv from 'dotenv';

dotenv.config();

const isTest = process.env.NODE_ENV === 'test';

let sequelize;
if (isTest) {
  // In tests, use in-memory sqlite for speed and isolation
  // Use dialect+storage to avoid Node.js deprecation warnings for sqlite URLs
  sequelize = new Sequelize({ dialect: 'sqlite', storage: ':memory:', logging: false });
} else {
  const { DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD } = process.env;
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
    host: DB_HOST,
    port: DB_PORT,
    dialect: 'mysql',
    logging: false
  });
}

export { sequelize };