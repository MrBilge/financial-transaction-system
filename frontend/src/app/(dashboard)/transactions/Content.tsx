"use client";

import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Search } from "lucide-react";
import { useEffect, useState } from "react";

import { getErrorMessage } from "@/api/client";
import { getTransactions } from "@/api/transactions";
import { DataTable } from "@/components/data-table/DataTable";
import { DataTableFilterPopover } from "@/components/data-table/DataTableFilterPopover";
import { DataTableSearch } from "@/components/data-table/DataTableSearch";
import { EmptyState } from "@/components/EmptyState";
import { MoneyMovementDialog } from "@/components/MoneyMovementDialog";
import { PageHeader } from "@/components/PageHeader";
import { createTransactionColumns } from "@/components/transactionColumns";
import { TransactionDetailsDialog } from "@/components/TransactionDetailsDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  compareAmounts,
  isValidFilterAmount,
  normalizeAmountInput,
  toEndOfDayIso,
  toStartOfDayIso,
} from "@/lib/format";
import { transactionStatusLabels, transactionTypeLabels } from "@/lib/labels";
import type {
  PaginationMeta,
  Transaction,
  TransactionListQuery,
  TransactionStatus,
  TransactionType,
} from "@/types/api";

const DEFAULT_PAGE_SIZE = 20;
const ALL = "ALL";

/** Popover'daki gelişmiş filtreler. */
interface TransactionFilters {
  type: TransactionType | typeof ALL;
  status: TransactionStatus | typeof ALL;
  /** YYYY-MM-DD (tarih kutusu değeri) */
  startDate: string;
  endDate: string;
  minAmount: string;
  maxAmount: string;
}

const emptyFilters: TransactionFilters = {
  type: ALL,
  status: ALL,
  startDate: "",
  endDate: "",
  minAmount: "",
  maxAmount: "",
};

/** Filtreleri doğrular; hata varsa kullanıcıya gösterilecek mesajı döndürür. */
const validateFilters = (filters: TransactionFilters): string | null => {
  const minAmount = normalizeAmountInput(filters.minAmount);
  const maxAmount = normalizeAmountInput(filters.maxAmount);

  if (minAmount && !isValidFilterAmount(minAmount)) {
    return "Minimum tutar geçerli değil (ör. 100 veya 100,50).";
  }
  if (maxAmount && !isValidFilterAmount(maxAmount)) {
    return "Maksimum tutar geçerli değil (ör. 5000 veya 5000,00).";
  }
  if (minAmount && maxAmount && compareAmounts(minAmount, maxAmount) > 0) {
    return "Minimum tutar, maksimum tutardan büyük olamaz.";
  }
  if (filters.startDate && filters.endDate && filters.startDate > filters.endDate) {
    return "Başlangıç tarihi, bitiş tarihinden sonra olamaz.";
  }
  return null;
};

/** Uygulanmış filtre sayısı (tarih ve tutar aralıkları birer filtre sayılır). */
const countActiveFilters = (filters: TransactionFilters): number => {
  let count = 0;
  if (filters.type !== ALL) {
    count += 1;
  }
  if (filters.status !== ALL) {
    count += 1;
  }
  if (filters.startDate || filters.endDate) {
    count += 1;
  }
  if (filters.minAmount || filters.maxAmount) {
    count += 1;
  }
  return count;
};

