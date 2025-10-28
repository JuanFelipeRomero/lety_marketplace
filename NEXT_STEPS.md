# 🚀 Próximos Pasos: Activación del Sistema de Pagos

## ✨ ¡Felicitaciones!

El sistema de pagos con Mercado Pago ha sido completamente implementado. Sigue estos pasos para activarlo.

---

## 📝 Paso 1: Ejecutar Migración de Base de Datos

### Opción A: Desde Supabase Dashboard (Recomendado)

1. Accede a tu proyecto en https://supabase.com
2. Ve a **SQL Editor**
3. Crea una nueva query
4. Copia y pega el contenido de `backend/migrations/001_add_payment_fields.sql`
5. Ejecuta el script
6. Verifica que no haya errores
7. Confirma que las nuevas tablas y campos existen

### Opción B: Desde CLI

```bash
# Si tienes la CLI de Supabase instalada
supabase db push backend/migrations/001_add_payment_fields.sql

# O usando psql directamente
psql "tu-connection-string" < backend/migrations/001_add_payment_fields.sql
```

### Verificación

Ejecuta esta query para verificar:

```sql
-- Verificar campos nuevos en clinicas
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'clinicas'
  AND column_name LIKE 'mercadopago%';

-- Verificar campos nuevos en citas
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'citas'
  AND column_name LIKE 'payment%';

-- Verificar tabla de configuración
SELECT * FROM configuracion_plataforma;
```

---

## 🔑 Paso 2: Crear Aplicación en Mercado Pago

### Para Modo Test (Desarrollo):

1. **Accede al Panel de Desarrolladores**
   - URL: https://www.mercadopago.com.co/developers/panel

2. **Crea una Nueva Aplicación**
   - Clic en "Crear aplicación"
   - Nombre: "Lety Marketplace - Test"
   - Tipo: Marketplace / E-commerce

3. **Configurar URLs de Redirección**
   ```
   Redirect URI: http://localhost:3000/mercadopago/oauth/callback
   ```

4. **Copiar Credenciales de Test**
   - Ve a "Credenciales de prueba"
   - Copia:
     - Public Key (TEST-...)
     - Access Token (TEST-...)
     - Client ID
     - Client Secret

5. **Configurar Webhook de Test**
   ```
   URL: https://tu-dominio-de-prueba.ngrok.io/payments/webhook
   Eventos: payment
   ```

### Para Modo Producción:

1. **Completar Datos de la Cuenta**
   - Verificar identidad
   - Completar información fiscal
   - Activar cuenta de producción

2. **Activar Aplicación**
   - Solicitar revisión de aplicación
   - Esperar aprobación de Mercado Pago

3. **Configurar URLs de Producción**
   ```
   Redirect URI: https://tu-dominio.com/mercadopago/oauth/callback
   Webhook: https://tu-dominio.com/payments/webhook
   ```

4. **Copiar Credenciales de Producción**
   - Ve a "Credenciales de producción"
   - Copia las mismas credenciales que en test

---

## ⚙️ Paso 3: Configurar Variables de Entorno

### Backend

Edita `backend/.env`:

```env
# Server
PORT=3000
NODE_ENV=development  # o 'production'

# JWT (debe existir)
JWT_SECRET=tu_jwt_secret_existente

# Supabase (debe existir)
SUPABASE_URL=tu_supabase_url
SUPABASE_KEY=tu_supabase_key
SERVICE_ROL_KEY=tu_service_role_key

# Google Maps (debe existir)
MAPS_API_KEY=tu_maps_api_key

# 🔥 NUEVO: Mercado Pago
MP_CLIENT_ID=tu_client_id_de_mp
MP_CLIENT_SECRET=tu_client_secret_de_mp
MP_ACCESS_TOKEN=tu_access_token_de_mp
MP_PUBLIC_KEY=tu_public_key_de_mp

# URLs OAuth
MP_REDIRECT_URI=http://localhost:3000/mercadopago/oauth/callback  # cambiar en prod
MP_WEBHOOK_SECRET=tu_webhook_secret  # opcional, para validación adicional

# URLs de la app
FRONTEND_URL=http://localhost:5173  # cambiar en prod
BACKEND_URL=http://localhost:3000   # cambiar en prod

# Configuración de pagos
DEFAULT_COMMISSION_PERCENTAGE=10
REFUND_DEADLINE_HOURS=24
```

