import express from 'express';
import { query, validationResult } from 'express-validator';
import { Op, Sequelize } from 'sequelize';
import { verificarToken, requiereRol } from '../middlewares/auth.js';
import { Aviso, Comentario, MetricaSemanal } from '../models/index.js';

export const metricasRouter = express.Router();

metricasRouter.use(verificarToken);

function toDateOnlyString(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getWeekRange(dateStr) {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0=Sun .. 6=Sat
  const diffToMonday = (day + 6) % 7; // Mon=0
  const monday = new Date(d);
  monday.setDate(d.getDate() - diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { semana_inicio: toDateOnlyString(monday), semana_fin: toDateOnlyString(sunday) };
}

metricasRouter.get(
  '/semanales',
  requiereRol('administrador', 'editor', 'visualizador'),
  [
    query('desde').optional().isISO8601(),
    query('hasta').optional().isISO8601(),
    query('pagina').optional().isInt({ min: 1 }),
    query('tamanio').optional().isInt({ min: 1, max: 100 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { desde, hasta } = req.query;
    const page = Number(req.query.pagina || 1);
    const limit = Number(req.query.tamanio || 20);
    const offset = (page - 1) * limit;

    const where = {};
    if (desde) where.semana_inicio = { [Op.gte]: desde };
    if (hasta) where.semana_inicio = { ...(where.semana_inicio || {}), [Op.lte]: hasta };

    const { rows, count } = await MetricaSemanal.findAndCountAll({
      where,
      order: [['semana_inicio', 'DESC']],
      offset,
      limit
    });

    res.json({ items: rows, total: count, page, limit });
  }
);

metricasRouter.post(
  '/semanales/recalcular',
  requiereRol('administrador', 'editor'),
  [query('semana').isISO8601()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { semana } = req.query;
    const { semana_inicio, semana_fin } = getWeekRange(semana);

    // Calcular total_avisos (por rango semanal declarado en Aviso)
    const totalAvisos = await Aviso.count({
      where: {
        fecha_inicio_semana: { [Op.gte]: semana_inicio },
        fecha_fin_semana: { [Op.lte]: semana_fin }
      }
    });

    // Calcular total_comentarios (por createdAt dentro de la semana)
    const startDate = new Date(`${semana_inicio}T00:00:00`);
    const endExclusive = new Date(`${semana_fin}T00:00:00`);
    endExclusive.setDate(endExclusive.getDate() + 1);

    const totalComentarios = await Comentario.count({
      where: {
        createdAt: { [Op.gte]: startDate, [Op.lt]: endExclusive }
      }
    });

    // Calcular usuarios_activos (distintos que comentaron o crearon avisos en la semana)
    const avisosCreados = await Aviso.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('creado_por')), 'creado_por']],
      where: {
        fecha_inicio_semana: { [Op.gte]: semana_inicio },
        fecha_fin_semana: { [Op.lte]: semana_fin }
      },
      raw: true
    });
    const comentaron = await Comentario.findAll({
      attributes: [[Sequelize.fn('DISTINCT', Sequelize.col('usuario_id')), 'usuario_id']],
      where: { createdAt: { [Op.gte]: startDate, [Op.lt]: endExclusive } },
      raw: true
    });

    const setUsuarios = new Set([
      ...avisosCreados.map(x => x.creado_por),
      ...comentaron.map(x => x.usuario_id)
    ]);

    const usuariosActivos = setUsuarios.size;

    await MetricaSemanal.upsert({
      semana_inicio,
      semana_fin,
      total_avisos: totalAvisos,
      total_comentarios: totalComentarios,
      usuarios_activos: usuariosActivos
    });

    const metrica = await MetricaSemanal.findOne({ where: { semana_inicio } });
    res.status(201).json(metrica);
  }
);