export const Content = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [search, setSearch] = useState("");
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  // draftFilters: popover'daki değerler, appliedFilters: listeye uygulanmış değerler.
  const [draftFilters, setDraftFilters] = useState<TransactionFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<TransactionFilters>(emptyFilters);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const [activeMovementType, setActiveMovementType] = useState<TransactionType | null>(
    null,
  );
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(
    null,
  );

  const columns = createTransactionColumns({ onViewDetails: setSelectedTransaction });
  const activeFilterCount = countActiveFilters(appliedFilters);
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

  const handleOpenFilters = () => {
    setDraftFilters(appliedFilters);
    setFilterError(null);
  };

  const handleApplyFilters = (): boolean => {
    const validationError = validateFilters(draftFilters);
    if (validationError) {
      setFilterError(validationError);
      return false;
    }

    setFilterError(null);
    setPage(1);
    setAppliedFilters({
      ...draftFilters,
      minAmount: normalizeAmountInput(draftFilters.minAmount),
      maxAmount: normalizeAmountInput(draftFilters.maxAmount),
    });
    return true;
  };

  const handleResetFilters = () => {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setFilterError(null);
    setPage(1);
  };

  const reloadTransactions = () => {
    setReloadCount((count) => count + 1);
  };

  useEffect(() => {
    let isCancelled = false;

    const loadTransactions = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const [activeSort] = sorting;
      const query: TransactionListQuery = {
        page,
        limit: pageSize,
        sortBy: activeSort?.id as TransactionListQuery["sortBy"],
        sortOrder: activeSort?.desc ? "desc" : "asc",
        search: search || undefined,
        type: appliedFilters.type === ALL ? undefined : appliedFilters.type,
        status: appliedFilters.status === ALL ? undefined : appliedFilters.status,
        minAmount: appliedFilters.minAmount || undefined,
        maxAmount: appliedFilters.maxAmount || undefined,
        // Tarih kutuları yerel günü gösterir; günün tamamı dahil edilir.
        startDate: appliedFilters.startDate
          ? toStartOfDayIso(appliedFilters.startDate)
          : undefined,
        endDate: appliedFilters.endDate ? toEndOfDayIso(appliedFilters.endDate) : undefined,
      };

      try {
        const response = await getTransactions(query);
        if (!isCancelled) {
          setTransactions(response.data);
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

    loadTransactions();

    return () => {
      isCancelled = true;
    };
  }, [page, pageSize, search, sorting, appliedFilters, reloadCount]);

  const emptyState = hasActiveFilters ? (
    <EmptyState
      icon={Search}
      title="Filtrelere uyan işlem bulunamadı"
      description="Arama veya filtreleri değiştirmeyi deneyin."
    />
  ) : (
    <EmptyState icon={ArrowLeftRight} title="Henüz işlem yok" />
  );

  const toolbar = (
    <>
      <DataTableSearch
        value={search}
        onSearch={handleSearch}
        placeholder="İşlem numarası ara"
        maxLength={64}
      />
      <DataTableFilterPopover
        activeFilterCount={activeFilterCount}
        onOpen={handleOpenFilters}
        onApply={handleApplyFilters}
        onReset={handleResetFilters}
      >
        {filterError && (
          <p role="alert" className="text-sm text-destructive">
            {filterError}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="filter-type">Tür</Label>
            <Select
              value={draftFilters.type}
              onValueChange={(value) =>
                setDraftFilters({ ...draftFilters, type: value as TransactionFilters["type"] })
              }
            >
              <SelectTrigger id="filter-type" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tümü</SelectItem>
                <SelectItem value="DEPOSIT">{transactionTypeLabels.DEPOSIT}</SelectItem>
                <SelectItem value="WITHDRAWAL">{transactionTypeLabels.WITHDRAWAL}</SelectItem>
                <SelectItem value="TRANSFER">{transactionTypeLabels.TRANSFER}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-status">Durum</Label>
            <Select
              value={draftFilters.status}
              onValueChange={(value) =>
                setDraftFilters({
                  ...draftFilters,
                  status: value as TransactionFilters["status"],
                })
              }
            >
              <SelectTrigger id="filter-status" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Tümü</SelectItem>
                <SelectItem value="SUCCESS">{transactionStatusLabels.SUCCESS}</SelectItem>
                <SelectItem value="FAILED">{transactionStatusLabels.FAILED}</SelectItem>
                <SelectItem value="PENDING">{transactionStatusLabels.PENDING}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-start-date">Başlangıç</Label>
            <Input
              id="filter-start-date"
              type="date"
              value={draftFilters.startDate}
              onChange={(event) =>
                setDraftFilters({ ...draftFilters, startDate: event.target.value })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-end-date">Bitiş</Label>
            <Input
              id="filter-end-date"
              type="date"
              value={draftFilters.endDate}
              onChange={(event) =>
                setDraftFilters({ ...draftFilters, endDate: event.target.value })
              }
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-min-amount">Min. tutar</Label>
            <Input
              id="filter-min-amount"
              value={draftFilters.minAmount}
              onChange={(event) =>
                setDraftFilters({ ...draftFilters, minAmount: event.target.value })
              }
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="filter-max-amount">Maks. tutar</Label>
            <Input
              id="filter-max-amount"
              value={draftFilters.maxAmount}
              onChange={(event) =>
                setDraftFilters({ ...draftFilters, maxAmount: event.target.value })
              }
              placeholder="0,00"
              inputMode="decimal"
            />
          </div>
        </div>
      </DataTableFilterPopover>
    </>
  );

  return (
    <>
      <PageHeader
        title="İşlemler"
        actions={
          <>
            <Button onClick={() => setActiveMovementType("DEPOSIT")}>
              <ArrowDownLeft aria-hidden="true" />
              Para Yatır
            </Button>
            <Button variant="outline" onClick={() => setActiveMovementType("WITHDRAWAL")}>
              <ArrowUpRight aria-hidden="true" />
              Para Çek
            </Button>
            <Button variant="outline" onClick={() => setActiveMovementType("TRANSFER")}>
              <ArrowLeftRight aria-hidden="true" />
              Transfer
            </Button>
          </>
        }
      />

      <DataTable
        columns={columns}
        data={transactions}
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
        onRetry={reloadTransactions}
        emptyState={emptyState}
      />

      {activeMovementType && (
        <MoneyMovementDialog
          type={activeMovementType}
          onClose={() => setActiveMovementType(null)}
          onTransactionRecorded={reloadTransactions}
        />
      )}

      {selectedTransaction && (
        <TransactionDetailsDialog
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </>
  );
};
