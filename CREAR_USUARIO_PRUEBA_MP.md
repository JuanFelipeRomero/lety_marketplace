# Cómo Crear Usuario de Prueba en Mercado Pago

## 🎯 Problema

Cuando usas credenciales de TEST, NO puedes pagar con tu cuenta real de Mercado Pago. Necesitas un **usuario de prueba**.

## ✅ Solución: Crear Usuario de Prueba Comprador

### Paso 1: Ir al Panel de Desarrolladores

1. Ve a: https://www.mercadopago.com.co/developers/panel/app
2. Selecciona tu aplicación
3. Haz clic en la pestaña **"Cuentas de prueba"**

### Paso 2: Crear Usuario de Prueba

1. Haz clic en **"Crear cuenta de prueba"**
2. Completa el formulario:
   - **País**: Colombia (debe ser el mismo país de tu aplicación)
   - **Descripción**: "Comprador - Tests"
   - **Tipo de cuenta**: Selecciona **"Comprador"**
   - **Dinero ficticio**: 1000000 (1 millón de COP para pruebas)
3. Acepta los términos
4. Haz clic en **"Crear cuenta de prueba"**

### Paso 3: Ver Credenciales del Usuario de Prueba

Mercado Pago te mostrará una tabla con:
- **Usuario**: Algo como `TEST-1234567890`
- **Contraseña**: Una contraseña generada automáticamente
- **User ID**: Número de identificación

**⚠️ IMPORTANTE**: Copia estos datos, los necesitarás en el siguiente paso.

### Paso 4: Iniciar Sesión con el Usuario de Prueba

1. **Abre una ventana de incógnito/privada** en tu navegador
2. Ve a: https://www.mercadopago.com.co
3. Haz clic en **"Ingresa"**
4. Usa las credenciales del usuario de prueba que creaste:
   - Usuario: `TEST-1234567890` (el que te dio Mercado Pago)
   - Contraseña: La contraseña generada

### Paso 5: Verificar el Usuario de Prueba (Si te pide código)

Cuando inicies sesión con el usuario de prueba, **Mercado Pago puede pedirte un código de verificación** que supuestamente envió por email. Como es una cuenta de prueba, no recibirás ese email.

**Solución**:
1. Ve al panel de desarrolladores donde creaste el usuario de prueba
2. Busca el **User ID** del usuario (es un número largo, ej: `1234567890`)
3. **Toma los últimos 6 dígitos** (ej: si es `1234567890`, usa `567890`)
4. **Ingresa esos 6 dígitos** como código de verificación

**Ejemplo**:
```
User ID: 2951551191
         ^^^^^^^^
Código a ingresar: 551191
```

### Paso 6: Realizar el Pago de Prueba

Ahora, **con la sesión del usuario de prueba abierta** en la ventana de incógnito:

1. En tu aplicación (ventana normal), haz clic en **"Pagar"**
2. Se abrirá Mercado Pago
3. **Debería detectar que ya estás logueado** con el usuario de prueba
4. Si no, cierra sesión de tu cuenta real y vuelve a iniciar con el usuario de prueba
5. Completa el pago con la tarjeta de prueba:
   - Tarjeta: `5254 1336 7440 3564`
   - CVV: `123`
   - Vencimiento: `11/30`
   - Nombre: `APRO`
   - Documento: `123456789`

## 🔄 Flujo Correcto con Usuarios de Prueba

```
┌─────────────────────────────────────┐
│ Tu Cuenta Real de Mercado Pago      │
│ (Vendedor)                          │
│                                     │
│ - Tiene la aplicación               │
│ - Tiene las credenciales TEST       │
│ - Crea usuarios de prueba           │
└─────────────────────────────────────┘
                  │
                  │ Crea
                  ▼
┌─────────────────────────────────────┐
│ Usuario de Prueba - Comprador       │
│ (TEST-1234567890)                   │
│                                     │
│ - Inicia sesión en MP               │
│ - Realiza el pago de prueba         │
│ - Usa tarjetas de prueba            │
└─────────────────────────────────────┘
```

## 🎯 Resumen

**Para que funcione con credenciales TEST**:
1. ✅ Crea usuario de prueba COMPRADOR
2. ✅ Inicia sesión con ese usuario en ventana de incógnito
3. ✅ Realiza el pago con tarjeta de prueba
4. ✅ Usa nombre del titular: `APRO`

**NO funcionará si**:
- ❌ Intentas pagar con tu cuenta real de Mercado Pago
- ❌ No estás logueado con el usuario de prueba
- ❌ Mezclas cuentas reales con credenciales TEST

---

## 🔗 Enlaces Útiles

- Panel de Desarrolladores: https://www.mercadopago.com.co/developers/panel/app
- Documentación oficial: https://www.mercadopago.com/developers/es/docs/checkout-api/additional-content/your-integrations/test/accounts

---

**Última actualización**: 2025-11-03
