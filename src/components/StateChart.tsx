"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import { formatUsd } from "@/lib/format";

export function StateChart({
  data,
}: {
  data: { state: string; opportunity: number }[];
}) {
  if (!data.length) {
    return (
      <div className="flex h-80 items-center justify-center text-sm text-slate-500">
        No state data
      </div>
    );
  }

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, left: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => formatUsd(v, true)}
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          <YAxis
            type="category"
            dataKey="state"
            width={36}
            tick={{ fontSize: 12, fill: "#334155" }}
          />
          <Tooltip
            formatter={(value) => [formatUsd(Number(value ?? 0)), "Illustrative Opportunity $"]}
            contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }}
          />
          <Bar
            dataKey="opportunity"
            name="Illustrative Opportunity $"
            fill="#4f46e5"
            radius={[0, 4, 4, 0]}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
