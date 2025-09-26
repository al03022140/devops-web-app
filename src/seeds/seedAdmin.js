import bcrypt from 'bcryptjs';
import { Usuario } from '../models/index.js';

export async function seedAdmin() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin1234!';

  const exists = await Usuario.findOne({ where: { email: adminEmail } });
  if (exists) return;

  const hash = await bcrypt.hash(adminPassword, 10);
  await Usuario.create({ nombre: 'Administrador', email: adminEmail, contraseña_hash: hash, rol: 'administrador' });
}