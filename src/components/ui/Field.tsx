import { forwardRef, useId, type InputHTMLAttributes, type SelectHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

const CONTROL =
  "block w-full rounded-lg border bg-white px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2";

export function claseControl(error?: string) {
  return cn(
    CONTROL,
    error
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "border-slate-300 focus:border-brand-500 focus:ring-brand-100",
  );
}

interface CampoBase {
  label: string;
  error?: string;
  ayuda?: string;
}

function Envoltorio({
  id,
  label,
  error,
  ayuda,
  children,
}: CampoBase & { id: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-red-600">
          {error}
        </p>
      ) : ayuda ? (
        <p className="text-xs text-slate-500">{ayuda}</p>
      ) : null}
    </div>
  );
}

export type InputProps = CampoBase & InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, ayuda, id, className, ...props },
  ref,
) {
  const autoId = useId();
  const campoId = id ?? autoId;
  return (
    <Envoltorio id={campoId} label={label} error={error} ayuda={ayuda}>
      <input
        ref={ref}
        id={campoId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${campoId}-error` : undefined}
        className={cn(claseControl(error), className)}
        {...props}
      />
    </Envoltorio>
  );
});

export type SelectProps = CampoBase & SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, ayuda, id, className, children, ...props },
  ref,
) {
  const autoId = useId();
  const campoId = id ?? autoId;
  return (
    <Envoltorio id={campoId} label={label} error={error} ayuda={ayuda}>
      <select
        ref={ref}
        id={campoId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${campoId}-error` : undefined}
        className={cn(claseControl(error), className)}
        {...props}
      >
        {children}
      </select>
    </Envoltorio>
  );
});
