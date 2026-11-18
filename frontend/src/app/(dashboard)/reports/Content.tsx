"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight, Scale } from "lucide-react";
import { useEffect, useState } from "react";
import type { FormEvent } from "react";

import { getErrorMessage } from "@/api/client";
import {
  getSummaryReport,
  getTransactionStatsReport,
  getVolumeReport,
} from "@/api/reports";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { PageHeader } from "@/components/PageHeader";
import { StatCard } from "@/components/StatCard";
import { VolumeChart } from "@/components/VolumeChart";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatMoney, getIstanbulDate } from "@/lib/format";
import type {
  SummaryReport,
  TransactionStatsReport,
  VolumeInterval,
  VolumeReport,
} from "@/types/api";

import { AccountReportSection } from "./AccountReportSection";
import { TransactionStatsTable } from "./TransactionStatsTable";

const intervalOptions: { value: VolumeInterval; label: string }[] = [
  { value: "daily", label: "Günlük" },
  { value: "weekly", label: "Haftalık" },
  { value: "monthly", label: "Aylık" },
];

interface ReportFilters {
  /** YYYY-MM-DD, Europe/Istanbul günü */
  startDate: string;
  endDate: string;
  interval: VolumeInterval;
}

// Varsayılan dönem: bugün dahil son 30 gün (sayfa açıldığı an hesaplanır).
const createDefaultFilters = (): ReportFilters => ({
  startDate: getIstanbulDate(29),
  endDate: getIstanbulDate(0),
  interval: "daily",
});

export const Content = () => {
  const [summary, setSummary] = useState<SummaryReport | null>(null);
  const [volume, setVolume] = useState<VolumeReport | null>(null);
  const [stats, setStats] = useState<TransactionStatsReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [draftFilters, setDraftFilters] = useState<ReportFilters>(createDefaultFilters);
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(createDefaultFilters);
  const [filterError, setFilterError] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const handleApplyFilters = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!draftFilters.startDate || !draftFilters.endDate) {
      setFilterError("Başlangıç ve bitiş tarihi zorunludur.");
      return;
    }
    if (draftFilters.startDate > draftFilters.endDate) {
      setFilterError("Başlangıç tarihi, bitiş tarihinden sonra olamaz.");
      return;
    }

    setFilterError(null);
    setAppliedFilters(draftFilters);
  };

  const reloadReports = () => {
    setReloadCount((count) => count + 1);
  };

  useEffect(() => {
    let isCancelled = false;

    const loadReports = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      const period = {
        startDate: appliedFilters.startDate,
        endDate: appliedFilters.endDate,
      };

      try {
        const [summaryResponse, volumeResponse, statsResponse] = await Promise.all([
          getSummaryReport(period),
          getVolumeReport({ ...period, interval: appliedFilters.interval }),
          getTransactionStatsReport(period),
        ]);
        if (!isCancelled) {
          setSummary(summaryResponse);
          setVolume(volumeResponse);
          setStats(statsResponse);
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

    loadReports();

    return () => {
      isCancelled = true;
    };
  }, [appliedFilters, reloadCount]);

  const renderReports = () => {
    if (isLoading) {
      return <LoadingState message="Raporlar hazırlanıyor..." />;
    }

    if (errorMessage || !summary || !volume || !stats) {
      return (
        <ErrorState message={errorMessage ?? "Raporlar alınamadı."} onRetry={reloadReports} />
      );
    }

    const netFlowColor = summary.moneyFlow.netFlow.startsWith("-")
      ? "text-red-700"
      : "text-foreground";
    const intervalLabel = intervalOptions.find(
      (option) => option.value === volume.interval,
    )?.label;

    return (
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Para Girişi"
            value={formatMoney(summary.moneyFlow.totalInflow)}
            icon={ArrowDownLeft}
          />
          <StatCard
            title="Para Çıkışı"
            value={formatMoney(summary.moneyFlow.totalOutflow)}
            icon={ArrowUpRight}
          />
          <StatCard
            title="Net Akış"
            value={formatMoney(summary.moneyFlow.netFlow)}
            icon={Scale}
            valueClassName={netFlowColor}
          />
          <StatCard
            title="Transfer Hacmi"
            value={formatMoney(summary.moneyFlow.transfers.amount)}
            description={`${summary.moneyFlow.transfers.count} transfer`}
            icon={ArrowLeftRight}
          />
        </div>

        <Card className="gap-2 py-4">
          <CardHeader className="px-4">
            <CardTitle className="text-sm">İşlem Hacmi</CardTitle>
            <CardDescription>{intervalLabel} · başarılı işlemler</CardDescription>
          </CardHeader>
          <CardContent className="px-4">
            <VolumeChart points={volume.data} interval={volume.interval} />
          </CardContent>
        </Card>

        <TransactionStatsTable stats={stats} />
      </div>
    );
  };

  return (
    <>
      <PageHeader
        title="Raporlar"
        actions={
          <form
            onSubmit={handleApplyFilters}
            noValidate
            className="flex flex-wrap items-center gap-2"
            aria-label="Rapor dönemi"
          >
            <Input
              type="date"
              value={draftFilters.startDate}
              onChange={(event) =>
                setDraftFilters({ ...draftFilters, startDate: event.target.value })
              }
              aria-label="Başlangıç tarihi"
              className="h-8 w-36"
            />
            <span className="text-muted-foreground">–</span>
            <Input
              type="date"
              value={draftFilters.endDate}
              onChange={(event) =>
                setDraftFilters({ ...draftFilters, endDate: event.target.value })
              }
              aria-label="Bitiş tarihi"
              className="h-8 w-36"
            />
            <Select
              value={draftFilters.interval}
              onValueChange={(value) =>
                setDraftFilters({ ...draftFilters, interval: value as VolumeInterval })
              }
            >
              <SelectTrigger className="w-28" aria-label="Gruplama">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {intervalOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button type="submit">Uygula</Button>
          </form>
        }
      />

      {filterError && (
        <p role="alert" className="mb-3 text-sm text-destructive">
          {filterError}
        </p>
      )}

      <div className="space-y-4">
        {renderReports()}
        {/* Hesap raporu da seçili dönemi kullanır. */}
        <AccountReportSection
          startDate={appliedFilters.startDate}
          endDate={appliedFilters.endDate}
        />
      </div>
    </>
  );
};
