import { AlertCircle, CheckCircle } from "lucide-react";
import { cn } from "~/lib/utils";

interface AlertProps {
  variant?: "success" | "error";
  children: React.ReactNode;
}

export function Alert({ variant = "success", children }: AlertProps) {
  const Icon = variant === "success" ? CheckCircle : AlertCircle;

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md p-2",
        variant === "success" && "bg-green-500/10 text-green-600",
        variant === "error" && "bg-red-500/10 text-red-600",
      )}
    >
      <Icon className="h-4 w-4" />
      {children}
    </div>
  );
}
