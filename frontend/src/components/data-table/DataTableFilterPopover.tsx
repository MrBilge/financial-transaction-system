"use client";

import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";
import type { FormEvent, ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface DataTableFilterPopoverProps {
  /** Uygulanmış filtre sayısı; butonda rozet olarak gösterilir. */
  activeFilterCount: number;
  /** Popover açılırken çağrılır; form alanlarını uygulanmış değerlere döndürmek için. */
  onOpen: () => void;
  /** Filtreleri uygular. Doğrulama hatası varsa false döndürür ve popover açık kalır. */
  onApply: () => boolean;
  onReset: () => void;
  /** Filtre alanları. */
  children: ReactNode;
}

/** Gelişmiş filtreler için toolbar butonu ve açılır panel. */
export const DataTableFilterPopover = ({
  activeFilterCount,
  onOpen,
  onApply,
  onReset,
  children,
}: DataTableFilterPopoverProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenChange = (nextIsOpen: boolean) => {
    if (nextIsOpen) {
      onOpen();
    }
    setIsOpen(nextIsOpen);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const isApplied = onApply();
    if (isApplied) {
      setIsOpen(false);
    }
  };

  const handleReset = () => {
    onReset();
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          <SlidersHorizontal aria-hidden="true" />
          Filtreler
          {activeFilterCount > 0 && (
            <Badge className="ml-1 h-5 min-w-5 rounded-full px-1.5 tabular-nums">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="start" className="w-[min(22rem,calc(100vw-2rem))] p-0">
        <form onSubmit={handleSubmit} noValidate>
          <div className="space-y-3 p-3">{children}</div>
          <div className="flex justify-between gap-2 border-t p-2">
            <Button type="button" variant="ghost" size="sm" onClick={handleReset}>
              Temizle
            </Button>
            <Button type="submit" size="sm">
              Uygula
            </Button>
          </div>
        </form>
      </PopoverContent>
    </Popover>
  );
};
