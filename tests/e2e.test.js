import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { sequelize } from '../src/lib/db.js';
import { initModels } from '../src/models/index.js';
import { authRouter } from '../src/routes/authRoutes.js';
import { usersRouter } from '../src/routes/userRoutes.js';
import { avisosRouter } from '../src/routes/avisosRoutes.js';
import { comentariosRouter } from '../src/routes/comentariosRoutes.js';
import { metricasRouter } from '../src/routes/metricasRoutes.js';
import { seedAdmin } from '../src/seeds/seedAdmin.js';

// Create test app
const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/avisos', avisosRouter);
app.use('/api/comentarios', comentariosRouter);
app.use('/api/metricas', metricasRouter);

describe('E2E: Avisos, Comentarios, Métricas e Imágenes', () => {
  let adminToken;
  let avisoId;

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_jwt_secret_key_for_ci';
    await sequelize.authenticate();
    await initModels(sequelize);
    await sequelize.sync({ force: true });
    await seedAdmin();
    // Login admin
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email: process.env.ADMIN_EMAIL || 'admin@example.com', password: process.env.ADMIN_PASSWORD || 'Admin1234!' });
    expect(loginRes.status).toBe(200);
    adminToken = loginRes.body.token;
  });

  afterAll(async () => {
    await sequelize.close();
  });

  test('Crear aviso (admin/editor)', async () => {
    const res = await request(app)
      .post('/api/avisos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        titulo: 'Aviso Semana 1',
        descripcion: 'Tareas y objetivos de la semana',
        fecha_inicio_semana: '2025-01-06',
        fecha_fin_semana: '2025-01-12'
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('aviso_id');
    avisoId = res.body.aviso_id;
  });

  test('Comentar en aviso', async () => {
    const res = await request(app)
      .post('/api/comentarios')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ aviso_id: avisoId, comentario: 'Primer comentario' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('comentario_id');
  });

  test('Listar comentarios por aviso', async () => {
    const res = await request(app)
      .get(`/api/comentarios/aviso/${avisoId}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(1);
  });

  test('Recalcular métricas semanales', async () => {
    const res = await request(app)
      .post('/api/metricas/semanales/recalcular?semana=2025-01-06')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('semana_inicio');
  });

  test('Subir imagen base64 al aviso y recuperar metadatos', async () => {
    const png1x1 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR4nGNgYAAAAAMAAWgmWQ0AAAAASUVORK5CYII='; // PNG tiny
    const upload = await request(app)
      .post(`/api/avisos/${avisoId}/imagenes`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ imagenes: [ { nombre_archivo: 'test.png', tipo_mime: 'image/png', datos_base64: `data:image/png;base64,${png1x1}` } ] });
    expect(upload.status).toBe(201);
    expect(Array.isArray(upload.body.imagenes)).toBe(true);
    expect(upload.body.imagenes.length).toBe(1);

    const list = await request(app)
      .get(`/api/avisos/${avisoId}/imagenes`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);
    expect(list.body[0]).toHaveProperty('nombre_archivo', 'test.png');
  });
});
