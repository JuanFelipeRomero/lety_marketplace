# Cómo Exponer tu Backend Local para Recibir Webhooks de Mercado Pago

## 🎯 Problema

Mercado Pago no puede enviar webhooks a `http://localhost:3000` porque no es accesible desde internet. Necesitas una URL pública temporal.

---

## ✅ Opción 1: Cloudflare Tunnel (Recomendado)

### Paso 1: Instalar Cloudflare Tunnel (cloudflared)

**Windows**:
1. Descarga desde: https://github.com/cloudflare/cloudflared/releases
2. Busca el archivo `cloudflared-windows-amd64.exe`
3. Descárgalo y renómbralo a `cloudflared.exe`
4. Muévelo a una carpeta en tu PATH o úsalo desde donde lo descargaste

**O usando winget**:
```bash
winget install --id Cloudflare.cloudflared
```

### Paso 2: Exponer tu Backend

Abre una **nueva terminal** y ejecuta:

```bash
cloudflared tunnel --url http://localhost:3000
```

**Verás algo como**:
```
2025-11-03T12:34:56Z INF +--------------------------------------------------------------------------------------------+
2025-11-03T12:34:56Z INF |  Your quick Tunnel has been created! Visit it at:                                        |
2025-11-03T12:34:56Z INF |  https://abc-def-123.trycloudflare.com                                                   |
2025-11-03T12:34:56Z INF +--------------------------------------------------------------------------------------------+
```

⚠️ **IMPORTANTE**: Copia esa URL (ej: `https://abc-def-123.trycloudflare.com`)

### Paso 3: Actualizar Variables de Entorno

Edita `backend/.env`:

```env
# Reemplaza:
BACKEND_URL=http://localhost:3000

# Por tu URL de Cloudflare Tunnel:
BACKEND_URL=https://abc-def-123.trycloudflare.com
```

### Paso 4: Reiniciar el Backend

```bash
# Detén el backend (Ctrl+C)
# Reinicia:
cd backend
npm start
```

### Paso 5: Configurar Webhook en Mercado Pago

1. Ve a: https://www.mercadopago.com.co/developers/panel/app
2. Selecciona tu aplicación
3. Ve a la sección **"Webhooks"**
4. Haz clic en **"Configurar webhooks"**
5. Ingresa la URL:
   ```
   https://abc-def-123.trycloudflare.com/payments/webhook
   ```
6. Selecciona el evento: **"Pagos"** o **"payment"**
7. Guarda

### Paso 6: Probar el Webhook

1. Confirma una nueva cita (o usa una existente)
2. Realiza el pago con el usuario de prueba
3. **Revisa los logs del backend** - deberías ver:
   ```
   ✅ Payment {id} processed for appointment {id}
   ```

---

## ✅ Opción 2: ngrok (Alternativa Popular)

### Paso 1: Instalar ngrok

1. Regístrate gratis en: https://ngrok.com/
2. Descarga ngrok para Windows
3. Descomprime el archivo

### Paso 2: Autenticar (solo primera vez)

```bash
ngrok config add-authtoken TU_TOKEN_AQUI
```

### Paso 3: Exponer tu Backend

```bash
ngrok http 3000
```

**Verás**:
```
Forwarding  https://1234-abc-def.ngrok-free.app -> http://localhost:3000
```

### Paso 4: Actualizar .env y Configurar Webhook

Igual que con Cloudflare, pero usa la URL de ngrok:
```env
BACKEND_URL=https://1234-abc-def.ngrok-free.app
```

---

## ✅ Opción 3: localtunnel (Más Simple)

### Paso 1: Instalar

```bash
npm install -g localtunnel
```

### Paso 2: Exponer

```bash
lt --port 3000 --subdomain lety-marketplace
```

**Verás**:
```
your url is: https://lety-marketplace.loca.lt
```

### Paso 3: Actualizar .env

```env
BACKEND_URL=https://lety-marketplace.loca.lt
```

---

## 📋 Resumen del Flujo Completo

