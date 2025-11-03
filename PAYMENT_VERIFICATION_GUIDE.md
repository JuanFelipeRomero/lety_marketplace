# Guía de Verificación de Pagos sin Webhooks

## Resumen de Cambios

Este documento describe la implementación del sistema de verificación de pagos que **NO depende de webhooks** para actualizar el estado de los pagos. El sistema consulta directamente la API de Mercado Pago cuando el usuario regresa del checkout.

---

## Problema Original

- Los webhooks de Mercado Pago no funcionaban en desarrollo local
- El usuario pagaba pero la BD no se actualizaba hasta que el webhook llegara (o nunca)
- No había forma de verificar manualmente el estado del pago
- Mala experiencia de usuario al tener que esperar o refrescar múltiples veces

---

## Solución Implementada

### 1. Nuevo Endpoint Backend: `/payments/verify/:appointmentId`

**Ubicación:** `backend/src/routes/payments.js` (líneas 401-592)

**Funcionalidad:**
- Recibe el ID de la cita y opcionalmente el `payment_id` de Mercado Pago
- Busca el pago en Mercado Pago usando:
  1. `payment_id` directo (si se proporciona) - método rápido
  2. `external_reference` (`appointment_{id}`) - método confiable
- Reutiliza la función `processPaymentUpdate()` existente para actualizar la BD
- Retorna mensajes user-friendly en español
- Maneja pagos pendientes (PSE, efectivo) con instrucciones

**Método HTTP:** `POST`
**Autenticación:** JWT requerido
**Permisos:** Dueño de la cita o veterinario de la clínica

**Ejemplo de Request:**
```bash
POST /payments/verify/42
Authorization: Bearer {token}
Content-Type: application/json

{
  "payment_id": "123456789" # Opcional
}
```

**Ejemplo de Response (Pago Aprobado):**
```json
{
  "message": "¡Pago confirmado! Tu cita ha sido programada.",
  "payment_status": "paid",
  "payment_id": "123456789",
  "payment_method": "credit_card",
  "payment_type": "credit_card",
  "transaction_amount": 50000,
  "mp_status": "approved",
  "mp_status_detail": "accredited",
  "date_approved": "2025-11-03T10:30:00.000Z",
  "already_processed": false
}
```

**Ejemplo de Response (Pago Pendiente - PSE):**
```json
{
  "message": "Tu pago está pendiente. Recibirás una confirmación cuando se complete.",
  "payment_status": "awaiting_payment",
  "payment_id": "123456789",
  "payment_method": "pse",
  "payment_type": "bank_transfer",
  "transaction_amount": 50000,
  "mp_status": "pending",
  "mp_status_detail": "pending_waiting_transfer",
  "pending_info": {
    "title": "Transferencia bancaria pendiente",
    "message": "Completa la transferencia bancaria en los próximos 3 días...",
    "estimated_time": "2-3 días hábiles"
  },
  "already_processed": false
}
```

---

### 2. Frontend - Verificación Automática al Volver de MP

**Ubicación:** `frontend/app/routes/DashboardClient/Citas/appointments.tsx`

**Cambios realizados:**

#### A) Nueva función `verifyPayment()` (líneas 66-117)
- Llama al endpoint `/payments/verify/:appointmentId`
- Muestra toasts con el resultado (éxito/pendiente/error)
- Refresca la lista de citas automáticamente
- Maneja estados de loading

#### B) useEffect para detectar retorno de MP (líneas 145-165)
- Detecta query parameters: `?payment=success`, `?payment=pending`, `?payment=failure`
- Busca la cita más reciente con estado `awaiting_payment`
- Llama automáticamente a `verifyPayment()`
- Limpia los query params de la URL después de verificar

#### C) Botón "Verificar Estado" (líneas 402-419)
- Visible solo cuando `payment_status === 'awaiting_payment'`
- Permite verificación manual si el usuario cierra la ventana antes de volver
- Muestra spinner animado durante la verificación
- Deshabilitado mientras verifica para evitar múltiples requests

---

## Flujo de Pago Completo

### Escenario 1: Pago con Tarjeta (Aprobado Inmediatamente)

