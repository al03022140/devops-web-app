import express from 'express';
import { body, param, query, validationResult } from 'express-validator';
import { Op } from 'sequelize';
import { Aviso, Comentario, Usuario } from '../models/index.js';
import { appEvents } from '../lib/events.js';
import { verificarToken, requiereRol } from '../middlewares/auth.js';

export const comentariosRouter = express.Router();

comentariosRouter.use(verificarToken);

// Listado global de comentarios con filtros y paginación
comentariosRouter.get(
  '/',
  requiereRol('administrador', 'editor', 'visualizador'),
  [
    query('usuario').optional().isString(), // puede ser id numérico o nombre parcial
    query('desde').optional().isISO8601(),
    query('hasta').optional().isISO8601(),
    query('aviso').optional().isInt(),
    query('page').optional().isInt({ min: 1 }),
    query('limit').optional().isInt({ min: 1, max: 100 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { usuario, desde, hasta } = req.query;
    const avisoFilter = req.query.aviso ? Number(req.query.aviso) : undefined;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 20);
    const offset = (page - 1) * limit;

    const where = {};
    if (avisoFilter) where.aviso_id = avisoFilter;
    if (desde) where.createdAt = { ...(where.createdAt || {}), [Op.gte]: new Date(`${desde}T00:00:00`) };
    if (hasta) where.createdAt = { ...(where.createdAt || {}), [Op.lte]: new Date(`${hasta}T23:59:59.999`) };

    // Filtro por usuario (id o nombre parcial)
    let include = [
      { model: Usuario, as: 'autor', attributes: ['usuario_id', 'nombre', 'email'] },
      { model: Aviso, as: 'aviso', attributes: ['aviso_id', 'titulo'] }
    ];

    if (usuario) {
      const maybeId = Number(usuario);
      if (Number.isFinite(maybeId)) {
        where.usuario_id = maybeId;
      } else {
        include = [
          { model: Usuario, as: 'autor', attributes: ['usuario_id', 'nombre', 'email'], where: { nombre: { [Op.like]: `%${usuario}%` } } },
          { model: Aviso, as: 'aviso', attributes: ['aviso_id', 'titulo'] }
        ];
      }
    }

    const { rows, count } = await Comentario.findAndCountAll({
      where,
      include,
      order: [['createdAt', 'DESC']],
      offset,
      limit
    });
    res.json({ items: rows, total: count, page, limit });
  }
);

// Listar comentarios de un aviso
comentariosRouter.get(
  '/aviso/:aviso_id',
  requiereRol('administrador', 'editor', 'visualizador'),
  [param('aviso_id').isInt()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const comentarios = await Comentario.findAll({
      where: { aviso_id: req.params.aviso_id },
      include: [
        { model: Usuario, as: 'autor', attributes: ['usuario_id', 'nombre', 'email'] },
        { model: Aviso, as: 'aviso', attributes: ['aviso_id', 'titulo'] }
      ],
      order: [['createdAt', 'DESC']]
    });
    res.json(comentarios);
  }
);

// Crear comentario
comentariosRouter.post(
  '/',
  requiereRol('administrador', 'editor', 'visualizador'),
  [
    body('aviso_id').isInt(),
    body('comentario').isString().isLength({ min: 1 })
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { aviso_id, comentario } = req.body;
    const usuario_id = req.user.usuario_id;

    const aviso = await Aviso.findByPk(aviso_id);
    if (!aviso) return res.status(404).json({ error: 'Aviso no encontrado' });

    const nuevo = await Comentario.create({ aviso_id, usuario_id, comentario });
    // Emitir evento para tiempo real
    appEvents.emit('comment:created', nuevo.comentario_id);
    res.status(201).json(nuevo);
  }
);

// Eliminar comentario (solo admin o el autor)
comentariosRouter.delete(
  '/:comentario_id',
  requiereRol('administrador', 'editor', 'visualizador'),
  [param('comentario_id').isInt()],
  async (req, res) => {
    const c = await Comentario.findByPk(req.params.comentario_id);
    if (!c) return res.status(404).json({ error: 'No encontrado' });

    if (req.user.rol !== 'administrador' && c.usuario_id !== req.user.usuario_id) {
      return res.status(403).json({ error: 'No autorizado' });
    }

    await c.destroy();
    res.status(204).send();
  }
);