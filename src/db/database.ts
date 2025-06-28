import { Sequelize } from 'sequelize';
import { Customer, defineCustomerModel } from './customer';
import { CustomerNote, defineCustomerNoteModel } from './note';
import { CustomerPhone, initCustomerPhone } from './customerphone';
import { logger } from '../logging';
import { CustomerAddress, initAddress } from './address';
import { CustomerReminder, defineCustomerReminderModel } from './reminder';
import { User, defineUserModel } from './user';
if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not defined in environment variables.');
}

export const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: false, // Optional: for debugging SQL queries
});

export async function initializeDatabase() {
    try {
        await sequelize.authenticate();
        logger.info('Connection to PostgreSQL established successfully.');

        defineCustomerModel(sequelize);
        defineCustomerNoteModel(sequelize);
        initCustomerPhone(sequelize);
        initAddress(sequelize);
        defineCustomerReminderModel(sequelize);
        defineUserModel(sequelize);

        Customer.hasMany(CustomerNote, {
            foreignKey: 'customerId',
            as: 'notes'
        });

        CustomerNote.belongsTo(Customer, {
            foreignKey: 'customerId'
        });

        Customer.hasMany(CustomerPhone, { foreignKey: 'customerId', as: 'phones' });
        CustomerPhone.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

        Customer.hasMany(CustomerAddress, { foreignKey: 'customerId', as: 'addresses' });
        CustomerAddress.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

        Customer.hasMany(CustomerReminder, { foreignKey: 'customerId', as: 'reminders' });
        CustomerReminder.belongsTo(Customer, { foreignKey: 'customerId', as: 'customer' });

        Customer.belongsTo(User, { foreignKey: 'userId', as: 'user' });
        User.hasMany(Customer, { foreignKey: 'userId', as: 'customers' });

        logger.info('Database models and associations initialized successfully.');
    } catch (error) {
        logger.error('Unable to connect to the database:', error);
        throw error
    }
}