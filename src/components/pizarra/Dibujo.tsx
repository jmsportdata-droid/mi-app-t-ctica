import { CANCHA, LIENZO } from "@/lib/pizarra";
import {
  ESTILOS_FLECHA,
  INFO_ESTILO,
  tituloJugada,
  type ElementoDiagrama,
  type Jugada,
  type JugadorEnDiagrama,
  type RolJugada,
} from "@/types/jugada";

/**
 * Piezas de la pizarra en SVG, sin estado: las usan el editor, el partido y el PDF.
 * Coordenadas en metros sobre un lienzo de 80 × 45 (ver LIENZO y CANCHA).
 */

const LINEA = "#2b2b2b";
const FUENTE = "'Arial Black', 'Arial', sans-serif";

/** Marcadores de punta de flecha, uno por estilo. */
export function Definiciones({ prefijo }: { prefijo: string }) {
  return (
    <defs>
      {ESTILOS_FLECHA.map((e) => (
        <marker
          key={e.valor}
          id={`${prefijo}-punta-${e.valor}`}
          viewBox="0 0 10 10"
          refX="7"
          refY="5"
          markerWidth="4"
          markerHeight="4"
          orient="auto-start-reverse"
        >
          <path d="M0,0 L10,5 L0,10 z" fill={e.color} />
        </marker>
      ))}
    </defs>
  );
}

/** Media cancha vista desde arriba: área, área chica, arco, punto penal y medialuna. */
export function CanchaArea() {
  const { fondo, bandaIzq, bandaDer, area, areaChica, arco, penal } = CANCHA;
  const radio = 9.15;
  const dy = area.y2 - penal.y;
  const dx = Math.sqrt(radio * radio - dy * dy);
  const props = {
    fill: "none",
    stroke: LINEA,
    strokeWidth: 0.55,
    strokeLinejoin: "round" as const,
  };
  return (
    <g>
      <rect x={0} y={0} width={LIENZO.ancho} height={LIENZO.alto} fill="#ffffff" />
      <path
        d={`M${bandaIzq},${LIENZO.alto} L${bandaIzq},${fondo} L${bandaDer},${fondo} L${bandaDer},${LIENZO.alto}`}
        {...props}
      />
      <rect x={area.x1} y={fondo} width={area.x2 - area.x1} height={area.y2 - fondo} {...props} />
      <rect
        x={areaChica.x1}
        y={fondo}
        width={areaChica.x2 - areaChica.x1}
        height={areaChica.y2 - fondo}
        {...props}
      />
      <rect x={arco.x1} y={arco.y1} width={arco.x2 - arco.x1} height={fondo - arco.y1} {...props} />
      <path
        d={`M${penal.x - dx},${area.y2} A${radio},${radio} 0 0 0 ${penal.x + dx},${area.y2}`}
        {...props}
      />
      <circle cx={penal.x} cy={penal.y} r={0.25} fill={LINEA} />
      <path
        d={`M${bandaIzq + 1.5},${fondo} A1.5,1.5 0 0 1 ${bandaIzq},${fondo + 1.5}`}
        {...props}
      />
      <path
        d={`M${bandaDer - 1.5},${fondo} A1.5,1.5 0 0 0 ${bandaDer},${fondo + 1.5}`}
        {...props}
      />
    </g>
  );
}

/** Corta el nombre en dos líneas si es largo (para el título de la derecha). */
function enLineas(texto: string, max = 26): string[] {
  if (texto.length <= max) return [texto];
  const palabras = texto.split(" ");
  const lineas: string[] = [""];
  for (const p of palabras) {
    const actual = lineas[lineas.length - 1]!;
    if ((actual + " " + p).trim().length > max && lineas.length < 2) lineas.push(p);
    else lineas[lineas.length - 1] = `${actual} ${p}`.trim();
  }
  return lineas;
}

