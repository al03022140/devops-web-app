import express from 'express';
import { body, param, validationResult } from 'express-validator';
import { Aviso, Usuario, AvisoImagen, Comentario } from '../models/index.js';
import { verificarToken, requiereRol } from '../middlewares/auth.js';

export const avisosRouter = express.Router();

avisosRouter.use(verificarToken);

// Listar avisos con paginación básica y creador
avisosRouter.get('/', requiereRol('administrador', 'editor', 'visualizador'), async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const offset = (Number(page) - 1) * Number(limit);
  const { rows, count } = await Aviso.findAndCountAll({
    include: [
      { model: Usuario, as: 'creador', attributes: ['usuario_id', 'nombre', 'email'] },
      { model: Comentario, as: 'comentarios' }
    ],
    order: [['createdAt', 'DESC']],
    offset,
    limit: Number(limit),
    distinct: true
  });
  res.json({ items: rows, total: count, page: Number(page), limit: Number(limit) });
});

// Crear aviso (solo administrador)
avisosRouter.post(
  '/',
  requiereRol('administrador', 'editor'),
  [
    body('titulo').isString().isLength({ min: 3 }),
    body('descripcion').isString().isLength({ min: 3 }),
    body('fecha_inicio_semana').isISO8601(),
    body('fecha_fin_semana').isISO8601()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { titulo, descripcion, fecha_inicio_semana, fecha_fin_semana } = req.body;
    const creado_por = req.user.usuario_id;
    const aviso = await Aviso.create({ titulo, descripcion, fecha_inicio_semana, fecha_fin_semana, creado_por });
    res.status(201).json(aviso);
  }
);

avisosRouter.get('/:aviso_id', requiereRol('administrador', 'editor', 'visualizador'), async (req, res) => {
  const aviso = await Aviso.findByPk(req.params.aviso_id, {
    include: [
      { model: Usuario, as: 'creador', attributes: ['usuario_id', 'nombre'] },
      { model: Comentario, as: 'comentarios' }
    ]
  });
  if (!aviso) return res.status(404).json({ error: 'No encontrado' });
  res.json(aviso);
});

// Actualizar aviso (solo administrador)
avisosRouter.put(
  '/:aviso_id',
  requiereRol('administrador', 'editor'),
  [
    param('aviso_id').isInt(),
    body('titulo').optional().isString().isLength({ min: 3 }),
    body('descripcion').optional().isString().isLength({ min: 3 }),
    body('fecha_inicio_semana').optional().isISO8601(),
    body('fecha_fin_semana').optional().isISO8601(),
    body('activo').optional().isBoolean()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const aviso = await Aviso.findByPk(req.params.aviso_id);
    if (!aviso) return res.status(404).json({ error: 'No encontrado' });
    await aviso.update(req.body);
    res.json(aviso);
  }
);

// Eliminar aviso (solo administrador)
avisosRouter.delete('/:aviso_id', requiereRol('administrador'), async (req, res) => {
  const aviso = await Aviso.findByPk(req.params.aviso_id);
  if (!aviso) return res.status(404).json({ error: 'No encontrado' });
  await aviso.destroy();
  res.status(204).send();
});

// Subir imágenes de un aviso (solo administrador) - acepta JSON base64 con límite local de 10mb
avisosRouter.post(
  '/:aviso_id/imagenes',
  requiereRol('administrador', 'editor'),
  express.json({ limit: '10mb' }),
  [param('aviso_id').isInt(), body('imagenes').isArray({ min: 1 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const avisoId = Number(req.params.aviso_id);
    const aviso = await Aviso.findByPk(avisoId);
    if (!aviso) return res.status(404).json({ error: 'Aviso no encontrado' });

    const imagenes = Array.isArray(req.body.imagenes) ? req.body.imagenes : [];

    const creadas = [];
    for (const img of imagenes) {
      const { nombre_archivo, tipo_mime, datos_base64 } = img || {};
      if (!nombre_archivo || !tipo_mime || !datos_base64) {
        return res.status(400).json({ error: 'Formato de imagen inválido' });
      }
      if (!String(tipo_mime).startsWith('image/')) {
        return res.status(400).json({ error: 'Solo se permiten imágenes' });
      }
      // datos_base64 puede venir con prefijo data:mime;base64,
      const base64 = String(datos_base64).includes(',') ? String(datos_base64).split(',')[1] : String(datos_base64);
      const buffer = Buffer.from(base64, 'base64');
      const creada = await AvisoImagen.create({
        aviso_id: avisoId,
        nombre_archivo,
        tipo_mime,
        datos: buffer
      });
      creadas.push({
        aviso_imagen_id: creada.aviso_imagen_id,
        nombre_archivo: creada.nombre_archivo,
        tipo_mime: creada.tipo_mime
      });
    }

    res.status(201).json({ imagenes: creadas });
  }
);

// Listar metadatos de imágenes de un aviso (todos los roles)
avisosRouter.get(
  '/:aviso_id/imagenes',
  requiereRol('administrador', 'editor', 'visualizador'),
  [param('aviso_id').isInt()],
  async (req, res) => {
    const avisoId = Number(req.params.aviso_id);
    const imgs = await AvisoImagen.findAll({
      where: { aviso_id: avisoId },
      order: [['createdAt', 'ASC']],
      attributes: ['aviso_imagen_id', 'nombre_archivo', 'tipo_mime', 'createdAt']
    });
    res.json(imgs);
  }
);

// Obtener binario de imagen (todos los roles)
avisosRouter.get(
  '/:aviso_id/imagenes/:imagen_id/raw',
  requiereRol('administrador', 'editor', 'visualizador'),
  [param('aviso_id').isInt(), param('imagen_id').isInt()],
  async (req, res) => {
    const { aviso_id, imagen_id } = req.params;
    const img = await AvisoImagen.findOne({ where: { aviso_id: Number(aviso_id), aviso_imagen_id: Number(imagen_id) } });
    if (!img) return res.status(404).json({ error: 'Imagen no encontrada' });
    res.setHeader('Content-Type', img.tipo_mime);
    res.setHeader('Cache-Control', 'private, max-age=300');
    return res.send(img.datos);
  }
);