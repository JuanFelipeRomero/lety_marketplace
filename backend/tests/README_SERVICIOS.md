# Tests de Servicios - Documentación

## Descripción General

Este documento describe la implementación de pruebas para el módulo de **Servicios** del sistema de veterinarias. Las pruebas cubren todas las operaciones CRUD y casos edge del sistema de servicios veterinarios.

## Estructura de Archivos

```
tests/
├── helpers/
│   └── serviciosHelpers.js       # Funciones helper para tests de servicios
├── unit/
│   └── routes/
│       └── servicios.unit.test.js # Tests unitarios de rutas de servicios
└── README_SERVICIOS.md           # Esta documentación
```

## Cobertura de Pruebas

### 1. POST /veterinary/services (Crear Servicio Individual)

**Pruebas de Validación de Entrada:**

- ✅ Validación de campos requeridos (id_clinica, nombre, precio, categoria)
- ✅ Validación de tipo numérico para precios
- ✅ Manejo correcto de valores por defecto (disponible=true, descripcion="")

**Pruebas de Operaciones de Base de Datos:**

- ✅ Creación exitosa de servicio
- ✅ Manejo de errores de inserción en BD

**Pruebas de Estructura de Respuesta:**

- ✅ Validación de estructura de respuesta exitosa

### 2. POST /register/services (Crear Múltiples Servicios)

**Pruebas de Validación de Entrada:**

- ✅ Validación de estructura de request (id_clinica, array de servicios)
- ✅ Validación de cada servicio en el array
- ✅ Procesamiento correcto de array de servicios

**Pruebas de Operaciones de Base de Datos:**

- ✅ Inserción exitosa de múltiples servicios
- ✅ Manejo de errores en inserción batch

### 3. GET /veterinary/services/:id_clinica (Obtener Servicios de Clínica)

**Pruebas de Validación de Parámetros:**

- ✅ Validación de parámetro id_clinica
- ✅ Manejo de query parameter categoria

**Pruebas de Lógica de Consulta:**

- ✅ Construcción correcta de query sin filtro de categoría
- ✅ Construcción correcta de query con filtro de categoría
- ✅ Manejo de resultados vacíos
- ✅ Manejo de errores de consulta en BD

**Pruebas de Estructura de Respuesta:**

- ✅ Validación de estructura de respuesta válida

### 4. GET /veterinary/services/detail/:id_servicio (Obtener Servicio Específico)

**Pruebas de Validación de Parámetros:**

- ✅ Validación de parámetro id_servicio

**Pruebas de Operaciones de Base de Datos:**

- ✅ Recuperación exitosa de servicio
- ✅ Manejo de servicio no encontrado
- ✅ Manejo de errores de BD

### 5. PUT /veterinary/services/:id_servicio (Actualizar Servicio)

**Pruebas de Validación de Entrada:**

- ✅ Validación de parámetro id_servicio
- ✅ Validación de que al menos un campo se proporcione para actualizar
- ✅ Validación de precio cuando se proporciona
- ✅ Procesamiento correcto de datos de actualización

**Pruebas de Operaciones de Base de Datos:**

- ✅ Verificación de existencia de servicio antes de actualizar
- ✅ Manejo de servicio no encontrado durante verificación
- ✅ Actualización exitosa de servicio
- ✅ Manejo de errores de actualización

### 6. DELETE /veterinary/services/:id_servicio (Eliminar Servicio)

**Pruebas de Validación de Parámetros:**

- ✅ Validación de parámetro id_servicio

**Pruebas de Operaciones de Base de Datos:**

- ✅ Verificación de existencia de servicio antes de eliminar
- ✅ Manejo de servicio no encontrado durante verificación
- ✅ Eliminación exitosa de servicio
- ✅ Manejo de errores de eliminación

### 7. Rutas Legacy (Compatibilidad)

**GET /services/:id_clinica:**

- ✅ Mantiene misma funcionalidad que nueva ruta

**PUT /service/:id_servicio:**

- ✅ Maneja actualizaciones como nueva ruta

**DELETE /service/:id_servicio:**

- ✅ Maneja eliminación como nueva ruta

### 8. Ruta Especial: GET /clinic/:clinicId/services

**Filtros de Servicios Activos:**

- ✅ Solo retorna servicios disponibles (disponible=true)
- ✅ Maneja caso sin servicios activos

### 9. Patrones de Manejo de Errores

**Errores Generales:**

- ✅ Manejo elegante de errores internos del servidor
- ✅ Formateo correcto de mensajes de error de BD
- ✅ Manejo de varios escenarios de error

### 10. Validaciones de Tipos de Datos

**Validaciones Específicas:**

- ✅ Manejo de diferentes formatos de precio
- ✅ Manejo de valores booleanos para disponible
- ✅ Validación de campos de texto

## Helpers y Utilidades

### serviciosHelpers.js

**Funciones de Mock:**

- `createMockServiciosSupabase()` - Cliente Supabase mock para servicios
- `createTestServiciosSetup()` - Configuración completa de test

**Factories de Datos:**

- `createTestServicio()` - Genera servicio de prueba
- `createTestClinica()` - Genera clínica de prueba
- `generateTestServicios(count)` - Genera múltiples servicios

**Builders de Requests:**

- `buildCreateServiceRequest()` - Request para crear servicio
- `buildCreateMultipleServicesRequest()` - Request para crear múltiples servicios
- `buildUpdateServiceRequest()` - Request para actualizar servicio

**Generadores de Datos Inválidos:**

- `generateInvalidServiceData()` - Datos inválidos para servicios
- `generateInvalidMultipleServicesData()` - Datos inválidos para múltiples servicios

**Validadores de Respuesta:**

- `validateServiceResponse()` - Valida respuesta de servicio individual
- `validateMultipleServicesResponse()` - Valida respuesta de múltiples servicios

## Estadísticas de Pruebas

- **Total de Pruebas:** 46
- **Grupos de Pruebas:** 10
- **Endpoints Cubiertos:** 8
- **Estado:** ✅ Todas las pruebas pasan

## Ejecución de Pruebas

### Ejecutar todas las pruebas de servicios

```bash
npm test -- tests/unit/routes/servicios.unit.test.js
```

### Ejecutar con cobertura

```bash
npm run test:coverage -- tests/unit/routes/servicios.unit.test.js
```

### Ejecutar en modo watch

```bash
npm test -- --watch tests/unit/routes/servicios.unit.test.js
```

## Consideraciones Técnicas

### Mocking Strategy

- Supabase client completamente mockeado
- Respuestas configurables por tipo de operación
- Soporte para operaciones individuales y batch

### Patrones de Validación

- Validación de campos requeridos vs opcionales
- Validación de tipos de datos específicos
- Manejo de valores por defecto

### Casos Edge Cubiertos

- Servicios con precio 0
- Campos opcionales vacíos vs null
- Categorías diversas
- Estados de disponibilidad

### Compatibilidad

- Rutas legacy mantenidas
- Consistencia en estructura de respuestas
- Manejo uniforme de errores

## Próximos Pasos

1. **Tests de Integración:** Implementar tests que verifiquen la integración completa con BD real
2. **Tests de Performance:** Validar rendimiento en operaciones batch
3. **Tests de Concurrencia:** Verificar comportamiento con múltiples operaciones simultáneas
4. **Validación de Reglas de Negocio:** Tests para lógica específica del dominio veterinario

---

**Nota:** Este módulo de pruebas sigue los mismos patrones establecidos en los módulos de analytics, citas y mascotas, asegurando consistencia en el enfoque de testing del proyecto.