```
┌─────────────────────────────────────┐
│  1. Backend corriendo en localhost  │
│     http://localhost:3000           │
└─────────────────────────────────────┘
              │
              │ Expuesto vía
              ▼
┌─────────────────────────────────────┐
│  2. Cloudflare Tunnel               │
│     https://abc-123.trycloudflare.com│
└─────────────────────────────────────┘
              │
              │ Actualizar BACKEND_URL en .env
              ▼
┌─────────────────────────────────────┐
│  3. Reiniciar backend               │
│     npm start                        │
└─────────────────────────────────────┘
              │
              │ Configurar webhook en MP
              ▼
┌─────────────────────────────────────┐
│  4. Mercado Pago                    │
│     Envía webhooks a:               │
│     https://abc-123.trycloudflare.com/payments/webhook │
└─────────────────────────────────────┘
              │
              │ Webhook recibido
              ▼
┌─────────────────────────────────────┐
│  5. Backend procesa pago            │
│     ✅ Payment processed            │
│     ✅ Cita actualizada a 'paid'   │
│     ✅ Ganancias guardadas         │
└─────────────────────────────────────┘
```

---

## ⚠️ Notas Importantes

### 1. La URL de Cloudflare Tunnel cambia cada vez
Cada vez que ejecutes `cloudflared tunnel`, obtendrás una URL diferente. Debes:
- Actualizar `BACKEND_URL` en `.env`
- Reiniciar el backend
- **NO necesitas actualizar** la configuración de webhooks en MP cada vez (solo cuando cambies la URL)

### 2. Mantén el Tunnel Abierto
Mientras estés desarrollando, **deja la terminal del tunnel abierta**. Si la cierras, el webhook no funcionará.

### 3. Seguridad
Estos túneles son para **desarrollo solamente**. No los uses en producción.

### 4. CORS
Si tienes problemas de CORS, actualiza `backend/src/app.js` para incluir tu URL de Cloudflare:

```javascript
app.use(
  cors({
    origin: [
      'http://localhost:5173',
      'https://abc-123.trycloudflare.com',  // Agrega esta línea
      // ... otras URLs
    ],
    credentials: true,
  })
);
```

---

## 🧪 Probar que Funciona

### 1. Verificar que el túnel está activo

Abre en tu navegador:
```
https://tu-url-cloudflare.trycloudflare.com/
```

Deberías ver la respuesta de tu API (probablemente un error 404 o "Cannot GET /", lo cual está bien).

### 2. Probar el endpoint de webhook manualmente

```bash
curl -X POST https://tu-url-cloudflare.trycloudflare.com/payments/webhook \
  -H "Content-Type: application/json" \
  -d '{"action":"payment.updated","data":{"id":"test123"},"type":"payment"}'
```

Deberías ver logs en tu backend procesando el webhook.

### 3. Hacer un pago real de prueba

1. Confirma una cita
2. Realiza el pago con usuario de prueba
3. **Revisa los logs del backend**
4. Deberías ver: `✅ Payment {id} processed for appointment {id}`

---

## ❓ Troubleshooting

### Error: "Connection refused" en los logs del backend

**Causa**: El webhook está usando la URL vieja de localhost.

**Solución**:
1. Verifica que `BACKEND_URL` en `.env` tenga la URL del tunnel
2. Reinicia el backend (`npm start`)

### Error: "Invalid signature" o "Unauthorized"

**Causa**: Mercado Pago está validando la firma del webhook.

**Solución**:
1. En desarrollo, puedes deshabilitar la validación temporalmente
2. O configura `MP_WEBHOOK_SECRET` en `.env`

### No llegan webhooks

**Causa**: Cloudflare Tunnel cerrado o URL mal configurada.

**Solución**:
1. Verifica que el tunnel siga corriendo
2. Prueba acceder a la URL desde tu navegador
3. Revisa la configuración de webhooks en Mercado Pago

---

## 🎯 Recomendación

Para desarrollo, usa **Cloudflare Tunnel** porque:
- ✅ No requiere cuenta (ngrok requiere registro)
- ✅ No tiene límites de peticiones
- ✅ HTTPS por defecto
- ✅ Fácil de usar

---

**Última actualización**: 2025-11-03
