import { Sequelize, DataTypes, Model, InferAttributes, InferCreationAttributes, CreationOptional } from 'sequelize';

// Represents a Firebase Auth user 
export class User extends Model<
    InferAttributes<User>,
    InferCreationAttributes<User>
> {
    declare id: string;
    declare email: string;
    declare displayName: string;
    declare emailVerified: boolean;
    declare photoURL: CreationOptional<string>;
    declare disabled: boolean;
    declare lastSignInTime: CreationOptional<Date>;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
}

export function defineUserModel(sequelize: Sequelize) {
    return User.init(
        {
            id: {
                type: DataTypes.STRING,
                primaryKey: true
            },
            email: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            displayName: {
                type: DataTypes.STRING,
                allowNull: false
            },
            emailVerified: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            photoURL: {
                type: DataTypes.STRING,
                allowNull: true
            },
            disabled: {
                type: DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false
            },
            lastSignInTime: {
                type: DataTypes.DATE,
                allowNull: true
            },
            createdAt: DataTypes.DATE,
            updatedAt: DataTypes.DATE,
        },
        {
            sequelize,
            tableName: "users",
            timestamps: true,
            indexes: [
                {
                    unique: true,
                    fields: ['email']
                }
            ]
        }
    )
}