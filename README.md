# Táctica FC

App del cuerpo técnico de un plantel principal: plantel, partidos, rivales y (próximamente)
planificación y cargas. Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase.

Los datos se separan en dos capas:

- **Permanente** (cuelga del cuerpo técnico, viaja de club en club): equipos rivales; más adelante
  modelo de juego, banco de tareas, informes.
- **Club-temporada** (cuelga de la temporada, queda en cada club): plantel, partidos y su detalle.

## Puesta en marcha

1. **Instalar dependencias**

   ```bash
   npm install
   ```

2. **Variables de entorno**: copiá `.env.example` a `.env.local` y completá:

   | Variable                        | Dónde se usa                                                           |
   | ------------------------------- | ---------------------------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | Cliente y servidor                                                     |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente y servidor                                                     |
   | `SUPABASE_SERVICE_ROLE_KEY`     | **Solo servidor** (alta de usuarios). Nunca con prefijo `NEXT_PUBLIC_` |
   | `API_FOOTBALL_KEY`              | **Solo servidor**: importar planteles y rivales desde API-Football     |

   Las mismas variables tienen que estar cargadas en Vercel → Settings → Environment Variables.

3. **Vincular la base de datos** (una sola vez por máquina). La CLI de Supabase viene como
   dependencia del proyecto, se usa con `npx supabase`:

   ```bash
   npx supabase login                          # abre el navegador para autorizar
   npx supabase link --project-ref <ref>       # <ref> es el subdominio de NEXT_PUBLIC_SUPABASE_URL; pide la contraseña de la base
   ```

4. **Supabase Auth**: en Authentication → Sign In / Providers, desactivá _Allow new users to sign
   up_ y el proveedor Google. No hay registro público: las cuentas las crea el entrenador.

5. **Arrancar**
   ```bash
   npm run dev
   ```

## Cuentas y permisos

- La primera vez que alguien entra sin pertenecer a un cuerpo técnico, la app le pide crearlo
  (`/bienvenida`): queda como **entrenador** y crea la temporada activa.
- El entrenador suma al resto desde **Cuerpo técnico → Agregar miembro** (email, rol y una
  contraseña inicial que le pasa a la persona). También puede cambiar roles, restablecer
  contraseñas y quitar miembros. Cada uno cambia su contraseña en **Mi cuenta**.
- Roles: entrenador, ayudante técnico, preparador físico y analista. Cualquier miembro edita todo
  lo de su cuerpo técnico; solo el entrenador gestiona miembros y temporadas.
- Los permisos los aplica la base (RLS en todas las tablas y en Storage), no solo la interfaz.
  `./scripts/probar-permisos.sh` los verifica contra la base remota dentro de una transacción que
  se deshace al final (ver `supabase/tests/permisos.sql`).
- Las imágenes (fotos y escudos) están en buckets **privados**, en una carpeta por cuerpo técnico, y
  se sirven desde `/imagenes/...` con la sesión del usuario.

## Importación desde API-Football

