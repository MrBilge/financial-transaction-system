"use client";

import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUpRight,
  Power,
  Scale,
  User,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

import { getAccount } from "@/api/accounts";
import { ApiError, getErrorMessage } from "@/api/client";
import { getAccountReport } from "@/api/reports";
import { getAccountTransactions } from "@/api/transactions";
import { AccountStatusDialog } from "@/components/AccountStatusDialog";
import { DataTable } from "@/components/data-table/DataTable";
import { DataTableFilterPopover } from "@/components/data-table/DataTableFilterPopover";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { MoneyMovementDialog } from "@/components/MoneyMovementDialog";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { AccountStatusBadge } from "@/components/StatusBadges";
import { createTransactionColumns } from "@/components/transactionColumns";
import { TransactionDetailsDialog } from "@/components/TransactionDetailsDialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatAccountNumber, formatDate, formatMoney } from "@/lib/format";
import { transactionStatusLabels, transactionTypeLabels } from "@/lib/labels";
import type {
  Account,
  AccountReport,
  PaginationMeta,
  Transaction,
  TransactionListQuery,
  TransactionStatus,
  TransactionType,
} from "@/types/api";

const DEFAULT_PAGE_SIZE = 10;
const ALL = "ALL";

interface TransactionFilters {
  type: TransactionType | typeof ALL;
  status: TransactionStatus | typeof ALL;
}

const emptyFilters: TransactionFilters = { type: ALL, status: ALL };

