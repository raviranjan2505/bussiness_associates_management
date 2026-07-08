import React from "react"
import {
  Pie,
  PieChart,
  Tooltip,
  Cell,
  ResponsiveContainer,
  Legend,
} from "recharts"
import CustomTooltip from "./CustomTooltip"
import CustomLegend from "./CustomLegend"

const CustomPieChart = ({ data, colors }) => {
  const hasData = data?.some((d) => Number(d.count) > 0)

  if (!hasData) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-gray-400">
        No data yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <PieChart margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <Pie
          data={data}
          cx={"50%"}
          cy={"46%"}
          labelLine={false}
          outerRadius={"78%"}
          innerRadius={"58%"}
          fill="#8884d8"
          dataKey="count"
          nameKey={"status"}
          paddingAngle={2}
        >
          {data?.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} stroke="none" />
          ))}
        </Pie>

        <Tooltip content={<CustomTooltip />} />

        <Legend verticalAlign="bottom" content={<CustomLegend />} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export default CustomPieChart