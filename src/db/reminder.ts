import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

export class CustomerReminder extends Model<
    InferAttributes<CustomerReminder>,
    InferCreationAttributes<CustomerReminder>
> {
    declare id: CreationOptional<string>;
    declare customerId: string;
    declare userId: string;
    declare description: string | null;
    declare dueDate: Date;
    declare dateCompleted: CreationOptional<Date> | null;
    declare priority: CreationOptional<'low' | 'medium' | 'high'>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

export function defineCustomerReminderModel(sequelize: Sequelize) {
    return CustomerReminder.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            customerId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            userId: {
                type: DataTypes.STRING,
                allowNull: false
            },
            description: {
                type: new DataTypes.TEXT,
                allowNull: true
            },
            dueDate: {
                type: DataTypes.DATE,
                allowNull: false
            },
            dateCompleted: {
                type: DataTypes.DATE,
                allowNull: true,
                defaultValue: null
            },
            priority: {
                type: DataTypes.ENUM('low', 'medium', 'high'),
                defaultValue: 'medium'
            },
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
        {
            sequelize,
            tableName: "reminders",
            timestamps: true,
            indexes: [
                {
                    fields: ['customerId']
                },
                {
                    fields: ['userId']
                },
                {
                    fields: ['dueDate']
                },
                {
                    fields: ['dateCompleted']
                }
            ]
        }
    )
}