export const Content = () => {
  const params = useParams<{ id: string }>();
  const accountId = params.id;

  const [account, setAccount] = useState<Account | null>(null);
  const [report, setReport] = useState<AccountReport | null>(null);
  const [isOverviewLoading, setIsOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<ApiError | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsMeta, setTransactionsMeta] = useState<PaginationMeta | null>(null);
  const [isTransactionsLoading, setIsTransactionsLoading] = useState(true);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [sorting, setSorting] = useState<SortingState>([{ id: "createdAt", desc: true }]);
  const [draftFilters, setDraftFilters] = useState<TransactionFilters>(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState<TransactionFilters>(emptyFilters);

  const [reloadCount, setReloadCount] = useState(0);
  const [activeMovementType, setActiveMovementType] = useState<TransactionType | null>(
    null,
  );
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(
    null,
  );

  const isAccountNotFound = overviewError?.status === 404;
  const isAccountActive = account?.status === "ACTIVE";
  const columns = createTransactionColumns({
    onViewDetails: setSelectedTransaction,
    accountId,
  });

  let activeFilterCount = 0;
  if (appliedFilters.type !== ALL) {
    activeFilterCount += 1;
  }
  if (appliedFilters.status !== ALL) {
    activeFilterCount += 1;
  }

  // Para hareketi veya durum değişikliğinden sonra hem özet hem işlem listesi yenilenir.
  const reloadAll = () => {
    setReloadCount((count) => count + 1);
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
    setAppliedFilters(draftFilters);
    setPage(1);
    return true;
  };

  const handleResetFilters = () => {
    setDraftFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  };

  useEffect(() => {
    let isCancelled = false;

    const loadOverview = async () => {
      setIsOverviewLoading(true);
      setOverviewError(null);

      try {
        const [accountResponse, reportResponse] = await Promise.all([
          getAccount(accountId),
          getAccountReport(accountId),
        ]);
        if (!isCancelled) {
          setAccount(accountResponse);
          setReport(reportResponse);
        }
      } catch (error) {
        if (!isCancelled) {
          const apiError =
            error instanceof ApiError
              ? error
              : new ApiError(0, [getErrorMessage(error)]);
          setOverviewError(apiError);
        }
      } finally {
        if (!isCancelled) {
          setIsOverviewLoading(false);
        }
      }
    };

    loadOverview();

    return () => {
      isCancelled = true;
    };
  }, [accountId, reloadCount]);

  useEffect(() => {
    let isCancelled = false;

    const loadTransactions = async () => {
      setIsTransactionsLoading(true);
      setTransactionsError(null);

      const [activeSort] = sorting;

      try {
        const response = await getAccountTransactions(accountId, {
          page,
          limit: pageSize,
          sortBy: activeSort?.id as TransactionListQuery["sortBy"],
          sortOrder: activeSort?.desc ? "desc" : "asc",
          type: appliedFilters.type === ALL ? undefined : appliedFilters.type,
          status: appliedFilters.status === ALL ? undefined : appliedFilters.status,
        });
        if (!isCancelled) {
          setTransactions(response.data);
          setTransactionsMeta(response.meta);
        }
      } catch (error) {
        if (!isCancelled) {
          setTransactionsError(getErrorMessage(error));
        }
      } finally {
        if (!isCancelled) {
          setIsTransactionsLoading(false);
        }
      }
    };

    loadTransactions();

    return () => {
      isCancelled = true;
    };
  }, [accountId, page, pageSize, sorting, appliedFilters, reloadCount]);

  if (isOverviewLoading && !account) {
    return <LoadingState message="Hesap bilgileri yükleniyor..." />;
  }

  if (isAccountNotFound) {
    return (
      <EmptyState
        title="Hesap bulunamadı"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/accounts">
              <ArrowLeft aria-hidden="true" />
              Hesaplara dön
            </Link>
          </Button>
        }
      />
    );
  }

  if (overviewError || !account || !report) {
    return (
      <ErrorState
        message={overviewError?.message ?? "Hesap bilgileri alınamadı."}
        onRetry={reloadAll}
      />
    );
  }

  const netFlowColor = report.netFlow.startsWith("-") ? "text-red-700" : "text-foreground";

  const toolbar = (
    <>
      <span className="px-1 text-sm font-medium">İşlem Geçmişi</span>
      <div className="sm:ml-auto">
        <DataTableFilterPopover
          activeFilterCount={activeFilterCount}
          onOpen={() => setDraftFilters(appliedFilters)}
          onApply={handleApplyFilters}
          onReset={handleResetFilters}
        >
          <div className="space-y-1.5">
            <Label htmlFor="account-transaction-type">Tür</Label>
            <Select
              value={draftFilters.type}
              onValueChange={(value) =>
                setDraftFilters({ ...draftFilters, type: value as TransactionFilters["type"] })
              }
            >
              <SelectTrigger id="account-transaction-type" className="w-full">
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
            <Label htmlFor="account-transaction-status">Durum</Label>
            <Select
              value={draftFilters.status}
              onValueChange={(value) =>
                setDraftFilters({
                  ...draftFilters,
                  status: value as TransactionFilters["status"],
                })
              }
            >
              <SelectTrigger id="account-transaction-status" className="w-full">
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
        </DataTableFilterPopover>
      </div>
    </>
  );

  return (
    <>
      <PageHeader
        title={formatAccountNumber(account.accountNumber)}
        actions={
          <>
            <Button
              size="sm"
              onClick={() => setActiveMovementType("DEPOSIT")}
              disabled={!isAccountActive}
            >
              <ArrowDownLeft aria-hidden="true" />
              Para Yatır
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveMovementType("WITHDRAWAL")}
              disabled={!isAccountActive}
            >
              <ArrowUpRight aria-hidden="true" />
              Para Çek
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setActiveMovementType("TRANSFER")}
              disabled={!isAccountActive}
            >
              <ArrowLeftRight aria-hidden="true" />
              Transfer
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsStatusDialogOpen(true)}>
              <Power aria-hidden="true" />
              {isAccountActive ? "Pasif Yap" : "Aktif Yap"}
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
        <AccountStatusBadge status={account.status} />
        <span>Açılış: {formatDate(account.createdAt)}</span>
        <Link
          href={`/customers/${account.customerId}`}
          className="flex items-center gap-1 text-primary hover:underline"
        >
          <User className="size-4" aria-hidden="true" />
          Müşteriyi görüntüle
        </Link>
      </div>

      {!isAccountActive && (
        <Alert className="mb-4">
          <AlertDescription>
            Hesap pasif: para yatırma, çekme ve transfer yapılamaz.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Bakiye" value={formatMoney(account.balance)} icon={Scale} />
        <StatCard
          title="Toplam Gelen"
          value={formatMoney(report.incoming.total)}
          description={`${report.incoming.deposits.count} yatırma · ${report.incoming.transfers.count} transfer`}
          icon={ArrowDownLeft}
        />
        <StatCard
          title="Toplam Giden"
          value={formatMoney(report.outgoing.total)}
          description={`${report.outgoing.withdrawals.count} çekme · ${report.outgoing.transfers.count} transfer`}
          icon={ArrowUpRight}
        />
        <StatCard
          title="Net Akış"
          value={formatMoney(report.netFlow)}
          icon={ArrowLeftRight}
          valueClassName={netFlowColor}
        />
      </div>

      <DataTable
        columns={columns}
        data={transactions}
        toolbar={toolbar}
        sorting={sorting}
        onSortingChange={handleSortingChange}
        pagination={
          transactionsMeta
            ? {
                meta: transactionsMeta,
                onPageChange: setPage,
                onPageSizeChange: handlePageSizeChange,
              }
            : undefined
        }
        isLoading={isTransactionsLoading}
        errorMessage={transactionsError}
        onRetry={reloadAll}
        emptyState={
          <EmptyState
            icon={ArrowLeftRight}
            title={activeFilterCount > 0 ? "Filtrelere uyan işlem yok" : "Henüz işlem yok"}
          />
        }
      />

      {activeMovementType && (
        <MoneyMovementDialog
          type={activeMovementType}
          initialAccount={account}
          onClose={() => setActiveMovementType(null)}
          onTransactionRecorded={reloadAll}
        />
      )}

      {isStatusDialogOpen && (
        <AccountStatusDialog
          account={account}
          onClose={() => setIsStatusDialogOpen(false)}
          onUpdated={reloadAll}
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
