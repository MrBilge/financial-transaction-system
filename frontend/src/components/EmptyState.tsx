import { Inbox } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  /** Ör. "Yeni Müşteri" butonu. */
  action?: ReactNode;
}

/** Listelenecek kayıt olmadığında gösterilen ortak durum. */
export const EmptyState = ({
  title,
  description,
  icon: Icon = Inbox,
  action,
}: EmptyStateProps) => {
  return (
    <Empty className="min-h-48 border border-dashed bg-muted/30">
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        {description && <EmptyDescription>{description}</EmptyDescription>}
      </EmptyHeader>

      {action && <EmptyContent>{action}</EmptyContent>}
    </Empty>
  );
};
