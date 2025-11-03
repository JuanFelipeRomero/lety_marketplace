# Configuración de Mercado Pago

Este documento describe los pasos necesarios para configurar correctamente la integración de Mercado Pago en Lety Marketplace.

## Requisitos Previos

1. Cuenta de Mercado Pago con perfil de desarrollador
2. Aplicación creada en el [Panel de Desarrolladores de Mercado Pago](https://www.mercadopago.com.co/developers/panel)
3. Credenciales de OAuth (Client ID y Client Secret)
4. URL pública para webhooks (HTTPS requerido en producción)

## Pasos de Configuración

### 1. Configurar Variables de Entorno

Asegúrate de tener estas variables en tu archivo `.env`:

```env
# Mercado Pago OAuth Credentials
MP_CLIENT_ID=your_app_client_id_here
MP_CLIENT_SECRET=your_app_client_secret_here
MP_ACCESS_TOKEN=your_marketplace_access_token
MP_PUBLIC_KEY=your_marketplace_public_key

# Webhook Configuration
MP_REDIRECT_URI=https://your-backend-url.com/mercadopago/oauth/callback
MP_WEBHOOK_SECRET=your_webhook_secret_here

# URLs
FRONTEND_URL=https://your-frontend-url.com
BACKEND_URL=https://your-backend-url.com

# Payment Configuration
DEFAULT_COMMISSION_PERCENTAGE=10
REFUND_DEADLINE_HOURS=24
```

### 2. Ejecutar Migraciones de Base de Datos

Ejecuta las migraciones para agregar los campos necesarios:

```bash
# Conectarte a tu base de datos y ejecutar:
psql -U your_user -d your_database -f backend/migrations/001_add_payment_fields.sql
psql -U your_user -d your_database -f backend/migrations/002_add_user_identification.sql
```

O usando Supabase SQL Editor, copia y ejecuta el contenido de ambos archivos.

### 3. Configurar Webhooks en Mercado Pago

Hay dos formas de configurar webhooks:

#### Opción A: Usando el Panel de Desarrolladores (Recomendado)

1. Inicia sesión en [Mercado Pago Developers](https://www.mercadopago.com.co/developers/panel)
2. Ve a tu aplicación
3. En el menú lateral, selecciona "Webhooks"
4. Haz clic en "Configurar notificaciones"
5. Configura las siguientes URLs:

**Producción:**
```
https://your-backend-url.com/payments/webhook
```

**Sandbox (para pruebas):**
```
https://your-backend-url.com/payments/webhook
```

6. Selecciona los siguientes eventos:
   - ✅ **Pagos** (payment)
   - ✅ **Merchant Orders** (opcional)

7. Guarda la configuración

8. **IMPORTANTE:** Copia el "Webhook Secret" que te proporciona Mercado Pago y agrégalo a tu `.env` como `MP_WEBHOOK_SECRET`

#### Opción B: Usando el MCP de Mercado Pago (Programático)

Si tienes el MCP de Mercado Pago configurado en Claude Code:

```javascript
// Ejemplo de configuración via MCP
await mcp_mercadopago_save_webhook({
  callback: "https://your-backend-url.com/payments/webhook",
  callback_sandbox: "https://your-backend-url.com/payments/webhook",
  topics: ["payment", "merchant_order"]
});
```

### 4. Configurar Redirect URI en Mercado Pago

1. En el panel de tu aplicación en Mercado Pago
2. Ve a "Configuración" → "Redirect URLs"
3. Agrega tu URL de callback de OAuth:
```
https://your-backend-url.com/mercadopago/oauth/callback
```

### 5. Probar la Configuración de Webhooks

Puedes probar los webhooks usando el MCP:

```javascript
// Simular un webhook de pago
await mcp_mercadopago_simulate_webhook({
  resource_id: "123456789", // ID de un pago de prueba
  topic: "payment",
  callback_env_production: false // false para sandbox, true para producción
});
```

## Requisitos del Checklist de Calidad

La integración ahora cumple con estos requisitos de Mercado Pago:

### Campos Implementados ✅

1. **items.quantity** - Cantidad del producto/servicio
2. **items.unit_price** - Precio unitario
3. **items.category_id** - Categoría del servicio ('services')
4. **items.id** - ID del item (appointment_XXX)
5. **items.title** - Nombre del servicio
6. **items.description** - Descripción detallada
7. **payer.email** - Email del comprador
8. **payer.first_name** - Nombre del comprador
9. **payer.last_name** - Apellido del comprador
10. **payer.phone** - Teléfono del comprador
11. **payer.identification** - Documento de identidad (tipo y número)
12. **payer.address** - Dirección del comprador
13. **statement_descriptor** - Descripción en extracto bancario
14. **back_urls** - URLs de retorno (success, failure, pending)
15. **notification_url** - URL para webhooks
16. **external_reference** - Referencia externa (appointment_XXX)
17. **marketplace_fee** - Comisión de plataforma
18. **purpose** - Propósito del pago ('wallet_purchase')
19. **binary_mode** - Modo de pago (false para permitir métodos offline)
20. **additional_info** - Información adicional completa
21. **expires** - Vencimiento de preferencia (24 horas)
22. **Validación de firma de webhooks** - HMAC SHA256

## Datos de Usuario Requeridos

Para que la integración funcione correctamente, los usuarios deben proporcionar:

### Campos Obligatorios:
- ✅ Email
- ✅ Nombre completo
- ✅ Teléfono
- ✅ Tipo de documento (CC, CE, TI, PA, NIT)
- ✅ Número de documento

### Campos Opcionales (recomendados):
- Dirección completa
- Ciudad
- Código postal

## Actualizar Frontend

Asegúrate de que el formulario de registro/perfil del usuario capture estos campos:

```typescript
// Campos necesarios en el formulario de usuario
interface UserFormData {
  nombre: string;           // Nombre completo
  correo: string;           // Email
  telefono: string;         // Teléfono (10 dígitos)
  tipo_documento: 'CC' | 'CE' | 'TI' | 'PA' | 'NIT'; // Tipo de documento
  numero_documento: string; // Número de documento
  direccion?: string;       // Dirección (opcional pero recomendado)
  ciudad?: string;          // Ciudad (opcional)
  codigo_postal?: string;   // Código postal (opcional)
}
```

## Flujo de Integración

### Para Clínicas Veterinarias:

1. La clínica accede a `/dashboard-vet/mercadopago-setup`
2. Hace clic en "Conectar Mercado Pago"
3. Es redirigida a Mercado Pago para autorizar
4. Al aprobar, Mercado Pago redirige de vuelta con un código
5. El backend intercambia el código por tokens y los guarda
6. La clínica ya puede recibir pagos

### Para Pagos de Citas:

1. El dueño de mascota agenda una cita
2. La clínica confirma la cita
3. El sistema crea una preferencia de pago en Mercado Pago
4. Se genera un link de pago y se envía al usuario
5. El usuario paga a través del link
6. Mercado Pago envía un webhook cuando el pago se procesa
7. El sistema actualiza el estado de la cita automáticamente

## Seguridad

### Validación de Webhooks

Los webhooks ahora están protegidos con validación HMAC SHA256:

```javascript
// El sistema valida automáticamente cada webhook:
const signature = headers['x-signature'];
const requestId = headers['x-request-id'];
const dataId = query.id;

// Calcula: HMAC-SHA256(dataId + requestId, webhook_secret)
// Compara con x-signature
```

### Tokens de OAuth

Los tokens tienen una expiración de ~180 días. El sistema:
- Verifica la expiración automáticamente
- Alerta cuando quedan menos de 7 días
- Permite refrescar tokens manualmente desde el dashboard

## Testing con Usuarios de Prueba

### 🧪 Entorno de Sandbox vs Producción

Antes de ir a producción, es **fundamental** probar tu integración usando el entorno de **Sandbox** de Mercado Pago.

**📚 Guía Completa**: Para una guía detallada paso a paso sobre cómo probar tu integración, consulta:
👉 **[MERCADOPAGO_TESTING_GUIDE.md](./MERCADOPAGO_TESTING_GUIDE.md)**

### Resumen Rápido

#### ¿Por qué necesito usuarios de prueba?

Las credenciales de **Sandbox** (pruebas) **SOLO** funcionan con **usuarios de prueba**, NO con cuentas reales de Mercado Pago.

Si intentas conectar tu cuenta real de Mercado Pago usando credenciales de sandbox, obtendrás el error:
```
"La aplicación no está preparada para conectarse a Mercado Pago"
```

#### Pasos Básicos para Testing

1. **Crear usuario vendedor de prueba**:
   - Ve a [Cuentas de Prueba](https://www.mercadopago.com.co/developers/panel/test-users)
   - Crea un usuario tipo "Vendedor"
   - Guarda las credenciales generadas

2. **Probar OAuth con usuario de prueba**:
   - Conecta la veterinaria usando el usuario de prueba (NO tu cuenta real)
   - Esto debería funcionar sin errores

3. **Probar pagos con tarjetas de prueba**:
   - Usa tarjetas ficticias proporcionadas por Mercado Pago
   - Ejemplo: `5031 7557 3453 0604` (aprobada)

4. **Verificar webhooks**:
   - Confirma que lleguen notificaciones al backend
   - Valida que se actualicen los estados

**📖 Para instrucciones detalladas, tarjetas de prueba completas, y troubleshooting, consulta:**
👉 **[MERCADOPAGO_TESTING_GUIDE.md](./MERCADOPAGO_TESTING_GUIDE.md)**

---

## Troubleshooting

### Error: "La aplicación no está preparada para conectarse"

**Causas comunes:**

#### 1. Usando cuenta real con credenciales de sandbox ⚠️ MÁS COMÚN
**Problema**: Estás intentando conectar tu cuenta REAL de Mercado Pago Colombia, pero tu aplicación tiene credenciales de SANDBOX (pruebas).

**Solución**:
- Para **testing/desarrollo**: Usa un [usuario de prueba vendedor](./MERCADOPAGO_TESTING_GUIDE.md#paso-1-crear-usuarios-de-prueba)
- Para **producción**: Obtén [credenciales de producción](#migración-a-producción) del panel de MP

#### 2. Redirect URI no configurada
**Problema**: Falta configurar la Redirect URI en el panel de Mercado Pago

**Solución:**
- Ve al [Panel de Desarrolladores > Tu aplicación](https://www.mercadopago.com.co/developers/panel/app)
- En "Configuración" → "Redirect URLs", agrega:
  ```
  https://your-backend-url.com/mercadopago/oauth/callback
  ```
- La URL debe coincidir **exactamente** con `MP_REDIRECT_URI` en tu `.env`

#### 3. Faltan campos del checklist de calidad
**Problema**: No se envían todos los campos requeridos en las preferencias de pago

**Solución:**
- Verifica que los usuarios tengan documento de identidad
- Asegúrate de enviar todos los [campos obligatorios](#campos-implementados-)

#### 4. Webhooks no configurados
**Problema**: Los webhooks no están registrados en Mercado Pago

**Solución:**
- Configura webhooks en el [Panel de MP](https://www.mercadopago.com.co/developers/panel)
- Verifica que `MP_WEBHOOK_SECRET` esté en tu `.env`

### Error: "Invalid webhook signature"

**Causa:** El webhook secret no coincide o no está configurado

**Solución:**
1. Obtén el webhook secret del panel de Mercado Pago
2. Actualiza `MP_WEBHOOK_SECRET` en `.env`
3. Reinicia el servidor

### Los usuarios no pueden pagar porque faltan datos

**Causa:** El usuario no tiene documento de identidad o teléfono

**Solución:**
1. Actualiza el frontend para solicitar estos datos en el registro
2. Crea una pantalla de "Completar perfil" antes de permitir pagos
3. Valida que los datos estén completos antes de crear preferencias

## Testing

### Probar OAuth:

```bash
# 1. Iniciar flujo de autorización
curl http://localhost:3000/mercadopago/oauth/authorize

# 2. Seguir el link retornado
# 3. Autorizar en Mercado Pago
# 4. Verificar que se guardaron los tokens
```

### Probar Creación de Preferencia:

```bash
curl -X POST http://localhost:3000/payments/create-preference \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{"appointmentId": 123}'
```

### Probar Webhooks:

```bash
# Usando MCP de Mercado Pago:
mcp_mercadopago_simulate_webhook({
  resource_id: "payment_id_here",
  topic: "payment",
  callback_env_production: false
});
```

## Migración a Producción

Cuando estés listo para procesar pagos reales, sigue estos pasos:

### 1. Obtener Credenciales de Producción

1. Ve a [Panel de Desarrolladores > Tu aplicación](https://www.mercadopago.com.co/developers/panel/app)
2. En el menú lateral, selecciona **"Credenciales de Producción"**
3. Si te pide información de la empresa:
   - **Industria**: Selecciona "Servicios" o "Marketplace"
   - **Sitio web**: Ingresa tu URL de producción (puede ser temporal)
4. Copia:
   - **Public Key** → Será tu nuevo `MP_CLIENT_ID`
   - **Client Secret** → Será tu nuevo `MP_CLIENT_SECRET`
   - **Access Token** → Será tu nuevo `MP_ACCESS_TOKEN`

### 2. Actualizar Variables de Entorno

Actualiza tu `.env` de producción:

```env
# Cambiar de credenciales sandbox a producción
MP_CLIENT_ID=[Public Key de Producción]
MP_CLIENT_SECRET=[Client Secret de Producción]
MP_ACCESS_TOKEN=[Access Token de Producción]

# Actualizar a URL de producción
MP_REDIRECT_URI=https://tu-dominio-real.com/mercadopago/oauth/callback
FRONTEND_URL=https://tu-dominio-real.com
BACKEND_URL=https://tu-backend-real.com
```

### 3. Actualizar Configuración en Mercado Pago

1. Actualiza la **Redirect URI** en el panel de MP con tu URL de producción
2. Reconfigura los **Webhooks** con tu URL de producción:
   ```
   https://tu-backend-real.com/payments/webhook
   ```
3. Verifica que Colombia esté habilitado en tu aplicación

### 4. Reconectar Veterinarias

⚠️ **Importante**: Las veterinarias que conectaste con usuarios de prueba deberán reconectarse usando sus **cuentas reales** de Mercado Pago.

### 5. Verificación Final

Antes de lanzar:
- ✅ Todas las credenciales son de producción
- ✅ URLs apuntan a tu dominio real
- ✅ Webhooks configurados correctamente
- ✅ SSL/HTTPS habilitado
- ✅ Probado al menos una conexión de veterinaria real
- ✅ Probado al menos un pago real

## Recursos Adicionales

- 📚 [**Guía de Testing Completa**](./MERCADOPAGO_TESTING_GUIDE.md) - Cómo probar con usuarios de prueba
- 🚀 [**Guía Rápida de Solución**](./MERCADOPAGO_FIX_QUICK_GUIDE.md) - Resumen del fix del error de Colombia
- 📖 [Documentación de Mercado Pago](https://www.mercadopago.com.co/developers)
- ✅ [Checklist de Calidad](https://www.mercadopago.com.co/developers/es/docs/integration-quality)
- 🔐 [OAuth Reference](https://www.mercadopago.com.co/developers/es/docs/security/oauth)
- 📡 [Webhooks Guide](https://www.mercadopago.com.co/developers/es/docs/webhooks)

## Contacto y Soporte

Si encuentras problemas:
1. Revisa los logs del backend (`console.log` statements)
2. Verifica la configuración en el panel de Mercado Pago
3. Consulta la documentación oficial
4. Contacta al equipo de soporte de Mercado Pago: https://www.mercadopago.com.co/developers/es/support
