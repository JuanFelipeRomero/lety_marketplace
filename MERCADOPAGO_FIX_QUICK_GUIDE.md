# Guía Rápida: Solucionar "La aplicación no está preparada"

## Problema

Al intentar conectar Mercado Pago desde `/dashboard-vet/mercadopago-setup`, aparece el error:
> "La aplicación no está preparada para conectarse a Mercado Pago"

## Causa

Tu aplicación no cumplía con los requisitos mínimos del checklist de calidad de Mercado Pago. Faltaban campos obligatorios en las preferencias de pago y configuración de webhooks.

## Solución Implementada

### ✅ Cambios Realizados Automáticamente

1. **Actualizado el servicio de Mercado Pago** (`backend/src/services/mercadopago.js`)
   - Agregados todos los campos requeridos del checklist
   - Implementada validación completa de firma de webhooks (HMAC SHA256)
   - Agregado soporte para datos completos del pagador

2. **Actualizada la ruta de pagos** (`backend/src/routes/payments.js`)
   - Obtiene datos completos del usuario (teléfono, documento, dirección)
   - Envía toda la información requerida a Mercado Pago
   - Validación segura de webhooks

3. **Creada migración de base de datos** (`backend/migrations/002_add_user_identification.sql`)
   - Agrega campos para documento de identidad
   - Agrega campos para dirección del usuario

## Pasos Inmediatos (DEBES HACER ESTO)

### 1. Ejecutar la Migración de Base de Datos ⚡

**Opción A: Usando Supabase SQL Editor**

1. Ve a tu proyecto de Supabase
2. Abre el SQL Editor
3. Copia y pega el contenido de `backend/migrations/002_add_user_identification.sql`
4. Ejecuta el script

**Opción B: Usando psql**

```bash
psql -U your_user -d your_database -f backend/migrations/002_add_user_identification.sql
```

### 2. Configurar la Variable de Entorno del Webhook Secret ⚡

Agrega esto a tu `backend/.env`:

```env
MP_WEBHOOK_SECRET=your_webhook_secret_here
```

**¿Dónde obtener el webhook secret?**

