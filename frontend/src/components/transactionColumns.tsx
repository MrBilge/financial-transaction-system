"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { ArrowDownLeft, ArrowUpRight, Eye } from "lucide-react";
import Link from "next/link";

import { DataTableColumnHeader } from "@/components/data-table/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/data-table/DataTableRowActions";
import {
  TransactionStatusBadge,
  TransactionTypeBadge,
} from "@/components/StatusBadges";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatAccountNumber, formatDateTime, formatMoney } from "@/lib/format";
import type { Transaction } from "@/types/api";

/** Hesap numarası hücresi; para yatırmada kaynak, para çekmede hedef hesap yoktur. */
const AccountNumberCell = ({ accountNumber }: { accountNumber: string | null }) => {
  if (!accountNumber) {
    return <span className="text-muted-foreground">—</span>;
  }
  return (
    <span className="font-mono text-xs whitespace-nowrap">
      {formatAccountNumber(accountNumber)}
    </span>
  );
};

interface TransactionColumnOptions {
  onViewDetails: (transaction: Transaction) => void;
  /**
   * Hesap detay sayfasında verilir: tutarlar bu hesaba göre gelen (+) veya
   * giden (-) olarak gösterilir ve bu hesaba giden bağlantı menüden çıkarılır.
   */
  accountId?: string;
}

/**
 * İşlem tablosu sütunları (İşlemler, Hesap Detayı ve Genel Bakış).
 * Hesap ID'leri (UUID) gösterilmez; hesap numaraları backend yanıtından gelir,
 * hesap detayına satır menüsünden gidilir.
 */
export const createTransactionColumns = ({
  onViewDetails,
  accountId,
}: TransactionColumnOptions): ColumnDef<Transaction>[] => {
  const getAmountText = (transaction: Transaction): string => {
    const amount = formatMoney(transaction.amount);
    if (!accountId) {
      return amount;
    }
    return transaction.targetAccountId === accountId ? `+${amount}` : `-${amount}`;
  };

  const getAmountColor = (transaction: Transaction): string => {
    if (!accountId || transaction.status !== "SUCCESS") {
      return "text-foreground";
    }
    return transaction.targetAccountId === accountId
      ? "text-emerald-700"
      : "text-red-700";
  };

  return [
    {
      accessorKey: "transactionNumber",
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="İşlem No" />,
      cell: ({ row }) => (
        <span className="font-mono text-xs">{row.original.transactionNumber}</span>
      ),
    },
    {
      accessorKey: "type",
      enableSorting: false,
      meta: { className: "hidden sm:table-cell" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tür" />,
      cell: ({ row }) => <TransactionTypeBadge type={row.original.type} />,
    },
    {
      accessorKey: "amount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Tutar" alignRight />
      ),
      cell: ({ row }) => (
        <div
          className={`text-right font-medium tabular-nums ${getAmountColor(row.original)}`}
        >
          {getAmountText(row.original)}
        </div>
      ),
    },
    {
      accessorKey: "status",
      enableSorting: false,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Durum" />,
      cell: ({ row }) => (
        <div className="space-y-0.5">
          <TransactionStatusBadge status={row.original.status} />
          {row.original.failureReason && (
            <p className="text-xs text-destructive">{row.original.failureReason}</p>
          )}
        </div>
      ),
    },
    {
      accessorKey: "sourceAccountNumber",
      enableSorting: false,
      meta: { className: "hidden lg:table-cell" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Kaynak" />,
      cell: ({ row }) => (
        <AccountNumberCell accountNumber={row.original.sourceAccountNumber} />
      ),
    },
    {
      accessorKey: "targetAccountNumber",
      enableSorting: false,
      meta: { className: "hidden lg:table-cell" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Hedef" />,
      cell: ({ row }) => (
        <AccountNumberCell accountNumber={row.original.targetAccountNumber} />
      ),
    },
    {
      accessorKey: "createdAt",
      meta: { className: "hidden md:table-cell" },
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tarih" />,
      cell: ({ row }) => (
        <span className="whitespace-nowrap text-muted-foreground">
          {formatDateTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      enableSorting: false,
      header: () => <span className="sr-only">İşlemler</span>,
      cell: ({ row }) => {
        const transaction = row.original;
        const showSourceLink =
          transaction.sourceAccountId !== null &&
          transaction.sourceAccountId !== accountId;
        const showTargetLink =
          transaction.targetAccountId !== null &&
          transaction.targetAccountId !== accountId;

        return (
          <DataTableRowActions label={`${transaction.transactionNumber} için işlemler`}>
            <DropdownMenuItem onSelect={() => onViewDetails(transaction)}>
              <Eye aria-hidden="true" />
              Detayları görüntüle
            </DropdownMenuItem>
            {(showSourceLink || showTargetLink) && <DropdownMenuSeparator />}
            {showSourceLink && (
              <DropdownMenuItem asChild>
                <Link href={`/accounts/${transaction.sourceAccountId}`}>
                  <ArrowUpRight aria-hidden="true" />
                  Kaynak hesaba git
                </Link>
              </DropdownMenuItem>
            )}
            {showTargetLink && (
              <DropdownMenuItem asChild>
                <Link href={`/accounts/${transaction.targetAccountId}`}>
                  <ArrowDownLeft aria-hidden="true" />
                  Hedef hesaba git
                </Link>
              </DropdownMenuItem>
            )}
          </DataTableRowActions>
        );
      },
    },
  ];
};
