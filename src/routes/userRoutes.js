import express from 'express';
import bcrypt from 'bcryptjs';
import { body, param, validationResult } from 'express-validator';
import { Usuario } from '../models/index.js';
import { requiereRol, verificarToken } from '../middlewares/auth.js';

export const usersRouter = express.Router();

usersRouter.use(verificarToken);

usersRouter.get('/', requiereRol('administrador', 'editor', 'visualizador'), async (_req, res) => {
  const users = await Usuario.findAll({ attributes: { exclude: ['contraseña_hash'] } });
  res.json(users);
});

usersRouter.post(
  '/',
  requiereRol('administrador'),
  [
    body('nombre').isString().isLength({ min: 2 }),
    body('email').isEmail(),
    body('password').isLength({ min: 6 }),
    body('rol').isIn(['administrador', 'editor', 'visualizador'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { nombre, email, password, rol } = req.body;
    const hash = await bcrypt.hash(password, 10);
    const user = await Usuario.create({ nombre, email, contraseña_hash: hash, rol });
    res.status(201).json({ usuario_id: user.usuario_id, nombre, email, rol });
  }
);

usersRouter.get('/:usuario_id', requiereRol('administrador', 'editor', 'visualizador'), async (req, res) => {
  const user = await Usuario.findByPk(req.params.usuario_id, { attributes: { exclude: ['contraseña_hash'] } });
  if (!user) return res.status(404).json({ error: 'No encontrado' });
  res.json(user);
});

usersRouter.put(
  '/:usuario_id',
  requiereRol('administrador', 'editor'),
  [
    param('usuario_id').isInt(),
    body('nombre').optional().isString().isLength({ min: 2 }),
    body('email').optional().isEmail(),
    body('password').optional().isLength({ min: 6 }),
    body('rol').optional().isIn(['administrador', 'editor', 'visualizador'])
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const user = await Usuario.findByPk(req.params.usuario_id);
    if (!user) return res.status(404).json({ error: 'No encontrado' });

    const updates = { ...req.body };
    if (updates.password) {
      updates.contraseña_hash = await bcrypt.hash(updates.password, 10);
      delete updates.password;
    }
    await user.update(updates);
    res.json({ usuario_id: user.usuario_id, nombre: user.nombre, email: user.email, rol: user.rol });
  }
);

usersRouter.delete('/:usuario_id', requiereRol('administrador'), async (req, res) => {
  const user = await Usuario.findByPk(req.params.usuario_id);
  if (!user) return res.status(404).json({ error: 'No encontrado' });
  await user.destroy();
  res.status(204).send();
});