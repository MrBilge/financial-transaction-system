"use client";

import { MoreHorizontal } from "lucide-react";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface DataTableRowActionsProps {
  /** Ekran okuyucular için, ör. "Ayşe Yılmaz için işlemler". */
  label: string;
  /** DropdownMenuItem öğeleri. */
  children: ReactNode;
}

/** Satır sonundaki "..." menüsü (detay, düzenleme vb.). */
export const DataTableRowActions = ({ label, children }: DataTableRowActionsProps) => {
  return (
    <div className="flex justify-end">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={label}>
            <MoreHorizontal aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {children}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
