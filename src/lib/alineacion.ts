import { TITULARES, type AlineacionInput } from "@/types/alineacion";

export type Destino =
  { tipo: "slot"; indice: number } | { tipo: "banquillo" } | { tipo: "disponibles" };

type Estado = Pick<AlineacionInput, "titulares" | "suplentes">;

/** Normaliza titulares a exactamente 11 posiciones. */
export function normalizarTitulares(titulares: readonly (string | null)[]): (string | null)[] {
  return Array.from({ length: TITULARES }, (_, i) => titulares[i] ?? null);
}

/** Quita de la alineación los ids que ya no existen (jugadores eliminados). */
export function limpiarAlineacion(estado: Estado, idsValidos: ReadonlySet<string>): Estado {
  return {
    titulares: normalizarTitulares(estado.titulares).map((id) =>
      id && idsValidos.has(id) ? id : null,
    ),
    suplentes: estado.suplentes.filter((id) => idsValidos.has(id)),
  };
}

/**
 * Mueve un jugador a un destino. Si el destino es un hueco ocupado,
 * el ocupante pasa al lugar de origen del jugador movido (intercambio).
 */
export function moverJugador(estado: Estado, jugadorId: string, destino: Destino): Estado {
  const titulares = normalizarTitulares(estado.titulares);
  let suplentes = [...estado.suplentes];

  const slotOrigen = titulares.indexOf(jugadorId);
  const enBanquillo = suplentes.includes(jugadorId);

  // Sacar al jugador de donde esté
  if (slotOrigen >= 0) titulares[slotOrigen] = null;
  if (enBanquillo) suplentes = suplentes.filter((id) => id !== jugadorId);

  switch (destino.tipo) {
    case "slot": {
      const ocupante = titulares[destino.indice] ?? null;
      titulares[destino.indice] = jugadorId;
      if (ocupante && ocupante !== jugadorId) {
        if (slotOrigen >= 0) titulares[slotOrigen] = ocupante;
        else if (enBanquillo) suplentes.push(ocupante);
        // Si venía de "disponibles", el ocupante vuelve a disponibles
      }
      break;
    }
    case "banquillo":
      suplentes.push(jugadorId);
      break;
    case "disponibles":
      break;
  }

  return { titulares, suplentes };
}
