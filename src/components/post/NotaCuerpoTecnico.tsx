"use client";

import { useState } from "react";
import { guardarValoracion } from "@/app/(dashboard)/partidos/post-actions";
import { cn } from "@/lib/utils/cn";
import { useAccion } from "@/components/ui/useAccion";

/** Nota del cuerpo técnico (1-10) a un jugador en el partido; se guarda al salir del campo. */
export function NotaCuerpoTecnico({
  partidoId,
  jugadorId,
  nombre,
  inicial,
}: {
  partidoId: string;
  jugadorId: string;
  nombre: string;
  inicial: number | null;
}) {
  const accion = useAccion();
  const [valor, setValor] = useState(inicial === null ? "" : String(inicial));
  const [guardado, setGuardado] = useState(valor);

  function guardar() {
    if (valor === guardado) return;
    const texto = valor.replace(",", ".").trim();
    const nota = texto === "" ? null : Number(texto);
    if (nota !== null && (Number.isNaN(nota) || nota < 1 || nota > 10)) {
      accion.setError("1 a 10");
      return;
    }
    accion.ejecutar(
      () => guardarValoracion(partidoId, jugadorId, nota),
      () => setGuardado(valor),
    );
  }

  return (
    <input
      inputMode="decimal"
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={guardar}
      placeholder="—"
      aria-label={`Nota del cuerpo técnico a ${nombre}`}
      title={accion.error ?? "Nota del cuerpo técnico (1 a 10)"}
      className={cn(
        "w-12 rounded border px-1 py-0.5 text-center text-xs font-bold tabular-nums",
        accion.error ? "border-red-400 bg-red-50" : "border-slate-300",
        accion.pendiente && "opacity-60",
      )}
    />
  );
}
