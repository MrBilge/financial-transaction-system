"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Power, User } from "lucide-react";
import Link from "next/link";

import { DataTableColumnHeader } from "@/components/data-table/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/data-table/DataTableRowActions";
import { AccountStatusBadge } from "@/components/StatusBadges";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { formatAccountNumber, formatDate, formatMoney } from "@/lib/format";
import type { Account } from "@/types/api";

interface AccountColumnOptions {
  onToggleStatus: (account: Account) => void;
  /**
   * Hesap sahibi sütunu ve müşteri bağlantısı gösterilsin mi?
   * Müşteri detay sayfasında hesap sahibi zaten bellidir.
   */
  showCustomer?: boolean;
}

/**
 * Hesap tablosu sütunları (Hesaplar ve Müşteri Detayı sayfaları).
 * Sıralanabilir sütunların id'leri backend'in sortBy alanlarıyla aynıdır.
 */
export const createAccountColumns = ({
  onToggleStatus,
  showCustomer = true,
}: AccountColumnOptions): ColumnDef<Account>[] => {
  const accountNumberColumn: ColumnDef<Account> = {
    accessorKey: "accountNumber",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Hesap No" />,
    cell: ({ row }) => (
      <Link
        href={`/accounts/${row.original.id}`}
        className="font-mono text-sm font-medium hover:text-primary hover:underline"
      >
        {formatAccountNumber(row.original.accountNumber)}
      </Link>
    ),
  };

  // Backend müşteri adına göre sıralamayı desteklemediği için bu sütun sıralanamaz.
  const ownerColumn: ColumnDef<Account> = {
    id: "customer",
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Hesap Sahibi" />,
    cell: ({ row }) => (
      <Link
        href={`/customers/${row.original.customerId}`}
        className="hover:text-primary hover:underline"
      >
        {row.original.customer.firstName} {row.original.customer.lastName}
      </Link>
    ),
  };

  const balanceColumn: ColumnDef<Account> = {
    accessorKey: "balance",
    header: ({ column }) => (
      <DataTableColumnHeader column={column} title="Bakiye" alignRight />
    ),
    cell: ({ row }) => (
      <div className="text-right font-medium tabular-nums">
        {formatMoney(row.original.balance)}
      </div>
    ),
  };

  const statusColumn: ColumnDef<Account> = {
    accessorKey: "status",
    enableSorting: false,
    header: ({ column }) => <DataTableColumnHeader column={column} title="Durum" />,
    cell: ({ row }) => <AccountStatusBadge status={row.original.status} />,
  };

  const createdAtColumn: ColumnDef<Account> = {
    accessorKey: "createdAt",
    meta: { className: "hidden md:table-cell" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Açılış" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
    ),
  };

  const actionsColumn: ColumnDef<Account> = {
    id: "actions",
    enableSorting: false,
    header: () => <span className="sr-only">İşlemler</span>,
    cell: ({ row }) => {
      const account = row.original;
      const isActive = account.status === "ACTIVE";

      return (
        <DataTableRowActions
          label={`${formatAccountNumber(account.accountNumber)} hesabı için işlemler`}
        >
          <DropdownMenuItem asChild>
            <Link href={`/accounts/${account.id}`}>
              <Eye aria-hidden="true" />
              Detayı görüntüle
            </Link>
          </DropdownMenuItem>
          {showCustomer && (
            <DropdownMenuItem asChild>
              <Link href={`/customers/${account.customerId}`}>
                <User aria-hidden="true" />
                Müşteriyi görüntüle
              </Link>
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            variant={isActive ? "destructive" : "default"}
            onSelect={() => onToggleStatus(account)}
          >
            <Power aria-hidden="true" />
            {isActive ? "Pasif yap" : "Aktif yap"}
          </DropdownMenuItem>
        </DataTableRowActions>
      );
    },
  };

  const columns: ColumnDef<Account>[] = [accountNumberColumn];
  if (showCustomer) {
    columns.push(ownerColumn);
  }
  columns.push(balanceColumn, statusColumn, createdAtColumn, actionsColumn);

  return columns;
};
