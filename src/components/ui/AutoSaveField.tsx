"use client";

import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { claseControl } from "./Field";

export type ResultadoAutoguardado =
  { ok: true; valor: string | null } | { ok: false; error: string };

type EstadoGuardado = "idle" | "guardando" | "guardado" | "error";

interface AutoSaveFieldProps {
  label: string;
  valorInicial: string | null;
  /** Persiste el valor; se llama al perder el foco solo si el valor ha cambiado. */
  onGuardar: (valor: string) => Promise<ResultadoAutoguardado>;
  multilinea?: boolean;
  filas?: number;
  tipo?: "text" | "url";
  placeholder?: string;
  ayuda?: string;
  /** Vista previa a partir del último valor guardado (embed, imagen…) */
  children?: (valorGuardado: string | null) => React.ReactNode;
}

/** Campo que se guarda automáticamente al perder el foco. */
export function AutoSaveField({
  label,
  valorInicial,
  onGuardar,
  multilinea = false,
  filas = 5,
  tipo = "text",
  placeholder,
  ayuda,
  children,
}: AutoSaveFieldProps) {
  const id = useId();
  const [valor, setValor] = useState(valorInicial ?? "");
  const [guardado, setGuardado] = useState<string | null>(valorInicial);
  const [estado, setEstado] = useState<EstadoGuardado>("idle");
  const [error, setError] = useState<string | null>(null);

  // Serializa los guardados: si el usuario sale y vuelve rápido, se respetan en orden.
  const cola = useRef<Promise<void>>(Promise.resolve());
  const ultimoGuardado = useRef<string | null>(valorInicial);

  useEffect(() => {
    if (estado !== "guardado") return;
    const t = setTimeout(() => setEstado("idle"), 2000);
    return () => clearTimeout(t);
  }, [estado]);

  function handleBlur() {
    const pendiente = valor.trim();
    cola.current = cola.current.then(async () => {
      if (pendiente === (ultimoGuardado.current ?? "")) return;

      setEstado("guardando");
      setError(null);
      try {
        const resultado = await onGuardar(pendiente);
        if (!resultado.ok) {
          setEstado("error");
          setError(resultado.error);
          return;
        }
        ultimoGuardado.current = resultado.valor;
        setGuardado(resultado.valor);
        setValor((actual) => (actual.trim() === pendiente ? (resultado.valor ?? "") : actual));
        setEstado("guardado");
      } catch {
        setEstado("error");
        setError("Error de conexión. Salí de nuevo del campo para reintentar.");
      }
    });
  }

  const props = {
    id,
    value: valor,
    placeholder,
    onBlur: handleBlur,
    "aria-invalid": estado === "error",
    "aria-describedby": `${id}-estado`,
    className: claseControl(estado === "error" ? (error ?? "error") : undefined),
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <label htmlFor={id} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        <EstadoIndicador id={`${id}-estado`} estado={estado} />
      </div>

      {multilinea ? (
        <textarea
          {...props}
          rows={filas}
          onChange={(e) => setValor(e.target.value)}
          className={cn(props.className, "resize-y")}
        />
      ) : (
        <input
          {...props}
          type={tipo}
          inputMode={tipo === "url" ? "url" : undefined}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      )}

      {error ? (
        <p className="text-xs text-red-600">{error}</p>
      ) : ayuda ? (
        <p className="text-xs text-slate-500">{ayuda}</p>
      ) : null}

      {children?.(guardado)}
    </div>
  );
}

function EstadoIndicador({ id, estado }: { id: string; estado: EstadoGuardado }) {
  const texto: Record<EstadoGuardado, string> = {
    idle: "",
    guardando: "Guardando…",
    guardado: "Guardado ✓",
    error: "No guardado",
  };
  return (
    <span
      id={id}
      aria-live="polite"
      className={cn(
        "text-xs transition-opacity",
        estado === "idle" && "opacity-0",
        estado === "guardando" && "text-slate-500",
        estado === "guardado" && "text-brand-600",
        estado === "error" && "text-red-600",
      )}
    >
      {texto[estado]}
    </span>
  );
}
