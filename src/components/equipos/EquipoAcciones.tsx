"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { eliminarEquipo } from "@/app/(dashboard)/equipos/actions";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

export function EquipoAcciones({ id, nombre }: { id: string; nombre: string }) {
  const router = useRouter();
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendiente, startTransition] = useTransition();

  function cerrar() {
    setAbierto(false);
    setError(null);
  }

  function confirmar() {
    setError(null);
    startTransition(async () => {
      try {
        const resultado = await eliminarEquipo(id);
        if (!resultado.ok) {
          setError(resultado.error);
          return;
        }
        setAbierto(false);
        router.refresh();
      } catch {
        setError("Error de conexión al eliminar.");
      }
    });
  }

  return (
    <div className="flex gap-2">
      <Link
        href={`/equipos/${id}/editar`}
        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-700 transition-colors hover:border-brand-500 hover:bg-brand-50 hover:text-brand-700"
      >
        Editar
      </Link>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="flex-1 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:border-red-300 hover:bg-red-50"
      >
        Eliminar
      </button>

      <ConfirmDialog
        abierto={abierto}
        titulo="Eliminar equipo"
        descripcion={
          <>
            ¿Seguro que querés eliminar <strong className="text-slate-900">{nombre}</strong>? Se
            borrará también su escudo. Esta acción no se puede deshacer.
          </>
        }
        textoConfirmar="Eliminar equipo"
        cargando={pendiente}
        error={error}
        onConfirmar={confirmar}
        onCerrar={cerrar}
      />
    </div>
  );
}
