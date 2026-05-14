# Alerta de Mantenimiento de Flota

Aplicacion en Next.js + React para registrar vehiculos de carga y programar mantenimientos futuros con vista de alertas vencidas y proximas.

## Stack

- Next.js 16 (App Router)
- React 19
- Prisma ORM
- PostgreSQL
- pgAdmin

## Requisitos

- Node.js 20+
- Docker Desktop

## Puesta en marcha

1. Instalar dependencias:

```bash
npm install
```

2. Levantar PostgreSQL y pgAdmin:

```bash
npm run db:up
```

3. Generar cliente Prisma y crear migracion inicial:

```bash
npm run prisma:generate
npm run prisma:migrate -- --name init
```

4. Iniciar aplicacion:

```bash
npm run dev
```

5. Abrir en navegador:

- App: http://localhost:3000
- pgAdmin: http://localhost:5050
	- Usuario: admin@alerta.local
	- Password: admin123

## Conexion pgAdmin

Al crear el servidor en pgAdmin usa:

- Host: postgres (si usas pgAdmin dentro del mismo Docker) o localhost (si te conectas desde fuera)
- Puerto: 5432
- Usuario: alerta_user
- Password: alerta_pass
- Database: alerta_mantenimiento

## Variables de entorno

Archivo [.env](.env):

```env
DATABASE_URL="postgresql://alerta_user:alerta_pass@localhost:5432/alerta_mantenimiento?schema=public"
```
