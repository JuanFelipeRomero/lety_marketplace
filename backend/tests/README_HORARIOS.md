# Tests de Horarios - Documentación

## Descripción General

Este documento describe la implementación de pruebas para el módulo de **Horarios** del sistema de veterinarias. Las pruebas cubren todas las operaciones de gestión de horarios de atención con casos edge específicos del dominio veterinario.

## Estructura de Archivos

```
tests/
├── helpers/
│   └── horariosHelpers.js       # Funciones helper para tests de horarios
├── unit/
│   └── routes/
│       └── horarios.unit.test.js # Tests unitarios de rutas de horarios
└── README_HORARIOS.md           # Esta documentación
```

## Cobertura de Pruebas

### 1. POST /register/schedule (Crear Horario Individual)

**Pruebas de Validación de Entrada:**

- ✅ Validación de campos requeridos (id_clinica, dia_semana)
- ✅ Validación de días de semana válidos (monday-sunday)
- ✅ Validación condicional de horarios según estado
- ✅ Manejo correcto de valores por defecto (es_24h=false, esta_cerrado=false)

**Pruebas de Lógica de Negocio:**

- ✅ Procesamiento de horario normal (requiere hora_apertura y hora_cierre)
- ✅ Procesamiento de horario 24h (automático: 00:00:00 - 23:59:59)
- ✅ Procesamiento de día cerrado (horas = null)
- ✅ Validación de consistencia lógica entre campos

**Pruebas de Operaciones de Base de Datos:**

- ✅ Creación exitosa de horario
- ✅ Manejo de errores de inserción en BD
- ✅ Manejo de conflictos de horarios duplicados

**Pruebas de Estructura de Respuesta:**

- ✅ Validación de estructura de respuesta exitosa

### 2. POST /register/schedules (Crear Múltiples Horarios)

**Pruebas de Validación de Entrada:**

- ✅ Validación de estructura de request (id_clinica, array de horarios)
- ✅ Validación de cada horario en el array
- ✅ Procesamiento correcto de array de horarios mixtos
- ✅ Detección de días duplicados en el request

**Pruebas de Lógica de Negocio:**

- ✅ Validación de todos los horarios antes de procesamiento
- ✅ Manejo de horarios válidos e inválidos mezclados
- ✅ Procesamiento consistente de diferentes tipos de horario

**Pruebas de Operaciones de Base de Datos:**

- ✅ Inserción exitosa de múltiples horarios
- ✅ Manejo de errores en inserción batch
- ✅ Manejo de fallos parciales en batch

**Pruebas de Estructura de Respuesta:**

- ✅ Validación de estructura de respuesta para múltiples horarios

### 3. Validaciones Específicas del Dominio

**Validación de Formato de Tiempo:**

- ✅ Validación de formato HH:MM:SS correcto
- ✅ Rechazo de formatos inválidos
- ✅ Validación de valores de tiempo límite (00:00:00 - 23:59:59)

**Lógica de Horarios Especiales:**

- ✅ Manejo de flags conflictivos (24h + cerrado)
- ✅ Validación de horarios límite (medianoche, etc.)
- ✅ Validación de semana completa sin duplicados

### 4. Casos Edge Críticos

**Combinaciones Complejas:**

- ✅ Horarios que cruzan medianoche
- ✅ Horarios con misma hora de apertura y cierre
- ✅ Flags conflictivos con resolución por precedencia

**Casos de Integridad de Datos:**

- ✅ Preservación de campos durante procesamiento
- ✅ Procesamiento consistente de arrays
- ✅ Validación de estructura de datos procesados

### 5. Patrones de Manejo de Errores

**Errores Generales:**

- ✅ Manejo elegante de errores internos del servidor
- ✅ Formateo correcto de mensajes de error de BD
- ✅ Manejo de varios escenarios de error específicos

## Helpers y Utilidades

### horariosHelpers.js

**Funciones de Mock:**

- `createMockHorariosSupabase()` - Cliente Supabase mock para horarios
- `createTestHorariosSetup()` - Configuración completa de test

**Factories de Datos:**

- `createTestHorario()` - Genera horario de prueba
- `createTestClinica()` - Genera clínica de prueba
- `generateTestHorarios(count)` - Genera múltiples horarios

**Builders de Requests:**

