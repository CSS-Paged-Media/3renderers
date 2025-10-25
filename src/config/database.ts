import { Sequelize } from 'sequelize';

// Initialize Sequelize with PostgreSQL connection
// Configuration can be adjusted via environment variables
export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'pdfgen',
  username: process.env.POSTGRES_USER || 'pdfuser',
  password: process.env.POSTGRES_PASSWORD || 'password',
  logging: process.env.NODE_ENV === 'development' ? console.log : false,
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});