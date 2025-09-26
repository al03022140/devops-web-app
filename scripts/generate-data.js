import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { sequelize } from '../src/lib/db.js';
import { initModels, Usuario, Aviso, Comentario } from '../src/models/index.js';
import { seedAdmin } from '../src/seeds/seedAdmin.js';

dotenv.config();

function parseArgs() {
  const args = Object.fromEntries(
    process.argv.slice(2).map(arg => {
      const [k, v] = arg.replace(/^--/, '').split('=');
      return [k, v === undefined ? true : v];
    })
  );
  return {
    avisos: Number(args.avisos ?? 1000),
    comments: Number(args.comments ?? 3),
    users: Number(args.users ?? 25),
    weeks: Number(args.weeks ?? 8),
    truncate: args.truncate === 'true' || args.truncate === true || false,
    batchSize: Number(args.batchSize ?? 1000)
  };
}

function startOfWeek(d) {
  const date = new Date(d);
  const day = date.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // Monday start, handle Sunday
  date.setDate(date.getDate() + diff);
  date.setHours(0,0,0,0);
  return date;
}

function endOfWeek(monday) {
  const date = new Date(monday);
  date.setDate(date.getDate() + 6);
  date.setHours(23,59,59,999);
  return date;
}

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

async function ensureUsers(targetUsers) {
  const count = await Usuario.count();
  const toCreate = Math.max(0, targetUsers - count);
  if (toCreate === 0) {
    return Usuario.findAll({ attributes: ['usuario_id'] });
  }
  const users = [];
  for (let i = 0; i < toCreate; i++) {
    const idx = count + i + 1;
    const nombre = `Usuario ${idx}`;
    const email = `user${idx}@example.com`;
    const hash = await bcrypt.hash('Password123!', 10);
    users.push({ nombre, email, contraseña_hash: hash, rol: 'visualizador', createdAt: new Date(), updatedAt: new Date() });
  }
  await Usuario.bulkCreate(users);
  return Usuario.findAll({ attributes: ['usuario_id'] });
}

async function generateData({ avisos, comments, users, weeks, truncate, batchSize }) {
  console.log(`→ Iniciando generación de datos: avisos=${avisos}, comments/aviso=${comments}, users=${users}, weeks=${weeks}`);
  await sequelize.authenticate();
  await initModels(sequelize);
  await sequelize.sync();
  await seedAdmin();

  if (truncate) {
    console.log('⚠️  Limpieza de datos existente (avisos, comentarios)...');
    await Comentario.destroy({ where: {} });
    await Aviso.destroy({ where: {} });
  }

  const userRows = await ensureUsers(users);
  const userIds = userRows.map(u => u.usuario_id);

  const todayMonday = startOfWeek(new Date());

  // Generar avisos en lotes
  let createdAvisoIds = [];
  const avisoBatches = Math.ceil(avisos / batchSize);
  for (let b = 0; b < avisoBatches; b++) {
    const start = b * batchSize;
    const end = Math.min(avisos, start + batchSize);
    const batch = [];
    for (let i = start; i < end; i++) {
      const weekOffset = i % weeks; // distribuir uniformemente
      const monday = new Date(todayMonday);
      monday.setDate(monday.getDate() - weekOffset * 7);
      const sunday = endOfWeek(monday);
      const creado_por = userIds[Math.floor(Math.random() * userIds.length)];
      batch.push({
        titulo: `Aviso ${i + 1}`,
        descripcion: `Descripción del aviso ${i + 1}`,
        fecha_inicio_semana: formatDateOnly(monday),
        fecha_fin_semana: formatDateOnly(sunday),
        creado_por,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    }
    const created = await Aviso.bulkCreate(batch);
    createdAvisoIds.push(...created.map(a => a.aviso_id));
    console.log(`   • Avisos creados: ${end}/${avisos}`);
  }

  // Generar comentarios
  const totalComments = createdAvisoIds.length * comments;
  const commentBatches = Math.ceil(totalComments / batchSize);
  let commentIndex = 0;
  for (let b = 0; b < commentBatches; b++) {
    const batch = [];
    for (let i = 0; i < batchSize && commentIndex < totalComments; i++) {
      const avisoIdx = Math.floor(commentIndex / comments);
      const aviso_id = createdAvisoIds[avisoIdx];
      const usuario_id = userIds[Math.floor(Math.random() * userIds.length)];
      batch.push({
        aviso_id,
        usuario_id,
        comentario: `Comentario ${commentIndex + 1} en aviso ${aviso_id}`,
        createdAt: new Date(),
        updatedAt: new Date()
      });
      commentIndex++;
    }
    await Comentario.bulkCreate(batch);
    console.log(`   • Comentarios creados: ${Math.min((b + 1) * batchSize, totalComments)}/${totalComments}`);
  }

  console.log('✔️  Generación completada');
}

(async () => {
  const opts = parseArgs();
  const t0 = Date.now();
  try {
    await generateData(opts);
  } catch (err) {
    console.error('Error generando datos:', err);
    process.exitCode = 1;
  } finally {
    await sequelize.close().catch(() => {});
    const ms = Date.now() - t0;
    console.log(`⏱️  Tiempo total: ${(ms/1000).toFixed(2)}s`);
  }
})();