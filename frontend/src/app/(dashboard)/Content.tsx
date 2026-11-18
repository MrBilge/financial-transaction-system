"use client";

import {
  ArrowLeftRight,
  Landmark,
  Scale,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getErrorMessage } from "@/api/client";
import {
  getSummaryReport,
  getTransactionStatsReport,
  getVolumeReport,
} from "@/api/reports";
import { getTransactions } from "@/api/transactions";
import { DataTable } from "@/components/data-table/DataTable";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { createTransactionColumns } from "@/components/transactionColumns";
import { TransactionDetailsDialog } from "@/components/TransactionDetailsDialog";
import { VolumeChart } from "@/components/VolumeChart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatMoney } from "@/lib/format";
import type {
  SummaryReport,
  Transaction,
  TransactionStatsReport,
  VolumeReport,
} from "@/types/api";

import { TransactionStatusChart } from "./TransactionStatusChart";

const RECENT_TRANSACTION_COUNT = 6;

export const Content = () => {
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [volume, setVolume] = useState<VolumeReport | null>(null);
  const [stats, setStats] = useState<TransactionStatsReport | null>(null);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(
    null,
  );

  const transactionColumns = createTransactionColumns({
    onViewDetails: setSelectedTransaction,
  });

  const reloadDashboard = () => {
    setReloadCount((count) => count + 1);
  };

  useEffect(() => {
    let isCancelled = false;

    const loadDashboard = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        // Özet ve istatistikler tüm zamanlar için, hacim grafiği son 30 gün için
        // (backend varsayılanı) alınır.
        const [summaryResponse, volumeResponse, statsResponse, transactionsResponse] =
          await Promise.all([
            getSummaryReport(),
            getVolumeReport({ interval: "daily" }),
            getTransactionStatsReport(),
            getTransactions({ limit: RECENT_TRANSACTION_COUNT }),
          ]);

        if (!isCancelled) {
          setSummary(summaryResponse);
          setVolume(volumeResponse);
          setStats(statsResponse);
          setRecentTransactions(transactionsResponse.data);
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

    loadDashboard();

    return () => {
      isCancelled = true;
    };
  }, [reloadCount]);

  const pageHeader = (
    <PageHeader
      title="Genel Bakış"
      actions={
        <Button asChild>
          <Link href="/transactions">
            <ArrowLeftRight aria-hidden="true" />
            Yeni İşlem
          </Link>
        </Button>
      }
    />
  );

  if (isLoading) {
    return (
      <>
        {pageHeader}
        <LoadingState message="Özet bilgiler yükleniyor..." />
      </>
    );
  }

  if (errorMessage || !summary || !volume || !stats) {
    return (
      <>
        {pageHeader}
        <ErrorState
          message={errorMessage ?? "Özet bilgiler alınamadı."}
          onRetry={reloadDashboard}
        />
      </>
    );
  }

  const netFlowColor = summary.moneyFlow.netFlow.startsWith("-")
    ? "text-red-700"
    : "text-foreground";

  return (
    <>
      {pageHeader}

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Toplam Bakiye"
          value={formatMoney(summary.accounts.totalBalance)}
          icon={Landmark}
        />
        <StatCard
          title="Müşteriler"
          value={String(summary.customers.total)}
          icon={Users}
        />
        <StatCard
          title="Hesaplar"
          value={String(summary.accounts.total)}
          description={`${summary.accounts.active} aktif · ${summary.accounts.passive} pasif`}
          icon={Wallet}
        />
        <StatCard
          title="Net Para Akışı"
          value={formatMoney(summary.moneyFlow.netFlow)}
          description={`Giriş ${formatMoney(summary.moneyFlow.totalInflow)} · Çıkış ${formatMoney(summary.moneyFlow.totalOutflow)}`}
          icon={Scale}
          valueClassName={netFlowColor}
        />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Finansal Hareketler</CardTitle>
            <CardDescription>Son 30 gün · başarılı işlemler</CardDescription>
            <CardAction>
              <Button variant="outline" size="sm" asChild>
                <Link href="/reports">Raporlar</Link>
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent>
            <VolumeChart points={volume.data} interval={volume.interval} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>İşlem Durumları</CardTitle>
          </CardHeader>
          <CardContent>
            <TransactionStatusChart counts={stats.byStatus} />
          </CardContent>
        </Card>
      </div>

      <DataTable
        columns={transactionColumns}
        data={recentTransactions}
        toolbar={
          <>
            <span className="px-1 text-sm font-medium">Son İşlemler</span>
            <Button variant="outline" size="sm" className="sm:ml-auto" asChild>
              <Link href="/transactions">Tümünü gör</Link>
            </Button>
          </>
        }
        emptyState={<EmptyState icon={ArrowLeftRight} title="Henüz işlem yok" />}
      />

      {selectedTransaction && (
        <TransactionDetailsDialog
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </>
  );
};
