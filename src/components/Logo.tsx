export function Logo() {
  return (
    <div className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600 text-white shadow-sm">
        <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
          <path d="M12 7l3.5 2.5-1.3 4h-4.4l-1.3-4L12 7z" fill="currentColor" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="block text-base font-bold tracking-tight text-slate-900">
          Gestión Total
        </span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
          Cuerpo técnico
        </span>
      </span>
    </div>
  );
}
