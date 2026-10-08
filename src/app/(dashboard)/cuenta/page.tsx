import type { Metadata } from "next";
import { requerirContexto } from "@/lib/contexto";
import { ROL_LABEL } from "@/types/cuerpo-tecnico";
import { PageHeader } from "@/components/ui/PageHeader";
import { CambiarPasswordForm } from "@/components/auth/CambiarPasswordForm";

export const metadata: Metadata = { title: "Mi cuenta" };

export default async function CuentaPage() {
  const { miembro, email, cuerpoTecnico } = await requerirContexto();
  const datos = [
    { label: "Nombre", valor: miembro.nombre },
    { label: "Email", valor: email },
    { label: "Rol", valor: `${ROL_LABEL[miembro.rol]} · ${cuerpoTecnico.nombre}` },
  ];

  return (
    <>
      <PageHeader titulo="Mi cuenta" />
      <div className="grid max-w-3xl gap-6 md:grid-cols-2">
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <dl className="space-y-4">
            {datos.map(({ label, valor }) => (
              <div key={label}>
                <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {label}
                </dt>
                <dd className="mt-1 font-medium text-slate-900">{valor}</dd>
              </div>
            ))}
          </dl>
        </section>
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 font-semibold text-slate-900">Cambiar contraseña</h2>
          <CambiarPasswordForm />
        </section>
      </div>
    </>
  );
}
