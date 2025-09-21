# 🧪 Testing Guide - Lety Marketplace Backend

## 📋 Tabla de Contenidos

- [Configuración Inicial](#configuración-inicial)
- [Ejecutar Tests](#ejecutar-tests)
- [Estructura de Tests](#estructura-de-tests)
- [Tipos de Tests](#tipos-de-tests)
- [Mejores Prácticas](#mejores-prácticas)

## ⚙️ Configuración Inicial

### 1. Instalar Dependencias

```bash
cd backend
npm install
```

### 2. Configurar Variables de Entorno de Test

Crea un archivo `.env.test` en el directorio backend:

```bash
NODE_ENV=test
PORT=3001
SUPABASE_URL=your-test-supabase-url
SERVICE_ROL_KEY=your-test-service-rol-key
JWT_SECRET=test-jwt-secret-key
```

### 3. Configurar Base de Datos de Test

- Crea una instancia separada de Supabase para testing
- Ejecuta las migraciones en la base de datos de test
- Configura las URLs en `.env.test`

## 🚀 Ejecutar Tests

### Comandos Disponibles

```bash
# Ejecutar todos los tests
npm test

# Ejecutar solo tests unitarios
npm run test:unit

# Ejecutar solo tests de integración
npm run test:integration

# Ejecutar tests con coverage
npm run test:coverage

# Ejecutar tests en modo watch
npm run test:watch
```

## 📁 Estructura de Tests

```
tests/
├── setup.js                    # Configuración global de tests
├── helpers/
│   └── testHelpers.js          # Utilidades y helpers para tests
├── unit/                       # Tests unitarios
│   ├── middleware/
│   │   └── auth.test.js        # Tests del middleware de auth
│   ├── routes/
│   │   └── usuarios.test.js    # Tests unitarios de rutas
│   └── utils.test.js           # Tests de funciones utilitarias
├── integration/                # Tests de integración
│   ├── auth.integration.test.js
│   └── usuarios.integration.test.js
└── database/
    └── testDatabase.js         # Utilidades para base de datos de test
```

## 🧪 Tipos de Tests

### Tests Unitarios

- Prueban funciones individuales de forma aislada
- Usan mocks para dependencias externas
- Son rápidos y no requieren base de datos

```javascript
// Ejemplo de test unitario
test("should validate date correctly", () => {
  expect(validateDate("2024-01-15")).toBe(true);
  expect(validateDate("invalid-date")).toBe(false);
});
```

### Tests de Integración

- Prueban endpoints completos con Supertest
- Usan base de datos de test real
- Verifican la integración entre componentes

```javascript
// Ejemplo de test de integración
test("should authenticate user with valid credentials", async () => {
  const response = await request(app)
    .post("/owner/login")
    .send({ email: "test@example.com", password: "password" });

  expect(response.status).toBe(200);
  expect(response.body.token).toBeDefined();
});
```

## 📊 Coverage Reports

Los reports de coverage se generan en `coverage/`:

- **HTML Report**: `coverage/lcov-report/index.html`
- **Text Summary**: Se muestra en terminal
- **LCOV**: `coverage/lcov.info` (para CI/CD)

## 🛠️ Mejores Prácticas

### 1. Nomenclatura de Tests

```javascript
describe("UsuariosController", () => {
  describe("POST /register/user", () => {
    test("should create user successfully with valid data", () => {
      // test implementation
    });

    test("should return 400 when email is missing", () => {
      // test implementation
    });
  });
});
```

### 2. Usar Test Helpers

```javascript
import { createTestUser, createUserToken } from "../helpers/testHelpers.js";

// En lugar de crear datos manualmente
const user = createTestUser({ email: "test@example.com" });
const token = createUserToken(user.id_usuario);
```

### 3. Limpiar Estado Entre Tests

```javascript
beforeEach(async () => {
  await testDb.cleanDatabase();
  await testDb.seedDatabase();
});
```

### 4. Tests Descriptivos

```javascript
// ❌ Malo
test("login test", () => {});

// ✅ Bueno
test("should return JWT token when user provides valid credentials", () => {});
```

## 🐛 Debugging Tests

### Ejecutar Test Específico

```bash
npm test -- --testNamePattern="should authenticate user"
npm test -- tests/unit/utils.test.js
```

### Logs en Tests

```javascript
// Habilitar logs en development
process.env.NODE_ENV = "development";
```

### Debug con VS Code

Agrega esta configuración en `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceRoot}/backend/node_modules/.bin/jest",
  "args": ["--runInBand"],
  "console": "integratedTerminal",
  "internalConsoleOptions": "neverOpen",
  "cwd": "${workspaceRoot}/backend"
}
```

## 🔧 Configuración Adicional

### Jest Configuration

El archivo `jest.config.js` incluye:

- **Transform**: Babel para ES6 modules
- **Coverage**: Reportes detallados
- **Setup**: Configuración global
- **Timeouts**: 30 segundos para tests

### Variables de Entorno

- `NODE_ENV=test`: Previene inicio de servidor
- `PORT=3001`: Puerto para tests de integración
- `SUPABASE_URL`: URL de base de datos de test
- `JWT_SECRET`: Secret key para tests

## 🚨 Problemas Comunes

### Error: "Cannot find module"

```bash
# Instalar dependencias
npm install

# Verificar paths en jest.config.js
```

### Tests Timeout

```javascript
// Aumentar timeout en jest.config.js
jest.setTimeout(30000);

// O en test específico
test("slow test", async () => {
  // test code
}, 60000); // 60 segundos
```

### Base de Datos No Disponible

- Verificar variables en `.env.test`
- Confirmar que la base de datos de test esté corriendo
- Revisar permisos de la service role key

## 📈 Métricas de Calidad

### Coverage Mínimo Recomendado

- **Statements**: 80%
- **Branches**: 75%
- **Functions**: 80%
- **Lines**: 80%

### Configurar en `jest.config.js`:

```javascript
coverageThreshold: {
  global: {
    branches: 75,
    functions: 80,
    lines: 80,
    statements: 80
  }
}
```
