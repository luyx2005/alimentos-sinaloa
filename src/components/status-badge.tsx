import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, type CaptureStatus } from "@/lib/calc";
import { cn } from "@/lib/utils";

const STYLES: Record<CaptureStatus, string> = {
  completo:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
  incompleto:
    "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300",
  sin_captura:
    "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950 dark:text-rose-300",
};

export function StatusBadge({
  status,
  className,
}: {
  status: CaptureStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn(STYLES[status], className)}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}
