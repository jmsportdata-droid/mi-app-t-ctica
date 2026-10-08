import { requerirContexto } from "@/lib/contexto";
import { Sidebar } from "@/components/layout/Sidebar";
import { BarraTemporada } from "@/components/cuerpo-tecnico/BarraTemporada";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // Sin sesión → /login (el middleware ya lo hace); sin cuerpo técnico → /bienvenida
  const contexto = await requerirContexto();

  return (
    <div className="min-h-screen">
      <Sidebar nombre={contexto.miembro.nombre} rol={contexto.miembro.rol} />
      <main className="pl-16 md:pl-64">
        <BarraTemporada
          cuerpoTecnico={contexto.cuerpoTecnico.nombre}
          temporadas={contexto.temporadas}
          actual={contexto.temporada}
        />
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">{children}</div>
      </main>
    </div>
  );
}
