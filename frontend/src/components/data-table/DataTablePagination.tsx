"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PaginationMeta } from "@/types/api";

const PAGE_SIZE_OPTIONS = [10, 20, 50];

interface DataTablePaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  /** Verilirse "sayfa başına kayıt" seçimi gösterilir. */
  onPageSizeChange?: (pageSize: number) => void;
}

/** Tablonun alt kısmındaki sayfalama: kayıt sayısı, sayfa boyutu, önceki / sonraki. */
export const DataTablePagination = ({
  meta,
  onPageChange,
  onPageSizeChange,
}: DataTablePaginationProps) => {
  const totalPages = Math.max(meta.totalPages, 1);
  const isFirstPage = meta.page <= 1;
  const isLastPage = meta.page >= totalPages;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t px-3 py-2 text-sm text-muted-foreground">
      <p>{meta.total} kayıt</p>

      <div className="flex items-center gap-3">
        {onPageSizeChange && (
          <div className="flex items-center gap-2">
            <span className="hidden sm:inline">Sayfa başına</span>
            <Select
              value={String(meta.limit)}
              onValueChange={(value) => onPageSizeChange(Number(value))}
            >
              <SelectTrigger size="sm" className="w-18" aria-label="Sayfa başına kayıt">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAGE_SIZE_OPTIONS.map((pageSize) => (
                  <SelectItem key={pageSize} value={String(pageSize)}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <span className="tabular-nums">
          {meta.page} / {totalPages}
        </span>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(meta.page - 1)}
            disabled={isFirstPage}
            aria-label="Önceki sayfa"
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-sm"
            onClick={() => onPageChange(meta.page + 1)}
            disabled={isLastPage}
            aria-label="Sonraki sayfa"
          >
            <ChevronRight aria-hidden="true" />
          </Button>
        </div>
      </div>
    </div>
  );
};
