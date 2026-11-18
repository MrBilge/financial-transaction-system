"use client";

import { ChartColumn } from "lucide-react";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import { EmptyState } from "@/components/EmptyState";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { formatMoney, formatPeriodLabel, toChartValue } from "@/lib/format";
import type { VolumeInterval, VolumePoint } from "@/types/api";

const chartConfig = {
  deposit: { label: "Para Yatırma", color: "var(--chart-1)" },
  withdrawal: { label: "Para Çekme", color: "var(--chart-4)" },
  transfer: { label: "Transfer", color: "var(--chart-2)" },
} satisfies ChartConfig;

type SeriesKey = keyof typeof chartConfig;

interface ChartRow {
  label: string;
  deposit: number;
  withdrawal: number;
  transfer: number;
  // Tooltip'te hassas tutarı göstermek için orijinal string değerler.
  depositAmount: string;
  withdrawalAmount: string;
  transferAmount: string;
}

const getExactAmount = (row: ChartRow, seriesKey: SeriesKey): string => {
  if (seriesKey === "deposit") {
    return row.depositAmount;
  }
  if (seriesKey === "withdrawal") {
    return row.withdrawalAmount;
  }
  return row.transferAmount;
};

// Eksen etiketleri yalnızca ölçek gösterir: "₺1,2 Mn" gibi kısa biçim.
const compactCurrencyFormatter = new Intl.NumberFormat("tr-TR", {
  notation: "compact",
  maximumFractionDigits: 1,
});

interface VolumeChartProps {
  points: VolumePoint[];
  interval: VolumeInterval;
}

/** Periyot bazlı başarılı işlem hacmi (para yatırma, çekme, transfer). */
export const VolumeChart = ({ points, interval }: VolumeChartProps) => {
  const hasAnyTransaction = points.some((point) => point.transactionCount > 0);

  if (!hasAnyTransaction) {
    return (
      <EmptyState
        icon={ChartColumn}
        title="Bu dönemde başarılı işlem yok"
        description="Tarih aralığını değiştirerek tekrar deneyebilirsiniz."
      />
    );
  }

  const rows: ChartRow[] = points.map((point) => ({
    label: formatPeriodLabel(point.periodStart, interval === "monthly"),
    deposit: toChartValue(point.depositAmount),
    withdrawal: toChartValue(point.withdrawalAmount),
    transfer: toChartValue(point.transferAmount),
    depositAmount: point.depositAmount,
    withdrawalAmount: point.withdrawalAmount,
    transferAmount: point.transferAmount,
  }));

  return (
    <ChartContainer config={chartConfig} className="aspect-auto h-72 w-full">
      <BarChart data={rows} margin={{ left: 4, right: 4 }}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="label"
          tickLine={false}
          axisLine={false}
          tickMargin={8}
          minTickGap={16}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={56}
          tickFormatter={(value: number) =>
            `₺${compactCurrencyFormatter.format(value)}`
          }
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              formatter={(_value, name, item) => {
                const seriesKey = String(name) as SeriesKey;
                const row = item.payload as ChartRow;

                return (
                  <div className="flex w-full items-center justify-between gap-4">
                    <span className="flex items-center gap-2 text-muted-foreground">
                      <span
                        className="size-2.5 rounded-[2px]"
                        style={{ backgroundColor: item.color }}
                      />
                      {chartConfig[seriesKey].label}
                    </span>
                    <span className="font-medium tabular-nums text-foreground">
                      {formatMoney(getExactAmount(row, seriesKey))}
                    </span>
                  </div>
                );
              }}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="deposit" fill="var(--color-deposit)" radius={[4, 4, 0, 0]} />
        <Bar
          dataKey="withdrawal"
          fill="var(--color-withdrawal)"
          radius={[4, 4, 0, 0]}
        />
        <Bar dataKey="transfer" fill="var(--color-transfer)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  );
};