/** Textos de la placa: número, tipo de jugada, nombre y seña. */
export function Encabezado({
  jugada,
}: {
  jugada: Pick<Jugada, "tipo" | "categoria" | "numero" | "nombre" | "sena">;
}) {
  const nombre = enLineas(jugada.nombre.toUpperCase());
  return (
    <g fontFamily={FUENTE} fill="#1f2937" fontWeight={900}>
      {jugada.numero !== null && (
        <text x={1.6} y={3.4} fontSize={2.6}>
          {jugada.numero}
        </text>
      )}
      <text x={21.5} y={4.2} fontSize={1.7} textAnchor="middle">
        {tituloJugada(jugada)}
      </text>
      {nombre.map((l, i) => (
        <text
          key={i}
          x={58.5}
          y={(nombre.length === 1 ? 4.2 : 3.1) + i * 2}
          fontSize={1.6}
          textAnchor="middle"
        >
          {l}
        </text>
      ))}
      {jugada.sena && (
        <text x={8} y={43.2} fontSize={1.5}>
          SEÑA: {jugada.sena.toUpperCase()}
        </text>
      )}
    </g>
  );
}

function apellido(nombre: string): string {
  const partes = nombre.trim().split(/\s+/);
  return (partes.length > 1 ? partes[partes.length - 1] : partes[0])!.toUpperCase();
}

const CAMISETA =
  "M-1.6,-1.5 L-0.6,-1.9 Q0,-1.3 0.6,-1.9 L1.6,-1.5 L2.3,-0.3 L1.3,0.2 L1.3,1.9 L-1.3,1.9 L-1.3,0.2 L-2.3,-0.3 Z";

/** Un elemento del dibujo. */
export function ElementoSVG({
  elemento: e,
  prefijo,
  roles,
  jugadorDeRol,
  color,
  seleccionado = false,
}: {
  elemento: ElementoDiagrama;
  prefijo: string;
  roles: RolJugada[];
  jugadorDeRol?: (rolId: string) => JugadorEnDiagrama | null;
  color: string;
  seleccionado?: boolean;
}) {
  const resalte = seleccionado ? { filter: "drop-shadow(0 0 0.6px #2563eb)" } : undefined;

  if (e.tipo === "flecha") {
    const estilo = INFO_ESTILO[e.estilo];
    return (
      <path
        d={`M${e.x1},${e.y1} Q${e.cx},${e.cy} ${e.x2},${e.y2}`}
        fill="none"
        stroke={estilo.color}
        strokeWidth={estilo.ancho + (seleccionado ? 0.15 : 0)}
        strokeDasharray={estilo.trazo || undefined}
        strokeLinecap="round"
        markerEnd={`url(#${prefijo}-punta-${e.estilo})`}
        style={resalte}
      />
    );
  }

  if (e.tipo === "pelota") {
    return (
      <g transform={`translate(${e.x},${e.y})`} style={resalte}>
        <circle r={0.7} fill="#ffffff" stroke="#111827" strokeWidth={0.16} />
        <circle r={0.26} fill="#111827" />
      </g>
    );
  }

  if (e.tipo === "texto") {
    return (
      <text
        x={e.x}
        y={e.y}
        fontFamily={FUENTE}
        fontWeight={900}
        fontSize={1.5}
        fill="#1f2937"
        style={resalte}
      >
        {e.texto}
      </text>
    );
  }

  if (e.tipo === "rival") {
    return (
      <g transform={`translate(${e.x},${e.y})`} style={resalte}>
        <path
          d={CAMISETA}
          transform="scale(0.72)"
          fill="#dc2626"
          stroke="#7f1d1d"
          strokeWidth={0.18}
        />
        {e.etiqueta && (
          <text
            y={0.65}
            fontSize={0.9}
            fontFamily={FUENTE}
            fontWeight={900}
            fill="#fff"
            textAnchor="middle"
          >
            {e.etiqueta}
          </text>
        )}
      </g>
    );
  }

  // Jugador propio: con el jugador asignado al rol (foto y dorsal) o con el rol
  const rol = roles.find((r) => r.id === e.rol);
  const jugador = e.rol && jugadorDeRol ? jugadorDeRol(e.rol) : null;
  const clip = `${prefijo}-clip-${e.id}`;
  // Debajo, el apellido del jugador asignado (en la biblioteca alcanza con la sigla del rol)
  const etiqueta = jugador ? apellido(jugador.nombre) : null;
  return (
    <g transform={`translate(${e.x},${e.y})`} style={resalte}>
      <circle r={1.5} fill={color} stroke="#ffffff" strokeWidth={0.22} />
      {jugador?.fotoUrl ? (
        <>
          <clipPath id={clip}>
            <circle r={1.4} />
          </clipPath>
          <image
            href={jugador.fotoUrl}
            x={-1.4}
            y={-1.4}
            width={2.8}
            height={2.8}
            clipPath={`url(#${clip})`}
            preserveAspectRatio="xMidYMin slice"
          />
        </>
      ) : (
        <text
          y={jugador?.numero !== null && jugador?.numero !== undefined ? 0.45 : 0.35}
          fontSize={jugador?.numero !== null && jugador?.numero !== undefined ? 1.25 : 0.95}
          fontFamily={FUENTE}
          fontWeight={900}
          fill="#ffffff"
          textAnchor="middle"
        >
          {jugador?.numero ?? rol?.corto ?? "?"}
        </text>
      )}
      {jugador?.fotoUrl && jugador.numero !== null && (
        <g transform="translate(-1.35,-1.25)">
          <circle r={0.68} fill="#111827" />
          <text
            y={0.29}
            fontSize={0.78}
            fontFamily={FUENTE}
            fontWeight={900}
            fill="#fff"
            textAnchor="middle"
          >
            {jugador.numero}
          </text>
        </g>
      )}
      {etiqueta && (
        <text
          y={2.45}
          fontSize={0.78}
          fontFamily={FUENTE}
          fontWeight={900}
          fill="#1f2937"
          textAnchor="middle"
          stroke="#ffffff"
          strokeWidth={0.3}
          paintOrder="stroke"
          letterSpacing={0.05}
        >
          {etiqueta}
        </text>
      )}
    </g>
  );
}

