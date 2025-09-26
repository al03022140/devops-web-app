import jwt from 'jsonwebtoken';

export function generarToken(payload) {
  return jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '8h' });
}

export function verificarToken(req, res, next) {
  const auth = req.headers.authorization || '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'No autorizado' });
  try {
    const data = jwt.verify(token, process.env.JWT_SECRET);
    req.user = data;
    next();
  } catch (_e) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

export function requiereRol(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.user || !rolesPermitidos.includes(req.user.rol)) {
      return res.status(403).json({ error: 'Permisos insuficientes' });
    }
    next();
  };
}