import { useState } from "react"
import { formatCost, formatTokenCount, getChangeSymbol, formatPercentage } from "@shared/calculate-cost"
import type { UsageData, ViewMode } from "@shared/types"
import { EmptyState } from "../components/EmptyState"
import { HourlyUsageChart } from "../components/HourlyUsageChart"

interface ExpandedViewProps {
	data: UsageData | null
	viewMode: ViewMode
	onViewModeChange: (mode: ViewMode) => void
	onRefresh: () => void
}

export function ExpandedView({ data, viewMode, onViewModeChange, onRefresh }: ExpandedViewProps) {
	const [selectedDateRange, setSelectedDateRange] = useState("last7days")
	
	if (!data) {
		return <EmptyState action={{ label: "Refresh", onClick: onRefresh }} />
	}
	
	const displayData = viewMode === "daily" ? (data.daily || []) : (data.sessions || [])
	
	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="p-4 border-b border-[var(--border)]">
				<div className="flex items-center justify-between mb-3">
					<h2 className="text-lg font-semibold">Usage Details</h2>
					<div className="flex items-center space-x-2">
						<button
							type="button"
							onClick={() => onViewModeChange("daily")}
							className={`px-3 py-1 text-sm rounded ${
								viewMode === "daily"
									? "bg-primary text-white"
									: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
							}`}
						>
							Daily
						</button>
						<button
							type="button"
							onClick={() => onViewModeChange("session")}
							className={`px-3 py-1 text-sm rounded ${
								viewMode === "session"
									? "bg-primary text-white"
									: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
							}`}
						>
							Session
						</button>
						<button
							type="button"
							onClick={() => onViewModeChange("hourly")}
							className={`px-3 py-1 text-sm rounded ${
								viewMode === "hourly"
									? "bg-primary text-white"
									: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
							}`}
						>
							Hourly
						</button>
					</div>
				</div>
				
				{viewMode === "hourly" && (
					<select
						value={selectedDateRange}
						onChange={(e) => setSelectedDateRange(e.target.value)}
						className="px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded border border-[var(--border)] focus:outline-none focus:ring-2 focus:ring-primary"
					>
						<option value="today">Today</option>
						<option value="last24hours">Last 24 hours</option>
					</select>
				)}
			</div>
			
			{/* Content */}
			<div className="flex-1 overflow-auto">
				{viewMode === "hourly" ? (
					<div className="flex flex-col h-full">
						{/* Chart */}
						<div className="p-4 border-b border-[var(--border)]">
							<HourlyUsageChart 
								data={selectedDateRange === "today" ? data.todayHourly || [] : data.hourly || []} 
								height={250}
							/>
						</div>
						{/* Table */}
						<div className="flex-1 overflow-auto">
							<table className="w-full">
								<thead className="sticky top-0 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
									<tr>
										<th className="text-left px-4 py-2 text-sm font-medium text-[var(--text-secondary)]">
											Hour
										</th>
										<th className="text-right px-4 py-2 text-sm font-medium text-[var(--text-secondary)]">
											Requests
										</th>
										<th className="text-right px-4 py-2 text-sm font-medium text-[var(--text-secondary)]">
											Tokens
										</th>
										<th className="text-right px-4 py-2 text-sm font-medium text-[var(--text-secondary)]">
											Cost
										</th>
									</tr>
								</thead>
								<tbody>
									{(selectedDateRange === "today" ? data.todayHourly || [] : data.hourly || []).map((hour, index) => {
										const totalTokens = hour.tokens.inputTokens + hour.tokens.outputTokens + hour.tokens.cacheCreationTokens + hour.tokens.cacheReadTokens
										const currentHour = new Date().getHours()
										const hourValue = new Date(hour.hour).getHours()
										const isCurrentHour = selectedDateRange === "today" && hourValue === currentHour
										
										return (
											<tr 
												key={hour.hour} 
												className={`border-b border-[var(--border)] hover:bg-[var(--bg-secondary)] ${
													isCurrentHour ? "bg-primary/10" : ""
												}`}
											>
												<td className="px-4 py-3 text-sm text-[var(--text-primary)]">
													{hour.hourLabel}
													{isCurrentHour && (
														<span className="ml-2 text-xs text-primary font-medium">(current)</span>
													)}
												</td>
												<td className="px-4 py-3 text-sm text-right text-[var(--text-primary)]">
													{hour.entryCount}
												</td>
												<td className="px-4 py-3 text-sm text-right text-[var(--text-primary)]">
													{formatTokenCount(totalTokens)}
												</td>
												<td className="px-4 py-3 text-sm text-right font-medium text-[var(--text-primary)]">
													{hour.cost > 0 ? formatCost(hour.cost) : "—"}
												</td>
											</tr>
										)
									})}
								</tbody>
							</table>
						</div>
					</div>
				) : (
					<table className="w-full">
					<thead className="sticky top-0 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
						<tr>
							<th className="text-left px-4 py-2 text-sm font-medium text-[var(--text-secondary)]">
								{viewMode === "daily" ? "Date" : "Project / Session"}
							</th>
							<th className="text-right px-4 py-2 text-sm font-medium text-[var(--text-secondary)]">
								Tokens
							</th>
							<th className="text-right px-4 py-2 text-sm font-medium text-[var(--text-secondary)]">
								Cost
							</th>
							<th className="text-right px-4 py-2 text-sm font-medium text-[var(--text-secondary)]">
								Change
							</th>
						</tr>
					</thead>
					<tbody>
						{displayData.slice(0, 20).map((item, index) => {
							const isDaily = "date" in item
							const label = isDaily ? item.date : `${item.project} / ${item.session}`
							const tokens = isDaily 
								? item.tokens.inputTokens + item.tokens.outputTokens + item.tokens.cacheCreationTokens + item.tokens.cacheReadTokens
								: item.tokens.inputTokens + item.tokens.outputTokens + item.tokens.cacheCreationTokens + item.tokens.cacheReadTokens
							const cost = item.cost
							const change = isDaily ? item.percentChange : undefined
							
							return (
								<tr key={index} className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)]">
									<td className="px-4 py-3 text-sm text-[var(--text-primary)]">
										{label}
									</td>
									<td className="px-4 py-3 text-sm text-right text-[var(--text-primary)]">
										{formatTokenCount(tokens)}
									</td>
									<td className="px-4 py-3 text-sm text-right font-medium text-[var(--text-primary)]">
										{formatCost(cost)}
									</td>
									<td className="px-4 py-3 text-sm text-right">
										{change !== undefined ? (
											<span className={`flex items-center justify-end space-x-1 ${
												change > 0 ? "text-danger" : change < 0 ? "text-success" : "text-[var(--text-secondary)]"
											}`}>
												<span>{getChangeSymbol(change)}</span>
												<span>{formatPercentage(change)}</span>
											</span>
										) : (
											<span className="text-[var(--text-secondary)]">—</span>
										)}
									</td>
								</tr>
							)
						})}
					</tbody>
				</table>
			)}
			</div>
			
			{/* Footer */}
			<div className="border-t border-[var(--border)] p-4">
				<div className="flex items-center justify-between mb-4">
					{viewMode === "hourly" ? (
						<>
							<div className="text-sm text-[var(--text-secondary)]">
								{selectedDateRange === "today" ? "Today's hourly usage" : "Last 24 hours"}
							</div>
							<div className="text-sm font-medium">
								Total: {formatCost((selectedDateRange === "today" ? data.todayHourly || [] : data.hourly || []).reduce((sum, item) => sum + item.cost, 0))}
							</div>
						</>
					) : (
						<>
							<div className="text-sm text-[var(--text-secondary)]">
								Showing {Math.min(displayData.length, 20)} of {displayData.length} entries
							</div>
							<div className="text-sm font-medium">
								Total: {formatCost(displayData.reduce((sum, item) => sum + item.cost, 0))}
							</div>
						</>
					)}
				</div>
				
				<div className="flex justify-center space-x-2">
					<button
						type="button"
						onClick={() => {/* TODO: Export functionality */}}
						className="px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded hover:bg-[var(--bg-tertiary)]/80 transition-colors"
					>
						💾 Export
					</button>
					<button
						type="button"
						onClick={() => {/* TODO: Settings */}}
						className="px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded hover:bg-[var(--bg-tertiary)]/80 transition-colors"
					>
						⚙️ Settings
					</button>
					<button
						type="button"
						onClick={() => {/* TODO: Analytics */}}
						className="px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded hover:bg-[var(--bg-tertiary)]/80 transition-colors"
					>
						📊 Analytics
					</button>
				</div>
			</div>
		</div>
	)
}