import { DataTypes, Model } from 'sequelize';

export class MetricaSemanal extends Model {}

export async function defineMetricaSemanal(sequelize) {
  MetricaSemanal.init(
    {
      metrica_semana_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      semana_inicio: {
        type: DataTypes.DATEONLY,
        allowNull: false,
        unique: true
      },
      semana_fin: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      total_avisos: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      total_comentarios: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
      },
      usuarios_activos: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false,
        defaultValue: 0
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
      modelName: 'MetricaSemanal',
      tableName: 'metricas_semanales',
      indexes: [
        {
          name: 'idx_metricas_semanales_semana_inicio',
          fields: ['semana_inicio']
        }
      ]
    }
  );

  return MetricaSemanal;
}