"use client";

import { useState } from "react";
import { slidesEmbedUrl, videoEmbedUrl, vimeoEmbedUrl } from "@/lib/embeds";

function Marco({
  children,
  proporcion = "aspect-video",
}: {
  children: React.ReactNode;
  proporcion?: string;
}) {
  return (
    <div
      className={`${proporcion} w-full overflow-hidden rounded-lg border border-slate-200 bg-slate-100`}
    >
      {children}
    </div>
  );
}

export function VimeoEmbed({ url, titulo }: { url: string | null; titulo: string }) {
  const src = url ? vimeoEmbedUrl(url) : null;
  if (!src) return null;
  return (
    <Marco>
      <iframe
        src={src}
        title={titulo}
        className="h-full w-full"
        loading="lazy"
        allow="autoplay; fullscreen; picture-in-picture"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </Marco>
  );
}

/** Vídeo del partido: Vimeo o YouTube. */
export function VideoEmbed({ url, titulo }: { url: string | null; titulo: string }) {
  const src = url ? videoEmbedUrl(url) : null;
  if (!src) return null;
  return (
    <Marco>
      <iframe
        src={src}
        title={titulo}
        className="h-full w-full"
        loading="lazy"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
        allowFullScreen
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </Marco>
  );
}

export function SlidesEmbed({ url, titulo }: { url: string | null; titulo: string }) {
  const src = url ? slidesEmbedUrl(url) : null;
  if (!src) return null;
  return (
    <Marco>
      <iframe src={src} title={titulo} className="h-full w-full" loading="lazy" allowFullScreen />
    </Marco>
  );
}

export function ImagenPreview({ url, alt }: { url: string | null; alt: string }) {
  const [fallo, setFallo] = useState<string | null>(null);
  if (!url) return null;

  if (fallo === url) {
    return (
      <p className="rounded-lg border border-dashed border-slate-300 p-3 text-xs text-slate-500">
        No se pudo cargar la imagen. Comprueba que la URL es pública y apunta a una imagen.
      </p>
    );
  }
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="block">
      {/* URL externa arbitraria: next/image requeriría registrar cada dominio */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt={alt}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setFallo(url)}
        className="max-h-64 w-full rounded-lg border border-slate-200 bg-slate-50 object-contain"
      />
    </a>
  );
}

export function PdfEnlace({ url }: { url: string | null }) {
  if (!url) return null;
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-brand-500 hover:text-brand-700"
    >
      <svg
        viewBox="0 0 24 24"
        className="h-4 w-4 text-red-500"
        fill="none"
        stroke="currentColor"
        strokeWidth={2}
        aria-hidden
      >
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
      </svg>
      Abrir PDF
    </a>
  );
}
