"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ChartColumn } from "lucide-react";

import { DataTable } from "@/components/data-table/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { formatMoney } from "@/lib/format";
import { transactionTypeLabels } from "@/lib/labels";
import type { TransactionStatsReport, TransactionType } from "@/types/api";

const TRANSACTION_TYPES: TransactionType[] = ["DEPOSIT", "WITHDRAWAL", "TRANSFER"];

interface StatsRow {
  label: string;
  total: number;
  success: number;
  failed: number;
  pending: number;
  /** "Tüm işlemler" satırında tutar gösterilmez (türler birbirine eklenmez). */
  successAmount: string | null;
  averageSuccessAmount: string | null;
}

const numberCell = (value: number, colorClass = "") => (
  <div className={`text-right tabular-nums ${colorClass}`}>{value}</div>
);

const moneyCell = (value: string | null) => (
  <div className="text-right font-medium tabular-nums">
    {value === null ? "—" : formatMoney(value)}
  </div>
);

const rightHeader = (title: string) => <div className="text-right">{title}</div>;

const columns: ColumnDef<StatsRow>[] = [
  {
    accessorKey: "label",
    header: "İşlem Türü",
    cell: ({ row }) => <span className="font-medium">{row.original.label}</span>,
  },
  {
    accessorKey: "total",
    header: () => rightHeader("Toplam"),
    cell: ({ row }) => numberCell(row.original.total),
  },
  {
    accessorKey: "success",
    header: () => rightHeader("Başarılı"),
    cell: ({ row }) => numberCell(row.original.success, "text-emerald-700"),
  },
  {
    accessorKey: "failed",
    header: () => rightHeader("Başarısız"),
    cell: ({ row }) => numberCell(row.original.failed, "text-red-700"),
  },
  {
    accessorKey: "pending",
    meta: { className: "hidden sm:table-cell" },
    header: () => rightHeader("Beklemede"),
    cell: ({ row }) => numberCell(row.original.pending, "text-amber-700"),
  },
  {
    accessorKey: "successAmount",
    header: () => rightHeader("Başarılı Tutar"),
    cell: ({ row }) => moneyCell(row.original.successAmount),
  },
  {
    accessorKey: "averageSuccessAmount",
    meta: { className: "hidden md:table-cell" },
    header: () => rightHeader("Ortalama"),
    cell: ({ row }) => moneyCell(row.original.averageSuccessAmount),
  },
];

interface TransactionStatsTableProps {
  stats: TransactionStatsReport;
}

/** İşlem türüne göre durum sayıları ve başarılı işlem tutarları. */
export const TransactionStatsTable = ({ stats }: TransactionStatsTableProps) => {
  const typeRows: StatsRow[] = TRANSACTION_TYPES.map((type) => ({
    label: transactionTypeLabels[type],
    ...stats.byType[type],
  }));

  const totalRow: StatsRow = {
    label: "Tüm işlemler",
    ...stats.byStatus,
    successAmount: null,
    averageSuccessAmount: null,
  };

  return (
    <DataTable
      columns={columns}
      data={[...typeRows, totalRow]}
      toolbar={<span className="px-1 text-sm font-medium">İşlem İstatistikleri</span>}
      emptyState={<EmptyState icon={ChartColumn} title="Bu dönemde işlem yok" />}
    />
  );
};
