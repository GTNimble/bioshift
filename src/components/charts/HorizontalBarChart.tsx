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

export function HorizontalBarChart({
  data,
  dataKey = "value",
  nameKey = "name",
  valueFormatter = (v: number) => formatUsd(v, true),
  barName = "Value",
  fill = "#4f46e5",
  height = 320,
}: {
  data: Record<string, string | number>[];
  dataKey?: string;
  nameKey?: string;
  valueFormatter?: (v: number) => string;
  barName?: string;
  fill?: string;
  height?: number;
}) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        No chart data
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 4, bottom: 4 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={(v) => valueFormatter(Number(v))}
            tick={{ fontSize: 11, fill: "#64748b" }}
          />
          <YAxis
            type="category"
            dataKey={nameKey}
            width={72}
            tick={{ fontSize: 11, fill: "#334155" }}
          />
          <Tooltip
            formatter={(value) => valueFormatter(Number(value ?? 0))}
            contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }}
          />
          <Bar dataKey={dataKey} name={barName} fill={fill} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
