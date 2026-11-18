import { AlertTriangle, RotateCw } from "lucide-react";

import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  message: string;
  /** Verilirse "Tekrar Dene" butonu gösterilir. */
  onRetry?: () => void;
}

/** Veri yüklenemediğinde gösterilen ortak durum. */
export const ErrorState = ({
  title = "Veriler yüklenemedi",
  message,
  onRetry,
}: ErrorStateProps) => {
  return (
    <div
      role="alert"
      className="flex min-h-48 flex-col items-center justify-center gap-4 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center"
    >
      <div className="flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
        <AlertTriangle className="size-5" aria-hidden="true" />
      </div>

      <div className="space-y-1">
        <p className="font-medium text-foreground">{title}</p>
        <p className="max-w-md text-sm text-muted-foreground">{message}</p>
      </div>

      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          Tekrar Dene
        </Button>
      )}
    </div>
  );
};
