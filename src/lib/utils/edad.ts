/**
 * Calcula la edad a partir de una fecha "YYYY-MM-DD".
 * Se parsean los componentes a mano para evitar desfases por zona horaria.
 */
export function calcularEdad(fechaNac: string, hoy: Date = new Date()): number | null {
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

export function formatearFecha(fechaNac: string): string {
  const [anio, mes, dia] = fechaNac.split("-");
  return anio && mes && dia ? `${dia}/${mes}/${anio}` : fechaNac;
}
