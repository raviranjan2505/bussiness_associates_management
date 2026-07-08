import React from "react"
import {
  BarChart,
  Bar,
  Rectangle,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts"

const CustomBarChart = ({ data }) => {
  // Cycles through a small theme-consistent palette per bar so a
  // division/service breakdown reads clearly even without a "priority" field.
  const PALETTE = ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#ec4899", "#8b5cf6"]
  const getBarColor = (entry, index) => {
    switch (entry?.priority) {
      case "Low":
        return "#4CAF50"
      case "Medium":
        return "#FF9800"
      case "High":
        return "#F44336"
      default:
        return PALETTE[index % PALETTE.length]
    }
  }

  const CustomToolTip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2 shadow-md rounded-lg border border-gray-300">
          <p className="text-xs font-semibold text-purple-800 mb-1">
            {payload[0].payload.priority}
          </p>

          <p className="text-sm text-gray-600">
            Count:{" "}
            <span className="text-sm font-medium text-gray-900">
              {payload[0].payload.count}
            </span>
          </p>
        </div>
      )
    }

    return null
  }

  const hasData = data?.some((d) => Number(d.count) > 0)

  if (!hasData) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
        No data yet
      </div>
    )
  }

  // Categories are unbounded (division/service names), so on narrow screens
  // give each bar a minimum width and let the card scroll horizontally
  // instead of squashing every label into unreadable slivers.
  const minChartWidth = Math.max((data?.length || 0) * 72, 280)

  return (
    <div className="h-full w-full overflow-x-auto">
      <div className="h-full" style={{ minWidth: `${minChartWidth}px` }}>
        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
          <BarChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="none" />

            <XAxis
              dataKey="priority"
              tick={{ fill: "#555", fontSize: 12 }}
              stroke="none"
              interval={0}
              angle={-20}
              textAnchor="end"
              height={50}
            />

            <YAxis tick={{ fill: "#555", fontSize: 12 }} stroke="none" allowDecimals={false} width={36} />

            <Tooltip
              content={<CustomToolTip />}
              cursor={{ fill: "rgba(0,0,0,0.04)" }}
            />

            <Bar
              dataKey="count"
              name={"priority"}
              fill="#4f46e5"
              radius={[10, 10, 0, 0]}
              maxBarSize={48}
            >
              {data?.map((entry, index) => (
                <Cell key={index} fill={getBarColor(entry, index)} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default CustomBarChart