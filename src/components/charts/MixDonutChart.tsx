"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { formatPct } from "@/lib/format";

const COLORS = {
  brand: "#4f46e5",
  bio: "#94a3b8",
  other: "#34d399",
};

export function MixDonutChart({
  brandShare,
  bioShare,
  brandLabel = "Reference brand",
  bioLabel = "Biosimilars",
  height = 260,
}: {
  brandShare: number;
  bioShare: number;
  brandLabel?: string;
  bioLabel?: string;
  height?: number;
}) {
  const data = [
    { name: brandLabel, value: Math.max(0, brandShare) },
    { name: bioLabel, value: Math.max(0, bioShare) },
  ].filter((d) => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-slate-500">
        No mix data
      </div>
    );
  }

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius="58%"
            outerRadius="82%"
            paddingAngle={2}
            stroke="#fff"
            strokeWidth={2}
          >
            {data.map((entry) => (
              <Cell
                key={entry.name}
                fill={
                  entry.name === brandLabel
                    ? COLORS.brand
                    : entry.name === bioLabel
                      ? COLORS.bio
                      : COLORS.other
                }
              />
            ))}
          </Pie>
          <Tooltip
            formatter={(value) => formatPct(Number(value ?? 0))}
            contentStyle={{ fontSize: 12, borderRadius: 8, borderColor: "#e2e8f0" }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => <span className="text-xs text-slate-600">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
