/**
 * Exporta un SVG a PNG en el navegador. Las imágenes (fotos y escudos) se
 * incrustan antes de dibujar, y los elementos marcados con data-ui (manijas
 * del editor) no salen en el archivo.
 */
export async function descargarSVGComoPNG(
  svg: SVGSVGElement,
  nombreArchivo: string,
  ancho = 1920,
): Promise<void> {
  const clon = svg.cloneNode(true) as SVGSVGElement;
  clon.querySelectorAll("[data-ui]").forEach((n) => n.remove());
  clon.setAttribute("xmlns", "http://www.w3.org/2000/svg");

  await Promise.all(
    Array.from(clon.querySelectorAll("image")).map(async (img) => {
      const href = img.getAttribute("href");
      if (!href || href.startsWith("data:")) return;
      try {
        const respuesta = await fetch(href);
        const blob = await respuesta.blob();
        const data = await new Promise<string>((resolver, rechazar) => {
          const lector = new FileReader();
          lector.onload = () => resolver(String(lector.result));
          lector.onerror = rechazar;
          lector.readAsDataURL(blob);
        });
        img.setAttribute("href", data);
      } catch {
        img.remove();
      }
    }),
  );

  const caja = svg.viewBox.baseVal;
  const alto = Math.round((ancho * caja.height) / caja.width);
  clon.setAttribute("width", String(ancho));
  clon.setAttribute("height", String(alto));
  const xml = new XMLSerializer().serializeToString(clon);

  const imagen = new Image();
  await new Promise<void>((resolver, rechazar) => {
    imagen.onload = () => resolver();
    imagen.onerror = () => rechazar(new Error("No se pudo dibujar la imagen"));
    imagen.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  });

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("El navegador no permite exportar imágenes");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, ancho, alto);
  ctx.drawImage(imagen, 0, 0, ancho, alto);

  const blob = await new Promise<Blob | null>((resolver) => canvas.toBlob(resolver, "image/png"));
  if (!blob) throw new Error("No se pudo generar el PNG");
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo.endsWith(".png") ? nombreArchivo : `${nombreArchivo}.png`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/** "Balón al segundo palo" → "balon-al-segundo-palo" */
export function nombreArchivo(texto: string): string {
  return (
    texto
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60) || "jugada"
  );
}
