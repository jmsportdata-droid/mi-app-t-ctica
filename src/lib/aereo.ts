/**
 * Índice aéreo (0-100) para la pelota quieta: no alcanza con la altura. Combina
 * altura, duelos aéreos ganados cada 90′, % de aéreos ganados y remates de cabeza
 * en ABP. Sin minutos suficientes (menos de 90′) no se calcula.
 */
export interface DatosAereos {
  altura_cm: number | null;
  minutos?: number | null;
  aereos_90?: number | null;
  aereos_pct?: number | null;
  cabezazos_abp?: number | null;
}

export function indiceAereo(d: DatosAereos): number | null {
  if (!d.minutos || d.minutos < 90) return null;
  const altura = d.altura_cm ? Math.min(1, Math.max(0, (d.altura_cm - 168) / 24)) : 0.4;
  const volumen = Math.min(1, (d.aereos_90 ?? 0) / 5);
  const acierto = (d.aereos_pct ?? 40) / 100;
  const amenaza = Math.min(1, (d.cabezazos_abp ?? 0) / 4);
  return Math.round(100 * (0.3 * altura + 0.35 * volumen + 0.2 * acierto + 0.15 * amenaza));
}
