import { formatCost, formatTokenCount, getChangeSymbol, formatPercentage } from "@shared/calculate-cost"
import type { UsageData } from "@shared/types"

interface CompactViewProps {
	data: UsageData | null
}

export function CompactView({ data }: CompactViewProps) {
	if (!data?.today) {
		return (
			<div className="flex items-center justify-center h-full px-4 text-sm text-[var(--text-secondary)]">
				No data today
			</div>
		)
	}
	
	const { cost, tokens, percentChange } = data.today
	const totalTokens = tokens.inputTokens + tokens.outputTokens + tokens.cacheCreationTokens + tokens.cacheReadTokens
	
	return (
		<div className="flex items-center justify-center h-full px-4 space-x-4">
			<div className="flex items-center space-x-1">
				<span className="text-lg">💰</span>
				<span className="font-semibold">{formatCost(cost)}</span>
			</div>
			
			<div className="w-px h-4 bg-[var(--border)]" />
			
			<div className="flex items-center space-x-1">
				<span className="text-lg">📊</span>
				<span className="text-sm">{formatTokenCount(totalTokens, true)}</span>
			</div>
			
			{percentChange !== undefined && (
				<>
					<div className="w-px h-4 bg-[var(--border)]" />
					<div className={`flex items-center space-x-1 text-sm ${
						percentChange > 0 ? "text-danger" : percentChange < 0 ? "text-success" : "text-[var(--text-secondary)]"
					}`}>
						<span>{getChangeSymbol(percentChange)}</span>
						<span>{formatPercentage(percentChange)}</span>
					</div>
				</>
			)}
		</div>
	)
}