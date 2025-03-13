import { Sequelize } from 'sequelize';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in environment variables.');
}

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: console.log, // Optional: for debugging SQL queries
});

export function authenticate() {
    sequelize.authenticate()
        .then(() => console.log('Connection to PostgreSQL established successfully.'))
        .catch(err => console.error('Unable to connect to the database:', err));
}