/** Placa completa de solo lectura (partido, listados y PDF). */
export function DiagramaJugada({
  jugada,
  prefijo,
  jugadorDeRol,
  color = "#4c1d95",
  escudoUrl,
  className,
}: {
  jugada: Pick<Jugada, "tipo" | "categoria" | "numero" | "nombre" | "sena" | "roles" | "diagrama">;
  prefijo: string;
  jugadorDeRol?: (rolId: string) => JugadorEnDiagrama | null;
  color?: string;
  escudoUrl?: string | null;
  className?: string;
}) {
  // Flechas abajo, después pelota y jugadores, como en las placas
  const orden = { flecha: 0, texto: 1, pelota: 2, rival: 3, jugador: 4 } as const;
  const elementos = [...jugada.diagrama.elementos].sort((a, b) => orden[a.tipo] - orden[b.tipo]);
  return (
    <svg
      viewBox={`0 0 ${LIENZO.ancho} ${LIENZO.alto}`}
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={jugada.nombre}
    >
      <Definiciones prefijo={prefijo} />
      <CanchaArea />
      <Encabezado jugada={jugada} />
      {elementos.map((e) => (
        <ElementoSVG
          key={e.id}
          elemento={e}
          prefijo={prefijo}
          roles={jugada.roles}
          jugadorDeRol={jugadorDeRol}
          color={color}
        />
      ))}
      {escudoUrl && (
        <image
          href={escudoUrl}
          x={67}
          y={38}
          width={5.5}
          height={5.5}
          preserveAspectRatio="xMidYMid meet"
        />
      )}
    </svg>
  );
}
