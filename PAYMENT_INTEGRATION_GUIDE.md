# Guía de Integración de Pagos con Mercado Pago

## 📋 Resumen

Esta guía documenta la integración completa del sistema de pagos usando Mercado Pago para Lety Marketplace. La integración incluye:

- ✅ OAuth para conectar cuentas de veterinarias
- ✅ Split Payments (pagos divididos) con comisión de plataforma
- ✅ Flujo de pago tras confirmación de cita
- ✅ Reembolsos automáticos según política
- ✅ Webhooks para notificaciones de pago
- ✅ Gestión de estados de pago y trazabilidad

## 🎯 Flujo de Pago Implementado

### Para Veterinarias:

1. **Conexión de Mercado Pago**
   - La veterinaria accede a `/dashboard-vet/mercadopago-setup`
   - Hace clic en "Conectar Mercado Pago"
   - Es redirigida a Mercado Pago para autorizar la aplicación
   - Tras autorizar, vuelve a la plataforma con tokens guardados

2. **Confirmación de Cita y Generación de Pago**
   - La veterinaria recibe una solicitud de cita (estado: `pendiente`)
   - Al confirmar la cita, se crea automáticamente una preferencia de pago
   - El sistema calcula la comisión de plataforma (10% por defecto)
   - Se genera un link de pago que se envía al cliente

### Para Clientes:

1. **Agendamiento de Cita**
   - El cliente agenda una cita (estado: `pendiente`)
   - Ve un disclaimer sobre pago tras confirmación
   - Acepta términos incluyendo política de reembolso

2. **Recepción de Link de Pago**
   - La veterinaria confirma la cita
   - El cliente recibe notificación con link de pago
   - Puede acceder a `/dashboard-client/appointments/:id/payment`

3. **Completar Pago**
   - Cliente hace clic en "Ir a pagar"
   - Es redirigido a Mercado Pago
   - Completa el pago con método preferido
   - Mercado Pago notifica a la plataforma vía webhook
   - Estado de cita cambia a `pagada`

## 📁 Estructura de Archivos

### Backend

```
backend/
├── migrations/
│   └── 001_add_payment_fields.sql      # Migración de BD
├── src/
│   ├── services/
│   │   └── mercadopago.js              # Cliente de Mercado Pago
│   ├── routes/
│   │   ├── mercadopago.js              # Rutas OAuth
│   │   ├── payments.js                 # Rutas de pago y webhook
│   │   └── citas.js                    # Actualizado con lógica de pago
│   └── utils/
│       ├── paymentValidation.js        # Validaciones de pago
│       └── refundPolicy.js             # Políticas de reembolso
└── .env.example                        # Variables de entorno
```

### Frontend

```
frontend/
└── app/
    ├── components/
    │   ├── payment-modal.tsx           # Modal de pago
    │   ├── payment-status-badge.tsx    # Badge de estado
    │   └── appoinment-scheduler.tsx    # Actualizado con disclaimer
    └── routes/
        ├── dashboard-vet/
        │   └── mercadopago-setup.tsx   # Setup de MP para vets
        └── dashboard-client/
            └── appointments/
                └── $id/
                    └── payment.tsx      # Vista de pago para clientes
```

## 🗄️ Cambios en la Base de Datos

### Tabla `clinicas`
Nuevos campos para OAuth de Mercado Pago:
- `mercadopago_access_token` - Token de acceso (válido 180 días)
- `mercadopago_refresh_token` - Para renovar el access token
- `mercadopago_user_id` - ID de usuario en Mercado Pago
- `mercadopago_public_key` - Llave pública para frontend
- `mp_token_expiration` - Fecha de expiración del token
- `mp_connected` - Boolean indicando si está conectado

### Tabla `citas`
Nuevos campos para tracking de pagos:
- `payment_status` - Estado: pending, awaiting_payment, paid, refunded, failed, cancelled
- `payment_id` - ID del pago en Mercado Pago
- `preference_id` - ID de preferencia generada
- `payment_url` - Link de pago (init_point)
- `payment_amount` - Monto total a pagar
- `marketplace_fee` - Comisión de plataforma
- `payment_date` - Fecha de confirmación de pago
- `refund_id` - ID del reembolso (si aplica)
- `refund_date` - Fecha del reembolso
- `refund_reason` - Motivo del reembolso
- `payment_method` - Método usado (tarjeta, PSE, etc)
- `payment_metadata` - JSON con info completa del pago

### Nueva Tabla `configuracion_plataforma`
Configuración global:
- `commission_percentage` - Porcentaje de comisión (default: 10)
- `refund_deadline_hours` - Horas antes de cita para reembolso (default: 24)
- `payment_enabled` - Habilitar/deshabilitar pagos
- `min_advance_payment_hours` - Horas mínimas antes de cita para requerir pago

