import { defineUsuario, Usuario } from './usuario.js';
import { defineAviso, Aviso } from './aviso.js';
import { defineComentario, Comentario } from './comentario.js';
import { defineMetricaSemanal, MetricaSemanal } from './metrica_semanal.js';
import { defineAvisoImagen, AvisoImagen } from './aviso_imagen.js';

export async function initModels(sequelize) {
  defineUsuario(sequelize);
  defineAviso(sequelize);
  defineComentario(sequelize);
  defineMetricaSemanal(sequelize);
  defineAvisoImagen(sequelize);

  // Asociaciones
  // Usuario 1—N Aviso (creado_por)
  Usuario.hasMany(Aviso, { foreignKey: 'creado_por', as: 'avisos_creados' });
  Aviso.belongsTo(Usuario, { foreignKey: 'creado_por', as: 'creador' });

  // Aviso 1—N Comentario
  Aviso.hasMany(Comentario, { foreignKey: 'aviso_id', as: 'comentarios' });
  Comentario.belongsTo(Aviso, { foreignKey: 'aviso_id', as: 'aviso' });

  // Usuario 1—N Comentario
  Usuario.hasMany(Comentario, { foreignKey: 'usuario_id', as: 'comentarios' });
  Comentario.belongsTo(Usuario, { foreignKey: 'usuario_id', as: 'autor' });

  // Aviso 1—N AvisoImagen
  Aviso.hasMany(AvisoImagen, { foreignKey: 'aviso_id', as: 'imagenes' });
  AvisoImagen.belongsTo(Aviso, { foreignKey: 'aviso_id', as: 'aviso' });
  // sincronización se realiza en server.js
}

export { Usuario } from './usuario.js';
export { Aviso } from './aviso.js';
export { Comentario } from './comentario.js';
export { MetricaSemanal } from './metrica_semanal.js';
export { AvisoImagen } from './aviso_imagen.js';