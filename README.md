# Táctica FC

Webapp de análisis táctico para un equipo de fútbol. Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase Auth.

## Puesta en marcha

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Variables de entorno**: copiá `.env.example` a `.env.local` y completá:
   | Variable | Dónde se usa |
   | --- | --- |
   | `NEXT_PUBLIC_SUPABASE_URL` | Cliente y servidor |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Cliente y servidor |
   | `SUPABASE_SERVICE_ROLE_KEY` | **Solo servidor** (alta de usuarios). Nunca con prefijo `NEXT_PUBLIC_` |

   Las mismas variables tienen que estar cargadas en Vercel → Settings → Environment Variables.

3. **Vincular la base de datos** (una sola vez por máquina). La CLI de Supabase viene como
   dependencia del proyecto, se usa con `npx supabase`:
   ```bash
   npx supabase login                          # abre el navegador para autorizar
   npx supabase link --project-ref <ref>       # <ref> es el subdominio de NEXT_PUBLIC_SUPABASE_URL; pide la contraseña de la base
   ```

4. **Google OAuth**
   - Supabase → Authentication → Providers → Google: activa e introduce Client ID / Secret de Google Cloud.
   - En Google Cloud, añade como *Authorized redirect URI*: `https://<tu-proyecto>.supabase.co/auth/v1/callback`
   - Supabase → Authentication → URL Configuration: añade `http://localhost:3000/auth/callback`
     (y la URL de producción) a *Redirect URLs*.

5. **Arrancar**
   ```bash
   npm run dev
   ```

## Estructura

```
src/
├── middleware.ts                  # Protege todo excepto /login y /auth/callback
├── app/
│   ├── login/                     # Email + contraseña y "Continuar con Google"
│   ├── auth/callback/route.ts     # Intercambia el code OAuth por sesión
│   └── (dashboard)/               # Layout con sidebar fijo (requiere sesión)
│       ├── plantilla/             # Grid por posición, loading skeleton, error boundary
│       │   ├── actions.ts         # Server Actions: crear / editar / eliminar
│       │   ├── nuevo/             # Alta de jugador
│       │   └── [id]/              # Ficha ("Ver") y [id]/editar
│       ├── equipos/               # Grid de rivales, nuevo, [id]/editar, modal de borrado
│       └── partidos/              # Grid, nuevo, [id] con pestañas (Informe, Plan, ABP, Alineación, Eventos)
├── components/
│   ├── ui/                        # Button, Input/Select, Alert, Skeleton...
│   ├── layout/                    # Sidebar, LogoutButton
│   ├── auth/                      # LoginForm
│   ├── jugadores/                 # JugadorCard, PlantillaGrid, JugadorForm, Skeletons
│   ├── equipos/                   # EquipoCard, EquipoForm, EquipoAcciones, EquiposSkeleton
│   ├── partidos/                  # PartidoCard, PartidoForm, PartidoTabs, paneles, AlineacionEditor, eventos/
│   └── campo/                     # CampoFutbol (SVG reutilizable)
├── lib/
│   ├── supabase/                  # Clientes browser / server / middleware
│   ├── alineacion.ts              # Lógica pura de mover jugadores (campo / banquillo)
│   ├── export.ts                  # CSV / JSON de eventos
│   ├── embeds.ts                  # URLs de Vimeo / Google Slides → URL de embed segura
│   ├── storage/                   # Validación, subida (cliente) y borrado (servidor) de imágenes
│   ├── data/jugadores.ts          # Lecturas (server-only)
│   ├── validations/jugador.ts     # Esquema Zod compartido cliente/servidor
│   └── utils/                     # calcularEdad, rutaSegura, cn
└── types/                         # Jugador, Database
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

## Scripts

| Script                 | Descripción                                   |
| ---------------------- | --------------------------------------------- |
| `npm run dev`          | Servidor de desarrollo                        |
| `npm run build`        | Build de producción                           |
| `npm run typecheck`    | Comprobación de tipos                         |
| `npm run lint`         | ESLint                                        |
| `npm run format`       | Formatea todo con Prettier                    |
| `npm run format:check` | Verifica el formato sin tocar archivos        |
| `npm run db:nueva`     | Crea una migración vacía                      |
| `npm run db:push`      | Aplica las migraciones pendientes en remoto   |
| `npm run db:tipos`     | Regenera los tipos de TypeScript de la base   |
