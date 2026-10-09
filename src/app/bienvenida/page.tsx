import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSesion } from "@/lib/contexto";
import { Logo } from "@/components/Logo";
import { LogoutButton } from "@/components/layout/LogoutButton";
import { AltaCuerpoTecnicoForm } from "@/components/cuerpo-tecnico/AltaCuerpoTecnicoForm";

export const metadata: Metadata = { title: "Bienvenida" };

/** Primer ingreso de alguien que todavía no pertenece a ningún cuerpo técnico. */
export default async function BienvenidaPage() {
  const sesion = await getSesion();
  if (sesion.estado === "sin_sesion") redirect("/login");
  if (sesion.estado === "ok") redirect("/hoy");

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-50 via-white to-slate-100 p-4">
      <div className="w-full max-w-lg">
        <div className="mb-8 flex justify-center">
          <Logo />
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-lg">
          <h1 className="text-xl font-semibold text-slate-900">Bienvenido</h1>
          <p className="mb-6 mt-1 text-sm text-slate-500">
            Creá tu cuerpo técnico y la temporada en la que están. Vas a quedar como entrenador y
            después podés sumar al resto.
          </p>
          <AltaCuerpoTecnicoForm />
        </div>
        <div className="mx-auto mt-4 w-48">
          <LogoutButton />
        </div>
        <p className="mt-2 text-center text-xs text-slate-400">{sesion.email}</p>
      </div>
    </main>
  );
}
