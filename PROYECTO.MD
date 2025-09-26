# Dashboard de Avisos Semanales - Sistema de Gestión

## 📋 Descripción del Proyecto

**Sistema web de dashboard** para gestión de avisos semanales donde los administradores pueden publicar actividades y tareas de la semana, y los usuarios pueden visualizar y comentar en tiempo real.

### 🎯 Objetivo Principal
Crear una plataforma simple y funcional que permita la comunicación efectiva del equipo mediante avisos semanales con sistema de comentarios integrado.

---

## 🏗️ Arquitectura del Sistema

### **Stack Tecnológico**
- **Backend**: Node.js + Express
- **Base de Datos**: MySQL
- **Frontend**: HTML5 + CSS3 + JavaScript vanilla
- **Autenticación**: JWT
- **DevOps**: Docker + GitHub Actions
- **Monitoreo**: Prometheus + Grafana

### **Estructura de Carpetas**
```
├── .github/
│   └── workflows/       # GitHub Actions CI/CD
│       ├── ci.yml       # Pipeline de integración continua
│       └── deploy.yml   # Pipeline de despliegue
├── src/
│   ├── models/          # Modelos de BD (Usuario, Aviso, Comentario)
│   ├── routes/          # Rutas API (auth, avisos, comentarios)
│   ├── middlewares/     # Autenticación y permisos
│   └── lib/             # Conexión BD y utilidades
├── Front/
│   ├── html/            # Páginas del dashboard
│   └── css/             # Estilos del sistema
├── terraform/
│   ├── main.tf          # Configuración principal de infraestructura
│   ├── variables.tf     # Variables de Terraform
│   ├── outputs.tf       # Outputs de infraestructura
│   ├── scripts/         # Scripts de inicialización
│   └── templates/       # Plantillas de configuración
├── monitoring/
│   ├── prometheus.yml   # Configuración de Prometheus
│   └── grafana/         # Dashboards y datasources de Grafana
├── nginx/
│   └── nginx.conf       # Configuración del proxy reverso
├── tests/
│   ├── setup.js         # Configuración de tests
│   └── api.test.js      # Tests de API
├── scripts/
│   └── deploy-local.ps1 # Script de despliegue local
├── docker-compose.yml       # Configuración desarrollo
├── docker-compose.prod.yml  # Configuración producción
├── jest.config.js           # Configuración de testing
├── DEPLOYMENT.md            # Documentación de despliegue
└── .env.prod.example        # Variables de entorno ejemplo
```

---

## 🗄️ Estructura de Base de Datos

