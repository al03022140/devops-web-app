# Despliegue: Desarrollo y Producción

Este documento describe cómo ejecutar el proyecto en local (Docker y sin Docker) y cómo se despliega a producción con Terraform + GitHub Actions.

## Requisitos
- Node.js 20+
- Docker y Docker Compose
- Cuenta en DigitalOcean (si usas Terraform del repo)

## Variables de entorno
- Copia `.env.prod.example` a `.env.prod` y completa valores reales.
- En local, puedes definir `.env` con los mínimos para desarrollo.

## Desarrollo local (Docker)
1. Construir e iniciar servicios
   ```powershell
   docker-compose up -d --build
   ```
2. Ver logs
   ```powershell
   docker-compose logs -f app
   ```
3. Parar y limpiar
   ```powershell
   docker-compose down -v
   ```

## Desarrollo local (sin Docker)
1. Instalar dependencias
   ```powershell
   npm install
   ```
2. Ejecutar en modo dev
   ```powershell
   npm run dev
   ```
3. Ejecutar tests
   ```powershell
   npm test
   ```

## Producción con Docker Compose
1. Construir e iniciar
   ```bash
   docker-compose -f docker-compose.prod.yml up -d --build
   ```
2. Verificar salud
   ```bash
   curl -f http://localhost:3000/health
   ```
3. Logs
   ```bash
   docker-compose -f docker-compose.prod.yml logs -f app
   ```

## CI/CD (GitHub Actions)
- Workflow CI: `.github/workflows/ci.yml`
  - Ejecuta tests con Node 20
  - Construye y publica imagen en GHCR
  - Escaneo de seguridad con Trivy
- Workflow Deploy: `.github/workflows/deploy.yml`
  - Provisiona infra con Terraform (DigitalOcean)
  - Verifica salud y métricas

### Secrets requeridos
- DIGITALOCEAN_TOKEN
- SSH_PUBLIC_KEY
- ALLOWED_SSH_IP
- DB_PASSWORD
- JWT_SECRET

## Terraform
1. Inicializar
   ```bash
   cd terraform
   terraform init
   ```
2. Planificar
   ```bash
   terraform plan
   ```
3. Aplicar
   ```bash
   terraform apply
   ```

## Monitorización
- Prometheus: http://servidor:9090
- Grafana: http://servidor:3001
- Métricas app: http://servidor:3000/metrics

## Realtime (WebSocket)
- Endpoint WS: `/comments` (protegido por Nginx con headers upgrade)
- CSP habilitada para `ws:` y `wss:` en `nginx/nginx.conf`
- Frontend selecciona `ws://` o `wss://` automáticamente

## Troubleshooting
- Puertos ocupados: cambia puertos en `docker-compose*.yml`
- DB conexión en tests: en CI se usa MySQL; localmente las pruebas usan SQLite en memoria
- Token inválido: revisa `JWT_SECRET` consistente entre app y seeds