### Frontend

Edita `frontend/.env` (si no existe, créalo):

```env
VITE_API_URL=http://localhost:3000  # cambiar en prod
```

---

## 🧪 Paso 4: Probar en Modo Test

### 1. Iniciar Aplicación

```bash
# Terminal 1: Backend
cd backend
npm install  # si aún no lo has hecho
npm start

# Terminal 2: Frontend
cd frontend
npm install  # si aún no lo has hecho
npm run dev
```

### 2. Configurar ngrok (para webhooks locales)

```bash
# Instalar ngrok si no lo tienes
npm install -g ngrok

# Exponer puerto 3000
ngrok http 3000

# Copiar la URL HTTPS que te da (ej: https://abc123.ngrok.io)
# Actualizar webhook en Mercado Pago con: https://abc123.ngrok.io/payments/webhook
```

### 3. Flujo de Prueba Completo

#### Como Veterinaria:

1. **Conectar Mercado Pago**
   ```
   Login como veterinaria
   → Ir a /dashboard-vet/mercadopago-setup
   → Clic en "Conectar Mercado Pago"
   → Autorizar en MP (usar credenciales de test)
   → Verificar que vuelves con "Conectado" ✅
   ```

2. **Confirmar una Cita**
   ```
   → Ir a /dashboard-vet/appointments
   → Seleccionar cita pendiente
   → Clic en "Confirmar"
   → Verificar respuesta incluye payment_url
   ```

#### Como Cliente:

3. **Recibir Link de Pago**
   ```
   Login como cliente
   → Ir a /dashboard-client/appointments
   → Ver cita confirmada con badge "Esperando pago"
   → Clic en la cita
   → Ver botón "Ir a pagar"
   ```

4. **Completar Pago**
   ```
   → Clic en "Ir a pagar"
   → Redirigido a Mercado Pago
   → Usar tarjeta de prueba APROBADA:
     Número: 5031 7557 3453 0604
     CVV: 123
     Vencimiento: 11/25
   → Completar pago
   → Verificar redirección de vuelta
   ```

5. **Verificar Webhook**
   ```
   → Revisar logs del backend
   → Buscar: "📥 Webhook received"
   → Buscar: "✅ Payment ... processed"
   → Verificar estado de cita cambió a "paid"
   ```

6. **Probar Cancelación/Reembolso**
   ```
   → Cancelar cita (con >24h de anticipación)
   → Verificar reembolso procesado
   → Verificar estado cambió a "refunded"
   ```

### Tarjetas de Prueba

**Aprobadas:**
```
MASTERCARD: 5031 7557 3453 0604
VISA: 4509 9535 6623 3704
AMEX: 3711 803032 57522
```

**Rechazadas:**
```
MASTERCARD: 5031 4332 1540 6351 (insufficient funds)
VISA: 4013 5406 8274 6260 (call for authorize)
```

---

## 🌐 Paso 5: Desplegar a Producción

### Checklist Pre-Deploy

- [ ] Todas las pruebas en test pasaron exitosamente
- [ ] Webhook funciona correctamente
- [ ] OAuth flow completo funciona
- [ ] Reembolsos se procesan correctamente
- [ ] Variables de entorno de producción listas
- [ ] Aplicación de MP aprobada para producción
- [ ] Dominio con HTTPS configurado

### Actualizar Variables de Entorno

**Backend (producción):**
```env
NODE_ENV=production
MP_CLIENT_ID=tu_prod_client_id
MP_CLIENT_SECRET=tu_prod_client_secret
MP_ACCESS_TOKEN=tu_prod_access_token
MP_PUBLIC_KEY=tu_prod_public_key
MP_REDIRECT_URI=https://api.tu-dominio.com/mercadopago/oauth/callback
FRONTEND_URL=https://tu-dominio.com
BACKEND_URL=https://api.tu-dominio.com
```

