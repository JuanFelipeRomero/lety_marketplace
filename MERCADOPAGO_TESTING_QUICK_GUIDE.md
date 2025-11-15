# Guía Rápida de Testing - Mercado Pago (Flujo Simplificado)

## 🔥 Cambios Realizados

### 1. **Backend - Confirmación de Citas (`citas.js`)**
   - ✅ Eliminada validación de OAuth (`mp_connected`, `mercadopago_access_token`)
   - ✅ Ahora usa el flujo simplificado con credenciales de la plataforma
   - ✅ Crea preferencia de pago automáticamente cuando la veterinaria confirma una cita

### 2. **Frontend - Vista de Citas del Cliente (`appointments.tsx`)**
   - ✅ Agregado botón de pago que aparece cuando `payment_status === "awaiting_payment"`
   - ✅ Agregados campos de pago en la interfaz TypeScript
   - ✅ Backend devuelve `payment_url`, `payment_status`, `payment_amount`

## 🧪 Cómo Probar el Flujo Completo

### Paso 1: Verificar Variables de Entorno

En `backend/.env`, asegúrate de tener:

```env
# IMPORTANTE: Usa credenciales de TEST para desarrollo
MP_ACCESS_TOKEN=TEST-xxxxx-xxxxxx-xxxxxx
MP_PUBLIC_KEY=TEST-xxxxx-xxxxxx-xxxxxx

# URLs (CRÍTICO: estas deben estar configuradas)
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

**⚠️ IMPORTANTE**: Si no tienes `FRONTEND_URL` y `BACKEND_URL` configuradas, verás el error:
```
auto_return invalid. back_url.success must be defined
```

**¿Dónde obtener las credenciales?**
1. Ve a https://www.mercadopago.com.co/developers/panel/app
2. Crea una aplicación (si no tienes una)
3. Copia el `Access Token` y `Public Key` de **TEST**

### Paso 2: Ejecutar las Migraciones

Si aún no has ejecutado la migración de simplificación:

```bash
cd backend
# Ejecuta la migración en tu base de datos
psql -h <host> -U <usuario> -d <database> -f migrations/002_simplify_mercadopago.sql
```

**En Supabase:**
1. Ve a SQL Editor
2. Copia el contenido de `migrations/002_simplify_mercadopago.sql`
3. Ejecuta el SQL

### Paso 3: Reiniciar el Backend

```bash
cd backend
npm start
```

Verifica en los logs que inicie sin errores.

### Paso 4: Probar el Flujo

#### A. Como Cliente (Pet Owner)

1. **Crear una cita**:
   - Inicia sesión como usuario cliente
   - Ve a "Buscar Veterinarias"
   - Selecciona una clínica
   - Agenda una cita con una mascota

2. **Verificar estado inicial**:
   - Ve a "Mis Citas"
   - La cita debe estar en estado `pendiente`
   - NO debe haber botón de pago todavía

#### B. Como Veterinaria

1. **Confirmar la cita**:
   - Cierra sesión del cliente
   - Inicia sesión como veterinaria
   - Ve a "Citas"
   - Encuentra la cita pendiente
   - Haz clic en "Confirmar"

2. **Verificar en Backend**:
   - Revisa los logs del backend
   - Deberías ver: `✅ Payment preference created for appointment {id}`
   - Si ves errores, revisa:
     - ¿Está configurado `MP_ACCESS_TOKEN`?
     - ¿Está funcionando la API de Mercado Pago?

#### C. Como Cliente - Pagar

1. **Ver botón de pago**:
   - Cierra sesión de la veterinaria
   - Inicia sesión como cliente
   - Ve a "Mis Citas"
   - La cita debe estar en estado `confirmada`
   - **DEBE aparecer un botón verde "Pagar"** 💳

2. **Realizar el pago**:
   - Haz clic en "Pagar"
   - Se abrirá Mercado Pago en una nueva pestaña
   - Usa estos datos de prueba para Colombia (MCO):

   **Tarjetas de prueba**:
   | Tarjeta | Número | CVV | Vencimiento |
   |---------|--------|-----|-------------|
   | Mastercard | `5254 1336 7440 3564` | 123 | 11/30 |
   | Visa | `4013 5406 8274 6260` | 123 | 11/30 |

   **⚠️ DATOS DEL TITULAR (CRÍTICO)**:
   - **Nombre del titular**: `APRO` ← ⚠️ **Escribe exactamente esto, NO tu nombre real**
   - **Documento**: `123456789`
   - **Email**: Cualquiera (ej: test@test.com)

   **Importante**: El nombre del titular controla el resultado del pago:
   - `APRO` → ✅ Pago aprobado
   - `OTHE` → ❌ Rechazado por error
   - `FUND` → ❌ Rechazado por fondos insuficientes

3. **Verificar el pago**:
   - Completa el pago en Mercado Pago
   - Regresa a la aplicación
   - El webhook debe procesar el pago automáticamente
   - Revisa los logs: `✅ Payment {id} processed for appointment {id}`

4. **Verificar ganancias de la clínica**:
   - Inicia sesión como veterinaria
   - Ve a "Ganancias" (`/dashboard-vet/earnings`)
   - Deberías ver:
     - **Pendiente**: El monto que se le debe a la clínica (90% del total)
     - **Comisión Plataforma**: 10% del total
     - Fecha del pago

## 🐛 Troubleshooting

### Error: "Una de las partes con la que intentas hacer el pago es de prueba"

**Causa Principal**: Estás intentando pagar con tu cuenta REAL de Mercado Pago usando credenciales de TEST.

**Solución**:
Necesitas crear y usar un **usuario de prueba comprador**:

1. Ve a https://www.mercadopago.com.co/developers/panel/app
2. Clic en "Cuentas de prueba" → "Crear cuenta de prueba"
3. Selecciona tipo: **Comprador**, país: Colombia
4. Copia el **Usuario** y **Contraseña** que te da
5. Copia el **User ID** (lo necesitarás para verificación)
6. Abre una **ventana de incógnito**
7. Inicia sesión en Mercado Pago con el usuario de prueba
8. **Si pide código de verificación**: Usa los **últimos 6 dígitos del User ID**
   - Ejemplo: User ID `1234567890` → Código: `567890`
9. Ahora sí, realiza el pago desde tu aplicación

📚 Guía completa: [CREAR_USUARIO_PRUEBA_MP.md](./CREAR_USUARIO_PRUEBA_MP.md)

### Error: Pide código de verificación por email

**Causa**: Los usuarios de prueba no tienen email real.

**Solución**:
Usa los **últimos 6 dígitos del User ID** como código de verificación:
1. Ve al panel de desarrolladores
2. Busca el User ID de tu usuario de prueba (ej: `2951551191`)
3. Toma los últimos 6 dígitos (ej: `551191`)
4. Ingrésalos como código

### Error: Estás usando tu nombre real en lugar del nombre de prueba

**Solución**:
Cuando uses credenciales de TEST, debes usar datos de prueba específicos:

**Para Colombia (MCO) - Pago Aprobado**:
- Tarjeta: `5254 1336 7440 3564`
- CVV: `123`
- Vencimiento: `11/30`
- **Nombre del titular**: `APRO` ← ⚠️ Escribe exactamente esto
- Documento: `123456789`

**⚠️ MUY IMPORTANTE**:
- ❌ NO uses tu nombre real (ej: "Juan Pérez")
- ✅ USA: `APRO` (todo en mayúsculas)
- El nombre del titular controla el resultado del pago en modo TEST

### El botón de pago NO aparece después de confirmar

**Posibles causas**:

1. **El backend no creó la preferencia de pago**:
   ```bash
   # Verifica los logs del backend cuando confirmas la cita
   # Busca: "✅ Payment preference created for appointment"
   # Si no aparece, revisa errores en los logs
   ```

2. **Las credenciales de Mercado Pago no están configuradas**:
   ```bash
   # Verifica que tengas MP_ACCESS_TOKEN en .env
   cat backend/.env | grep MP_ACCESS_TOKEN
   ```

3. **La cita no tiene `payment_url` en la base de datos**:
   ```sql
   -- Ejecuta en Supabase SQL Editor
   SELECT id_cita, estado, payment_status, payment_url, payment_amount
   FROM citas
   WHERE id_cita = <ID_DE_TU_CITA>;

   -- Debería mostrar:
   -- payment_status: 'awaiting_payment'
   -- payment_url: 'https://www.mercadopago.com.co/checkout/v1/redirect?...'
   -- payment_amount: <precio del servicio>
   ```

4. **El frontend no está recibiendo los campos de pago**:
   ```bash
   # Abre DevTools en el navegador
   # Ve a Network > XHR
   # Busca la request a /appointments/user
   # Verifica que la respuesta incluya payment_url, payment_status, payment_amount
   ```

### Error: "auto_return invalid. back_url.success must be defined"

**Causa**: Estás usando credenciales de PRODUCCIÓN con URLs de localhost.

**Solución**:
1. Ve a https://www.mercadopago.com.co/developers/panel/app
2. Cambia a la pestaña **"Credenciales de prueba"** (no "Credenciales de producción")
3. Copia **AMBAS** credenciales:
   - ✅ Access Token de TEST (empieza con `TEST-`)
   - ✅ Public Key de TEST (empieza con `TEST-`)
4. Actualiza tu `.env`:
   ```env
   MP_ACCESS_TOKEN=TEST-xxxxx...  # Debe empezar con TEST-
   MP_PUBLIC_KEY=TEST-xxxxx...    # Debe empezar con TEST-
   ```
5. **REINICIA el backend** (las variables de entorno solo se cargan al iniciar)

**⚠️ IMPORTANTE**: Si alguna de tus credenciales empieza con `APP_USR-`, estás usando credenciales de PRODUCCIÓN que NO funcionan con localhost.

### Error: "Mercado Pago API error" al confirmar cita

**Causa**: Credenciales incorrectas, vencidas, o de producción.

**Solución**:
1. Verifica que **AMBAS** credenciales empiecen con `TEST-`
2. Copia y pega cuidadosamente (sin espacios extras)
3. Reinicia el backend después de cambiar `.env`

### El webhook no procesa el pago

**Causa**: URL del webhook incorrecta o no alcanzable.

**Para desarrollo local**:
1. Instala ngrok: https://ngrok.com/
2. Expone tu backend:
   ```bash
   ngrok http 3000
   ```
3. Copia la URL HTTPS (ej: `https://abc123.ngrok.io`)
4. Configúrala en Mercado Pago:
   - Panel > Webhooks
   - URL: `https://abc123.ngrok.io/payments/webhook`

