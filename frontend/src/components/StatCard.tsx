import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  description?: string;
  icon: LucideIcon;
  /** Değer rengi; ör. negatif net akış için kırmızı. */
  valueClassName?: string;
}

/** Kompakt özet istatistik kutusu (Genel Bakış, Raporlar, Hesap Detayı). */
export const StatCard = ({
  title,
  value,
  description,
  icon: Icon,
  valueClassName = "text-foreground",
}: StatCardProps) => {
  return (
    <div className="rounded-lg border bg-card px-4 py-3">
      <div className="flex items-center justify-between gap-2 text-muted-foreground">
        <p className="text-xs font-medium">{title}</p>
        <Icon className="size-4" aria-hidden="true" />
      </div>
      <p
        className={`mt-1 truncate text-xl font-semibold tracking-tight tabular-nums ${valueClassName}`}
      >
        {value}
      </p>
      {description && (
        <p className="truncate text-xs text-muted-foreground">{description}</p>
      )}
    </div>
  );
};
