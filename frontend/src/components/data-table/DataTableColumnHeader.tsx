"use client";

import type { Column } from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ChevronsUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";

interface DataTableColumnHeaderProps<TData, TValue> {
  column: Column<TData, TValue>;
  title: string;
  /** Tutar gibi sağa hizalı sütunlar için. */
  alignRight?: boolean;
}

/**
 * Sütun başlığı. Sütun sıralanabiliyorsa tıklanınca artan / azalan sıralama
 * arasında geçiş yapar (sıralama backend'de uygulanır).
 */
export const DataTableColumnHeader = <TData, TValue>({
  column,
  title,
  alignRight = false,
}: DataTableColumnHeaderProps<TData, TValue>) => {
  const alignmentClass = alignRight ? "justify-end text-right" : "";

  if (!column.getCanSort()) {
    return <div className={`flex ${alignmentClass}`}>{title}</div>;
  }

  const sortDirection = column.getIsSorted();

  let SortIcon = ChevronsUpDown;
  let sortLabel = "sıralanmamış";
  if (sortDirection === "asc") {
    SortIcon = ArrowUp;
    sortLabel = "artan sırada";
  }
  if (sortDirection === "desc") {
    SortIcon = ArrowDown;
    sortLabel = "azalan sırada";
  }

  const handleClick = () => {
    // İlk tıklamada artan; sonra artan ve azalan arasında geçiş.
    column.toggleSorting(sortDirection === "asc");
  };

  return (
    <div className={`flex ${alignmentClass}`}>
      <Button
        variant="ghost"
        size="sm"
        onClick={handleClick}
        className="-mx-2 h-8 px-2 font-medium data-[sorted=true]:text-foreground"
        data-sorted={sortDirection !== false}
        aria-label={`${title}, ${sortLabel}. Sıralamayı değiştir`}
      >
        {title}
        <SortIcon
          className={sortDirection ? "text-foreground" : "text-muted-foreground/60"}
          aria-hidden="true"
        />
      </Button>
    </div>
  );
};
