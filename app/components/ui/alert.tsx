import { type VariantProps, cva } from "class-variance-authority";
import { AlertCircle, AlertTriangle, CheckCircle, Info } from "lucide-react";

const alertVariants = cva("rounded-lg border px-3 py-2", {
  variants: {
    variant: {
      success: "border-emerald-500/20 bg-emerald-500/5 text-emerald-600",
      error: "border-red-500/20 bg-red-500/5 text-red-600",
      warning: "border-amber-500/20 bg-amber-500/5 text-amber-600",
      info: "border-blue-500/20 bg-blue-500/5 text-blue-600",
    },
  },
  defaultVariants: {
    variant: "info",
  },
});

interface AlertProps extends VariantProps<typeof alertVariants> {
  children: React.ReactNode;
}

const Alert = ({ variant = "info", children }: AlertProps) => {
  const Icon = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  }[variant ?? "info"];

  return (
    <div className={alertVariants({ variant })}>
      <Icon className="-mt-0.5 me-2 inline-flex h-4 w-4 opacity-60" />
      {children}
    </div>
  );
};

export { Alert, alertVariants };