**Plantel → Importar** y **Equipos → Importar** traen jugadores y rivales desde
[API-Football](https://www.api-football.com) (cliente en `src/lib/externos/api-football.ts`).

- Plan gratuito: 100 consultas por día y 10 por minuto. Alcanza para el buscador, el plantel
  actual de un equipo (1 consulta) y el perfil de cada jugador (1 consulta: nombre completo,
  fecha de nacimiento, nacionalidad y altura). No incluye fixture ni estadísticas de la
  temporada en curso.
- Cada jugador y rival guarda su id en `ids_externos.api_football`: volver a importar actualiza
  en vez de duplicar. Número y línea se actualizan; el resto solo se completa si falta.
- Fotos y escudos se copian al Storage privado del cuerpo técnico.

## Estructura

```
src/
├── middleware.ts                  # Protege todo excepto /login
├── app/
│   ├── login/                     # Email + contraseña (sin registro público)
│   ├── bienvenida/                # Alta del cuerpo técnico en el primer ingreso
│   ├── imagenes/                  # Sirve las imágenes privadas de Storage
│   └── (dashboard)/               # Sidebar + barra de temporada (requiere cuerpo técnico)
│       ├── plantilla/             # Grid por posición, loading skeleton, error boundary
│       │   ├── actions.ts         # Server Actions: crear / editar / eliminar
│       │   ├── nuevo/             # Alta de jugador
│       │   └── [id]/              # Ficha ("Ver") y [id]/editar
│       ├── equipos/               # Grid de rivales, nuevo, [id]/editar, modal de borrado
│       ├── partidos/              # Grid, nuevo, [id] con pestañas (Informe, Plan, ABP, Alineación, Eventos)
│       ├── cuerpo-tecnico/        # Miembros (alta, rol, contraseña) y temporadas
│       └── cuenta/                # Datos propios y cambio de contraseña
├── components/
│   ├── ui/                        # Button, Input/Select, Alert, Skeleton...
│   ├── layout/                    # Sidebar, LogoutButton
│   ├── auth/                      # LoginForm, CambiarPasswordForm
│   ├── cuerpo-tecnico/            # BarraTemporada, MiembroForm/Fila, TemporadaForm/Card, alta inicial
│   ├── jugadores/                 # JugadorCard, PlantillaGrid, JugadorForm, Skeletons
│   ├── equipos/                   # EquipoCard, EquipoForm, EquipoAcciones, EquiposSkeleton
│   ├── partidos/                  # PartidoCard, PartidoForm, PartidoTabs, paneles, AlineacionEditor, eventos/
│   └── campo/                     # CampoFutbol (SVG reutilizable)
├── lib/
│   ├── supabase/                  # Clientes browser / server / middleware / admin (service role)
│   ├── contexto.ts                # Sesión: miembro, cuerpo técnico y temporada seleccionada
│   ├── alineacion.ts              # Lógica pura de mover jugadores (campo / banquillo)
│   ├── export.ts                  # CSV / JSON de eventos
│   ├── embeds.ts                  # URLs de Vimeo / Google Slides → URL de embed segura
│   ├── storage/                   # Validación, subida (cliente) y borrado (servidor) de imágenes
│   ├── data/                      # Lecturas (server-only)
│   ├── validations/jugador.ts     # Esquema Zod compartido cliente/servidor
│   └── utils/                     # calcularEdad, rutaSegura, cn
└── types/                         # database.ts (generado) y tipos de dominio derivados
```

## Base de datos y migraciones

El esquema vive en `supabase/migrations/` y **nunca se cambia a mano desde el panel de Supabase**.

```bash
npm run db:nueva -- nombre_del_cambio   # crea supabase/migrations/<fecha>_nombre_del_cambio.sql
# escribí el SQL en ese archivo
npm run db:push                         # aplica en la base remota las migraciones pendientes
npm run db:tipos                        # regenera src/types/database.ts desde la base
```

`npx supabase migration list` muestra qué migraciones están aplicadas en local y en remoto.

Para consultar la base remota **en modo solo lectura** (la base rechaza cualquier escritura), con
`SUPABASE_ACCESS_TOKEN` en `.env.local`:

```bash
./scripts/db-leer.sh "select count(*) from public.jugadores"
```

## Scripts

| Script                 | Descripción                                 |
| ---------------------- | ------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo                      |
| `npm run build`        | Build de producción                         |
| `npm run typecheck`    | Comprobación de tipos                       |
| `npm run lint`         | ESLint                                      |
| `npm run format`       | Formatea todo con Prettier                  |
| `npm run format:check` | Verifica el formato sin tocar archivos      |
| `npm run db:nueva`     | Crea una migración vacía                    |
| `npm run db:push`      | Aplica las migraciones pendientes en remoto |
| `npm run db:tipos`     | Regenera los tipos de TypeScript de la base |
