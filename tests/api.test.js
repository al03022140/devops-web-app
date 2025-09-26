import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import cors from 'cors';
import { sequelize } from '../src/lib/db.js';
import { initModels } from '../src/models/index.js';
import { authRouter } from '../src/routes/authRoutes.js';
import { usersRouter } from '../src/routes/userRoutes.js';
import { seedAdmin } from '../src/seeds/seedAdmin.js';

// Create test app
const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);

describe('API Tests', () => {
  beforeAll(async () => {
    try {
      await sequelize.authenticate();
      await initModels(sequelize);
      await sequelize.sync({ force: true });
      await seedAdmin();
    } catch (error) {
      console.error('Database setup failed:', error);
      throw error;
    }
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe('Health Check', () => {
    test('GET /health should return status ok', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);

      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('uptime');
    });
  });

  describe('Authentication', () => {
    test('POST /api/auth/login should reject invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword'
      };

      await request(app)
        .post('/api/auth/login')
        .send(loginData)
        .expect(401);
    });

    test('Admin seed can login and validate token', async () => {
      // Ensure models are synced and seed admin
      const { seedAdmin } = await import('../src/seeds/seedAdmin.js');
      await seedAdmin();

      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: process.env.ADMIN_EMAIL || 'admin@example.com', password: process.env.ADMIN_PASSWORD || 'Admin1234!' })
        .expect(200);
      expect(loginRes.body).toHaveProperty('token');
      const token = loginRes.body.token;

      const validateRes = await request(app)
        .get('/api/auth/validate')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);
      expect(validateRes.body).toHaveProperty('valid', true);
      expect(validateRes.body).toHaveProperty('user');
    });
  });

  describe('User Management', () => {
    let authToken;

    beforeAll(async () => {
      // Login as admin
      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          email: process.env.ADMIN_EMAIL || 'admin@example.com',
          password: process.env.ADMIN_PASSWORD || 'Admin1234!'
        });
      authToken = loginResponse.body.token;
    });

    test('GET /api/users should require authentication', async () => {
      await request(app)
        .get('/api/users')
        .expect(401);
    });

    test('GET /api/users should return users list with valid token', async () => {
      const response = await request(app)
        .get('/api/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
    });
  });

  describe('Input Validation', () => {
    test('POST /api/auth/login should validate required fields', async () => {
      const invalidData = {
        email: 'invalid-email'
      };
      await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);
    });

    test('POST /api/auth/login should validate email format', async () => {
      const invalidData = {
        email: 'not-an-email',
        contraseña: 'password123'
      };

      await request(app)
        .post('/api/auth/login')
        .send(invalidData)
        .expect(400);
    });
  });
});