```
1. Usuario hace clic en "Pagar" → Redirige a Mercado Pago
2. Usuario paga con tarjeta → MP aprueba inmediatamente
3. MP redirige a: /dashboard-client/appointments?payment=success
4. Frontend detecta ?payment=success
5. Frontend llama a POST /payments/verify/:appointmentId
6. Backend consulta MP API → encuentra pago "approved"
7. Backend actualiza BD: payment_status = "paid", estado = "pagada"
8. Frontend muestra toast: "¡Pago confirmado! Tu cita ha sido programada."
9. Lista de citas se actualiza automáticamente
10. Badge cambia a "Pagado ✓"
```

### Escenario 2: Pago con PSE (Pendiente)

```
1. Usuario hace clic en "Pagar" → Redirige a Mercado Pago
2. Usuario selecciona PSE y genera transferencia
3. MP redirige a: /dashboard-client/appointments?payment=pending
4. Frontend detecta ?payment=pending
5. Frontend llama a POST /payments/verify/:appointmentId
6. Backend consulta MP API → encuentra pago "pending"
7. Backend actualiza BD: payment_status = "awaiting_payment", payment_id guardado
8. Frontend muestra toast: "Tu pago está pendiente..."
9. Frontend muestra segundo toast con instrucciones de PSE (8 segundos)
10. Usuario completa transferencia en su banco (2-3 días)
11. Webhook de MP notifica cuando se confirma → BD se actualiza a "paid"
    - O usuario hace clic en "Verificar Estado" después
```

### Escenario 3: Usuario Cierra Ventana Antes de Volver

```
1. Usuario hace clic en "Pagar" → Redirige a Mercado Pago
2. Usuario paga con tarjeta → MP aprueba
3. Usuario cierra la ventana antes de regresar a la app
4. Usuario vuelve a /dashboard-client/appointments
5. Usuario ve su cita con badge "Esperando pago"
6. Usuario hace clic en botón "Verificar Estado"
7. Backend consulta MP API → encuentra pago "approved"
8. Backend actualiza BD: payment_status = "paid"
9. Frontend muestra toast: "¡Pago confirmado!"
10. Badge cambia a "Pagado ✓"
```

### Escenario 4: Webhook Falla Pero Verificación Manual Funciona

```
1. Usuario paga → Webhook falla (red, timeout, etc.)
2. BD no se actualiza automáticamente
3. Usuario ve cita con estado "Esperando pago"
4. Usuario hace clic en "Verificar Estado"
5. Sistema consulta directamente MP API
6. BD se actualiza correctamente
7. Sistema muestra estado actualizado
```

---

## Estados de Pago

### Estados en la BD (`payment_status`)

| Estado | Descripción | Badge UI |
|--------|-------------|----------|
| `null` / `undefined` | Sin pago iniciado | - |
| `awaiting_payment` | URL de pago generada, esperando pago | "Esperando pago" (amarillo) |
| `paid` | Pago confirmado | "Pagado ✓" (verde) |
| `failed` | Pago rechazado | "Pago fallido" (rojo) |
| `refunded` | Pago reembolsado | "Reembolsado" (gris) |

### Estados de Mercado Pago → Mapeo a BD

| MP Status | BD Status | Acción |
|-----------|-----------|--------|
| `approved` | `paid` | Confirmar cita, registrar ganancias |
| `pending` | `awaiting_payment` | Mostrar instrucciones, esperar webhook |
| `in_process` | `awaiting_payment` | Mostrar mensaje de procesamiento |
| `rejected` | `failed` | Permitir reintentar pago |
| `cancelled` | `cancelled` | Cancelar cita |
| `refunded` | `refunded` | Actualizar estado |

---

## Ventajas del Nuevo Sistema

✅ **No depende de webhooks para actualización inmediata**
- Usuario ve resultado al instante al volver de MP
- No hay que esperar 2-10 segundos para que llegue el webhook

✅ **Funciona en desarrollo local**
- No requiere exponer el backend con ngrok/cloudflare
- Facilita testing y desarrollo

