import { cn } from "@/lib/utils/cn";

const ANCHO = 300;
const ALTO = 96;
const PAD = 6;

export interface PuntoGrafico {
  etiqueta: string;
  /** Barra (nuestro valor) */
  valor: number | null;
  /** Línea (media móvil) */
  media?: number | null;
  /** Punto (rival u otra referencia) */
  referencia?: number | null;
}

/**
 * Evolución partido a partido: barras con nuestro valor, la media móvil de 5
 * como línea y la referencia (el rival) como puntos.
 */
export function GraficoEvolucion({
  puntos,
  formato,
  className,
}: {
  puntos: PuntoGrafico[];
  formato: (x: number | null) => string;
  className?: string;
}) {
  const valores = puntos
    .flatMap((p) => [p.valor, p.media, p.referencia])
    .filter((v): v is number => typeof v === "number");
  const max = Math.max(...valores, 0) || 1;
  const n = puntos.length;
  const paso = (ANCHO - 2 * PAD) / Math.max(n, 1);
  const x = (i: number) => PAD + paso * (i + 0.5);
  const y = (v: number) => ALTO - PAD - ((ALTO - 2 * PAD) * v) / max;
  const linea = puntos
    .map((p, i) => (p.media === null || p.media === undefined ? null : `${x(i)},${y(p.media)}`))
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      viewBox={`0 0 ${ANCHO} ${ALTO}`}
      className={cn("h-24 w-full", className)}
      role="img"
      aria-label={`Evolución en ${n} partidos`}
    >
      <line
        x1={PAD}
        x2={ANCHO - PAD}
        y1={ALTO - PAD}
        y2={ALTO - PAD}
        className="stroke-slate-200"
      />
      {puntos.map((p, i) =>
        p.valor === null ? null : (
          <rect
            key={i}
            x={x(i) - Math.min(14, paso * 0.6) / 2}
            width={Math.min(14, paso * 0.6)}
            y={y(p.valor)}
            height={Math.max(0, ALTO - PAD - y(p.valor))}
            rx={2}
            className="fill-brand-500/80"
          >
            <title>{`${p.etiqueta}: ${formato(p.valor)}${p.referencia !== null && p.referencia !== undefined ? ` (rival ${formato(p.referencia)})` : ""}`}</title>
          </rect>
        ),
      )}
      {puntos.map((p, i) =>
        p.referencia === null || p.referencia === undefined ? null : (
          <circle key={`r${i}`} cx={x(i)} cy={y(p.referencia)} r={2.5} className="fill-slate-400" />
        ),
      )}
      {linea && n > 1 && (
        <polyline points={linea} fill="none" strokeWidth={2} className="stroke-slate-900" />
      )}
    </svg>
  );
}

export interface PuntoDispersion {
  id: string;
  x: number;
  y: number;
  etiqueta: string;
  /** Resaltado (p. ej. formado en el club) */
  destacado?: boolean;
  /** Borde (p. ej. extranjero) */
  marcado?: boolean;
}

/** Dispersión simple (edad vs minutos). */
export function GraficoDispersion({
  puntos,
  ejeX,
  ejeY,
  minX,
  maxX,
}: {
  puntos: PuntoDispersion[];
  ejeX: string;
  ejeY: string;
  minX: number;
  maxX: number;
}) {
  const W = 600;
  const H = 300;
  const L = 48;
  const B = 32;
  const maxY = Math.max(...puntos.map((p) => p.y), 90);
  const px = (v: number) => L + ((W - L - 12) * (v - minX)) / Math.max(1, maxX - minX);
  const py = (v: number) => H - B - ((H - B - 12) * v) / maxY;
  const marcasX = Array.from({ length: Math.floor((maxX - minX) / 2) + 1 }, (_, i) => minX + 2 * i);
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="w-full"
      role="img"
      aria-label={`${ejeY} según ${ejeX}`}
    >
      {[0, 0.5, 1].map((f) => (
        <g key={f}>
          <line
            x1={L}
            x2={W - 12}
            y1={py(maxY * f)}
            y2={py(maxY * f)}
            className="stroke-slate-100"
          />
          <text
            x={L - 6}
            y={py(maxY * f) + 4}
            textAnchor="end"
            className="fill-slate-400 text-[11px]"
          >
            {Math.round(maxY * f)}
          </text>
        </g>
      ))}
      {marcasX.map((v) => (
        <text
          key={v}
          x={px(v)}
          y={H - B + 16}
          textAnchor="middle"
          className="fill-slate-400 text-[11px]"
        >
          {v}
        </text>
      ))}
      <text x={(W + L) / 2} y={H - 2} textAnchor="middle" className="fill-slate-500 text-[11px]">
        {ejeX}
      </text>
      <text
        x={12}
        y={H / 2}
        textAnchor="middle"
        transform={`rotate(-90 12 ${H / 2})`}
        className="fill-slate-500 text-[11px]"
      >
        {ejeY}
      </text>
      {puntos.map((p) => (
        <g key={p.id}>
          <circle
            cx={px(p.x)}
            cy={py(p.y)}
            r={6}
            strokeWidth={p.marcado ? 2.5 : 1}
            className={cn(
              p.destacado ? "fill-amber-400" : "fill-brand-500/70",
              p.marcado ? "stroke-slate-900" : "stroke-white",
            )}
          >
            <title>{`${p.etiqueta}: ${p.x} años, ${p.y}′`}</title>
          </circle>
          {p.y >= maxY * 0.15 && (
            <text x={px(p.x) + 8} y={py(p.y) + 4} className="fill-slate-600 text-[10px]">
              {p.etiqueta}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

/** Barra horizontal 0-100 (percentil o %). */
export function BarraPorcentaje({ valor, className }: { valor: number; className?: string }) {
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
      <div
        className={cn("h-full rounded-full", className ?? "bg-brand-600")}
        style={{ width: `${Math.max(0, Math.min(100, valor))}%` }}
      />
    </div>
  );
}