### Nueva Tabla `payment_transactions`
Log de auditoría de transacciones:
- Registra todos los eventos de pago (payment, refund, chargeback)
- Guarda metadata completa de cada transacción
- Permite trazabilidad completa

## 🔧 Configuración Inicial

### 1. Ejecutar Migración de Base de Datos

```bash
# Conectarse a Supabase y ejecutar el script
psql <connection-string> < backend/migrations/001_add_payment_fields.sql
```

O ejecutar directamente desde el SQL Editor de Supabase.

### 2. Configurar Variables de Entorno

Copiar `.env.example` a `.env` y configurar:

```bash
# Backend
cd backend
cp .env.example .env
```

Editar `.env` con tus credenciales de Mercado Pago:

```env
# Obtener en: https://www.mercadopago.com.co/developers/panel/app
MP_CLIENT_ID=tu_app_client_id
MP_CLIENT_SECRET=tu_app_client_secret
MP_ACCESS_TOKEN=tu_marketplace_access_token
MP_PUBLIC_KEY=tu_marketplace_public_key

# URL de callback OAuth (debe estar registrada en MP)
MP_REDIRECT_URI=http://localhost:3000/mercadopago/oauth/authorize

# URLs para redirecciones
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:3000

# Configuración de comisión y políticas
DEFAULT_COMMISSION_PERCENTAGE=10
REFUND_DEADLINE_HOURS=24
```

### 3. Crear Aplicación en Mercado Pago

1. Ir a https://www.mercadopago.com.co/developers/panel/app
2. Crear nueva aplicación
3. Configurar Redirect URI: `http://localhost:3000/mercadopago/oauth/callback`
4. Obtener Client ID y Client Secret
5. Generar Access Token de la aplicación (marketplace)
6. Configurar webhook URL: `http://tu-dominio.com/payments/webhook`

### 4. Instalar Dependencias

```bash
# Backend - ya instalado
cd backend
npm install

# Frontend - no requiere dependencias adicionales
cd frontend
npm install
```

## 🚀 Uso de la Integración

### Para Veterinarias

#### 1. Conectar Mercado Pago

```typescript
// La veterinaria navega a:
/dashboard-vet/mercadopago-setup

// Hace clic en "Conectar Mercado Pago"
// Es redirigida a Mercado Pago
// Autoriza la aplicación
// Vuelve automáticamente con tokens guardados
```

#### 2. Confirmar Cita y Generar Pago

```typescript
// Al confirmar una cita, el backend automáticamente:
PUT /appointments/:id/status
{
  "status": "confirmada",
  "message": "Tu cita ha sido confirmada"
}

// Respuesta incluye:
{
  "message": "Cita confirmada exitosamente",
  "payment_url": "https://www.mercadopago.com.co/checkout/v1/redirect?pref_id=..."
}
```

### Para Clientes

#### 1. Ver Estado de Pago

```typescript
// Acceder a la vista de pago
GET /dashboard-client/appointments/:id/payment

// O consultar estado vía API:
GET /payments/status/:appointmentId
```

#### 2. Completar Pago

```typescript
// Cliente hace clic en "Ir a pagar"
// Es redirigido a Mercado Pago
// Completa el pago
// MP notifica vía webhook
// Estado actualizado automáticamente
```

#### 3. Solicitar Reembolso

```typescript
// Al cancelar cita con más de 24h de anticipación:
POST /payments/refund/:appointmentId
{
  "reason": "Motivo de cancelación"
}

// Sistema valida elegibilidad y procesa reembolso automático
```

## 🔔 Webhooks de Mercado Pago

### Configuración

En el panel de Mercado Pago:
1. Ir a tu aplicación → Webhooks
2. Agregar URL: `https://tu-dominio.com/payments/webhook`
3. Seleccionar eventos: `payment`

### Proceso de Webhook

1. MP envía notificación POST a `/payments/webhook`
2. Backend valida firma (x-signature header)
3. Busca appointment por external_reference
4. Obtiene detalles del pago usando payment_id
5. Actualiza estado de cita según resultado
6. Registra transacción en log

```typescript
// Payload del webhook
{
  "type": "payment",
  "data": {
    "id": "12345678" // Payment ID
  }
}
```

## 💰 Comisiones y Split Payments

### Cálculo de Comisión

```typescript
// Por defecto: 10% de comisión
const serviceAmount = 100000; // $100,000 COP
const commissionPercentage = 10;
const marketplaceFee = serviceAmount * 0.10; // $10,000 COP

// Veterinaria recibe: $90,000 COP (después de comisión MP)
// Plataforma recibe: $10,000 COP
```

