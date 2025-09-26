import { DataTypes, Model } from 'sequelize';

export class Usuario extends Model {}

export async function defineUsuario(sequelize) {
  Usuario.init(
    {
      usuario_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      nombre: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      email: {
        type: DataTypes.STRING(150),
        allowNull: false,
        unique: true,
        validate: { isEmail: true }
      },
      contraseña_hash: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      rol: {
        type: DataTypes.ENUM('administrador', 'editor', 'visualizador'),
        allowNull: false,
        defaultValue: 'visualizador'
      },
      createdAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      },
      updatedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
      }
    },
    {
      sequelize,
      modelName: 'Usuario',
      tableName: 'usuarios'
    }
  );

  return Usuario;
}