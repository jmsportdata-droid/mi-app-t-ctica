import { INFO_ESPACIO, INFO_TIPO_TAREA, type Tarea } from "@/types/tarea";

/** 150 → "2′30″", 900 → "15′", 30 → "30″". */
export function formatearSegundos(seg: number): string {
  const min = Math.floor(seg / 60);
  const resto = seg % 60;
  if (min === 0) return `${resto}″`;
  return resto === 0 ? `${min}′` : `${min}′${String(resto).padStart(2, "0")}″`;
}

/** "2:30" o "2" (minutos) → segundos; vacío → null; inválido → NaN. */
export function parsearDuracion(texto: string): number | null {
  const t = texto.trim();
  if (t === "") return null;
  const m = /^(\d{1,3})(?::([0-5]?\d))?$/.exec(t);
  if (!m) return Number.NaN;
  return Number(m[1]) * 60 + Number(m[2] ?? 0);
}

/** Segundos → "2:30" para editar. */
export function duracionParaEditar(seg: number | null): string {
  if (seg === null) return "";
  return `${Math.floor(seg / 60)}:${String(seg % 60).padStart(2, "0")}`;
}

type TiempoTarea = Pick<Tarea, "series" | "duracion_seg" | "pausa_seg">;

/** Total en segundos, con la misma regla que la columna generada de la base. */
export function tiempoTotal({ series, duracion_seg, pausa_seg }: TiempoTarea): number | null {
  if (duracion_seg === null) return null;
  if (series === null) return duracion_seg;
  return series * duracion_seg + (series - 1) * (pausa_seg ?? 0);
}

/** Como en la planilla: "3 × 2′30″ + 30″" (o "15′" si es continuo). */
export function textoTiempo(tarea: TiempoTarea): string | null {
  const { series, duracion_seg, pausa_seg } = tarea;
  if (duracion_seg === null) return null;
  if (series === null) return formatearSegundos(duracion_seg);
  const pausa = pausa_seg ? ` + ${formatearSegundos(pausa_seg)}` : "";
  return `${series} × ${formatearSegundos(duracion_seg)}${pausa}`;
}

type EspacioDeTarea = Pick<Tarea, "espacio" | "largo_m" | "ancho_m">;

/** "10 × 10 m", "Cancha entera" o "½ cancha (52 × 68 m)" si se cargaron medidas. */
export function textoEspacio({ espacio, largo_m, ancho_m }: EspacioDeTarea): string | null {
  const medidas = largo_m && ancho_m ? `${largo_m} × ${ancho_m} m` : null;
  if (!espacio) return medidas;
  if (espacio === "medidas") return medidas;
  const label = INFO_ESPACIO[espacio].label;
  return medidas ? `${label} (${medidas})` : label;
}

/** Superficie en m²: las medidas cargadas o las aproximadas del espacio estándar. */
export function superficie({ espacio, largo_m, ancho_m }: EspacioDeTarea): number | null {
  if (largo_m && ancho_m) return largo_m * ancho_m;
  if (!espacio) return null;
  const medidas = INFO_ESPACIO[espacio].medidas;
  return medidas ? medidas[0] * medidas[1] : null;
}

export function m2PorJugador(tarea: EspacioDeTarea & Pick<Tarea, "jugadores">): number | null {
  const m2 = superficie(tarea);
  return m2 && tarea.jugadores ? Math.round(m2 / tarea.jugadores) : null;
}

/**
 * Prompt para generar el gráfico de la tarea con IA (Higgsfield u otra).
 * Se arma con los datos de la ficha; se puede reemplazar por uno propio.
 */
export function promptAutomatico(tarea: Tarea, objetivos: string[]): string {
  const espacio = textoEspacio(tarea);
  const lineas = [
    "Diagrama táctico de fútbol para una ficha de entrenamiento profesional. Vista cenital 2D, estilo pizarra táctica limpia y moderna, colores planos, sin perspectiva ni sombras.",
    `Ejercicio: «${tarea.nombre}» (${INFO_TIPO_TAREA[tarea.tipo].label}).`,
    tarea.espacio === "gimnasio"
      ? "Lugar: gimnasio, mostrar las estaciones de trabajo con íconos simples de cada ejercicio."
      : `Espacio: ${espacio ?? "sector de la cancha"}, césped verde con las líneas blancas de la cancha y el espacio de trabajo delimitado con conos naranjas.`,
    tarea.formato
      ? `Jugadores: ${tarea.formato}${tarea.jugadores ? ` (${tarea.jugadores} en total)` : ""}.`
      : null,
    "Equipo en posesión en rojo, equipo que defiende en azul, comodines en amarillo y arqueros en verde; cada jugador es un círculo con un número. Pelotas blancas, mini arcos y arcos según corresponda.",
    tarea.descripcion ? `Cómo se organiza y se juega:\n${tarea.descripcion}` : null,
    objetivos.length > 0 ? `Objetivos a destacar: ${objetivos.join(", ")}.` : null,
    "Flechas: línea continua para el pase, línea discontinua para el movimiento sin pelota y línea ondulada para la conducción.",
    "Sin textos largos dentro de la imagen: solo el nombre del ejercicio arriba y una leyenda chica con los colores. Formato horizontal 16:9, alta resolución.",
  ];
  return lineas.filter((l): l is string => l !== null).join("\n\n");
}
