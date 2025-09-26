import { DataTypes, Model } from 'sequelize';

export class Comentario extends Model {}

export async function defineComentario(sequelize) {
  Comentario.init(
    {
      comentario_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      aviso_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      usuario_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      comentario: {
        type: DataTypes.TEXT,
        allowNull: false
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
      modelName: 'Comentario',
      tableName: 'comentarios'
    }
  );

  return Comentario;
}