# FaceAttendance AI — Backend

Sistema inteligente de control de asistencia mediante reconocimiento facial, desarrollado con **FastAPI**, **SQLAlchemy**, **PostgreSQL** y futuras integraciones con **DeepFace**, **OpenCV** y servicios de IA.

---

# 📌 Descripción

FaceAttendance AI permite identificar empleados mediante visión por computadora y registrar automáticamente horarios de entrada y salida.

El sistema generará reportes de asistencia, llegadas tarde, horas trabajadas y horas extra, automatizando procesos que normalmente se realizan de forma manual.

La solución sigue una arquitectura **Backend API + Frontend Web**, utilizando Python y PostgreSQL como base tecnológica.

---

# 🚀 Estado Actual del Proyecto

## Fase completada

```text
feature/configuracion-backend
```

### Implementado

* Estructura base del backend
* Configuración de FastAPI
* Configuración de PostgreSQL
* Variables de entorno
* Configuración de SQLAlchemy
* Configuración de logging
* Swagger/OpenAPI
* Conexión exitosa con Aiven

### Pendiente

* Modelos SQLAlchemy
* CRUD de empleados
* Registro de asistencias
* Reconocimiento facial
* Reportes

---

# 🏗️ Arquitectura del Proyecto

```text
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── endpoints/
│   │       │   └── health.py
│   │       └── router.py
│   │
│   ├── core/
│   │   ├── config.py
│   │   └── logging.py
│   │
│   ├── db/
│   │   └── base.py
│   │
│   ├── models/
│   │   └── mixins.py
│   │
│   ├── schemas/
│   │   └── health.py
│   │
│   ├── services/
│   ├── repositories/
│   ├── utils/
│   │
│   └── main.py
│
├── alembic/
├── tests/
│   ├── conftest.py
│   └── test_health.py
│
├── .env.example
├── alembic.ini
├── requirements.txt
└── README.md
```

---

# 🛠️ Tecnologías

## Backend

* Python 3.12+
* FastAPI
* SQLAlchemy 2.0
* Alembic
* PostgreSQL
* Psycopg2
* Uvicorn
* Pydantic v2
* Pydantic Settings
* Loguru

## Base de Datos

* PostgreSQL
* Aiven Cloud Database

## Control de Versiones

* Git
* Git Flow
* GitHub

## Futuras Integraciones

* OpenCV
* DeepFace
* FaceNet512
* MediaPipe
* Azure AI Services

---

# ⚙️ Configuración Inicial

## 1. Clonar el proyecto

```bash
git clone <URL_DEL_REPOSITORIO>
cd backend
```

---

## 2. Crear entorno virtual

### Windows

```bash
python -m venv .venv
.venv\Scripts\activate
```

### Linux / macOS

```bash
python -m venv .venv
source .venv/bin/activate
```

---

## 3. Instalar dependencias

```bash
python -m pip install -r requirements.txt
```

---

## 4. Configurar variables de entorno

Copiar:

```bash
cp .env.example .env
```

Completar los datos de conexión PostgreSQL.

Ejemplo:

```env
POSTGRES_SERVER=host.aivencloud.com
POSTGRES_PORT=12345
POSTGRES_USER=avnadmin
POSTGRES_PASSWORD=********
POSTGRES_DB=defaultdb
```

---

## 5. Ejecutar migraciones

```bash
alembic upgrade head
```

---

## 6. Ejecutar el proyecto

```bash
python -m uvicorn app.main:app --reload
```

o

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Salida esperada:

```text
INFO: Uvicorn running on http://127.0.0.1:8000
INFO: Database connection established successfully.
```

---

# 📖 Documentación de la API

Una vez iniciado el servidor:

| Interfaz     | URL                                       |
| ------------ | ----------------------------------------- |
| Swagger UI   | http://localhost:8000/api/v1/docs         |
| ReDoc        | http://localhost:8000/api/v1/redoc        |
| OpenAPI JSON | http://localhost:8000/api/v1/openapi.json |
| Health Check | http://localhost:8000/api/v1/health       |

---

# 🧪 Testing

Ejecutar todos los tests:

```bash
pytest tests/ -v
```

---

# 🌿 Flujo de Trabajo Git

## Ramas principales

```text
main
develop
```

---

## Crear una nueva feature

```bash
git checkout develop
git pull origin develop
git flow feature start nombre-feature
```

Ejemplo:

```bash
git flow feature start backend-api
```

---

## Finalizar una feature

```bash
git add .
git commit -m "feat: descripcion"
git push origin feature/nombre-feature
```

Posteriormente crear un Pull Request hacia:

```text
develop
```

---

# 🗺️ Roadmap

| Feature Branch                | Estado       |
| ----------------------------- | ------------ |
| feature/configuracion-backend | ✅ Completada |
| feature/backend-api           | 🔜 Próxima   |
| feature/employee-management   | ⏳ Pendiente  |
| feature/face-recognition      | ⏳ Pendiente  |
| feature/attendance-engine     | ⏳ Pendiente  |
| feature/reports-api           | ⏳ Pendiente  |

---

## Feature 2 — Backend API

Objetivos:

* CRUD de empleados
* Endpoints REST
* Schemas Pydantic
* Services
* Repositories

---

## Feature 3 — Employee Management

Objetivos:

* Gestión completa de empleados

---

## Feature 4 — Face Recognition

Objetivos:

* Captura facial
* Registro biométrico
* Identificación facial

---

## Feature 5 — Attendance Engine

Objetivos:

* Registro automático de entradas
* Registro automático de salidas
* Horas trabajadas
* Horas extra

---

## Feature 6 — Reports API

Objetivos:

* Reportes
* Estadísticas
* Exportación de información

---

# 🎯 Objetivo Final

Implementar una plataforma de asistencia inteligente capaz de identificar empleados mediante reconocimiento facial y automatizar el control de horarios, mejorando la trazabilidad de la información y reduciendo procesos manuales dentro de la organización.

---

# 🔄 Equivalencias para Desarrolladores Node.js

| Node.js / Prisma   | Python                                  |
| ------------------ | --------------------------------------- |
| npm install        | python -m pip install                   |
| package.json       | requirements.txt                        |
| node_modules       | .venv                                   |
| npm run dev        | python -m uvicorn app.main:app --reload |
| Express / NestJS   | FastAPI                                 |
| Prisma ORM         | SQLAlchemy                              |
| Prisma Migrate     | Alembic                                 |
| schema.prisma      | Modelos SQLAlchemy                      |
| DTOs               | Schemas Pydantic                        |
| Services           | Services                                |
| Controllers        | Endpoints / Routers                     |
| Repository Pattern | Repository Pattern                      |
| .env               | .env                                    |

---

## ORM

### Prisma

```prisma
model Empleado {
  id      String @id
  nombre  String
}
```

### SQLAlchemy

```python
class Empleado(Base):
    __tablename__ = "empleados"

    id = Column(UUID, primary_key=True)
    nombre = Column(String)
```

---

## Migraciones

### Prisma

```bash
npx prisma migrate dev
```

### Alembic

```bash
alembic revision --autogenerate -m "descripcion"
alembic upgrade head
```

---

## Swagger

### NestJS

```text
/ api
```

### FastAPI

```text
/ api/v1/docs
```

FastAPI genera automáticamente la documentación OpenAPI y Swagger para todos los endpoints registrados.
