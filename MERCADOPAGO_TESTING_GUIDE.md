# Guía Completa de Testing - Integración Mercado Pago

## 🎯 Objetivo de esta Guía

Esta guía te ayudará a **probar completamente la integración de Mercado Pago** sin usar dinero real, sin tener un sitio en producción, y sin arriesgar tu cuenta real de Mercado Pago.

---

## 📚 Conceptos Importantes

### Sandbox vs Producción

Mercado Pago maneja **dos entornos completamente separados**:

| Aspecto | Sandbox (Pruebas) | Producción |
|---------|-------------------|------------|
| **Propósito** | Desarrollo y testing | Transacciones reales |
| **Dinero** | Ficticio | Real |
| **Usuarios** | Usuarios de prueba | Usuarios reales |
| **Credenciales** | Credenciales de prueba | Credenciales de producción |
| **Pagos** | Simulados | Reales con tarjetas reales |
| **Requiere sitio público** | ❌ No | ✅ Recomendado |

### ⚠️ Regla de Oro

**Las credenciales de SANDBOX solo funcionan con USUARIOS DE PRUEBA, nunca con cuentas reales.**

Por eso cuando intentabas conectar tu cuenta real de Mercado Pago Colombia con credenciales de sandbox, obtenías el error: *"La aplicación no está preparada para conectarse a Mercado Pago"*.

---

## 🔧 Configuración Actual (Sandbox)

Tu aplicación está actualmente configurada para **Sandbox/Testing**:

```env
# backend/.env
MP_CLIENT_ID=2951551193
MP_CLIENT_SECRET=D3NlbMp7mQ...
MP_ACCESS_TOKEN=APP_USR-962414714146657-102721-...
MP_REDIRECT_URI=https://partially-covers-relying-stuart.trycloudflare.com/mercadopago/oauth/callback
```

Estas credenciales son **de prueba** y solo funcionan con **usuarios de prueba**.

---

## 📝 Paso 1: Crear Usuarios de Prueba

### 1.1 Crear Usuario Vendedor (Veterinaria)

Este usuario simulará a una veterinaria que se conecta a tu marketplace.

**Pasos**:

