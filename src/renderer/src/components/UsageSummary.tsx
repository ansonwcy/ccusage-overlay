import {
	formatCost,
	formatPercentage,
	formatTokenCount,
	getChangeSymbol,
} from "@shared/calculate-cost";
import type { DailySummary, TokenTotals } from "@shared/types";

interface UsageSummaryProps {
	title: string;
	data: DailySummary | TokenTotals | null;
	showProgress?: boolean;
	maxValue?: number;
}

export function UsageSummary({
	title,
	data,
	showProgress = false,
	maxValue,
}: UsageSummaryProps) {
	if (!data) {
		return (
			<div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
				<h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
					{title}
				</h3>
				<div className="animate-pulse">
					<div className="h-8 bg-[var(--bg-tertiary)] rounded w-24 mb-2" />
					<div className="h-4 bg-[var(--bg-tertiary)] rounded w-32" />
				</div>
			</div>
		);
	}

	const cost = "cost" in data ? data.cost : data.totalCost;
	const totalTokens =
		"tokens" in data
			? data.tokens.inputTokens +
				data.tokens.outputTokens +
				data.tokens.cacheCreationTokens +
				data.tokens.cacheReadTokens
			: data.inputTokens +
				data.outputTokens +
				data.cacheCreationTokens +
				data.cacheReadTokens;

	const percentChange =
		"percentChange" in data ? data.percentChange : undefined;
	const progress = showProgress && maxValue ? (cost / maxValue) * 100 : 0;

	return (
		<div className="p-4 bg-[var(--bg-secondary)] rounded-lg">
			<h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">
				{title}
			</h3>

			<div className="flex items-baseline justify-between mb-2">
				<span className="text-2xl font-bold text-[var(--text-primary)]">
					{formatCost(cost)}
				</span>
				{percentChange !== undefined && (
					<span
						className={`text-sm flex items-center ${
							percentChange > 0
								? "text-danger"
								: percentChange < 0
									? "text-success"
									: "text-[var(--text-secondary)]"
						}`}
					>
						{getChangeSymbol(percentChange)} {formatPercentage(percentChange)}
					</span>
				)}
			</div>

			{showProgress && (
				<div className="w-full h-2 bg-[var(--bg-tertiary)] rounded-full mb-2 overflow-hidden">
					<div
						className={`h-full transition-all duration-300 ${
							progress > 90
								? "bg-danger"
								: progress > 75
									? "bg-warning"
									: "bg-primary"
						}`}
						style={{ width: `${Math.min(progress, 100)}%` }}
					/>
				</div>
			)}

			<p className="text-xs text-[var(--text-secondary)]">
				{formatTokenCount(totalTokens, true)} tokens
			</p>
		</div>
	);
}
