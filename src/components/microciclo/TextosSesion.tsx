"use client";

import { guardarTextoSesion } from "@/app/(dashboard)/microciclo/actions";
import { AutoSaveField } from "@/components/ui/AutoSaveField";

/** Objetivo y notas de la sesión, con guardado automático. */
export function TextosSesion({
  actividadId,
  objetivo,
  notas,
}: {
  actividadId: string;
  objetivo: string | null;
  notas: string | null;
}) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <AutoSaveField
        label="Objetivo de la sesión"
        valorInicial={objetivo}
        onGuardar={(v) => guardarTextoSesion(actividadId, "objetivo", v)}
        placeholder="Ej. Salida con línea de 3 contra presión alta del rival"
      />
      <AutoSaveField
        label="Notas para el cuerpo técnico"
        valorInicial={notas}
        onGuardar={(v) => guardarTextoSesion(actividadId, "notas", v)}
        multilinea
        filas={2}
        placeholder="Materiales, quién arma cada estación, ajustes…"
      />
    </section>
  );
}