✅ **Botón manual como backup**
- Si usuario cierra ventana, puede verificar después
- Si webhook falla, verificación manual funciona

✅ **Mejor experiencia de usuario**
- Feedback inmediato con toasts
- Mensajes claros en español
- Instrucciones para pagos pendientes (PSE, efectivo)

✅ **Reutiliza código existente**
- Usa `searchPayments()` ya implementado
- Usa `processPaymentUpdate()` para actualizar BD
- Solo ~200 líneas de código nuevo

✅ **Webhooks siguen funcionando**
- Sistema híbrido: verificación manual + webhooks
- Webhooks manejan pagos pendientes que se confirman después
- Ambos métodos son idempotentes (seguro ejecutar múltiples veces)

---

## Cómo Probar

### Preparación

1. **Asegúrate de tener configurado:**
   ```env
   # backend/.env
   MP_ACCESS_TOKEN=tu_access_token
   FRONTEND_URL=http://localhost:5173
   BACKEND_URL=http://localhost:3001
   ```

2. **Inicia backend y frontend:**
   ```bash
   # Terminal 1 - Backend
   cd backend
   npm start

   # Terminal 2 - Frontend
   cd frontend
   npm run dev
   ```

### Prueba 1: Pago con Tarjeta de Prueba (Aprobado)

1. Inicia sesión como usuario (pet owner)
2. Ve a "Mis Citas"
3. Encuentra una cita confirmada con botón "Pagar"
4. Haz clic en "Pagar" → Se abre Mercado Pago
5. Usa tarjeta de prueba:
   - **Número:** 5031 7557 3453 0604
   - **CVV:** 123
   - **Vencimiento:** 11/25
   - **Nombre:** APRO (aprueba el pago)
6. Completa el pago
7. MP te redirige a /dashboard-client/appointments?payment=success
8. **Verificar:**
   - ✅ Toast verde: "¡Pago confirmado! Tu cita ha sido programada."
   - ✅ Badge cambia a "Pagado ✓" (verde)
   - ✅ Botón "Pagar" desaparece
   - ✅ En BD: `payment_status = 'paid'`, `estado = 'pagada'`

### Prueba 2: Pago Rechazado

1. Repite proceso pero usa:
   - **Nombre:** OTHE (otros errores)
2. MP te redirige con ?payment=failure
3. **Verificar:**
   - ✅ Toast rojo: "Tu pago fue rechazado..."
   - ✅ Botón "Pagar" sigue visible
   - ✅ Badge sigue "Esperando pago"

### Prueba 3: Verificación Manual

1. Completa un pago (Prueba 1)
2. Antes de que se redirija, **cierra la ventana de MP**
3. Vuelve manualmente a /dashboard-client/appointments
4. Verás la cita con "Esperando pago"
5. Haz clic en botón "Verificar Estado"
6. **Verificar:**
   - ✅ Botón muestra "Verificando..." con spinner
   - ✅ Toast verde: "¡Pago confirmado!"
   - ✅ Badge cambia a "Pagado ✓"

### Prueba 4: Múltiples Verificaciones (Idempotencia)

1. Completa un pago exitoso
2. Haz clic en "Verificar Estado" múltiples veces
3. **Verificar:**
   - ✅ Toast: "Pago ya confirmado"
   - ✅ No se duplican registros en BD
   - ✅ No errores en consola

### Prueba 5: Simular Webhook con MCP

Si quieres probar que los webhooks todavía funcionan:

```bash
# En Claude Code con MCP de Mercado Pago
/mcp mercadopago simulate_webhook
# Payment ID: (el ID del pago que hiciste)
# Topic: payment
# Callback URL: http://localhost:3001/payments/webhook
```

**Verificar:**
- ✅ Backend logs: "📥 Webhook received"
- ✅ BD se actualiza correctamente
- ✅ No genera duplicados (idempotente)

---

## Logs de Debug

### Backend

Busca estos logs en la consola del backend:

```
🔍 Verifying payment for appointment 42
🔍 Searching payments by external_reference: appointment_42
✅ Payment found by external_reference: 123456789 (status: approved)
✅ Payment 123456789 processed for appointment 42 - Status: paid
💰 Earnings recorded for clinic 5: 45000 COP (50000 - 5000 commission)
✅ Payment verification complete for appointment 42: approved
```

### Frontend

Busca estos logs en la consola del navegador:

```
📥 Returned from MP with status: success, verifying payment...
🔍 Verifying payment for appointment 42
```

---

## Solución de Problemas

### Error: "No se encontró ningún pago para esta cita"

**Causa:** El usuario aún no completó el pago o cerró antes de pagar

**Solución:**
- Verificar que el usuario haya completado el pago en MP
- Si pagó, esperar 5-10 segundos y hacer clic en "Verificar Estado"
- Revisar en MP dashboard si el pago existe

### Error: "Token inválido o expirado"

**Causa:** Sesión expirada

**Solución:**
- Cerrar sesión y volver a iniciar sesión
- Verificar que JWT_SECRET esté configurado en backend

### El webhook no llega en producción

**No es problema:** El sistema de verificación manual funciona independientemente

**Para habilitar webhooks:**
1. Configurar webhook URL en Mercado Pago dashboard
2. Agregar `MP_WEBHOOK_SECRET` en `.env`
3. El sistema valida firma automáticamente

### Pago se procesa dos veces

**No debería pasar:** Sistema es idempotente

**Si pasa:**
1. Revisar logs para ver qué endpoint se llamó dos veces
2. Verificar que `processPaymentUpdate()` verifica estado actual antes de actualizar

---

## Archivos Modificados

```
backend/src/routes/payments.js
  - Líneas 401-592: Nuevo endpoint /payments/verify/:appointmentId
  - Líneas 546-592: Funciones helper para mensajes y instrucciones

frontend/app/routes/DashboardClient/Citas/appointments.tsx
  - Líneas 63: Nuevo estado isVerifyingPayment
  - Líneas 66-117: Función verifyPayment()
  - Líneas 119-143: Refactor fetchAppointments (extraída)
  - Líneas 145-165: useEffect para detectar retorno de MP
  - Líneas 402-420: Botón "Verificar Estado"
```

---

## API de Mercado Pago Utilizada

### Payment Search API
```javascript
MercadoPagoPaymentService.searchPayments(externalReference)
```

- **Endpoint MP:** `GET /v1/payments/search?external_reference={ref}`
- **Documentación:** https://www.mercadopago.com.co/developers/es/reference/payments/_payments_search/get
- **Rate Limit:** 10,000 requests/hour (producción)

### Get Payment API
```javascript
MercadoPagoPaymentService.getPayment(paymentId)
```

- **Endpoint MP:** `GET /v1/payments/{id}`
- **Documentación:** https://www.mercadopago.com.co/developers/es/reference/payments/_payments_id/get

---

## Próximos Pasos (Opcional)

### Mejoras Futuras

1. **Dashboard de Veterinario:**
   - Agregar botón "Verificar Pagos Pendientes" que verifique todas las citas con `awaiting_payment`
   - Mostrar estado de pago en la lista de citas del vet

2. **Notificaciones:**
   - Enviar email/SMS cuando pago se confirme
   - Notificar a la clínica cuando reciben un pago

3. **Analytics:**
   - Trackear cuántos pagos se confirman vía verificación manual vs webhook
   - Medir tiempo entre pago y confirmación

4. **Retry Logic:**
   - Agregar retry automático si consulta a MP falla (con exponential backoff)

5. **Cache:**
   - Cachear resultado de verificación por 30 segundos para evitar múltiples requests

---

## Conclusión

Este sistema proporciona una **alternativa robusta a los webhooks** que funciona tanto en desarrollo como en producción. El usuario obtiene **feedback inmediato** al volver de Mercado Pago, y tiene la opción de **verificar manualmente** en cualquier momento.

Los webhooks siguen funcionando como **sistema de respaldo** para pagos que se confirman de forma asíncrona (PSE, efectivo), pero ya no son el único punto de falla.

**Resultado:** Mejor experiencia de usuario + mayor confiabilidad + facilita desarrollo.