1. Ve a [Panel de Desarrolladores](https://www.mercadopago.com.co/developers/es/docs)
2. Haz clic en **"Ingresar"** (esquina superior derecha)
3. Inicia sesión con **TU cuenta real** de Mercado Pago
4. Ve a [**Tus integraciones**](https://www.mercadopago.com.co/developers/panel/app)
5. Selecciona tu aplicación del marketplace
6. En el menú lateral izquierdo, haz clic en **"Cuentas de prueba"**
7. Haz clic en **"+ Crear cuenta de prueba"**
8. Configura:
   - **País de operación**: Colombia
   - **Descripción**: "Veterinaria Prueba 1" (o el nombre que prefieras)
   - **Tipo de cuenta**: **Vendedor** ⚠️ (MUY IMPORTANTE)
   - **Dinero disponible**: Deja en blanco (no es necesario para vendedores)
9. Haz clic en **"Crear cuenta de prueba"**

**Resultado**: Mercado Pago generará:
- ✅ Usuario (email): Ejemplo: `TEST123456789@testuser.com`
- ✅ Contraseña: Ejemplo: `qatest12345`
- ✅ ID de usuario

**🔒 IMPORTANTE**: Guarda estos datos, los necesitarás para conectar la veterinaria.

### 1.2 Crear Usuario Comprador (Opcional)

Si también quieres probar el flujo de compra:

1. Repite los pasos anteriores
2. En **"Tipo de cuenta"** selecciona: **Comprador**
3. En **"Dinero disponible"** puedes poner: `1000` (pesos colombianos ficticios)

---

## 🧪 Paso 2: Probar el Flujo de OAuth

Ahora vamos a conectar una "veterinaria de prueba" a tu marketplace.

### 2.1 Iniciar tu Aplicación

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm run dev

# Terminal 3 - Cloudflare Tunnel (si lo usas)
# El comando que estés usando para exponer el puerto
```

### 2.2 Acceder al Dashboard de Veterinaria

1. Abre tu navegador en `http://localhost:5173` (o el puerto de tu frontend)
2. **Registra una nueva veterinaria** o **inicia sesión** con una existente
3. Ve al dashboard de veterinaria (algo como `/dashboard-vet`)

### 2.3 Iniciar Conexión con Mercado Pago

1. Busca la sección de **"Configuración de Mercado Pago"** o **"Mercado Pago Setup"**
   - Ruta probable: `/dashboard-vet/mercadopago-setup`
2. Haz clic en el botón **"Conectar con Mercado Pago"**
3. Se abrirá una ventana/pestaña de Mercado Pago

### 2.4 Autenticar con Usuario de Prueba ⚠️ CRÍTICO

**En la ventana de Mercado Pago**:

1. **Selecciona el país**: Colombia
2. **IMPORTANTE**: En lugar de usar tu cuenta real, usa las credenciales del **usuario de prueba vendedor** que creaste:
   - Email: `TEST123456789@testuser.com` (el que te generó MP)
   - Contraseña: `qatest12345` (la que te generó MP)
3. Haz clic en **"Iniciar sesión"**
4. Autoriza la conexión haciendo clic en **"Permitir"** o **"Autorizar"**

### 2.5 Verificar Conexión Exitosa

Después de autorizar, deberías:

1. ✅ Ser redirigido de vuelta a tu aplicación
2. ✅ Ver un mensaje de "Conexión exitosa" o similar
3. ✅ Ver los datos de Mercado Pago en el dashboard

**Verificar en la base de datos**:

```sql
SELECT
    id_clinica,
    nombre,
    mercadopago_user_id,
    mp_connected,
    mp_token_expiration
FROM clinicas
WHERE id_clinica = [ID_DE_TU_CLINICA];
```

Deberías ver:
- `mercadopago_user_id`: Populated con el ID del usuario de prueba
- `mp_connected`: `true`
- `mercadopago_access_token`: Un token largo
- `mp_token_expiration`: Una fecha futura

---

## 💳 Paso 3: Probar Pagos de Prueba

Una vez conectada la veterinaria, puedes probar crear y recibir pagos.

### 3.1 Tarjetas de Prueba para Colombia

Usa estas tarjetas FICTICIAS para probar pagos:

#### ✅ Tarjeta Aprobada

```
Número: 5031 7557 3453 0604
CVV: 123
Fecha de vencimiento: 11/25
Nombre: APRO (cualquier nombre)
Documento: 123456789
```

#### ❌ Tarjeta Rechazada

```
Número: 5031 4332 1540 6351
CVV: 123
Fecha de vencimiento: 11/25
Nombre: OTHE (cualquier nombre)
Documento: 123456789
```

#### ⏳ Tarjeta Pendiente

```
Número: 5031 7557 3453 0604
CVV: 123
Fecha de vencimiento: 11/25
Nombre: CALL (cualquier nombre)
Documento: 123456789
```

### 3.2 Crear un Pago de Prueba

1. **Como usuario/comprador**:
   - Registra una cuenta de usuario en tu marketplace
   - Busca una veterinaria (la que conectaste)
   - Agenda una cita/servicio
   - Procede al pago

2. **Usar tarjeta de prueba**:
   - Ingresa los datos de la **tarjeta de prueba aprobada**
   - Completa el pago

3. **Verificar resultado**:
   - ✅ El pago debería ser aprobado
   - ✅ Deberías recibir un webhook en tu backend
   - ✅ La cita debería cambiar de estado

### 3.3 Verificar Webhooks

En tu backend, deberías ver logs de webhooks recibidos:

```bash
# En la terminal del backend
# Deberías ver algo como:
[Webhook] Notification received: payment
[Webhook] Payment ID: 1234567890
[Webhook] Status: approved
```

---

## 🔍 Troubleshooting Común

### Error: "La aplicación no está preparada para conectarse"

**Causa**: Estás intentando usar tu cuenta REAL con credenciales de SANDBOX.

**Solución**: Usa el usuario de prueba vendedor (TEST...@testuser.com).

---

### Error: "Invalid redirect_uri"

**Causa**: La Redirect URI no está registrada en el panel de MP.

**Solución**:
1. Ve a [Panel de Desarrolladores > Tu aplicación](https://www.mercadopago.com.co/developers/panel/app)
2. Ve a "Credenciales"
3. En la sección OAuth, verifica que la Redirect URI sea exactamente:
   ```
   https://partially-covers-relying-stuart.trycloudflare.com/mercadopago/oauth/callback
   ```

---

### Error: "Client credentials not found"

**Causa**: Las credenciales en tu `.env` son incorrectas o están vacías.

**Solución**:
1. Verifica que `MP_CLIENT_ID` y `MP_CLIENT_SECRET` estén configurados
2. Reinicia el servidor backend después de cambiar `.env`

---

### El webhook no llega

**Causa**: Cloudflare Tunnel cambió de URL o no está activo.

**Solución**:
1. Verifica que Cloudflare esté ejecutándose
2. Actualiza la Redirect URI si cambió
3. Verifica que el endpoint `/payments/webhook` esté respondiendo

---

## 🚀 Paso 4: Cuándo Ir a Producción

Cambia a credenciales de producción SOLO cuando:

- ✅ Hayas probado completamente el flujo en sandbox
- ✅ Todo funcione sin errores
- ✅ Tengas un sitio web accesible públicamente
- ✅ Estés listo para recibir pagos REALES
- ✅ Hayas configurado correctamente las notificaciones webhook en producción

### Migración a Producción

Cuando estés listo:

1. **Obtener credenciales de producción**:
   - Panel de Desarrolladores > Tu aplicación
   - **"Credenciales de Producción"**
   - Copia Public Key, Client Secret y Access Token

2. **Actualizar `.env`**:
   ```env
   MP_CLIENT_ID=[Public Key de Producción]
   MP_CLIENT_SECRET=[Client Secret de Producción]
   MP_ACCESS_TOKEN=[Access Token de Producción]
   MP_REDIRECT_URI=[Tu URL de producción]/mercadopago/oauth/callback
   ```

3. **Actualizar Redirect URI en MP**:
   - Registra la nueva URL de producción en el panel

4. **Reconectar veterinarias**:
   - Las veterinarias deberán conectar de nuevo (ahora con cuentas REALES)

---

## 📊 Checklist de Testing

Usa este checklist para asegurarte de probar todo:

### OAuth
- [ ] Crear usuario vendedor de prueba
- [ ] Conectar veterinaria con usuario de prueba
- [ ] Verificar que se guarde el token en la BD
- [ ] Verificar que aparezca como "conectado" en el dashboard
- [ ] Probar desconectar y reconectar

### Pagos
- [ ] Crear un pago con tarjeta de prueba aprobada
- [ ] Crear un pago con tarjeta de prueba rechazada
- [ ] Verificar estados de pago en la BD
- [ ] Verificar que lleguen webhooks

### Webhooks
- [ ] Recibir notificación de pago aprobado
- [ ] Recibir notificación de pago rechazado
- [ ] Validar firma HMAC del webhook
- [ ] Actualizar estado de cita según webhook

### UI
- [ ] Mostrar estado de conexión de MP
- [ ] Mostrar botón de conectar/desconectar
- [ ] Manejar errores de conexión
- [ ] Mostrar historial de pagos

---

## 🆘 Soporte

Si sigues teniendo problemas:

1. **Documentación oficial**: [Mercado Pago Developers](https://www.mercadopago.com/developers/es/docs)
2. **Archivo de troubleshooting**: Ver `MERCADOPAGO_SETUP.md`
3. **Logs del backend**: Revisa la consola del backend para errores
4. **Soporte de MP**: [developers@mercadopago.com](mailto:developers@mercadopago.com)

---

## 📚 Recursos Adicionales

- [Crear usuarios de prueba](https://www.mercadopago.com/developers/es/docs/adobe-commerce/additional-content/your-integrations/test/accounts)
- [Tarjetas de prueba](https://www.mercadopago.com/developers/es/docs/checkout-api/integration-test/test-cards)
- [OAuth en MP](https://www.mercadopago.com/developers/es/docs/security/oauth)
- [Webhooks](https://www.mercadopago.com/developers/es/docs/checkout-api/additional-content/your-integrations/notifications/webhooks)

---

**Última actualización**: 2025-01-30