1. Ve a [Mercado Pago Developers](https://www.mercadopago.com.co/developers/panel)
2. Selecciona tu aplicación
3. Ve a "Webhooks" en el menú lateral
4. Encontrarás el "Webhook Secret" allí
5. Si no existe, créalo configurando la URL del webhook

### 3. Configurar Webhooks en Mercado Pago ⚡

1. Ve a [Mercado Pago Developers](https://www.mercadopago.com.co/developers/panel)
2. Selecciona tu aplicación
3. Ve a "Webhooks"
4. Configura estas URLs:

**Para Producción:**
```
https://tu-backend-url.com/payments/webhook
```

**Para Sandbox/Desarrollo:**
```
https://tu-backend-url.com/payments/webhook
```

5. Selecciona el evento "Pagos" (payment)
6. Guarda

### 4. Verificar la Redirect URI ⚡

1. En el panel de Mercado Pago, ve a "Configuración"
2. Busca "Redirect URLs"
3. Asegúrate de que tengas esta URL:

```
https://tu-backend-url.com/mercadopago/oauth/callback
```

4. Verifica que coincida exactamente con `MP_REDIRECT_URI` en tu `.env`

### 5. Reiniciar el Backend ⚡

```bash
cd backend
npm start
```

## Verificación

Después de realizar los pasos anteriores, verifica:

### ✅ Checklist de Verificación

- [ ] Migración de base de datos ejecutada (tabla `usuarios` tiene nuevas columnas)
- [ ] Variable `MP_WEBHOOK_SECRET` configurada en `.env`
- [ ] Webhooks configurados en panel de Mercado Pago
- [ ] Redirect URI configurada y coincide con `.env`
- [ ] Backend reiniciado

### Probar la Conexión

1. Ve a `/dashboard-vet/mercadopago-setup`
2. Haz clic en "Conectar Mercado Pago"
3. Deberías ser redirigido a Mercado Pago
4. Autoriza la aplicación
5. Deberías volver al dashboard con conexión exitosa

## ⚠️ Próximos Pasos Recomendados

### 1. Actualizar el Frontend para Capturar Datos de Usuario

Los usuarios ahora DEBEN proporcionar:

- **Tipo de documento** (CC, CE, TI, PA, NIT)
- **Número de documento**
- **Teléfono** (ya existe, solo asegúrate de que sea obligatorio)
- **Dirección** (opcional pero recomendado)

**Archivos a actualizar:**

- `frontend/app/routes/dashboard-client/profile.tsx` (o equivalente)
- Formulario de registro de usuarios

### 2. Validar Datos Antes de Crear Pagos

Agrega validación en el frontend para asegurarte de que los usuarios tengan todos los datos antes de intentar pagar.

### 3. Considerar Agregar Notificaciones

Actualmente no hay notificaciones automáticas cuando:
- Se crea un link de pago
- Se confirma un pago
- Se procesa un reembolso

Considera agregar emails o notificaciones push.

## Campos Ahora Implementados

### ✅ Checklist de Calidad Completo

Tu integración ahora envía:

1. ✅ items.quantity
2. ✅ items.unit_price
3. ✅ items.category_id
4. ✅ items.id
5. ✅ items.title
6. ✅ items.description
7. ✅ payer.email
8. ✅ payer.first_name
9. ✅ payer.last_name
10. ✅ payer.phone (si está disponible)
11. ✅ payer.identification (si está disponible)
12. ✅ payer.address (si está disponible)
13. ✅ statement_descriptor
14. ✅ back_urls
15. ✅ notification_url
16. ✅ external_reference
17. ✅ marketplace_fee
18. ✅ purpose
19. ✅ binary_mode
20. ✅ additional_info completo
21. ✅ expires + expiration dates
22. ✅ Validación de firma de webhooks (HMAC SHA256)

## Problemas Conocidos

### Si los Pagos Fallan por Falta de Datos

**Síntoma:** Error al crear preferencia porque faltan datos del usuario

**Solución Temporal:**

Actualiza manualmente los usuarios en la base de datos:

```sql
-- Ejemplo: agregar datos a un usuario
UPDATE usuarios
SET
  tipo_documento = 'CC',
  numero_documento = '1234567890',
  telefono = '3001234567',
  direccion = 'Calle 123 #45-67',
  ciudad = 'Bogotá',
  codigo_postal = '110111'
WHERE id_usuario = 1;
```

**Solución Permanente:**

Actualiza el frontend para solicitar estos datos en el registro.

## Troubleshooting

### Error: "Missing x-signature header"

**Causa:** El webhook secret no está configurado

**Solución:** Agrega `MP_WEBHOOK_SECRET` al `.env` y reinicia

### Error: "Invalid webhook signature"

**Causa:** El webhook secret es incorrecto

**Solución:** Verifica el webhook secret en el panel de MP

### Error: "Clínica no tiene Mercado Pago configurado"

**Causa:** La clínica no completó el flujo OAuth

**Solución:** Ve a `/dashboard-vet/mercadopago-setup` y conecta la cuenta

## Recursos

- [Guía Completa de Configuración](./MERCADOPAGO_SETUP.md)
- [Documentación Mercado Pago](https://www.mercadopago.com.co/developers)
- [Panel de Desarrolladores](https://www.mercadopago.com.co/developers/panel)

## ¿Necesitas Ayuda?

Si después de seguir estos pasos sigues teniendo problemas:

1. Revisa los logs del backend (busca mensajes con emojis 📥 ✅ ⚠️)
2. Verifica que todas las variables de entorno estén configuradas
3. Asegúrate de que la URL del backend sea accesible públicamente (para webhooks)
4. Usa ngrok o similar para desarrollo local

## Resumen de Archivos Modificados

```
✏️  backend/src/services/mercadopago.js          (Actualizado)
✏️  backend/src/routes/payments.js               (Actualizado)
➕ backend/migrations/002_add_user_identification.sql (Nuevo)
➕ MERCADOPAGO_SETUP.md                          (Nuevo)
➕ MERCADOPAGO_FIX_QUICK_GUIDE.md                (Nuevo)
```

---

**¡Listo!** Sigue los pasos y tu integración de Mercado Pago debería funcionar correctamente.
