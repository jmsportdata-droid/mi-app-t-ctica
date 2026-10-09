"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { regenerarEnlaceJugadores } from "@/app/(dashboard)/calendario/actions";
import { Button } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";

const CLASE_BOTON =
  "inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50";

/** Imágenes para el grupo de WhatsApp y link de solo lectura para los jugadores. */
export function BarraCompartir({
  desde,
  manana,
  token,
}: {
  /** Lunes de la semana que se está viendo */
  desde: string;
  manana: string;
  token: string | null;
}) {
  const router = useRouter();
  const [pendiente, startTransition] = useTransition();
  const [origen, setOrigen] = useState("");
  const [copiado, setCopiado] = useState(false);
  const [regenerando, setRegenerando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setOrigen(window.location.origin), []);
  const link = token && origen ? `${origen}/s/${token}` : null;

  function generar() {
    setError(null);
    startTransition(async () => {
      try {
        const r = await regenerarEnlaceJugadores();
        if (!r.ok) {
          setError(r.error);
          return;
        }
        setRegenerando(false);
        router.refresh();
      } catch {
        setError("Error de conexión. Probá de nuevo.");
      }
    });
  }

  async function copiar() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2000);
    } catch {
      setError("No se pudo copiar: seleccioná el link y copialo a mano.");
    }
  }

  return (
    <section className="mb-6 space-y-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-semibold text-slate-900">Compartir con el plantel</span>
        <a href={`/compartir/semana?desde=${desde}&descargar=1`} className={CLASE_BOTON}>
          ↓ Imagen de la semana
        </a>
        <a
          href={`/compartir/semana?desde=${desde}`}
          target="_blank"
          rel="noopener"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          ver
        </a>
        <a href={`/compartir/dia?fecha=${manana}&descargar=1`} className={CLASE_BOTON}>
          ↓ Imagen de mañana
        </a>
        <a
          href={`/compartir/dia?fecha=${manana}`}
          target="_blank"
          rel="noopener"
          className="text-sm font-medium text-brand-700 hover:underline"
        >
          ver
        </a>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3">
        <span className="text-sm text-slate-600">Link para jugadores:</span>
        {token ? (
          <>
            <input
              readOnly
              value={link ?? ""}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Link para jugadores"
              className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-1.5 text-xs text-slate-700"
            />
            <Button variante="secondary" className="px-3 py-1.5" onClick={copiar}>
              {copiado ? "¡Copiado!" : "Copiar"}
            </Button>
            <Button
              variante="ghost"
              className="px-3 py-1.5"
              onClick={() => setRegenerando(true)}
              disabled={pendiente}
            >
              Cambiar link
            </Button>
          </>
        ) : (
          <Button
            variante="secondary"
            className="px-3 py-1.5"
            cargando={pendiente}
            onClick={generar}
          >
            Crear link
          </Button>
        )}
      </div>
      <p className="text-xs text-slate-500">
        Solo se ve lo marcado como visible para los jugadores: nada de notas internas ni sesiones.
      </p>
      {error && !regenerando && <p className="text-xs text-red-600">{error}</p>}

      <ConfirmDialog
        abierto={regenerando}
        titulo="Cambiar el link de jugadores"
        descripcion="El link actual deja de andar y se crea uno nuevo. Usalo si el link llegó a alguien que no corresponde."
        textoConfirmar="Cambiar link"
        cargando={pendiente}
        error={regenerando ? error : null}
        onConfirmar={generar}
        onCerrar={() => setRegenerando(false)}
      />
    </section>
  );
}
