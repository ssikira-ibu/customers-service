import { Model, DataTypes, Sequelize, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

export class CustomerAddress extends Model<
    InferAttributes<CustomerAddress>,
    InferCreationAttributes<CustomerAddress>
> {
    declare id: CreationOptional<string>;
    declare customerId: string;
    declare street: string;
    declare city: string;
    declare state: string;
    declare postalCode: string;
    declare country: string;
    declare addressType: CreationOptional<string>;

    // Mark these as CreationOptional
    declare readonly createdAt: CreationOptional<Date>;
    declare readonly updatedAt: CreationOptional<Date>;
}

export function initAddress(sequelize: Sequelize) {
    return CustomerAddress.init(
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
            street: {
                type: new DataTypes.STRING(128),
                allowNull: false
            },
            city: {
                type: new DataTypes.STRING(128),
                allowNull: false
            },
            state: {
                type: new DataTypes.STRING(128),
                allowNull: false
            },
            postalCode: {
                type: new DataTypes.STRING(128),
                allowNull: false
            },
            country: {
                type: new DataTypes.STRING(128),
                allowNull: false
            },
            addressType: {
                type: new DataTypes.STRING(128),
                allowNull: true
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
            sequelize,
            tableName: "addresses",
            timestamps: true
        }
    );
}
