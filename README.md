# Táctica FC

Webapp de análisis táctico para un equipo de fútbol. Next.js 14 (App Router) + TypeScript + Tailwind CSS + Supabase Auth.

## Puesta en marcha

1. **Instalar dependencias**
   ```bash
   npm install
   ```

2. **Variables de entorno**: copia `.env.local.example` a `.env.local` y rellena:
   ```
   NEXT_PUBLIC_SUPABASE_URL=...
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   ```

3. **Base de datos**: en Supabase → SQL Editor, ejecuta en orden:
   - `supabase/schema.sql`: tabla `jugadores` con RLS para usuarios autenticados.
   - `supabase/002_fotos_y_equipos.sql`: columna `foto_url`, tabla `equipos` y los buckets
     públicos `player-photos` y `team-logos` (PNG/JPG, máx. 2 MB) con sus permisos.
   - `supabase/003_partidos.sql`: tablas `partidos`, `plan_partido` e `informe_rival`.
   - `supabase/004_avanzado.sql`: `jugador_atributos`, `alineacion_partido`, `abp_partido`,
     `eventos_partido` y la columna `partidos.video_url`.

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

## Scripts

| Script              | Descripción              |
| ------------------- | ------------------------ |
| `npm run dev`       | Servidor de desarrollo   |
| `npm run build`     | Build de producción      |
| `npm run typecheck` | Comprobación de tipos    |
| `npm run lint`      | ESLint                   |
