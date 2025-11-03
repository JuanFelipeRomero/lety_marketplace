# Lety Marketplace

Plataforma web que conecta dueños de mascotas con clínicas veterinarias en Bogotá, Colombia. Facilita la búsqueda de servicios, reserva de citas y gestión de clínicas a través de dashboards separados.

## 🚀 Stack Tecnológico

### Frontend
- **Framework**: React Router v7 (file-based routing)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + Shadcn UI
- **State**: Zustand con persist middleware

### Backend
- **Runtime**: Node.js con ES modules
- **Framework**: Express.js
- **Database**: PostgreSQL vía Supabase
- **Auth**: JWT + bcrypt

## 📦 Instalación y Ejecución

### Backend
```bash
cd backend
npm install
npm start  # Desarrollo con auto-reload
```

### Frontend
```bash
cd frontend
npm install
npm run dev  # Servidor de desarrollo
```

## 🧪 Testing

### Backend
```bash
cd backend
npm test                  # Ejecutar todos los tests
npm run test:watch        # Modo watch
npm run test:coverage     # Con cobertura
npm run test:integration  # Solo integración
npm run test:unit         # Solo unitarios
```

## 💳 Integración Mercado Pago (Flujo Simplificado)

### 🎯 Modelo de Pago

Este proyecto utiliza un **flujo de pago simplificado** ideal para MVPs y demos:

- ✅ **Todos los pagos van a UNA sola cuenta** (la de la plataforma)
- ✅ **Sin OAuth ni split automático** de pagos
- ✅ **Tracking interno** de ganancias por clínica
- ✅ **Simplicidad tributaria**: Un solo receptor de pagos

### 📖 Documentación

- **[MERCADOPAGO_SIMPLE_SETUP.md](./MERCADOPAGO_SIMPLE_SETUP.md)** - 🌟 GUÍA PRINCIPAL - Configuración paso a paso del flujo simplificado
  - Requisitos y credenciales
  - Configuración de webhooks
  - Testing con tarjetas de prueba
  - Gestión de ganancias y pagos a clínicas
  - FAQ y troubleshooting

### 🚀 Setup Rápido

1. **Crea cuenta en Mercado Pago** (si no tienes): https://www.mercadopago.com.co
2. **Obtén credenciales** del [Panel de Desarrolladores](https://www.mercadopago.com.co/developers/panel/app)
3. **Configura variables de entorno**:
   ```bash
   cd backend
   cp .env.example .env
   # Edita .env y agrega tus credenciales MP_ACCESS_TOKEN y MP_PUBLIC_KEY
   ```
4. **Ejecuta migraciones**:
   ```bash
   # En Supabase o tu BD PostgreSQL
   psql -f backend/migrations/001_add_payment_fields.sql
   psql -f backend/migrations/002_simplify_mercadopago.sql
   ```
5. **¡Listo!** Puedes empezar a recibir pagos

### 💡 Testing

Para testing, usa **credenciales de TEST** y estos datos de prueba:

**Tarjetas (Colombia)**:
| Tarjeta | Número | CVV | Vencimiento |
|---------|--------|-----|-------------|
| Mastercard | 5254 1336 7440 3564 | 123 | 11/30 |
| Visa | 4013 5406 8274 6260 | 123 | 11/30 |

**Datos del Titular** (⚠️ IMPORTANTE):
- **Nombre**: `APRO` (escribe exactamente esto para pago aprobado)
- **Documento**: 123456789

📚 Más detalles en [MERCADOPAGO_TESTING_QUICK_GUIDE.md](./MERCADOPAGO_TESTING_QUICK_GUIDE.md)

### 📊 Gestión de Ganancias

Las clínicas ven sus ganancias en `/dashboard-vet/earnings`:
- 💰 Pendiente de pago
- ✅ Pagos recibidos
- 📈 Total ganado (neto de comisión 10%)

Los administradores gestionan pagos a clínicas desde la base de datos.

## 📚 Documentación Adicional

Para más detalles sobre la arquitectura, esquema de base de datos, y patrones de implementación, consulta:
- **[CLAUDE.md](./CLAUDE.md)** - Documentación completa del proyecto

## 🆘 Soporte

Si encuentras problemas:
1. Revisa las guías de troubleshooting en los archivos de documentación
2. Verifica los logs del backend
3. Consulta la [documentación oficial de Mercado Pago](https://www.mercadopago.com.co/developers)
