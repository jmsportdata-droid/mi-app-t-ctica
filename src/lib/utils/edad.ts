/**
 * Calcula la edad a partir de una fecha "YYYY-MM-DD".
 * Se parsean los componentes a mano para evitar desfases por zona horaria.
 */
export function calcularEdad(fechaNac: string | null, hoy: Date = new Date()): number | null {
  if (!fechaNac) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(fechaNac);
  if (!match) return null;

  const anio = Number(match[1]);
  const mes = Number(match[2]);
  const dia = Number(match[3]);

  let edad = hoy.getFullYear() - anio;
  const mesActual = hoy.getMonth() + 1;
  if (mesActual < mes || (mesActual === mes && hoy.getDate() < dia)) {
    edad -= 1;
  }
  return edad;
}

/** "2026-03-16" → "16/03/2026"; null → "—". */
export function formatearFecha(fecha: string | null): string {
  if (!fecha) return "—";
  const [anio, mes, dia] = fecha.split("-");
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : fecha;
}
