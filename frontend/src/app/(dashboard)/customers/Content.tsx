"use client";

import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { Plus, Search, Users } from "lucide-react";
import { useEffect, useState } from "react";

import { getErrorMessage } from "@/api/client";
import { getCustomers } from "@/api/customers";
import { DataTable } from "@/components/data-table/DataTable";
import { DataTableSearch } from "@/components/data-table/DataTableSearch";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import type { Customer, CustomerListQuery, PaginationMeta } from "@/types/api";

import { createCustomerColumns } from "./columns";
import { CustomerFormDialog } from "./CustomerFormDialog";

const DEFAULT_PAGE_SIZE = 10;

export const Content = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [reloadCount, setReloadCount] = useState(0);

  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  const columns = createCustomerColumns({ onEdit: setEditingCustomer });

  const handleSearch = (value: string) => {
    setSearch(value);
    setPage(1);
  };

  const handleSortingChange: OnChangeFn<SortingState> = (updater) => {
    setSorting(updater);
    setPage(1);
  };

  const handlePageSizeChange = (newPageSize: number) => {
    setPageSize(newPageSize);
    setPage(1);
  };

  const reloadCustomers = () => {
    setReloadCount((count) => count + 1);
  };

  useEffect(() => {
    let isCancelled = false;

    const loadCustomers = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const [activeSort] = sorting;
      const query: CustomerListQuery = {
        page,
        limit: pageSize,
        search: search || undefined,
        sortBy: activeSort?.id as CustomerListQuery["sortBy"],
        sortOrder: activeSort?.desc ? "desc" : "asc",
      };

      try {
        const response = await getCustomers(query);
        if (!isCancelled) {
          setCustomers(response.data);
          setMeta(response.meta);
        }
      } catch (error) {
        if (!isCancelled) {
          setErrorMessage(getErrorMessage(error));
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false);
        }
      }
    };

    loadCustomers();

    return () => {
      isCancelled = true;
    };
  }, [page, pageSize, search, sorting, reloadCount]);

  const emptyState = search ? (
    <EmptyState
      icon={Search}
      title="Eşleşen müşteri bulunamadı"
      description={`"${search}" araması için sonuç yok.`}
    />
  ) : (
    <EmptyState
      icon={Users}
      title="Henüz müşteri yok"
      action={
        <Button size="sm" onClick={() => setIsCreateDialogOpen(true)}>
          <Plus aria-hidden="true" />
          Yeni Müşteri
        </Button>
      }
    />
  );

  return (
    <>
      <PageHeader
        title="Müşteriler"
        actions={
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus aria-hidden="true" />
            Yeni Müşteri
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={customers}
        toolbar={
          <DataTableSearch
            value={search}
            onSearch={handleSearch}
            placeholder="Ad, soyad veya e-posta ara"
          />
        }
        sorting={sorting}
        onSortingChange={handleSortingChange}
        pagination={
          meta
            ? { meta, onPageChange: setPage, onPageSizeChange: handlePageSizeChange }
            : undefined
        }
        isLoading={isLoading}
        errorMessage={errorMessage}
        onRetry={reloadCustomers}
        emptyState={emptyState}
      />

      {isCreateDialogOpen && (
        <CustomerFormDialog
          onClose={() => setIsCreateDialogOpen(false)}
          onSaved={reloadCustomers}
        />
      )}

      {editingCustomer && (
        <CustomerFormDialog
          customer={editingCustomer}
          onClose={() => setEditingCustomer(null)}
          onSaved={reloadCustomers}
        />
      )}
    </>
  );
};
