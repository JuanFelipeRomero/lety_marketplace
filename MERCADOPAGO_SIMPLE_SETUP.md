# Guía de Configuración de Mercado Pago (Flujo Simplificado)

Esta guía explica cómo configurar Mercado Pago en Lety Marketplace con el flujo simplificado donde **todos los pagos van a una única cuenta de Mercado Pago de la plataforma**.

## 📋 Tabla de Contenidos

- [Resumen del Flujo](#resumen-del-flujo)
- [Requisitos Previos](#requisitos-previos)
- [Configuración Paso a Paso](#configuración-paso-a-paso)
- [Pruebas y Testing](#pruebas-y-testing)
- [Flujo de Pagos](#flujo-de-pagos)
- [Gestión de Ganancias](#gestión-de-ganancias)
- [FAQ](#faq)

---

## 📝 Resumen del Flujo

### ¿Cómo Funciona?

1. **Cliente reserva cita** → El usuario selecciona un servicio veterinario
2. **Sistema genera link de pago** → Se crea una preferencia en Mercado Pago
3. **Cliente paga** → El dinero va directamente a TU cuenta de Mercado Pago
4. **Webhook confirma pago** → El sistema registra el pago y calcula ganancias
5. **Ganancias registradas** → Se guarda cuánto le debes a cada clínica veterinaria
6. **Pago a clínicas** → Tú (administrador) pagas a las clínicas manualmente

### Diferencias con el Modelo Anterior

| Aspecto | Modelo Anterior (Marketplace) | Modelo Simplificado (Actual) |
|---------|------------------------------|------------------------------|
| **Cuentas MP** | Cada clínica conecta su cuenta | Solo la plataforma tiene cuenta |
| **OAuth** | Requerido para cada clínica | No se requiere |
| **Split de Pagos** | Automático via `marketplace_fee` | Manual, registrado internamente |
| **Complejidad** | Alta | Baja |
| **Gestión Tributaria** | Cada clínica independiente | Solo la plataforma |
| **Ideal para** | Marketplace grande | MVP, Demo, Educación |

---

## ✅ Requisitos Previos

### 1. Cuenta de Mercado Pago

Necesitas **una cuenta de Mercado Pago en Colombia** (la de la plataforma).

- Si no tienes cuenta: [Crear cuenta en Mercado Pago](https://www.mercadopago.com.co)
- Tipo de cuenta: **Vendedor** (no necesitas cuenta empresarial para desarrollo)

### 2. Credenciales de Mercado Pago

Ve a tu [Panel de Desarrolladores de Mercado Pago](https://www.mercadopago.com.co/developers/panel/app):

1. Crea una nueva aplicación (si no tienes una)
2. Anota las siguientes credenciales:
   - **Access Token** (Producción y Test)
   - **Public Key** (Producción y Test)

### 3. Base de Datos

Ejecuta las migraciones incluidas:

```bash
cd backend
# Ejecuta la migración 001 (campos de pago originales)
psql -h <host> -U <usuario> -d <database> -f migrations/001_add_payment_fields.sql

# Ejecuta la migración 002 (simplificación)
psql -h <host> -U <usuario> -d <database> -f migrations/002_simplify_mercadopago.sql
```

O si usas Supabase, copia y ejecuta el SQL desde la interfaz web.

---

## 🚀 Configuración Paso a Paso

### Paso 1: Configurar Variables de Entorno

Copia el archivo de ejemplo:

```bash
cd backend
cp .env.example .env
```

Edita `.env` y configura las credenciales de Mercado Pago:

```env
# Mercado Pago Configuration (Simplified Integration)
# Para DESARROLLO: usa las credenciales de TEST
# Para PRODUCCIÓN: usa las credenciales de PRODUCCIÓN

MP_ACCESS_TOKEN=TEST-1234567890-abcdef  # O tu token de producción
MP_PUBLIC_KEY=TEST-abc123-def456         # O tu public key de producción

# Webhook Secret (opcional para desarrollo, obligatorio para producción)
MP_WEBHOOK_SECRET=                        # Dejar vacío en desarrollo

# URLs
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000
```

**⚠️ IMPORTANTE:**
- En **desarrollo**: Usa credenciales de **TEST**
- En **producción**: Usa credenciales de **PRODUCCIÓN**
- Nunca compartas tus tokens de producción

### Paso 2: Configurar Webhook (Producción)

Para recibir notificaciones de pago, necesitas configurar un webhook:

1. Ve a tu app en el [Panel de Mercado Pago](https://www.mercadopago.com.co/developers/panel/app)
2. En la sección **Webhooks**, agrega:
   - **URL**: `https://tu-dominio.com/payments/webhook`
   - **Eventos**: Selecciona `payment` (pagos)
3. Copia el **Webhook Secret** y agrégalo al `.env` como `MP_WEBHOOK_SECRET`

**Para desarrollo local con webhooks:**

Usa ngrok o similar para exponer tu localhost:

```bash
ngrok http 3000
# Copia la URL HTTPS generada y úsala en Mercado Pago
# Ejemplo: https://abc123.ngrok.io/payments/webhook
```

### Paso 3: Verificar Configuración de la Plataforma

Revisa los valores en la tabla `configuracion_plataforma`:

```sql
SELECT * FROM configuracion_plataforma;
```

Configuraciones importantes:

- **commission_percentage**: Comisión de la plataforma (default: 10%)
- **refund_deadline_hours**: Horas antes de la cita para permitir reembolso (default: 24)
- **min_payout_amount**: Monto mínimo para pago a clínicas (default: 50000 COP)

Puedes modificarlos:

```sql
UPDATE configuracion_plataforma
SET valor = '15'
WHERE clave = 'commission_percentage';
```

---

## 🧪 Pruebas y Testing

### Modo de Pruebas

Cuando usas credenciales de TEST, puedes probar pagos sin dinero real.

#### Tarjetas de Prueba para Colombia (MCO)

| Tarjeta | Número | Código | Vencimiento | Resultado |
|---------|--------|--------|-------------|-----------|
| Mastercard | 5474 9254 3267 0366 | 123 | 11/25 | ✅ Aprobado |
| Visa | 4013 5406 8274 6260 | 123 | 11/25 | ✅ Aprobado |
| Amex | 3711 803032 57522 | 1234 | 11/25 | ✅ Aprobado |
| Mastercard | 5031 7557 3453 0604 | 123 | 11/25 | ❌ Rechazado (fondos insuficientes) |

**Datos del pagador de prueba:**
- Email: `test_user_123456@testuser.com`
- Documento: CC 12345678

### Flujo de Prueba Completo

1. **Crear una cita**:
   ```bash
   # Desde el frontend, reserva una cita como usuario
   ```

2. **Generar link de pago**:
   ```bash
   curl -X POST http://localhost:3000/payments/create-preference \
     -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"appointmentId": 123}'
   ```

3. **Pagar la cita**:
   - Abre el `payment_url` retornado
   - Usa una tarjeta de prueba
   - Completa el pago

4. **Verificar webhook**:
   ```bash
   # Revisa los logs del backend para ver el webhook
   # Debe mostrar: ✅ Payment {id} processed for appointment {id}
   ```

5. **Verificar ganancias**:
   ```bash
   curl http://localhost:3000/payments/clinic-earnings \
     -H "Authorization: Bearer VET_JWT_TOKEN"
   ```

---

## 💰 Flujo de Pagos

### 1. Cliente Realiza el Pago

```
Cliente → Mercado Pago Checkout → Paga con tarjeta/PSE/efectivo
                                    ↓
                    Dinero depositado en TU cuenta de Mercado Pago
```

### 2. Sistema Registra el Pago

Cuando el webhook confirma el pago:

```sql
-- Se actualiza la cita
UPDATE citas
SET payment_status = 'paid',
    payment_id = '123456789',
    payment_date = NOW()
WHERE id_cita = 123;

-- Se crea registro de ganancia
INSERT INTO veterinary_earnings (
  id_clinica, id_cita, amount_total,
  platform_commission, clinic_amount, status
) VALUES (
  10,        -- ID de la clínica
  123,       -- ID de la cita
  100000,    -- Total pagado por el cliente
  10000,     -- 10% comisión plataforma
  90000,     -- 90% para la clínica
  'pending'  -- Pendiente de pago a la clínica
);
```

### 3. Cálculo de Comisiones

```javascript
// Ejemplo con 10% de comisión
Total pagado por cliente:    COP 100,000
Comisión plataforma (10%):   COP  10,000
Ganancia clínica (90%):      COP  90,000
```

### 4. Dashboard de Ganancias (Veterinarias)

Las clínicas ven sus ganancias en `/dashboard-vet/earnings`:

- **Pendiente**: Dinero acumulado por pagar
- **Pagado**: Dinero ya transferido a la clínica
- **Total**: Suma de todas las ganancias (neto de comisión)

---

## 📊 Gestión de Ganancias

### Consultar Ganancias Pendientes

```sql
-- Ver ganancias pendientes por clínica
SELECT
  c.nombre AS clinica,
  SUM(ve.clinic_amount) AS total_pendiente,
  COUNT(*) AS num_citas
FROM veterinary_earnings ve
JOIN clinicas c ON c.id_clinica = ve.id_clinica
WHERE ve.status = 'pending'
GROUP BY c.id_clinica, c.nombre
ORDER BY total_pendiente DESC;
```

### Marcar Pago a Clínica

Cuando transfieres dinero a una clínica:

```sql
-- Actualizar ganancias como pagadas
UPDATE veterinary_earnings
SET status = 'paid_out',
    payout_date = NOW(),
    payout_method = 'bank_transfer',
    payout_reference = 'TRANSFERENCIA_123456'
WHERE id_clinica = 10
  AND status = 'pending';
```

### Retener Ganancias

Si necesitas retener ganancias temporalmente:

```sql
UPDATE veterinary_earnings
SET status = 'held',
    notes = 'En revisión por soporte'
WHERE id_earning = 123;
```

---

## ❓ FAQ

### ¿Puedo usar este sistema en producción?

Este sistema simplificado es ideal para:
- ✅ MVPs y demos
- ✅ Proyectos educativos
- ✅ Plataformas pequeñas con pocas transacciones

**No es recomendado para**:
- ❌ Marketplaces grandes con alto volumen
- ❌ Cuando las clínicas necesitan acceso directo a su dinero
- ❌ Operaciones con regulaciones estrictas de split de pagos

Para casos más complejos, considera usar el modelo de marketplace con OAuth.

### ¿Cómo pago a las clínicas?

Tienes varias opciones:

1. **Transferencia bancaria manual**: Revisa ganancias pendientes y transfieres
2. **Mercado Pago P2P**: Usa tu cuenta MP para enviar a la cuenta MP de la clínica
3. **Automatización externa**: Script que procesa pagos periódicamente

### ¿Qué pasa si un cliente pide reembolso?

El sistema maneja reembolsos automáticamente:

1. Cliente/clínica solicita cancelación (con 24h de anticipación)
2. Sistema procesa refund en Mercado Pago
3. Dinero regresa al cliente
4. Ganancia de la clínica se marca como `cancelled`

```javascript
// Solicitar reembolso
POST /payments/refund/:appointmentId
{
  "reason": "Cliente canceló por emergencia"
}
```

### ¿Cómo sé si un webhook es legítimo?

El sistema valida webhooks usando HMAC-SHA256:

```javascript
// En backend/src/services/mercadopago.js
MercadoPagoUtils.validateWebhookSignature(headers, query, webhookSecret)
```

**Recomendación**: Siempre configura `MP_WEBHOOK_SECRET` en producción.

### ¿Puedo cambiar el porcentaje de comisión?

Sí, en cualquier momento:

```sql
UPDATE configuracion_plataforma
SET valor = '15'  -- 15% de comisión
WHERE clave = 'commission_percentage';
```

El cambio aplica a **nuevos pagos** (los existentes mantienen su comisión original).

### ¿Qué medios de pago acepta?

Mercado Pago en Colombia (MCO) soporta:

- 💳 Tarjetas de crédito (Visa, Mastercard, Amex, Diners)
- 💳 Tarjetas de débito
- 🏦 PSE (transferencia bancaria)
- 💰 Efecty (pago en efectivo)
- 👛 Saldo en cuenta de Mercado Pago

### ¿Cómo migro a producción?

1. Reemplaza credenciales TEST por PRODUCCIÓN en `.env`
2. Configura webhook en dominio real
3. Prueba con pago real pequeño
4. Monitorea logs y tabla `payment_transactions`

---

## 📚 Recursos Adicionales

- [Documentación Oficial Mercado Pago](https://www.mercadopago.com.co/developers/es/docs)
- [Checkout Pro - Mercado Pago](https://www.mercadopago.com.co/developers/es/docs/checkout-pro/landing)
- [API de Preferencias](https://www.mercadopago.com.co/developers/es/reference/preferences/_checkout_preferences/post)
- [Webhooks de Mercado Pago](https://www.mercadopago.com.co/developers/es/docs/your-integrations/notifications/webhooks)

---

## 🆘 Soporte

Si encuentras problemas:

1. Revisa los logs del backend: `npm start` en modo development
2. Verifica la tabla `payment_transactions` para ver el estado de pagos
3. Consulta la documentación de Mercado Pago
4. Revisa el código en `backend/src/routes/payments.js` y `backend/src/services/mercadopago.js`

---

**Última actualización**: 2025-11-03
**Versión**: 2.0 (Flujo Simplificado)
