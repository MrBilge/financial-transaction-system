"use client";

import { ChartPie } from "lucide-react";
import { Cell, Label, Pie, PieChart } from "recharts";

import { EmptyState } from "@/components/EmptyState";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import type { StatusCounts } from "@/types/api";

const chartConfig = {
  success: { label: "Başarılı", color: "oklch(0.6 0.15 155)" },
  failed: { label: "Başarısız", color: "oklch(0.6 0.2 25)" },
  pending: { label: "Beklemede", color: "oklch(0.78 0.15 80)" },
} satisfies ChartConfig;

interface TransactionStatusChartProps {
  counts: StatusCounts;
}

/** İşlemlerin durumlara göre dağılımı (halka grafik). */
export const TransactionStatusChart = ({ counts }: TransactionStatusChartProps) => {
  if (counts.total === 0) {
    return (
      <EmptyState
        icon={ChartPie}
        title="Henüz işlem yok"
        description="İşlemler yapıldıkça durum dağılımı burada görünecek."
      />
    );
  }

  const slices = [
    { status: "success", count: counts.success, fill: "var(--color-success)" },
    { status: "failed", count: counts.failed, fill: "var(--color-failed)" },
    { status: "pending", count: counts.pending, fill: "var(--color-pending)" },
  ];

  return (
    <ChartContainer config={chartConfig} className="mx-auto aspect-square h-72">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="status" hideLabel />} />
        <Pie
          data={slices}
          dataKey="count"
          nameKey="status"
          innerRadius={64}
          outerRadius={96}
          strokeWidth={2}
        >
          {slices.map((slice) => (
            <Cell key={slice.status} fill={slice.fill} />
          ))}
          <Label
            content={({ viewBox }) => {
              const hasCenter = viewBox && "cx" in viewBox && "cy" in viewBox;
              if (!hasCenter) {
                return null;
              }

              return (
                <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                  <tspan
                    x={viewBox.cx}
                    y={viewBox.cy}
                    className="fill-foreground text-2xl font-semibold"
                  >
                    {counts.total}
                  </tspan>
                  <tspan
                    x={viewBox.cx}
                    y={(viewBox.cy ?? 0) + 22}
                    className="fill-muted-foreground text-xs"
                  >
                    işlem
                  </tspan>
                </text>
              );
            }}
          />
        </Pie>
        <ChartLegend content={<ChartLegendContent nameKey="status" />} />
      </PieChart>
    </ChartContainer>
  );
};
