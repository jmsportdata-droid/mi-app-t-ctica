import { cn } from "@/lib/utils/cn";

interface AlertProps {
  tipo?: "error" | "exito";
  children: React.ReactNode;
}

export function Alert({ tipo = "error", children }: AlertProps) {
  return (
    <div
      role={tipo === "error" ? "alert" : "status"}
      className={cn(
        "rounded-lg border px-3 py-2 text-sm",
        tipo === "error"
          ? "border-red-200 bg-red-50 text-red-700"
          : "border-brand-100 bg-brand-50 text-brand-700",
      )}
    >
      {children}
    </div>
  );
}
