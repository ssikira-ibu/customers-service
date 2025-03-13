import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

export class CustomerPhone extends Model<
    InferAttributes<CustomerPhone>,
    InferCreationAttributes<CustomerPhone>
> {
    declare id: CreationOptional<string>;
    declare customerId: string;
    declare phoneNumber: string;
    declare designation: string; // e.g., 'home', 'work', 'mobile'

    // Timestamps
    declare readonly createdAt: CreationOptional<Date>;
    declare readonly updatedAt: CreationOptional<Date>;
}

export function initCustomerPhone(sequelize: Sequelize): void {
    CustomerPhone.init(
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
            phoneNumber: {
                type: new DataTypes.STRING(128),
                allowNull: false
            },
            designation: {
                type: new DataTypes.STRING(128),
                allowNull: false
            },
            createdAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            updatedAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
        },
        {
            tableName: 'phonenumbers',
            sequelize,
            timestamps: true,
        });
}
