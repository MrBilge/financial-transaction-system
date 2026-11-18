"use client";

import { ArrowDownLeft, ArrowLeftRight, ArrowUpRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { getErrorMessage } from "@/api/client";
import { getAccountReport } from "@/api/reports";
import { AccountCombobox } from "@/components/AccountCombobox";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { StatCard } from "@/components/StatCard";
import { formatMoney } from "@/lib/format";
import type { Account, AccountReport } from "@/types/api";

interface AccountReportSectionProps {
  /** Raporlar sayfasında seçili dönem (YYYY-MM-DD); hesap raporu da bu döneme göre alınır. */
  startDate: string;
  endDate: string;
}

/** Seçilen hesabın dönem içindeki gelen ve giden para hareketleri. */
export const AccountReportSection = ({
  startDate,
  endDate,
}: AccountReportSectionProps) => {
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [report, setReport] = useState<AccountReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  const selectedAccountId = selectedAccount?.id;
  const netFlowColor = report?.netFlow.startsWith("-")
    ? "text-red-700"
    : "text-foreground";

  const handleAccountSelect = (account: Account) => {
    setSelectedAccount(account);
    setReport(null);
  };

  useEffect(() => {
    if (!selectedAccountId) {
      return;
    }

    let isCancelled = false;

    const loadReport = async () => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await getAccountReport(selectedAccountId, {
          startDate,
          endDate,
        });
        if (!isCancelled) {
          setReport(response);
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

    loadReport();

    return () => {
      isCancelled = true;
    };
  }, [selectedAccountId, startDate, endDate, reloadCount]);

  const renderReport = () => {
    if (!selectedAccount) {
      return (
        <p className="text-sm text-muted-foreground">
          Gelen ve giden hareketleri görmek için bir hesap seçin.
        </p>
      );
    }

    if (errorMessage) {
      return (
        <ErrorState
          message={errorMessage}
          onRetry={() => setReloadCount((count) => count + 1)}
        />
      );
    }

    if (isLoading || !report) {
      return <LoadingState message="Hesap raporu yükleniyor..." />;
    }

    return (
      <div className="space-y-2">
        <div className="grid gap-3 sm:grid-cols-3">
          <StatCard
            title="Toplam Gelen"
            value={formatMoney(report.incoming.total)}
            description={`Yatırma ${formatMoney(report.incoming.deposits.amount)} · Transfer ${formatMoney(report.incoming.transfers.amount)}`}
            icon={ArrowDownLeft}
          />
          <StatCard
            title="Toplam Giden"
            value={formatMoney(report.outgoing.total)}
            description={`Çekme ${formatMoney(report.outgoing.withdrawals.amount)} · Transfer ${formatMoney(report.outgoing.transfers.amount)}`}
            icon={ArrowUpRight}
          />
          <StatCard
            title="Net Akış"
            value={formatMoney(report.netFlow)}
            description={`Bakiye ${formatMoney(report.account.balance)}`}
            icon={ArrowLeftRight}
            valueClassName={netFlowColor}
          />
        </div>
        <Link
          href={`/accounts/${report.account.id}`}
          className="inline-block text-sm text-primary hover:underline"
        >
          Hesap detayına git
        </Link>
      </div>
    );
  };

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="text-sm font-medium">Hesap Bazlı Rapor</h2>
      <div className="max-w-sm">
          <AccountCombobox
            id="report-account"
            label="Hesap"
            selectedAccount={selectedAccount}
            onSelect={handleAccountSelect}
          />
      </div>
      {renderReport()}
    </section>
  );
};
