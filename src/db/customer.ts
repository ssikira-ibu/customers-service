import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

export class Customer extends Model<
    InferAttributes<Customer>,
    InferCreationAttributes<Customer>
> {
    declare id: CreationOptional<number>;
    declare firstName: string;
    declare lastName: string;
    declare email: string;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

export class CustomerNote extends Model<
    InferAttributes<CustomerNote>,
    InferCreationAttributes<CustomerNote>> {
    declare id: CreationOptional<number>;
    declare customerId: number;
    declare note: string;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

export function defineCustomerModel(sequelize: Sequelize) {
    return Customer.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true
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
            timestamps: true
        }
    )
}

export function defineCustomerNoteModel(sequelize: Sequelize) {
    return CustomerNote.init(
        {
            id: {
                type: DataTypes.INTEGER,
                autoIncrement: true,
                primaryKey: true
            },
            customerId: {
                type: new DataTypes.INTEGER(),
                allowNull: false
            },
            note: {
                type: new DataTypes.STRING(512),
                allowNull: false
            },
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
        {
            sequelize,
            tableName: "notes",
            timestamps: true
        }
    )
}

export function buildAssociations() {
    Customer.hasMany(CustomerNote, {
        foreignKey: 'customerId',
        as: 'notes'
    });

    CustomerNote.belongsTo(Customer, {
        foreignKey: 'customerId'
    });

}