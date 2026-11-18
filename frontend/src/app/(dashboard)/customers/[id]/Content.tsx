"use client";

import type { OnChangeFn, SortingState } from "@tanstack/react-table";
import { ArrowLeft, CalendarDays, Mail, Pencil, Plus, Wallet } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { createAccount, getCustomerAccounts } from "@/api/accounts";
import { ApiError, getErrorMessage } from "@/api/client";
import { getCustomer } from "@/api/customers";
import { createAccountColumns } from "@/components/accountColumns";
import { AccountStatusDialog } from "@/components/AccountStatusDialog";
import { DataTable } from "@/components/data-table/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { formatAccountNumber, formatDate } from "@/lib/format";
import type { Account, AccountListQuery, Customer, PaginationMeta } from "@/types/api";

import { CustomerFormDialog } from "../CustomerFormDialog";

const DEFAULT_PAGE_SIZE = 10;

export const Content = () => {
  const params = useParams<{ id: string }>();
  const customerId = params.id;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isCustomerLoading, setIsCustomerLoading] = useState(true);
  const [customerError, setCustomerError] = useState<ApiError | null>(null);
  const [customerReloadCount, setCustomerReloadCount] = useState(0);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountsMeta, setAccountsMeta] = useState<PaginationMeta | null>(null);
  const [isAccountsLoading, setIsAccountsLoading] = useState(true);
  const [accountsError, setAccountsError] = useState<string | null>(null);
  const [accountsPage, setAccountsPage] = useState(1);
  const [accountsPageSize, setAccountsPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [accountsSorting, setAccountsSorting] = useState<SortingState>([
    { id: "createdAt", desc: true },
  ]);
  const [accountsReloadCount, setAccountsReloadCount] = useState(0);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isOpenAccountDialogVisible, setIsOpenAccountDialogVisible] = useState(false);
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [accountForStatusChange, setAccountForStatusChange] = useState<Account | null>(
    null,
  );

  const isCustomerNotFound = customerError?.status === 404;
  const accountColumns = createAccountColumns({
    onToggleStatus: setAccountForStatusChange,
    showCustomer: false,
  });

  const reloadCustomer = () => {
    setCustomerReloadCount((count) => count + 1);
  };

  const reloadAccounts = () => {
    setAccountsReloadCount((count) => count + 1);
  };

  const handleAccountsSortingChange: OnChangeFn<SortingState> = (updater) => {
    setAccountsSorting(updater);
    setAccountsPage(1);
  };

  const handleAccountsPageSizeChange = (newPageSize: number) => {
    setAccountsPageSize(newPageSize);
    setAccountsPage(1);
  };

  const handleOpenAccount = async () => {
    setIsCreatingAccount(true);

    try {
      const account = await createAccount({ customerId });
      toast.success("Yeni hesap açıldı", {
        description: formatAccountNumber(account.accountNumber),
      });
      setIsOpenAccountDialogVisible(false);
      setAccountsPage(1);
      reloadAccounts();
    } catch (error) {
      toast.error("Hesap açılamadı", { description: getErrorMessage(error) });
    } finally {
      setIsCreatingAccount(false);
    }
  };

  useEffect(() => {
    let isCancelled = false;

    const loadCustomer = async () => {
      setIsCustomerLoading(true);
      setCustomerError(null);

      try {
        const response = await getCustomer(customerId);
        if (!isCancelled) {
          setCustomer(response);
        }
      } catch (error) {
        if (!isCancelled) {
          const apiError =
            error instanceof ApiError
              ? error
              : new ApiError(0, [getErrorMessage(error)]);
          setCustomerError(apiError);
        }
      } finally {
        if (!isCancelled) {
          setIsCustomerLoading(false);
        }
      }
    };

    loadCustomer();

    return () => {
      isCancelled = true;
    };
  }, [customerId, customerReloadCount]);

  useEffect(() => {
    let isCancelled = false;

    const loadAccounts = async () => {
      setIsAccountsLoading(true);
      setAccountsError(null);

      const [activeSort] = accountsSorting;

      try {
        const response = await getCustomerAccounts(customerId, {
          page: accountsPage,
          limit: accountsPageSize,
          sortBy: activeSort?.id as AccountListQuery["sortBy"],
          sortOrder: activeSort?.desc ? "desc" : "asc",
        });
        if (!isCancelled) {
          setAccounts(response.data);
          setAccountsMeta(response.meta);
        }
      } catch (error) {
        if (!isCancelled) {
          setAccountsError(getErrorMessage(error));
        }
      } finally {
        if (!isCancelled) {
          setIsAccountsLoading(false);
        }
      }
    };

    loadAccounts();

    return () => {
      isCancelled = true;
    };
  }, [customerId, accountsPage, accountsPageSize, accountsSorting, accountsReloadCount]);

  if (isCustomerLoading && !customer) {
    return <LoadingState message="Müşteri bilgileri yükleniyor..." />;
  }

  if (isCustomerNotFound) {
    return (
      <EmptyState
        title="Müşteri bulunamadı"
        action={
          <Button variant="outline" size="sm" asChild>
            <Link href="/customers">
              <ArrowLeft aria-hidden="true" />
              Müşterilere dön
            </Link>
          </Button>
        }
      />
    );
  }

  if (customerError || !customer) {
    return (
      <ErrorState
        message={customerError?.message ?? "Müşteri bilgileri alınamadı."}
        onRetry={reloadCustomer}
      />
    );
  }

  return (
    <>
      <PageHeader
        title={`${customer.firstName} ${customer.lastName}`}
        actions={
          <>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(true)}>
              <Pencil aria-hidden="true" />
              Düzenle
            </Button>
            <Button onClick={() => setIsOpenAccountDialogVisible(true)}>
              <Plus aria-hidden="true" />
              Hesap Aç
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap gap-x-6 gap-y-1 text-sm text-muted-foreground">
        <span className="flex items-center gap-1.5 break-all">
          <Mail className="size-4 shrink-0" aria-hidden="true" />
          {customer.email}
        </span>
        <span className="flex items-center gap-1.5">
          <CalendarDays className="size-4 shrink-0" aria-hidden="true" />
          Kayıt: {formatDate(customer.createdAt)}
        </span>
      </div>

      <h2 className="mb-2 text-sm font-medium">Hesaplar</h2>
      <DataTable
        columns={accountColumns}
        data={accounts}
        sorting={accountsSorting}
        onSortingChange={handleAccountsSortingChange}
        pagination={
          accountsMeta
            ? {
                meta: accountsMeta,
                onPageChange: setAccountsPage,
                onPageSizeChange: handleAccountsPageSizeChange,
              }
            : undefined
        }
        isLoading={isAccountsLoading}
        errorMessage={accountsError}
        onRetry={reloadAccounts}
        emptyState={
          <EmptyState
            icon={Wallet}
            title="Bu müşterinin hesabı yok"
            action={
              <Button size="sm" onClick={() => setIsOpenAccountDialogVisible(true)}>
                <Plus aria-hidden="true" />
                Hesap Aç
              </Button>
            }
          />
        }
      />

      {isEditDialogOpen && (
        <CustomerFormDialog
          customer={customer}
          onClose={() => setIsEditDialogOpen(false)}
          onSaved={setCustomer}
        />
      )}

      {accountForStatusChange && (
        <AccountStatusDialog
          account={accountForStatusChange}
          onClose={() => setAccountForStatusChange(null)}
          onUpdated={reloadAccounts}
        />
      )}

      <AlertDialog
        open={isOpenAccountDialogVisible}
        onOpenChange={setIsOpenAccountDialogVisible}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Yeni hesap açılsın mı?</AlertDialogTitle>
            <AlertDialogDescription>
              {customer.firstName} {customer.lastName} adına 0,00 TL bakiyeli ve
              aktif yeni bir hesap açılacak.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isCreatingAccount}>Vazgeç</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                // Dialog'un hemen kapanmasını engeller; istek bitince kapatılır.
                event.preventDefault();
                handleOpenAccount();
              }}
              disabled={isCreatingAccount}
            >
              Hesap Aç
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
