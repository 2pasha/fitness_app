"use client";

import React from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { ExerciseSessionPoint } from "@/lib/analytics/demo-data";

interface ProgressionChartProps {
  history: ExerciseSessionPoint[];
  metric: "bestE1rmKg" | "maxWeightKg" | "volumeKg";
}

export function ProgressionChart({ history, metric }: ProgressionChartProps) {
  const metricLabel =
    metric === "bestE1rmKg"
      ? "Est. 1RM (kg)"
      : metric === "maxWeightKg"
      ? "Top Weight (kg)"
      : "Volume (kg)";

  const color =
    metric === "bestE1rmKg"
      ? "#3b82f6"
      : metric === "maxWeightKg"
      ? "#10b981"
      : "#8b5cf6";

  if (!history || history.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center rounded-xl border border-slate-800 bg-slate-900/40 text-sm text-slate-400">
        Not enough session history for this exercise yet.
      </div>
    );
  }

  return (
    <div className="h-64 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={history}
          margin={{ top: 10, right: 12, left: -12, bottom: 0 }}
        >
          <defs>
            <linearGradient id="metricGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.35} />
              <stop offset="95%" stopColor={color} stopOpacity={0.0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
          <XAxis
            dataKey="date"
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
          />
          <YAxis
            stroke="#64748b"
            fontSize={12}
            tickLine={false}
            domain={["auto", "auto"]}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#0f172a",
              borderColor: "#334155",
              borderRadius: "0.75rem",
              fontSize: "12px",
            }}
            formatter={(value: number) => [`${value} kg`, metricLabel]}
            labelFormatter={(label) => `Session: ${label}`}
          />
          <Area
            type="monotone"
            dataKey={metric}
            stroke={color}
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#metricGradient)"
            activeDot={{ r: 5 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
