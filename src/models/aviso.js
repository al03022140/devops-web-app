import { DataTypes, Model } from 'sequelize';

export class Aviso extends Model {}

export async function defineAviso(sequelize) {
  Aviso.init(
    {
      aviso_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      titulo: {
        type: DataTypes.STRING(200),
        allowNull: false
      },
      descripcion: {
        type: DataTypes.TEXT,
        allowNull: false
      },
      fecha_inicio_semana: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      fecha_fin_semana: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      creado_por: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      activo: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true
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
      modelName: 'Aviso',
      tableName: 'avisos'
    }
  );

  return Aviso;
}