import { useMemo } from "react"
import {
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	Cell,
} from "recharts"
import { formatCost } from "@shared/calculate-cost"
import type { HourlySummary } from "@shared/types"

interface HourlyUsageChartProps {
	data: HourlySummary[]
	height?: number
}

export function HourlyUsageChart({ data, height = 300 }: HourlyUsageChartProps) {
	// Calculate max cost for color intensity
	const maxCost = useMemo(() => {
		return Math.max(...data.map(d => d.cost), 0.01) // Ensure at least 0.01 to avoid division by zero
	}, [data])

	// Get color based on cost intensity
	const getBarColor = (cost: number) => {
		const intensity = cost / maxCost
		if (intensity > 0.8) return "#ef4444" // red-500
		if (intensity > 0.6) return "#f59e0b" // amber-500
		if (intensity > 0.4) return "#3b82f6" // blue-500
		if (intensity > 0.2) return "#10b981" // emerald-500
		return "#6b7280" // gray-500
	}

	// Custom tooltip
	const CustomTooltip = ({ active, payload, label }: any) => {
		if (active && payload && payload[0]) {
			const data = payload[0].payload as HourlySummary
			return (
				<div className="bg-[var(--bg-primary)] border border-[var(--border)] p-2 rounded shadow-lg">
					<p className="text-sm font-medium">{data.hourLabel}</p>
					<p className="text-sm text-[var(--text-primary)]">
						Cost: <span className="font-semibold">{formatCost(data.cost)}</span>
					</p>
					<p className="text-xs text-[var(--text-secondary)]">
						{data.entryCount} request{data.entryCount !== 1 ? 's' : ''}
					</p>
					<div className="text-xs text-[var(--text-secondary)] mt-1">
						<p>Input: {data.tokens.inputTokens.toLocaleString()}</p>
						<p>Output: {data.tokens.outputTokens.toLocaleString()}</p>
						{data.tokens.cacheReadTokens > 0 && (
							<p>Cache: {data.tokens.cacheReadTokens.toLocaleString()}</p>
						)}
					</div>
				</div>
			)
		}
		return null
	}

	// Calculate average cost
	const avgCost = useMemo(() => {
		const total = data.reduce((sum, d) => sum + d.cost, 0)
		return total / data.length
	}, [data])

	return (
		<div className="w-full h-full">
			<ResponsiveContainer width="100%" height={height}>
				<BarChart
					data={data}
					margin={{ top: 10, right: 10, bottom: 30, left: 40 }}
				>
					<CartesianGrid
						strokeDasharray="3 3"
						stroke="var(--border)"
						opacity={0.5}
					/>
					<XAxis
						dataKey="hourLabel"
						tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
						tickLine={{ stroke: "var(--border)" }}
						axisLine={{ stroke: "var(--border)" }}
						interval="preserveStartEnd"
					/>
					<YAxis
						tick={{ fill: "var(--text-secondary)", fontSize: 12 }}
						tickLine={{ stroke: "var(--border)" }}
						axisLine={{ stroke: "var(--border)" }}
						tickFormatter={(value) => `$${value.toFixed(2)}`}
					/>
					<Tooltip
						content={<CustomTooltip />}
						cursor={{ fill: "var(--bg-secondary)", opacity: 0.5 }}
					/>
					<Bar dataKey="cost" radius={[4, 4, 0, 0]}>
						{data.map((entry, index) => (
							<Cell key={`cell-${index}`} fill={getBarColor(entry.cost)} />
						))}
					</Bar>
					{/* Average line */}
					<line
						x1={0}
						y1={avgCost}
						x2="100%"
						y2={avgCost}
						stroke="var(--text-secondary)"
						strokeDasharray="5 5"
						opacity={0.5}
					/>
				</BarChart>
			</ResponsiveContainer>
		</div>
	)
}