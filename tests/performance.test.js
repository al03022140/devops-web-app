import { describe, test, beforeAll, beforeEach, afterAll, expect } from '@jest/globals';
import express from 'express';
import cors from 'cors';
import request from 'supertest';
import { performance } from 'perf_hooks';
import { sequelize } from '../src/lib/db.js';
import { initModels, Usuario, Aviso, Comentario } from '../src/models/index.js';
import { seedAdmin } from '../src/seeds/seedAdmin.js';
import { authRouter } from '../src/routes/authRoutes.js';
import { avisosRouter } from '../src/routes/avisosRoutes.js';
import { comentariosRouter } from '../src/routes/comentariosRoutes.js';

const TEST_VOLUMES = [10, 50, 100, 200];
const RESPONSE_THRESHOLD_MS = 1000; // 1s upper bound for in-memory DB responses
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin1234!';

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/avisos', avisosRouter);
app.use('/api/comentarios', comentariosRouter);

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

describe('Performance tests for avisos and comentarios', () => {
  let adminUser;
  let viewerUser;
  let authToken;

  beforeAll(async () => {
    await sequelize.authenticate();
    await initModels(sequelize);
  });

  beforeEach(async () => {
    await sequelize.sync({ force: true });
    await seedAdmin();
    adminUser = await Usuario.findOne({ where: { email: ADMIN_EMAIL } });
    if (!adminUser) {
      throw new Error('Admin user not seeded correctly');
    }
    viewerUser = await Usuario.create({
      nombre: 'Viewer Tester',
      email: 'viewer@test.local',
      contraseña_hash: adminUser.contraseña_hash,
      rol: 'visualizador'
    });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    authToken = loginRes.body.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  async function seedAvisos(volume) {
    const today = new Date();
    const records = [];
    for (let i = 0; i < volume; i++) {
      const start = new Date(today);
      start.setDate(start.getDate() - i);
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      records.push({
        titulo: `Aviso perf ${i + 1}`,
        descripcion: `Descripción de rendimiento ${i + 1}`,
        fecha_inicio_semana: formatDateOnly(start),
        fecha_fin_semana: formatDateOnly(end),
        creado_por: adminUser.usuario_id,
        activo: true
      });
    }
    await Aviso.bulkCreate(records);
  }

  async function seedComentarios(volume) {
    const aviso = await Aviso.create({
      titulo: 'Aviso base para comentarios',
      descripcion: 'Aviso que agrupa comentarios de prueba',
      fecha_inicio_semana: formatDateOnly(new Date()),
      fecha_fin_semana: formatDateOnly(new Date()),
      creado_por: adminUser.usuario_id,
      activo: true
    });

    const commentRecords = [];
    for (let i = 0; i < volume; i++) {
      commentRecords.push({
        aviso_id: aviso.aviso_id,
        usuario_id: viewerUser.usuario_id,
        comentario: `Comentario rendimiento ${i + 1}`
      });
    }
    await Comentario.bulkCreate(commentRecords);
    return aviso.aviso_id;
  }

  test.each(TEST_VOLUMES.map((volume, index) => [index + 1, RESPONSE_THRESHOLD_MS, volume]))('Test #%i - Lista de avisos responde en menos de %ims con %i registros', async (testNumber, threshold, volume) => {
    await seedAvisos(volume);

    const start = performance.now();
    const res = await request(app)
      .get('/api/avisos')
      .query({ page: 1, limit: volume })
      .set('Authorization', `Bearer ${authToken}`);
    const elapsed = performance.now() - start;

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('items');
    expect(res.body.items.length).toBeLessThanOrEqual(volume);
    expect(res.body.total).toBe(volume);
    expect(elapsed).toBeLessThanOrEqual(threshold);
  });

  test.each(TEST_VOLUMES.map((volume, index) => [index + 1, RESPONSE_THRESHOLD_MS, volume]))('Test #%i - Comentarios por aviso responden en menos de %ims con %i registros', async (testNumber, threshold, volume) => {
    const avisoId = await seedComentarios(volume);

    const start = performance.now();
    const res = await request(app)
      .get(`/api/comentarios/aviso/${avisoId}`)
      .set('Authorization', `Bearer ${authToken}`);
    const elapsed = performance.now() - start;

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBe(volume);
    expect(elapsed).toBeLessThanOrEqual(threshold);
  });
});
