"use client";

import { BarChart3, MapPinned, PieChart as PieIcon } from "lucide-react";
import { ChartCard } from "@/components/ui/ChartCard";
import { MixDonutChart } from "@/components/charts/MixDonutChart";
import { HorizontalBarChart } from "@/components/charts/HorizontalBarChart";
import { StateChart } from "@/components/StateChart";
import { formatUsd } from "@/lib/format";

export type OverviewChartPayload = {
  brandShare: number;
  bioShare: number;
  topStates: { state: string; opportunity: number }[];
  topFamilies: { name: string; value: number }[];
};

export function OverviewCharts({ data }: { data: OverviewChartPayload }) {
  return (
    <div className="mb-8 grid gap-4 lg:grid-cols-3">
      <ChartCard
        title="Brand vs biosimilar mix"
        description="Claim share across filtered Part D provider×drug rows."
        honesty="Gross Part D · not net of rebates/DIR"
        icon={<PieIcon className="h-4 w-4" />}
      >
        <MixDonutChart brandShare={data.brandShare} bioShare={data.bioShare} />
      </ChartCard>

      <ChartCard
        title="Top states by opportunity"
        description="Illustrative Opportunity $ = brand gross × peer biosimilar-share gap."
        honesty="Gross Part D · illustrative"
        icon={<MapPinned className="h-4 w-4" />}
        className="lg:col-span-1"
      >
        <StateChart data={data.topStates} />
      </ChartCard>

      <ChartCard
        title="Opportunity by brand family"
        description="Where peer-gap Opportunity $ concentrates across molecule families."
        honesty="Gross Part D · illustrative"
        icon={<BarChart3 className="h-4 w-4" />}
      >
        <HorizontalBarChart
          data={data.topFamilies}
          barName="Illustrative Opportunity $"
          valueFormatter={(v) => formatUsd(v, true)}
          height={280}
        />
      </ChartCard>
    </div>
  );
}
