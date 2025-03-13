import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

export class CustomerNote extends Model<
    InferAttributes<CustomerNote>,
    InferCreationAttributes<CustomerNote>
> {
    declare id: CreationOptional<string>;
    declare customerId: string;
    declare note: string;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

export function defineCustomerNoteModel(sequelize: Sequelize) {
    return CustomerNote.init(
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            customerId: {
                type: new DataTypes.UUID,
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