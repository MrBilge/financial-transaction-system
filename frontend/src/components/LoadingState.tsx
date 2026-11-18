import { Spinner } from "@/components/ui/spinner";

interface LoadingStateProps {
  message?: string;
}

/** Veri yüklenirken gösterilen ortak durum. */
export const LoadingState = ({ message = "Yükleniyor..." }: LoadingStateProps) => {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-48 flex-col items-center justify-center gap-3 text-muted-foreground"
    >
      <Spinner className="size-6 text-primary" aria-hidden="true" />
      <p className="text-sm">{message}</p>
    </div>
  );
};
