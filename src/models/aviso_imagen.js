import { DataTypes, Model } from 'sequelize';

export class AvisoImagen extends Model {}

export async function defineAvisoImagen(sequelize) {
  AvisoImagen.init(
    {
      aviso_imagen_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        autoIncrement: true,
        primaryKey: true
      },
      aviso_id: {
        type: DataTypes.INTEGER.UNSIGNED,
        allowNull: false
      },
      nombre_archivo: {
        type: DataTypes.STRING(255),
        allowNull: false
      },
      tipo_mime: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      datos: {
        type: DataTypes.BLOB('long'),
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
      modelName: 'AvisoImagen',
      tableName: 'aviso_imagenes',
      indexes: [
        { name: 'idx_aviso_imagenes_aviso_id', fields: ['aviso_id'] }
      ]
    }
  );

  return AvisoImagen;
}