### **Tabla: usuarios**
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- nombre (VARCHAR(100), NOT NULL)
- email (VARCHAR(150), UNIQUE, NOT NULL)
- contraseña (VARCHAR(255), NOT NULL) -- Hash bcrypt
- tipo_usuario (ENUM('administrador', 'editor', 'visualizador'), DEFAULT 'visualizador')
- fecha_creacion (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- activo (BOOLEAN, DEFAULT TRUE)
```

### **Tabla: avisos**
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- titulo (VARCHAR(200), NOT NULL)
- descripcion (TEXT, NOT NULL)
- fecha_inicio_semana (DATE, NOT NULL)
- fecha_fin_semana (DATE, NOT NULL)
- creado_por (INT, FOREIGN KEY → usuarios.id)
- fecha_creacion (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
- activo (BOOLEAN, DEFAULT TRUE)
```

### **Tabla: comentarios**
```sql
- id (INT, PRIMARY KEY, AUTO_INCREMENT)
- aviso_id (INT, FOREIGN KEY → avisos.id)
- usuario_id (INT, FOREIGN KEY → usuarios.id)
- comentario (TEXT, NOT NULL)
- fecha_comentario (TIMESTAMP, DEFAULT CURRENT_TIMESTAMP)
```

---

## 🎨 Interfaz del Dashboard

### **Páginas Principales**

#### **1. Login** (`login.html`)
- Autenticación con email/contraseña
- Validación en tiempo real
- Redirección automática post-login

#### **2. Dashboard Principal** (`dashboard.html`)
- Vista general de avisos activos
- Métricas de actividad
- Acceso rápido a funciones principales

#### **3. Gestión de Avisos** (`avisos-management.html`)
- CRUD completo de avisos
- Editor de texto enriquecido
- Previsualización en tiempo real

#### **4. Historial de Avisos** (`avisos-history.html`)
- Búsqueda y filtrado avanzado
- Paginación optimizada
- Exportación de datos

#### **5. Detalle de Aviso** (`aviso-detail.html`)
- Vista completa del aviso
- Sistema de comentarios en tiempo real
- Moderación de comentarios

#### **6. Gestión de Usuarios** (`users-list.html`, `user-detail.html`)
- Lista de usuarios con filtros
- Edición de perfiles y permisos
- Actividad de usuarios

#### **7. Moderación** (`comentarios-moderacion.html`)
- Revisión de comentarios
- Acciones de moderación
- Historial de moderación

#### **8. Actividad de Usuarios** (`actividad-usuarios.html`)
- Logs de actividad
- Métricas de engagement
- Reportes de uso

---

## 🔧 DevOps y Automatización

### **Pipeline CI/CD Implementado**

#### **1. Integración Continua (CI)**
- **GitHub Actions** (`.github/workflows/ci.yml`)
  - ✅ Tests automatizados con Jest + Supertest
  - ✅ Build de imagen Docker
  - ✅ Push a GitHub Container Registry (GHCR)
  - ✅ Escaneo de seguridad con Trivy
  - ✅ Validación de código con ESLint

#### **2. Infraestructura como Código (IaC)**
- **Terraform** (`terraform/`)
  - ✅ Provisioning automático en proveedor de nube
  - ✅ VPC, servidor, firewall configurados
  - ✅ Load Balancer opcional
  - ✅ Scripts de inicialización (cloud-init)
  - ✅ Variables y outputs configurables

#### **3. Despliegue Continuo (CD)**
- **GitHub Actions** (`.github/workflows/deploy.yml`)
  - ✅ Deploy automático tras CI exitoso
  - ✅ Provisioning de infraestructura
  - ✅ Despliegue de aplicación
  - ✅ Verificación de salud
  - ✅ Rollback automático en fallos

#### **4. Contenedorización**
- **Docker Compose Producción** (`docker-compose.prod.yml`)
  - ✅ Aplicación Node.js
  - ✅ Base de datos MySQL 8.0
  - ✅ Prometheus para métricas
  - ✅ Grafana para visualización
  - ✅ Nginx como proxy reverso
  - ✅ Health checks configurados

### **Stack de Monitoreo Implementado**

#### **Prometheus** (`monitoring/prometheus.yml`)
- ✅ Métricas de aplicación (`/metrics`)
- ✅ Métricas de sistema (Node Exporter)
- ✅ Métricas de MySQL
- ✅ Métricas de Docker
- ✅ Configuración de alertas

#### **Grafana** (`monitoring/grafana/`)
- ✅ Dashboards preconfigurados
- ✅ Datasource Prometheus automático
- ✅ Visualización en tiempo real
- ✅ Alertas configurables

#### **Nginx** (`nginx/nginx.conf`)
- ✅ Proxy reverso con load balancing
- ✅ Rate limiting en endpoints críticos
- ✅ Headers de seguridad
- ✅ Compresión gzip
- ✅ Logs estructurados

### **Ambientes y Configuración**

#### **Desarrollo Local**
- **Docker Compose** (`docker-compose.yml`)
- **Script PowerShell** (`scripts/deploy-local.ps1`)
  - Build automático
  - Inicio/parada de servicios
  - Visualización de logs
  - Limpieza de entorno

#### **Producción**
- **Servidor VPS** (2 vCPU, 2GB RAM)
- **Terraform gestionado**
- **Docker Compose en producción**
- **Monitoreo 24/7**

### **Configuración de Secretos**

#### **GitHub Secrets Requeridos**
```
CLOUD_API_TOKEN=tu_token_de_api_del_proveedor
SSH_PUBLIC_KEY=ssh-rsa AAAAB3NzaC1yc2E...
ALLOWED_SSH_IP=tu.ip.publica.aqui
DB_PASSWORD=tu_password_mysql_seguro
JWT_SECRET=tu_jwt_secret_super_seguro
```

#### **Variables de Entorno** (`.env.prod`)
```bash
# Aplicación
NODE_ENV=production
PORT=3000

# Base de Datos
MYSQL_ROOT_PASSWORD=password_seguro_mysql
MYSQL_DATABASE=devops_app

# JWT
JWT_SECRET=clave_jwt_super_segura

# Monitoreo
METRICS_ENABLED=true
GF_SECURITY_ADMIN_PASSWORD=admin_grafana_password

# GitHub Container Registry
GITHUB_REPOSITORY=tu-usuario/tu-repo
```

---

## 🔒 Seguridad Implementada

### **Autenticación y Autorización**
- JWT con expiración configurable
- Middleware de autenticación en todas las rutas protegidas
- Roles de usuario (admin, editor, visualizador)
- Validación de permisos por endpoint

### **Seguridad de API**
- Validación de entrada con express-validator
- Sanitización de datos
- Rate limiting por IP
- CORS configurado
- Headers de seguridad (Helmet.js)

### **Base de Datos**
- Contraseñas hasheadas con bcrypt
- Prepared statements (prevención SQL injection)
- Conexiones SSL en producción
- Backup automático configurado

### **Infraestructura**
- Firewall configurado (SSH, HTTP, HTTPS)
- Acceso SSH restringido por IP
- VPC privada
- Certificados SSL/TLS

### **Docker y Contenedores**
- Contenedores sin privilegios
- Redes aisladas
- Health checks obligatorios
- Imágenes escaneadas por vulnerabilidades

### **Nginx**
- Rate limiting (10 req/s general, 5 req/m auth)
- Headers de seguridad (XSS, CSRF, etc.)
- Restricción de acceso a métricas
- Logs de seguridad

#### **Docker**
- Contenedores sin privilegios
- Redes aisladas
- Health checks obligatorios
- Imágenes escaneadas por vulnerabilidades

#### **Terraform**
- Firewall configurado (SSH, HTTP, HTTPS)
- Acceso SSH restringido por IP
- VPC privada
- Backup automático opcional

### **Costos Estimados (Mensual)**
- **Servidor VPS** (2 vCPU, 2GB RAM): $20-30
- **Load Balancer** (opcional): $10-15
- **Almacenamiento adicional** (50GB): $5-10
- **Total estimado**: $25-55/mes

### **Escalabilidad**
- **Horizontal**: Múltiples servidores + Load Balancer
- **Vertical**: Upgrade de especificaciones del servidor
- **Base de datos**: MySQL Cluster o servicio gestionado
- **CDN**: Cloudflare para contenido estático

---

## 📱 Características de UX/UI

### **Diseño Responsive**
- Adaptable a móviles y escritorio
- Tema oscuro por defecto
- Iconografía intuitiva con emojis

### **Funcionalidades de Usuario**
- Notificaciones en tiempo real
- Búsqueda de avisos
- Filtros avanzados
- Exportación de datos
- Modo offline básico

### **Experiencia de Administrador**
- Dashboard de métricas
- Gestión de usuarios
- Moderación de contenido
- Configuración del sistema
- Logs de auditoría

---

## 🚀 Instalación y Despliegue

### **Desarrollo Local**

#### **Prerrequisitos**
- Docker y Docker Compose
- Node.js 18+ (para desarrollo)
- Git

#### **Pasos de Instalación**
```bash
# 1. Clonar repositorio
git clone <tu-repo>
cd devops-dashboard

# 2. Configurar variables de entorno
cp .env.example .env
# Editar .env con tus valores

# 3. Ejecutar con Docker Compose
docker-compose up -d --build

# 4. Verificar servicios
curl http://localhost:3000/health
```

#### **Script PowerShell** (Windows)
```powershell
# Build y start
.\scripts\deploy-local.ps1 -Build
.\scripts\deploy-local.ps1 -Start

# All-in-one (build + start + tunnel)
.\scripts\deploy-local.ps1 -AllInOne

# Con override local
.\scripts\deploy-local.ps1 -AllInOne -LocalOverride

# Ver logs
.\scripts\deploy-local.ps1 -Logs

# Limpiar
.\scripts\deploy-local.ps1 -Clean
```

### **Producción**

#### **Opción 1: Terraform (Recomendado)**
```bash
# 1. Configurar variables
cd terraform
cp terraform.tfvars.example terraform.tfvars
# Editar terraform.tfvars

# 2. Desplegar infraestructura
terraform init
terraform plan
terraform apply

# 3. Verificar despliegue
curl http://<server-ip>:3000/health
```

#### **Opción 2: Servidor Existente**
```bash
# 1. Conectar al servidor
ssh user@tu-servidor

# 2. Instalar Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Clonar y configurar
git clone <tu-repo>
cd devops-dashboard
cp .env.prod.example .env.prod
# Editar .env.prod

# 4. Desplegar
docker-compose -f docker-compose.prod.yml up -d --build
```

---

## 📊 Monitoreo y Métricas

### **URLs de Acceso**
- **Aplicación**: http://localhost:3000
- **Grafana**: http://localhost:3001 (admin/admin)
- **Prometheus**: http://localhost:9090
- **Métricas API**: http://localhost:3000/metrics

### **Métricas Disponibles**
- Requests por segundo
- Tiempo de respuesta promedio
- Errores HTTP por código
- Usuarios activos
- Avisos creados/día
- Comentarios por aviso
- Uso de CPU/Memoria
- Conexiones de BD activas

### **Alertas Configuradas**
- CPU > 80% por 5 minutos
- Memoria > 90% por 3 minutos
- Tiempo de respuesta > 2s
- Tasa de error > 5%
- BD desconectada
- Disco > 85%

---

## 🧪 Testing

### **Tipos de Tests**
- **Unitarios**: Modelos y utilidades
- **Integración**: APIs y BD
- **E2E**: Flujos completos de usuario
- **Carga**: Performance con k6

### **Comandos de Testing**
```bash
# Tests unitarios e integración
npm test

# Tests con coverage
npm run test:coverage

# Tests E2E
npm run test:e2e

# Tests de carga
npm run test:load
```

### **Coverage Objetivo**
- **Líneas**: >90%
- **Funciones**: >95%
- **Branches**: >85%
- **Statements**: >90%

---

## 📚 API Documentation

### **Endpoints Principales**

#### **Autenticación**
```
POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
GET  /api/auth/me
```

#### **Avisos**
```
GET    /api/avisos           # Listar avisos
POST   /api/avisos           # Crear aviso
GET    /api/avisos/:id       # Obtener aviso
PUT    /api/avisos/:id       # Actualizar aviso
DELETE /api/avisos/:id       # Eliminar aviso
```

#### **Comentarios**
```
GET    /api/comentarios/:avisoId    # Listar comentarios
POST   /api/comentarios/:avisoId    # Crear comentario
PUT    /api/comentarios/:id         # Actualizar comentario
DELETE /api/comentarios/:id         # Eliminar comentario
```

#### **Usuarios**
```
GET    /api/users           # Listar usuarios (admin)
GET    /api/users/:id       # Obtener usuario
PUT    /api/users/:id       # Actualizar usuario
DELETE /api/users/:id       # Eliminar usuario
```

#### **Métricas**
```
GET /api/metricas/dashboard    # Métricas del dashboard
GET /api/metricas/usuarios     # Actividad de usuarios
GET /metrics                   # Métricas Prometheus
```

---

## 🔄 Flujo de Desarrollo

### **Git Workflow**
```bash
# 1. Feature branch
git checkout -b feature/nueva-funcionalidad

# 2. Desarrollo y commits
git add .
git commit -m "feat: nueva funcionalidad"

# 3. Push y PR
git push origin feature/nueva-funcionalidad
# Crear Pull Request en GitHub

# 4. CI automático
# - Tests
# - Build Docker
# - Security scan

# 5. Review y merge
# 6. Deploy automático a producción
```

### **Convenciones de Commits**
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `docs:` Documentación
- `style:` Formato de código
- `refactor:` Refactorización
- `test:` Tests
- `chore:` Tareas de mantenimiento

---

## 🎯 Roadmap y Mejoras Futuras

### **Fase 2 - Funcionalidades Avanzadas**
- [ ] Notificaciones push
- [ ] Sistema de archivos adjuntos
- [ ] Editor WYSIWYG avanzado
- [ ] Plantillas de avisos
- [ ] Calendario integrado
- [ ] Exportación a PDF

### **Fase 3 - Escalabilidad**
- [ ] Microservicios
- [ ] Cache con Redis
- [ ] CDN para assets
- [ ] Base de datos distribuida
- [ ] Auto-scaling
- [ ] Multi-región

### **Fase 4 - Integraciones**
- [ ] API REST completa
- [ ] Webhooks
- [ ] Integración Slack/Teams
- [ ] SSO (SAML/OAuth)
- [ ] Mobile app
- [ ] Desktop app (Electron)

---

## 📞 Soporte y Contribución

### **Reportar Issues**
- Usar GitHub Issues
- Incluir logs y pasos para reproducir
- Especificar versión y entorno

### **Contribuir**
1. Fork del repositorio
2. Crear feature branch
3. Seguir convenciones de código
4. Agregar tests
5. Crear Pull Request

### **Contacto**
- **Documentación**: Ver `DEPLOYMENT.md`
- **Issues**: GitHub Issues
- **Discusiones**: GitHub Discussions

---

## 📄 Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

---

**Última actualización**: Diciembre 2024  
**Versión**: 1.0.0  
**Estado**: Producción Ready ✅