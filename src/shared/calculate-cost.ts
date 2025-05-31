import type { DailySummary, SessionSummary, TokenData, TokenTotals } from "./types"

export function calculateTotals(
	data: Array<DailySummary | SessionSummary>,
): TokenTotals {
	return data.reduce(
		(acc, item) => ({
			inputTokens: acc.inputTokens + item.tokens.inputTokens,
			outputTokens: acc.outputTokens + item.tokens.outputTokens,
			cacheCreationTokens: acc.cacheCreationTokens + item.tokens.cacheCreationTokens,
			cacheReadTokens: acc.cacheReadTokens + item.tokens.cacheReadTokens,
			totalCost: acc.totalCost + item.cost,
		}),
		{
			inputTokens: 0,
			outputTokens: 0,
			cacheCreationTokens: 0,
			cacheReadTokens: 0,
			totalCost: 0,
		},
	)
}

export function getTotalTokens(tokens: TokenData): number {
	return (
		tokens.inputTokens +
		tokens.outputTokens +
		tokens.cacheCreationTokens +
		tokens.cacheReadTokens
	)
}

export function createTotalsObject(totals: TokenTotals) {
	return {
		inputTokens: totals.inputTokens,
		outputTokens: totals.outputTokens,
		cacheCreationTokens: totals.cacheCreationTokens,
		cacheReadTokens: totals.cacheReadTokens,
		totalTokens: getTotalTokens(totals),
		totalCost: totals.totalCost,
	}
}

export function formatCost(cost: number): string {
	return `$${cost.toFixed(2)}`
}

export function formatTokenCount(count: number, compact = false): string {
	if (!compact) {
		return count.toLocaleString()
	}
	
	if (count >= 1_000_000) {
		return `${(count / 1_000_000).toFixed(1)}M`
	}
	if (count >= 1_000) {
		return `${(count / 1_000).toFixed(1)}K`
	}
	return count.toString()
}

export function calculatePercentageChange(current: number, previous: number): number {
	if (previous === 0) return current > 0 ? 100 : 0
	return ((current - previous) / previous) * 100
}

export function getChangeSymbol(change: number): string {
	if (change > 0) return "↑"
	if (change < 0) return "↓"
	return "→"
}

export function formatPercentage(value: number): string {
	return `${Math.abs(value).toFixed(0)}%`
}