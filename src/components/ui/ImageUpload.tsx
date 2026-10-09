"use client";

import { useEffect, useId, useState } from "react";
import {
  IMAGEN_ACCEPT,
  maxBytesDe,
  urlImagen,
  validarImagen,
  type Bucket,
} from "@/lib/storage/config";
import type { ImagenValor } from "@/lib/storage/client";
import { cn } from "@/lib/utils/cn";

interface ImageUploadProps {
  label: string;
  /** Bucket donde está la imagen ya guardada (para la vista previa) */
  bucket: Bucket;
  value: ImagenValor;
  onChange: (valor: ImagenValor) => void;
  ajuste?: "cover" | "contain";
  /** "circulo" para fotos y escudos; "rectangulo" para gráficos */
  forma?: "circulo" | "rectangulo";
  error?: string;
  disabled?: boolean;
}

/** Selector de imagen con vista previa. No sube nada: el formulario lo hace al guardar. */
export function ImageUpload({
  label,
  bucket,
  value,
  onChange,
  ajuste = "cover",
  forma = "circulo",
  error,
  disabled,
}: ImageUploadProps) {
  const id = useId();
  const [errorLocal, setErrorLocal] = useState<string | null>(null);
  const [previewArchivo, setPreviewArchivo] = useState<string | null>(null);

  // Object URL para previsualizar el archivo local; se libera al cambiar.
  useEffect(() => {
    if (!value.archivo) {
      setPreviewArchivo(null);
      return;
    }
    const url = URL.createObjectURL(value.archivo);
    setPreviewArchivo(url);
    return () => URL.revokeObjectURL(url);
  }, [value.archivo]);

  const preview = previewArchivo ?? urlImagen(bucket, value.ruta);
  const mensajeError = errorLocal ?? error;

  function handleArchivo(e: React.ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!archivo) return;

    const problema = validarImagen(archivo, bucket);
    if (problema) {
      setErrorLocal(problema);
      return;
    }
    setErrorLocal(null);
    onChange({ archivo, ruta: value.ruta });
  }

  function quitar() {
    setErrorLocal(null);
    onChange({ archivo: null, ruta: null });
  }

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium text-slate-700">{label}</span>
      <div className="flex items-center gap-4">
        <div
          className={cn(
            "flex shrink-0 items-center justify-center overflow-hidden border-2 border-dashed bg-slate-50",
            forma === "circulo" ? "h-20 w-20 rounded-full" : "h-24 w-40 rounded-lg",
            mensajeError ? "border-red-300" : "border-slate-300",
          )}
        >
          {preview ? (
            // Vista previa local (blob:) o imagen privada — next/image no aplica aquí
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Vista previa"
              className={cn(
                "h-full w-full",
                ajuste === "cover" ? "object-cover" : "object-contain p-1.5",
              )}
            />
          ) : (
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7 text-slate-400"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.6}
              aria-hidden
            >
              <path d="M4 16l4.6-4.6a2 2 0 0 1 2.8 0L16 16m-2-2 1.6-1.6a2 2 0 0 1 2.8 0L20 14M14 8h.01M6 20h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2z" />
            </svg>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor={id}
              className={cn(
                "inline-flex cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50",
                disabled && "pointer-events-none opacity-60",
              )}
            >
              {preview ? "Cambiar imagen" : "Subir imagen"}
            </label>
            {preview && (
              <button
                type="button"
                onClick={quitar}
                disabled={disabled}
                className="rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition-colors hover:bg-red-50 disabled:opacity-60"
              >
                Quitar
              </button>
            )}
          </div>
          <p className="text-xs text-slate-500">
            PNG o JPG, máximo {maxBytesDe(bucket) / 1024 / 1024} MB.
          </p>
        </div>

        <input
          id={id}
          type="file"
          accept={IMAGEN_ACCEPT}
          onChange={handleArchivo}
          disabled={disabled}
          className="sr-only"
          aria-invalid={Boolean(mensajeError)}
        />
      </div>
      {mensajeError && <p className="text-xs text-red-600">{mensajeError}</p>}
    </div>
  );
}
