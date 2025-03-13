import { Sequelize } from 'sequelize';
import { Customer, defineCustomerModel } from './customer';
import { CustomerNote, defineCustomerNoteModel } from './note';
import { CustomerPhone, initCustomerPhone } from './customerphone';
import { logger } from '../logging';

if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in environment variables.');
}

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: console.log, // Optional: for debugging SQL queries
});

export async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        logger.info('Connection to PostgreSQL established successfully.');

        defineCustomerModel(sequelize);
        defineCustomerNoteModel(sequelize);
        initCustomerPhone(sequelize);

        Customer.hasMany(CustomerNote, {
            foreignKey: 'customerId',
            as: 'notes'
        });

        CustomerNote.belongsTo(Customer, {
            foreignKey: 'customerId'
        });

        Customer.hasMany(CustomerPhone, { foreignKey: 'customerId', as: 'phones' });
        CustomerPhone.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

        await sequelize.sync({ alter: true });
        logger.info('Database synchronized successfully.');
    } catch (error) {
        logger.error('Unable to connect to the database:', error);
        throw error
    }
}