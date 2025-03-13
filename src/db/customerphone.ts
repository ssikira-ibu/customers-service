import { Model, DataTypes, Sequelize } from 'sequelize';

export class CustomerPhone extends Model {
    public id!: string;
    public customerId!: string;
    public phoneNumber!: string;
    public designation!: string; // e.g., 'home', 'work', 'mobile'

    // Timestamps
    public readonly createdAt!: Date;
    public readonly updatedAt!: Date;
}

export function initCustomerPhone(sequelize: Sequelize): void {
    CustomerPhone.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true,
        },
        customerId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        phoneNumber: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        designation: {
            allowNull: false,
            type: DataTypes.ENUM('home', 'work', 'mobile', 'other'),
        },
    }, {
        tableName: 'customer_phones',
        sequelize,
        timestamps: true,
    });
}
