// Sin caracteres que se confunden al dictarlos o copiarlos (0/O, 1/l/I)
const ALFABETO = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Contraseña aleatoria legible, en grupos de 4: "aB3k-9xQm-Tz7p". */
export function generarPassword(grupos = 3): string {
  const valores = crypto.getRandomValues(new Uint32Array(grupos * 4));
  const caracteres = Array.from(valores, (v) => ALFABETO[v % ALFABETO.length]);
  return Array.from({ length: grupos }, (_, i) => caracteres.slice(i * 4, i * 4 + 4).join("")).join(
    "-",
  );
}