### Configurar Comisión

```sql
-- Actualizar porcentaje de comisión
UPDATE configuracion_plataforma
SET valor = '15' -- 15%
WHERE clave = 'commission_percentage';
```

## 🔄 Reembolsos

### Política Automática

- **Más de 24h antes**: Reembolso completo automático
- **Menos de 24h**: Reembolso manual (requiere aprobación)
- **Cita ya realizada**: No elegible para reembolso

### Proceso de Reembolso

```typescript
// 1. Cliente cancela cita
// 2. Sistema valida elegibilidad
const eligibility = await isEligibleForRefund(appointment, 24);

// 3. Si es elegible, procesa reembolso
if (eligibility.eligible) {
  const refund = await createFullRefund(paymentId, sellerAccessToken);

  // 4. Actualiza estado de cita
  await updateAppointment({
    payment_status: 'refunded',
    refund_id: refund.id,
    estado: 'cancelada'
  });
}
```

## 🧪 Testing

### Credenciales de Prueba

Mercado Pago proporciona:
- Test Access Token
- Test Public Key
- Tarjetas de prueba: https://www.mercadopago.com.co/developers/es/docs/checkout-api/integration-test/test-cards

### Tarjetas de Prueba Comunes

```
Aprobado:
MASTERCARD: 5031 7557 3453 0604
CVV: 123
Vencimiento: 11/25

Rechazado:
VISA: 4509 9535 6623 3704
```

### Flujo de Prueba

1. Crear cita de prueba
2. Confirmar como veterinaria
3. Pagar con tarjeta de prueba
4. Verificar webhook recibido
5. Confirmar estado actualizado
6. Probar cancelación y reembolso

## 🔒 Seguridad

### Validaciones Implementadas

1. **OAuth State**: CSRF protection en flujo OAuth
2. **Webhook Signature**: Validación de firma de MP
3. **Token Expiration**: Renovación automática de tokens
4. **Authorization**: Permisos por tipo de usuario
5. **Ownership**: Validación de pertenencia de recursos

### Mejores Prácticas

- Tokens almacenados encriptados en BD
- HTTPS obligatorio en producción
- Validación de montos en frontend y backend
- Logs de auditoría para todas las transacciones
- Rate limiting en endpoints de pago

## 📊 Estados y Transiciones

### Estados de Cita

```
pendiente → confirmada → pagada → finalizada
    ↓           ↓          ↓
cancelada   cancelada  cancelada
                      (con reembolso)
```

### Estados de Pago

```
pending → awaiting_payment → paid
   ↓            ↓               ↓
cancelled   cancelled      refunded
   ↓            ↓
 failed       failed
```

## 🐛 Troubleshooting

### Webhook no llega

1. Verificar URL configurada en MP
2. Revisar firewall/CORS
3. Verificar logs del servidor
4. Usar ngrok para testing local

### Token expirado

```typescript
// Refrescar manualmente:
POST /mercadopago/oauth/refresh
Authorization: Bearer <vet_token>

// O configurar cron job para refrescar automáticamente
```

### Pago no se refleja

1. Verificar webhook recibido en logs
2. Consultar estado en Mercado Pago
3. Verificar external_reference coincide con appointment_id
4. Revisar si hubo errores en webhook handler

## 📈 Próximos Pasos

- [ ] Implementar notificaciones por email/SMS
- [ ] Dashboard de analytics de pagos para vets
- [ ] Reembolsos parciales (políticas flexibles)
- [ ] Pagos recurrentes para planes de salud
- [ ] Integración con calendario para recordatorios de pago
- [ ] Reportes de facturación para veterinarias
- [ ] Sistema de disputas y chargebacks

## 📚 Recursos

- [Mercado Pago Developers](https://www.mercadopago.com.co/developers)
- [Split Payments Docs](https://www.mercadopago.com.br/developers/en/docs/split-payments/landing)
- [OAuth Flow](https://www.mercadopago.com.co/developers/en/docs/security/oauth/introduction)
- [Webhooks Guide](https://www.mercadopago.com.co/developers/en/docs/your-integrations/notifications/webhooks)

## 🤝 Soporte

Para problemas o preguntas:
1. Revisar esta guía
2. Consultar logs del servidor
3. Verificar configuración de Mercado Pago
4. Contactar soporte de Mercado Pago si es necesario

---

**Versión:** 1.0
**Última actualización:** 26 de Octubre, 2025
**Autor:** Claude Code con Lety Marketplace Team
