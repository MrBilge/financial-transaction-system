"use client";

import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { Plus, Search, Wallet } from "lucide-react";
import { useEffect, useState } from "react";

import { getAccounts } from "@/api/accounts";
import { getErrorMessage } from "@/api/client";
import { createAccountColumns } from "@/components/accountColumns";
import { AccountStatusDialog } from "@/components/AccountStatusDialog";
import { DataTable } from "@/components/data-table/DataTable";
import { DataTableFilterPopover } from "@/components/data-table/DataTableFilterPopover";
import { DataTableSearch } from "@/components/data-table/DataTableSearch";
import { EmptyState } from "@/components/EmptyState";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  Account,
  AccountListQuery,
  AccountStatus,
  PaginationMeta,
} from "@/types/api";

import { NewAccountDialog } from "./NewAccountDialog";

const DEFAULT_PAGE_SIZE = 10;
const ALL_STATUSES = "ALL";

type StatusFilter = AccountStatus | typeof ALL_STATUSES;

export const Content = () => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  // draftStatus: filtre panelindeki seçim, statusFilter: listeye uygulanmış değer.
  const [draftStatus, setDraftStatus] = useState<StatusFilter>(ALL_STATUSES);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(ALL_STATUSES);
  const [reloadCount, setReloadCount] = useState(0);

  const [isNewAccountDialogOpen, setIsNewAccountDialogOpen] = useState(false);
  const [accountForStatusChange, setAccountForStatusChange] = useState<Account | null>(
    null,
  );

  const columns = createAccountColumns({ onToggleStatus: setAccountForStatusChange });
  const activeFilterCount = statusFilter === ALL_STATUSES ? 0 : 1;
  const hasActiveFilters = search !== "" || activeFilterCount > 0;

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

  const handleApplyFilters = (): boolean => {
    setStatusFilter(draftStatus);
    setPage(1);
    return true;
  };

  const handleResetFilters = () => {
    setDraftStatus(ALL_STATUSES);
    setStatusFilter(ALL_STATUSES);
    setPage(1);
  };

  const reloadAccounts = () => {
    setReloadCount((count) => count + 1);
  };

  useEffect(() => {
    let isCancelled = false;

    const loadAccounts = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const [activeSort] = sorting;
      const query: AccountListQuery = {
        page,
        limit: pageSize,
        search: search || undefined,
        status: statusFilter === ALL_STATUSES ? undefined : statusFilter,
        sortBy: activeSort?.id as AccountListQuery["sortBy"],
        sortOrder: activeSort?.desc ? "desc" : "asc",
      };

      try {
        const response = await getAccounts(query);
        if (!isCancelled) {
          setAccounts(response.data);
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

    loadAccounts();

    return () => {
      isCancelled = true;
    };
  }, [page, pageSize, search, statusFilter, sorting, reloadCount]);

  const emptyState = hasActiveFilters ? (
    <EmptyState
      icon={Search}
      title="Filtrelere uyan hesap bulunamadı"
      description="Arama veya filtreleri değiştirmeyi deneyin."
    />
  ) : (
    <EmptyState
      icon={Wallet}
      title="Henüz hesap yok"
      action={
        <Button size="sm" onClick={() => setIsNewAccountDialogOpen(true)}>
          <Plus aria-hidden="true" />
          Yeni Hesap
        </Button>
      }
    />
  );

  const toolbar = (
    <>
      <DataTableSearch
        value={search}
        onSearch={handleSearch}
        placeholder="Hesap no, ad veya soyad ara"
        maxLength={100}
      />
      <DataTableFilterPopover
        activeFilterCount={activeFilterCount}
        onOpen={() => setDraftStatus(statusFilter)}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      >
        <div className="space-y-1.5">
          <Label htmlFor="account-status-filter">Durum</Label>
          <Select
            value={draftStatus}
            onValueChange={(value) => setDraftStatus(value as StatusFilter)}
          >
            <SelectTrigger id="account-status-filter" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_STATUSES}>Tümü</SelectItem>
              <SelectItem value="ACTIVE">Aktif</SelectItem>
              <SelectItem value="PASSIVE">Pasif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </DataTableFilterPopover>
    </>
  );

  return (
    <>
      <PageHeader
        title="Hesaplar"
        actions={
          <Button onClick={() => setIsNewAccountDialogOpen(true)}>
            <Plus aria-hidden="true" />
            Yeni Hesap
          </Button>
        }
      />

      <DataTable
        columns={columns}
        data={accounts}
        toolbar={toolbar}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        pagination={
          meta
            ? { meta, onPageChange: setPage, onPageSizeChange: handlePageSizeChange }
            : undefined
        }
        isLoading={isLoading}
        errorMessage={errorMessage}
        onRetry={reloadAccounts}
        emptyState={emptyState}
      />

      {isNewAccountDialogOpen && (
        <NewAccountDialog
          onClose={() => setIsNewAccountDialogOpen(false)}
          onCreated={reloadAccounts}
        />
      )}

      {accountForStatusChange && (
        <AccountStatusDialog
          account={accountForStatusChange}
          onClose={() => setAccountForStatusChange(null)}
          onUpdated={reloadAccounts}
        />
      )}
    </>
  );
};
