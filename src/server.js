import express from 'express';
import dotenv from 'dotenv';
import morgan from 'morgan';
import cors from 'cors';
import promClient from 'prom-client';
import path from 'path';
import { fileURLToPath } from 'url';
import { sequelize } from './lib/db.js';
import { initModels } from './models/index.js';
import { authRouter } from './routes/authRoutes.js';
import { usersRouter } from './routes/userRoutes.js';
import { avisosRouter } from './routes/avisosRoutes.js';
import { comentariosRouter } from './routes/comentariosRoutes.js';
import { metricasRouter } from './routes/metricasRoutes.js'
import { seedAdmin } from './seeds/seedAdmin.js';
import http from 'http';
import { WebSocketServer } from 'ws';
import { appEvents } from './lib/events.js';
import { Comentario } from './models/index.js';

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

if (process.env.METRICS_ENABLED === 'true') {
  const register = new promClient.Registry();
  promClient.collectDefaultMetrics({ register });
  app.get('/metrics', async (_req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  });
}

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() });
});

app.use('/api/auth', authRouter);
app.use('/api/users', usersRouter);
app.use('/api/avisos', avisosRouter);
app.use('/api/comentarios', comentariosRouter);
app.use('/api/metricas', metricasRouter);

// Servir archivos estáticos del Front
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontPath = path.join(__dirname, '..', 'Front');
const imagesPath = path.join(__dirname, '..', 'images');
app.use(express.static(frontPath));
app.use('/images', express.static(imagesPath));

// Ruta raíz: redirige a login.html
app.get('/', (req, res) => {
  res.sendFile(path.join(frontPath, 'html', 'login.html'));
});

// Fallback para rutas no API: redirige a login.html
app.get(/^(?!\/api\/).*/, (req, res, next) => {
  res.sendFile(path.join(frontPath, 'html', 'login.html'), err => {
    if (err) next();
  });
});

const port = process.env.PORT || 3000;

async function start() {
  try {
    await sequelize.authenticate();
    await initModels(sequelize);
    await sequelize.sync();
    await seedAdmin();

    // Create HTTP server and attach WebSocket server for real-time comments
    const server = http.createServer(app);

    const wss = new WebSocketServer({ server, path: '/comments' });
    wss.on('connection', (ws) => {
      ws.send(JSON.stringify({ type: 'welcome', message: 'Connected to comments stream' }));
    });

    // Broadcast helper
    function broadcast(data) {
      const msg = typeof data === 'string' ? data : JSON.stringify(data);
      wss.clients.forEach((client) => {
        if (client.readyState === 1) {
          client.send(msg);
        }
      });
    }

    // Listen to app events and broadcast
    appEvents.on('comment:created', async (commentId) => {
      try {
        const c = await Comentario.findByPk(commentId, { include: ['autor', 'aviso'] });
        if (c) {
          broadcast({ type: 'new_comment', comment: c.toJSON() });
        }
      } catch (e) {
        // swallow
      }
    });

    server.listen(port, () => {
      console.log(`Server running on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();