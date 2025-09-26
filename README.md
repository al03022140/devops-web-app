# Dashboard de Avisos Semanales

Sistema de gestión de avisos y usuarios con arquitectura DevOps completa - Node.js, Docker, Monitoring, y automatización de despliegue.

## Descripción
Proyecto Node.js + Express + MySQL + Frontend estático (HTML/CSS/JS) con DevOps (Docker, Nginx), métricas (Prometheus/Grafana) y CI/CD.

## Requisitos
- Node.js 20+
- Docker y Docker Compose

## Desarrollo local (Docker)
1. Crear un archivo `.env` con al menos:
   - DB_PASSWORD=dev
   - DB_NAME=devops_app
   - JWT_SECRET=dev_secret
   - METRICS_ENABLED=true
2. Levantar servicios:

```powershell
# Windows PowerShell
$env:DB_PASSWORD='dev'; $env:DB_NAME='devops_app'; $env:JWT_SECRET='dev_secret'; $env:METRICS_ENABLED='true'; docker-compose up --build
```

App: http://localhost:3000

## Tests
Los tests de Jest usan SQLite en memoria, no requieren MySQL.

```powershell
$env:NODE_ENV='test'; npm test
```

## Endpoints clave
- Auth: POST /api/auth/login, GET /api/auth/validate
- Usuarios: CRUD en /api/users (rol admin)
- Avisos: CRUD en /api/avisos (admin/editor para escribir; todos para leer)
- Comentarios: /api/comentarios
- Métricas: /api/metricas

## Métricas y salud
- /health
- /metrics (habilitar con METRICS_ENABLED=true). Acceso restringido por Nginx.

## Tiempo real
Se expone WebSocket en `/comments`. El frontend se conecta automáticamente desde `comments.js`.

## Producción
Usa `docker-compose.prod.yml`, Nginx como proxy y Prometheus/Grafana. Ver `.env.prod.example` para variables.

## Deployment & CI/CD
Consulta `DEPLOYMENT.md` para una guía paso a paso de despliegue local y producción, variables de entorno y descripción de los workflows de CI/CD.

## Repositorio
- **GitHub**: https://github.com/al03022140/devops-web-app
- **Owner**: al03022140