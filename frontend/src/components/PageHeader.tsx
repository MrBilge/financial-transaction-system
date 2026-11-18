import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  /** Kısa bir alt bilgi (ör. kayıt tarihi). Liste sayfalarında genellikle gerekmez. */
  description?: string;
  /** Sağ tarafta gösterilecek butonlar. */
  actions?: ReactNode;
}

/** Sayfa başlığı ve ana işlem butonları. */
export const PageHeader = ({ title, description, actions }: PageHeaderProps) => {
  return (
    <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>

      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
};
