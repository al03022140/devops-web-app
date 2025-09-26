import express from 'express';
import bcrypt from 'bcryptjs';
import { body, validationResult } from 'express-validator';
import { Usuario } from '../models/index.js';
import { generarToken, verificarToken } from '../middlewares/auth.js';

export const authRouter = express.Router();

authRouter.post(
  '/login',
  [body('email').isEmail(), body('password').isLength({ min: 6 })],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    const { email, password } = req.body;
    const user = await Usuario.findOne({ where: { email } });
    if (!user) return res.status(401).json({ error: 'Credenciales inválidas' });

    const ok = await bcrypt.compare(password, user.contraseña_hash);
    if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

    const token = generarToken({ usuario_id: user.usuario_id, rol: user.rol, email: user.email });
    res.json({ token, rol: user.rol });
  }
);

// Validar token existente
authRouter.get('/validate', verificarToken, async (req, res) => {
  try {
    // Si llegamos aquí, el token es válido (verificado por el middleware)
    const user = await Usuario.findByPk(req.user.usuario_id, {
      attributes: ['usuario_id', 'nombre', 'email', 'rol']
    });
    
    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    res.json({ 
      valid: true, 
      user: {
        usuario_id: user.usuario_id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol
      }
    });
  } catch (error) {
    res.status(401).json({ error: 'Token inválido' });
  }
});