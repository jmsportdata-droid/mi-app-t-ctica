import { cn } from "@/lib/utils/cn";

interface CampoFutbolProps {
  className?: string;
  /** Capa superpuesta (fichas, marcadores…) posicionada en % sobre el campo */
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLDivElement>;
}

const LINEA = { fill: "none", stroke: "rgba(255,255,255,0.85)", strokeWidth: 0.35 } as const;

/**
 * Campo de fútbol vertical en SVG (68 × 105 m). Portería rival arriba, la nuestra abajo.
 * Los hijos se colocan con left/top en % relativos al rectángulo completo.
 */
export function CampoFutbol({ className, children, onClick }: CampoFutbolProps) {
  return (
    <div
      onClick={onClick}
      className={cn(
        "relative aspect-[68/105] w-full overflow-hidden rounded-xl shadow-inner",
        className,
      )}
    >
      <svg
        viewBox="0 0 68 105"
        className="absolute inset-0 h-full w-full"
        aria-hidden
        preserveAspectRatio="none"
      >
        {/* Césped con franjas */}
        <rect width="68" height="105" fill="#15803d" />
        {Array.from({ length: 7 }, (_, i) => (
          <rect key={i} y={i * 15} width="68" height="7.5" fill="#16a34a" />
        ))}

        {/* Líneas */}
        <rect x="2" y="2" width="64" height="101" {...LINEA} />
        <line x1="2" y1="52.5" x2="66" y2="52.5" {...LINEA} />
        <circle cx="34" cy="52.5" r="9.15" {...LINEA} />
        <circle cx="34" cy="52.5" r="0.5" fill="white" />

        {/* Áreas (arriba y abajo) */}
        {[
          { y: 2, dir: 1 },
          { y: 103, dir: -1 },
        ].map(({ y, dir }) => (
          <g key={y}>
            <rect x={13.84} y={dir === 1 ? y : y - 16.5} width={40.32} height={16.5} {...LINEA} />
            <rect x={24.84} y={dir === 1 ? y : y - 5.5} width={18.32} height={5.5} {...LINEA} />
            <circle cx="34" cy={y + dir * 11} r="0.5" fill="white" />
            <path
              d={`M 26.7 ${y + dir * 16.5} A 9.15 9.15 0 0 ${dir === 1 ? 0 : 1} 41.3 ${y + dir * 16.5}`}
              {...LINEA}
            />
            <rect
              x={30.34}
              y={dir === 1 ? y - 1.5 : y}
              width={7.32}
              height={1.5}
              fill="rgba(255,255,255,0.5)"
            />
          </g>
        ))}
      </svg>
      {children}
    </div>
  );
}