- `buildCreateScheduleRequest()` - Request para horario normal
- `buildCreate24hScheduleRequest()` - Request para horario 24h
- `buildCreateClosedScheduleRequest()` - Request para día cerrado
- `buildCreateMultipleSchedulesRequest()` - Request para múltiples horarios

**Validadores Específicos:**

- `isValidDayOfWeek(day)` - Valida días de semana
- `isValidTimeFormat(time)` - Valida formato HH:MM:SS
- `validateScheduleLogic(horario)` - Valida consistencia lógica
- `processScheduleData(input, id_clinica)` - Procesa según lógica de negocio

**Generadores de Datos de Prueba:**

- `generateScheduleTestCases()` - Casos válidos e inválidos estructurados
- `generateInvalidScheduleData()` - Datos inválidos para horario individual
- `generateInvalidMultipleSchedulesData()` - Datos inválidos para múltiples horarios

**Validadores de Respuesta:**

- `validateScheduleResponse()` - Valida respuesta de horario individual
- `validateMultipleSchedulesResponse()` - Valida respuesta de múltiples horarios

## Lógica de Negocio Específica

### Estados de Horario

1. **Horario Normal:**

   - `es_24h = false`, `esta_cerrado = false`
   - Requiere `hora_apertura` y `hora_cierre`
   - Se mantienen las horas proporcionadas

2. **Horario 24 Horas:**

   - `es_24h = true`
   - `hora_apertura = "00:00:00"`, `hora_cierre = "23:59:59"` (automático)
   - Ignora horas de entrada del usuario

3. **Día Cerrado:**
   - `esta_cerrado = true`
   - `hora_apertura = null`, `hora_cierre = null`
   - Ignora horas de entrada del usuario

### Validaciones Críticas

- **Días válidos:** solo monday-sunday (inglés, minúsculas)
- **Conflictos:** `esta_cerrado` tiene precedencia sobre `es_24h`
- **Formato de hora:** estricto HH:MM:SS (con segundos)
- **Duplicados:** no se permite el mismo día para la misma clínica

## Estadísticas de Pruebas

- **Total de Pruebas:** 38
- **Grupos de Pruebas:** 8
- **Endpoints Cubiertos:** 2
- **Estado:** ✅ Todas las pruebas pasan

## Ejecución de Pruebas

### Ejecutar todas las pruebas de horarios

```bash
npm test -- tests/unit/routes/horarios.unit.test.js
```

### Ejecutar con cobertura

```bash
npm run test:coverage -- tests/unit/routes/horarios.unit.test.js
```

### Ejecutar en modo watch

```bash
npm test -- --watch tests/unit/routes/horarios.unit.test.js
```

## Consideraciones Técnicas

### Complejidad del Módulo

- **Menos endpoints** (2) pero **lógica más compleja**
- **Validaciones interdependientes** entre múltiples campos
- **Casos edge específicos** del dominio veterinario

### Patrones de Validación

- Validación de campos requeridos vs condicionales
- Lógica de precedencia entre flags conflictivos
- Validación de integridad temporal

### Mocking Strategy

- Supabase client completamente mockeado
- Respuestas configurables por tipo de operación
- Soporte para operaciones individuales y batch

### Casos Edge Cubiertos

- Horarios 24h vs días cerrados
- Conflictos de flags booleanos
- Validación de formato de tiempo estricto
- Días duplicados en batch operations

## Diferencias con Otros Módulos

### Características Únicas

1. **Lógica condicional compleja** - campos interdependientes
2. **Validación de dominio específica** - días, horarios, estados
3. **Procesamiento automático** - horas calculadas según estado
4. **Conflictos de estado** - resolución por precedencia

### Similitudes con Otros Módulos

1. **Patrón de testing** - estructura describe/test anidada
2. **Helpers organizados** - mocks, factories, validators
3. **Cobertura completa** - success, errors, edge cases
4. **Documentación detallada** - README específico

## Próximos Pasos

1. **Tests de Integración:** Implementar tests que verifiquen la integración completa con BD real
2. **Tests de Conflictos:** Validar comportamiento con horarios solapados o conflictivos
3. **Tests de Performance:** Validar rendimiento en operaciones batch de semana completa
4. **Validación de Reglas de Negocio:** Tests para casos específicos de clínicas veterinarias

---

**Nota:** Este módulo de pruebas mantiene los mismos patrones establecidos en otros módulos, pero adapta la complejidad específica de la gestión de horarios de atención veterinaria.