**Alternativa**: Simula el webhook manualmente:
```bash
curl -X POST http://localhost:3000/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "action": "payment.updated",
    "data": {
      "id": "PAYMENT_ID_AQUI"
    },
    "type": "payment"
  }'
```

## ✅ Checklist de Verificación

- [ ] Variables de entorno configuradas (`MP_ACCESS_TOKEN`, `MP_PUBLIC_KEY`)
- [ ] Migración ejecutada (`002_simplify_mercadopago.sql`)
- [ ] Backend reiniciado
- [ ] Cliente puede crear citas
- [ ] Veterinaria puede confirmar citas
- [ ] Log muestra: "✅ Payment preference created for appointment {id}"
- [ ] Botón "Pagar" aparece en vista de cliente
- [ ] Se puede completar el pago con tarjeta de prueba
- [ ] Webhook procesa el pago (log: "✅ Payment {id} processed")
- [ ] Ganancias aparecen en dashboard de veterinaria

## 📊 Verificar Datos en Base de Datos

```sql
-- Ver estado de una cita específica
SELECT
  id_cita,
  estado,
  payment_status,
  payment_amount,
  preference_id,
  payment_url
FROM citas
WHERE id_cita = <ID_AQUI>;

-- Ver ganancias de una clínica
SELECT
  id_earning,
  id_cita,
  amount_total,
  platform_commission,
  clinic_amount,
  status,
  payment_date
FROM veterinary_earnings
WHERE id_clinica = <ID_CLINICA_AQUI>;

-- Ver todas las transacciones de pago
SELECT
  id_transaction,
  id_cita,
  transaction_type,
  status,
  amount,
  created_at
FROM payment_transactions
ORDER BY created_at DESC
LIMIT 10;
```

## 🎯 Resumen del Flujo

1. **Cliente agenda cita** → Estado: `pendiente`
2. **Veterinaria confirma cita** → Estado: `confirmada` + Se crea preferencia de pago
3. **Cliente ve botón "Pagar"** → Hace clic y va a Mercado Pago
4. **Cliente paga** → Dinero va a cuenta de la plataforma
5. **Webhook procesa pago** → Estado: `paid` + Se crea registro en `veterinary_earnings`
6. **Veterinaria ve ganancias** → Dashboard muestra 90% del pago pendiente

---

**Última actualización**: 2025-11-03
**Versión**: 1.0 (Flujo Simplificado)
