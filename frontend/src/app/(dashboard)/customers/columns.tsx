"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Eye, Pencil } from "lucide-react";
import Link from "next/link";

import { DataTableColumnHeader } from "@/components/data-table/DataTableColumnHeader";
import { DataTableRowActions } from "@/components/data-table/DataTableRowActions";
import { DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { formatDate } from "@/lib/format";
import type { Customer } from "@/types/api";

interface CustomerColumnOptions {
  onEdit: (customer: Customer) => void;
}

/** Müşteri tablosu sütunları. Sütun id'leri backend'in sortBy alanlarıyla aynıdır. */
export const createCustomerColumns = ({
  onEdit,
}: CustomerColumnOptions): ColumnDef<Customer>[] => [
  {
    accessorKey: "firstName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ad" />,
    cell: ({ row }) => (
      <Link
        href={`/customers/${row.original.id}`}
        className="font-medium hover:text-primary hover:underline"
      >
        {row.original.firstName}
      </Link>
    ),
  },
  {
    accessorKey: "lastName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Soyad" />,
  },
  {
    accessorKey: "email",
    meta: { className: "hidden sm:table-cell" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="E-posta" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{row.original.email}</span>
    ),
  },
  {
    accessorKey: "createdAt",
    meta: { className: "hidden md:table-cell" },
    header: ({ column }) => <DataTableColumnHeader column={column} title="Kayıt" />,
    cell: ({ row }) => (
      <span className="text-muted-foreground">{formatDate(row.original.createdAt)}</span>
    ),
  },
  {
    id: "actions",
    enableSorting: false,
    header: () => <span className="sr-only">İşlemler</span>,
    cell: ({ row }) => {
      const customer = row.original;

      return (
        <DataTableRowActions
          label={`${customer.firstName} ${customer.lastName} için işlemler`}
        >
          <DropdownMenuItem asChild>
            <Link href={`/customers/${customer.id}`}>
              <Eye aria-hidden="true" />
              Detayı görüntüle
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => onEdit(customer)}>
            <Pencil aria-hidden="true" />
            Düzenle
          </DropdownMenuItem>
        </DataTableRowActions>
      );
    },
  },
];
