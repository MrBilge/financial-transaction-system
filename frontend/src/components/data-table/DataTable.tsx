"use client";

import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type OnChangeFn,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";
import type { ReactNode } from "react";

import { DataTablePagination } from "@/components/data-table/DataTablePagination";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PaginationMeta } from "@/types/api";

// Sütun tanımlarına `meta: { className }` eklenebilmesi için (ör. küçük ekranda
// sütunu gizlemek: "hidden md:table-cell"). Sınıf hem başlığa hem hücreye uygulanır.
declare module "@tanstack/react-table" {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}

interface DataTablePaginationOptions {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
}

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** Tablonun üstündeki arama ve filtre alanları. */
  toolbar?: ReactNode;
  /** Sıralama backend'de yapılır; tablo yalnızca seçili sıralamayı gösterir ve değişikliği bildirir. */
  sorting?: SortingState;
  onSortingChange?: OnChangeFn<SortingState>;
  /** Sayfalama backend'de yapılır; verilmezse sayfalama alanı gösterilmez. */
  pagination?: DataTablePaginationOptions;
  isLoading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  /** Kayıt yoksa gösterilecek içerik (EmptyState). */
  emptyState: ReactNode;
}

/**
 * Ortak veri tablosu (shadcn Data Table + TanStack Table).
 * Filtreleme, sıralama ve sayfalama backend üzerinden yapılır (manual mod);
 * tablo yalnızca gelen sayfadaki satırları gösterir.
 */
export const DataTable = <TData, TValue>({
  columns,
  data,
  toolbar,
  sorting = [],
  onSortingChange,
  pagination,
  isLoading = false,
  errorMessage = null,
  onRetry,
  emptyState,
}: DataTableProps<TData, TValue>) => {
  // eslint-disable-next-line react-hooks/incompatible-library -- TanStack Table'ın beklenen kullanımı
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    // Sıralama değişikliğini dinleyen yoksa (ör. özet tablolar) başlıklar sıralanamaz.
    enableSorting: onSortingChange !== undefined,
    enableMultiSort: false,
    // Sıralama yalnızca artan / azalan arasında değişir; "sıralamasız" duruma dönmez.
    enableSortingRemoval: false,
    state: { sorting },
    onSortingChange,
  });

  const columnCount = columns.length;
  const rows = table.getRowModel().rows;

  const renderBody = () => {
    if (isLoading) {
      return (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={columnCount}>
            <LoadingState />
          </TableCell>
        </TableRow>
      );
    }

    if (errorMessage) {
      return (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={columnCount} className="p-4 whitespace-normal">
            <ErrorState message={errorMessage} onRetry={onRetry} />
          </TableCell>
        </TableRow>
      );
    }

    if (rows.length === 0) {
      return (
        <TableRow className="hover:bg-transparent">
          <TableCell colSpan={columnCount} className="p-4 whitespace-normal">
            {emptyState}
          </TableCell>
        </TableRow>
      );
    }

    return rows.map((row) => (
      <TableRow key={row.id}>
        {row.getVisibleCells().map((cell) => (
          <TableCell key={cell.id} className={cell.column.columnDef.meta?.className}>
            {flexRender(cell.column.columnDef.cell, cell.getContext())}
          </TableCell>
        ))}
      </TableRow>
    ));
  };

  const showPagination = pagination && !isLoading && !errorMessage && rows.length > 0;

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      {toolbar && (
        <div className="flex flex-col gap-2 border-b p-2 sm:flex-row sm:items-center">
          {toolbar}
        </div>
      )}

      <div className="overflow-x-auto">
        <Table>
          <TableHeader className="bg-muted/40">
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className={header.column.columnDef.meta?.className}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>{renderBody()}</TableBody>
        </Table>
      </div>

      {showPagination && (
        <DataTablePagination
          meta={pagination.meta}
          onPageChange={pagination.onPageChange}
          onPageSizeChange={pagination.onPageSizeChange}
        />
      )}
    </div>
  );
};
