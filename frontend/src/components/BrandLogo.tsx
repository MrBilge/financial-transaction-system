import { Landmark } from "lucide-react";

interface BrandLogoProps {
  /** Koyu zemin üzerinde kullanılıyorsa true. */
  inverted?: boolean;
}

/** Uygulama logosu ve adı. */
export const BrandLogo = ({ inverted = false }: BrandLogoProps) => {
  const titleColor = inverted ? "text-white" : "text-foreground";
  const subtitleColor = inverted ? "text-slate-400" : "text-muted-foreground";
  const iconBoxColor = inverted
    ? "bg-white/10 text-white ring-1 ring-white/15"
    : "bg-primary text-primary-foreground shadow-sm";

  return (
    <div className="flex items-center gap-3">
      <div className={`flex size-9 items-center justify-center rounded-lg ${iconBoxColor}`}>
        <Landmark className="size-5" aria-hidden="true" />
      </div>
      <div className="leading-tight">
        <p className={`text-sm font-semibold ${titleColor}`}>Finans Paneli</p>
        <p className={`text-xs ${subtitleColor}`}>Yönetim Konsolu</p>
      </div>
    </div>
  );
};
