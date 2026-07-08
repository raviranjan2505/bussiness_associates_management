import React from "react"

const CustomLegend = ({ payload }) => {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 pt-3">
      {payload?.map((entry, index) => (
        <div className="flex items-center gap-1.5" key={`legend-${index}`}>
          <div
            className="h-2.5 w-2.5 shrink-0 rounded-full"
            style={{ backgroundColor: entry.color }}
          ></div>

          <span className="text-xs font-medium text-gray-700">
            {entry.value}
          </span>
        </div>
      ))}
    </div>
  )
}

export default CustomLegend