import Image from "next/image";
import { cn } from "@/lib/utils/cn";

const TAMANOS = {
  sm: { caja: "h-12 w-12 text-base", px: 48 },
  md: { caja: "h-16 w-16 text-xl", px: 64 },
  lg: { caja: "h-24 w-24 text-3xl", px: 96 },
} as const;

interface AvatarProps {
  src: string | null;
  nombre: string;
  tamano?: keyof typeof TAMANOS;
  /** "cover" para fotos de personas, "contain" para logos/escudos */
  ajuste?: "cover" | "contain";
  className?: string;
}

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  const primera = partes[0]?.[0] ?? "";
  const ultima = partes.length > 1 ? (partes[partes.length - 1]?.[0] ?? "") : "";
  return (primera + ultima).toUpperCase() || "?";
}

/** Imagen si existe; si no, círculo con las iniciales del nombre. */
export function Avatar({ src, nombre, tamano = "sm", ajuste = "cover", className }: AvatarProps) {
  const { caja, px } = TAMANOS[tamano];

  if (src) {
    return (
      <span
        className={cn(
          "relative block shrink-0 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200",
          caja,
          className,
        )}
      >
        <Image
          src={src}
          alt={nombre}
          fill
          // Imágenes privadas servidas por /imagenes con la sesión del usuario:
          // el optimizador de Next no tiene esa sesión.
          unoptimized
          sizes={`${px * 2}px`}
          className={ajuste === "cover" ? "object-cover" : "object-contain p-1.5"}
        />
      </span>
    );
  }

  return (
    <span
      role="img"
      aria-label={nombre}
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-900 font-semibold text-white",
        caja,
        className,
      )}
    >
      {iniciales(nombre)}
    </span>
  );
}
