"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
} from "recharts";

export function ConversionChart({
  data,
}: {
  data: { name: string; brandShare: number; bioShare: number }[];
}) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 48 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 11, fill: "#64748b" }}
            angle={-35}
            textAnchor="end"
            interval={0}
            height={60}
          />
          <YAxis
            tickFormatter={(v) => `${Math.round(v * 100)}%`}
            tick={{ fontSize: 11, fill: "#64748b" }}
            domain={[0, 1]}
          />
          <Tooltip
            formatter={(value) =>
              `${(Number(value ?? 0) * 100).toFixed(1)}%`
            }
            contentStyle={{ fontSize: 12, borderRadius: 8 }}
          />
          <Legend />
          <Bar dataKey="brandShare" name="Brand share" stackId="a" fill="#4f46e5" radius={[0, 0, 0, 0]} />
          <Bar dataKey="bioShare" name="Biosimilar share" stackId="a" fill="#94a3b8" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
