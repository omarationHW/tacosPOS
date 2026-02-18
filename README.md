# Taqueria La Andaluza - POS

Sistema de punto de venta para taqueria. Permite tomar pedidos, gestionar la cocina en tiempo real y cobrar cuentas por mesa.

## Stack

- React 19 + TypeScript
- Vite 6
- Tailwind CSS 4
- Supabase (base de datos, autenticacion y realtime)

## Funcionalidades

- **Punto de Venta**: catalogo de productos por categoria, carrito de pedidos y asignacion por mesa. Los pedidos de la misma mesa se acumulan en una cuenta abierta.
- **Cocina**: pantalla en tiempo real que muestra los pedidos entrantes. El personal de cocina avanza el estado de cada orden (pendiente, preparando, listo, entregado).
- **Cuentas**: vista de cuentas abiertas por mesa con desglose de productos, subtotal, IVA y total. Permite cobrar en efectivo o tarjeta.
- **Dashboard**: metricas del dia (pedidos, ingresos, promedio por pedido) y productos mas vendidos.
- **Admin**: gestion de categorias y productos.
- **Roles**: acceso diferenciado para admin, cajero y cocina.
- **PWA**: instalable en tablet o celular desde el navegador.

## Estructura

```
apps/
  pos/          # Aplicacion principal (frontend)
  print-agent/  # Agente de impresion (pendiente)
packages/
  shared/       # Tipos compartidos
supabase/
  migrations/   # Esquema de base de datos (no incluido en el repo)
```

## Setup

1. Clonar el repositorio
2. Copiar `.env.example` a `.env` y llenar con las credenciales de Supabase
3. `npm install`
4. `npm run dev` desde `apps/pos/`
5. Ejecutar las migraciones SQL en el dashboard de Supabase