**Frontend (producción):**
```env
VITE_API_URL=https://api.tu-dominio.com
```

### Actualizar URLs en Mercado Pago

1. Panel de MP → Tu aplicación
2. OAuth redirect URI: `https://api.tu-dominio.com/mercadopago/oauth/callback`
3. Webhook: `https://api.tu-dominio.com/payments/webhook`
4. Activar en modo producción

### Deploy

```bash
# Backend
cd backend
npm run build  # si tienes build script
pm2 start ecosystem.config.js  # o tu método de deploy

# Frontend
cd frontend
npm run build
# Subir build/ a tu hosting (Vercel, Netlify, etc.)
```

---

## 📊 Paso 6: Monitoreo Post-Deploy

### Qué Monitorear

1. **Logs de Transacciones**
   ```sql
   SELECT * FROM payment_transactions
   ORDER BY created_at DESC
   LIMIT 50;
   ```

2. **Estado de Conexiones MP**
   ```sql
   SELECT id_clinica, nombre, mp_connected, mp_token_expiration
   FROM clinicas
   WHERE mp_connected = true;
   ```

3. **Pagos Pendientes**
   ```sql
   SELECT id_cita, payment_status, payment_amount, created_at
   FROM citas
   WHERE payment_status = 'awaiting_payment'
   ORDER BY created_at DESC;
   ```

4. **Reembolsos**
   ```sql
   SELECT id_cita, refund_id, refund_date, refund_reason
   FROM citas
   WHERE payment_status = 'refunded'
   ORDER BY refund_date DESC;
   ```

### Alertas Importantes

- Token próximo a vencer (<7 días)
- Webhooks fallando
- Tasa de pagos rechazados alta
- Reembolsos inusuales

---

## 🛠️ Mantenimiento Continuo

### Mensual

- [ ] Revisar tokens de veterinarias (expiración)
- [ ] Verificar webhooks funcionando
- [ ] Revisar transacciones con errores
- [ ] Analizar tasa de conversión de pagos

### Trimestral

- [ ] Actualizar SDK de Mercado Pago
- [ ] Revisar configuración de comisión
- [ ] Analizar política de reembolsos
- [ ] Recopilar feedback de usuarios

### Anual

- [ ] Renovar certificados SSL
- [ ] Revisar acuerdo con Mercado Pago
- [ ] Auditar seguridad del sistema

---

## 🆘 Troubleshooting Común

### "Token inválido o expirado"
→ Refrescar token: `POST /mercadopago/oauth/refresh`

### "Webhook no llega"
→ Verificar URL en panel de MP
→ Verificar HTTPS funcionando
→ Revisar logs del servidor

### "Pago aprobado pero estado no actualiza"
→ Revisar logs de webhook
→ Verificar external_reference coincide
→ Consultar pago manualmente en MP

### "No se puede refrescar token"
→ Reconectar OAuth completamente
→ Verificar credenciales en .env

---

## 📞 Soporte

### Documentación:
- `PAYMENT_INTEGRATION_GUIDE.md` - Guía técnica detallada
- `PAYMENT_IMPLEMENTATION_SUMMARY.md` - Resumen ejecutivo
- Inline comments en código

### Mercado Pago:
- Panel: https://www.mercadopago.com.co/developers/panel
- Docs: https://www.mercadopago.com.co/developers
- Soporte: developers@mercadopago.com
- Status: https://status.mercadopago.com

---

## ✅ Checklist Final

Antes de considerar el proyecto completo:

- [ ] Migración de BD ejecutada exitosamente
- [ ] Aplicación creada en Mercado Pago
- [ ] Variables de entorno configuradas
- [ ] Pruebas en test mode completadas
- [ ] OAuth flow funciona
- [ ] Pagos se procesan correctamente
- [ ] Webhooks reciben notificaciones
- [ ] Reembolsos funcionan
- [ ] Frontend muestra estados correctamente
- [ ] Documentación revisada
- [ ] Deploy en producción exitoso
- [ ] Monitoreo configurado

---

**¡Éxito con tu implementación!** 🎉

Si encuentras algún problema, consulta la documentación detallada o los logs del sistema.
