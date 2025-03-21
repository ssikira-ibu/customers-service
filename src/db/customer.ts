import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

export class Customer extends Model<
    InferAttributes<Customer>,
    InferCreationAttributes<Customer>
> {
    declare id: CreationOptional<string>;
    declare userId: string; // References to the user table, owner of the customer
    declare firstName: string;
    declare lastName: string;
    declare email: string;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

export function defineCustomerModel(sequelize: Sequelize) {
    return Customer.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            userId: {
                type: DataTypes.STRING,
                allowNull: false
            },
            firstName: {
                type: new DataTypes.STRING(128),
                allowNull: false
            },
            lastName: {
                type: new DataTypes.STRING(128),
                allowNull: false
            },
            email: {
                type: new DataTypes.STRING(128),
                allowNull: false
            },
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
        {
            sequelize,
            tableName: "customers",
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ['email', 'userId'],
                    name: 'customers_email_userId_unique'
                }
            ]
        }
    )
}