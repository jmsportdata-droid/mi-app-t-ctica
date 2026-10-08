/**
 * Utilidades para convertir URLs pegadas por el usuario en URLs de embed seguras.
 * Solo se generan iframes hacia hosts conocidos (Vimeo y Google Slides).
 */

function parsearHttps(raw: string): URL | null {
  try {
    const url = new URL(raw.trim());
    return url.protocol === "https:" ? url : null;
  } catch {
    return null;
  }
}

export function esUrlHttps(raw: string): boolean {
  return parsearHttps(raw) !== null;
}

/**
 * Admite:
 *   https://vimeo.com/123456789
 *   https://vimeo.com/123456789/abcdef1234          (vídeo oculto con hash)
 *   https://vimeo.com/channels/x/123456789
 *   https://player.vimeo.com/video/123456789?h=abcdef1234
 */
export function vimeoEmbedUrl(raw: string): string | null {
  const url = parsearHttps(raw);
  if (!url) return null;

  const host = url.hostname.replace(/^www\./, "");
  if (host !== "vimeo.com" && host !== "player.vimeo.com") return null;

  const segmentos = url.pathname.split("/").filter(Boolean);
  let indice = -1;
  segmentos.forEach((s, i) => {
    if (/^\d+$/.test(s)) indice = i;
  });
  const id = segmentos[indice];
  if (!id) return null;

  const siguiente = segmentos[indice + 1];
  const hash =
    url.searchParams.get("h") ?? (siguiente && /^[a-f0-9]+$/i.test(siguiente) ? siguiente : null);

  const embed = new URL(`https://player.vimeo.com/video/${id}`);
  if (hash && /^[a-f0-9]+$/i.test(hash)) embed.searchParams.set("h", hash);
  embed.searchParams.set("dnt", "1");
  return embed.toString();
}

/**
 * Admite youtube.com/watch?v=, youtu.be/, /embed/, /shorts/ y /live/.
 * Se usa el dominio youtube-nocookie.com (sin cookies de seguimiento).
 */
export function youtubeEmbedUrl(raw: string): string | null {
  const url = parsearHttps(raw);
  if (!url) return null;

  const host = url.hostname.replace(/^(www|m)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") {
    id = url.pathname.slice(1).split("/")[0] ?? null;
  } else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    id =
      url.pathname === "/watch"
        ? url.searchParams.get("v")
        : (/^\/(?:embed|shorts|live)\/([^/]+)/.exec(url.pathname)?.[1] ?? null);
  }
  if (!id || !/^[\w-]{11}$/.test(id)) return null;
  return `https://www.youtube-nocookie.com/embed/${id}`;
}

/** Vídeo de partido: Vimeo o YouTube. */
export function videoEmbedUrl(raw: string): string | null {
  return vimeoEmbedUrl(raw) ?? youtubeEmbedUrl(raw);
}

/**
 * Admite:
 *   https://docs.google.com/presentation/d/<ID>/edit…
 *   https://docs.google.com/presentation/d/e/<PUB_ID>/pub…   (publicada en la web)
 */
export function slidesEmbedUrl(raw: string): string | null {
  const url = parsearHttps(raw);
  if (!url || url.hostname !== "docs.google.com") return null;

  const publicada = /^\/presentation\/d\/e\/([\w-]+)/.exec(url.pathname);
  if (publicada?.[1]) {
    return `https://docs.google.com/presentation/d/e/${publicada[1]}/embed?start=false&loop=false`;
  }

  const normal = /^\/presentation\/d\/([\w-]+)/.exec(url.pathname);
  if (normal?.[1]) {
    return `https://docs.google.com/presentation/d/${normal[1]}/embed?start=false&loop=false`;
  }
  return null;
}
