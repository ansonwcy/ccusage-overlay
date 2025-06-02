import {
	formatCost,
	formatPercentage,
	formatTokenCount,
	getChangeSymbol,
} from "@shared/calculate-cost";
import type {
	HourlySummary as HourlyUsage,
	UsageData,
	ViewMode,
} from "@shared/types";
import React, { useState } from "react";
import { EmptyState } from "../components/EmptyState";

interface ExpandedViewProps {
	data: UsageData | null;
	viewMode: ViewMode;
	onViewModeChange: (mode: ViewMode) => void;
	onRefresh: () => void;
}

interface Session {
	startHour: string;
	endHour: string;
	hours: HourlyUsage[];
	totalCost: number;
	date?: string;
	isOngoing?: boolean;
}

function getDateFromHour(hour: string): string {
	// Extract date from ISO timestamp (e.g., "2024-05-31T10:00:00" -> "May 31, 2024")
	const date = new Date(hour);
	// WORKAROUND: If system year is 2025 but data is from 2024, adjust display
	const year = date.getFullYear();
	const displayYear = year === 2025 ? 2024 : year;

	return date
		.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
			year: "numeric",
		})
		.replace(year.toString(), displayYear.toString());
}

function identifySessions(hourlyData: HourlyUsage[]): Session[] {
	const sessions: Session[] = [];
	let currentSession: Session | null = null;
	let sessionStartIndex = -1;

	// hourlyData is in chronological order (oldest to newest)
	// Process from oldest to newest
	for (let i = 0; i < hourlyData.length; i++) {
		const hour = hourlyData[i];

		if (hour.cost > 0) {
			// Start new session or continue existing one
			if (!currentSession) {
				sessionStartIndex = i;
				currentSession = {
					startHour: hour.hourLabel, // This is the start of the session
					endHour: hour.hourLabel, // Will be updated as we progress
					hours: [],
					totalCost: 0,
					date: getDateFromHour(hour.hour),
					isOngoing: false,
				};
			}

			// Add hour to current session
			currentSession.hours.push(hour);
			currentSession.totalCost += hour.cost;
			// Update endHour to the current hour (which is later in time)
			currentSession.endHour = hour.hourLabel;

			// Check if we've reached the 5-hour limit
			if (i - sessionStartIndex + 1 >= 5) {
				// Hours are already in chronological order
				sessions.push(currentSession);
				currentSession = null;
			}
		} else if (currentSession && i - sessionStartIndex < 5) {
			// Continue session even with zero-cost hours if within 5-hour window
			currentSession.hours.push(hour);
			currentSession.endHour = hour.hourLabel;

			if (i - sessionStartIndex + 1 >= 5) {
				// Hours are already in chronological order
				sessions.push(currentSession);
				currentSession = null;
			}
		} else if (currentSession) {
			// We've gone beyond 5 hours from the session start, end it
			// Hours are already in chronological order
			sessions.push(currentSession);
			currentSession = null;
		}
	}

	// Add any remaining session
	if (currentSession && currentSession.hours.length > 0) {
		// Check if this is the most recent session (last hour is the most recent in data)
		const lastHour = hourlyData[hourlyData.length - 1];
		if (lastHour && currentSession.hours.includes(lastHour)) {
			// This is the most recent session, mark it as ongoing if less than 5 hours
			if (currentSession.hours.length < 5) {
				currentSession.isOngoing = true;
			}
		}
		// Hours are already in chronological order
		sessions.push(currentSession);
	}

	// Sessions are already in chronological order (oldest to newest)
	// Reverse to show newest first
	sessions.reverse();

	return sessions;
}

export function ExpandedView({
	data,
	viewMode,
	onViewModeChange,
	onRefresh,
}: ExpandedViewProps) {
	if (!data) {
		return <EmptyState action={{ label: "Refresh", onClick: onRefresh }} />;
	}

	const displayData = data.daily || [];
	const sessions =
		viewMode === "hourly" ? identifySessions(data.hourly || []) : [];

	return (
		<div className="flex flex-col h-full">
			{/* Header */}
			<div className="p-2 border-b border-[var(--border)] drag-region">
				<div className="flex items-center justify-between">
					<h2 className="text-sm font-semibold">Claude Usage</h2>
					<div className="flex items-center space-x-1">
						<button
							type="button"
							onClick={() => onViewModeChange("hourly")}
							className={`px-2 py-0.5 text-xs rounded ${
								viewMode === "hourly"
									? "bg-primary text-white"
									: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
							}`}
						>
							Hourly
						</button>
						<button
							type="button"
							onClick={() => onViewModeChange("daily")}
							className={`px-2 py-0.5 text-xs rounded ${
								viewMode === "daily"
									? "bg-primary text-white"
									: "bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
							}`}
						>
							Daily
						</button>
					</div>
				</div>
			</div>

			{/* Content */}
			<div className="flex-1 overflow-hidden">
				{viewMode === "hourly" ? (
					<div className="flex flex-col h-full">
						{/* Table with session grouping */}
						<div className="flex-1 overflow-auto no-scrollbar">
							<table className="w-full">
								<thead className="sticky top-0 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
									<tr>
										<th className="text-left px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
											Hour
										</th>
										<th className="text-right px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
											Reqs
										</th>
										<th className="text-right px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
											Tokens
										</th>
										<th className="text-right px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
											Cost
										</th>
									</tr>
								</thead>
								<tbody>
									{sessions.length > 0
										? sessions.map((session, sessionIndex) => (
												<React.Fragment key={`session-${sessionIndex}`}>
													{/* Session header */}
													<tr className="bg-[var(--bg-tertiary)]">
														<td
															colSpan={4}
															className="px-3 py-1.5 text-xs font-medium"
														>
															<div className="flex items-center justify-between">
																<span>
																	Session: {session.startHour} -{" "}
																	{session.endHour}
																	{session.isOngoing && " - ongoing"} (
																	{formatCost(session.totalCost)})
																</span>
																<span className="text-[var(--text-secondary)]">
																	{session.date}
																</span>
															</div>
														</td>
													</tr>
													{/* Session hours */}
													{session.hours
														.slice()
														.reverse()
														.map((hour) => {
															const totalTokens =
																hour.tokens.inputTokens +
																hour.tokens.outputTokens +
																hour.tokens.cacheCreationTokens +
																hour.tokens.cacheReadTokens;

															return (
																<tr
																	key={hour.hour}
																	className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)]"
																>
																	<td className="px-3 py-1 text-xs text-[var(--text-primary)] pl-6">
																		{hour.hourLabel}
																	</td>
																	<td className="px-3 py-1 text-xs text-right text-[var(--text-primary)]">
																		{hour.entryCount}
																	</td>
																	<td className="px-3 py-1 text-xs text-right text-[var(--text-primary)]">
																		{formatTokenCount(totalTokens)}
																	</td>
																	<td className="px-3 py-1 text-xs text-right font-medium text-[var(--text-primary)]">
																		{hour.cost > 0
																			? formatCost(hour.cost)
																			: "—"}
																	</td>
																</tr>
															);
														})}
													{/* Show 'continues...' if this is the most recent session and has less than 5 hours */}
													{session.isOngoing && (
														<tr className="border-b border-[var(--border)]">
															<td
																colSpan={4}
																className="px-3 py-1 text-xs text-[var(--text-secondary)] italic text-center"
															>
																continues...
															</td>
														</tr>
													)}
												</React.Fragment>
											))
										: // No sessions, show all hours
											(data.hourly || [])
												.slice()
												.reverse()
												.map((hour) => {
													const totalTokens =
														hour.tokens.inputTokens +
														hour.tokens.outputTokens +
														hour.tokens.cacheCreationTokens +
														hour.tokens.cacheReadTokens;

													return (
														<tr
															key={hour.hour}
															className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)]"
														>
															<td className="px-3 py-1 text-xs text-[var(--text-primary)]">
																{hour.hourLabel}
															</td>
															<td className="px-3 py-1 text-xs text-right text-[var(--text-primary)]">
																{hour.entryCount}
															</td>
															<td className="px-3 py-1 text-xs text-right text-[var(--text-primary)]">
																{formatTokenCount(totalTokens)}
															</td>
															<td className="px-3 py-1 text-xs text-right font-medium text-[var(--text-primary)]">
																{hour.cost > 0 ? formatCost(hour.cost) : "—"}
															</td>
														</tr>
													);
												})}
								</tbody>
							</table>
						</div>
					</div>
				) : (
					<table className="w-full">
						<thead className="sticky top-0 bg-[var(--bg-secondary)] border-b border-[var(--border)]">
							<tr>
								<th className="text-left px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
									Date
								</th>
								<th className="text-right px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
									Tokens
								</th>
								<th className="text-right px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
									Cost
								</th>
								<th className="text-right px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)]">
									Change
								</th>
							</tr>
						</thead>
						<tbody>
							{displayData.slice(0, 20).map((item, index) => {
								const label = item.date;
								const tokens =
									item.tokens.inputTokens +
									item.tokens.outputTokens +
									item.tokens.cacheCreationTokens +
									item.tokens.cacheReadTokens;
								const cost = item.cost;
								const change = item.percentChange;

								return (
									<tr
										key={index}
										className="border-b border-[var(--border)] hover:bg-[var(--bg-secondary)]"
									>
										<td className="px-3 py-1 text-xs text-[var(--text-primary)]">
											{label}
										</td>
										<td className="px-3 py-1 text-xs text-right text-[var(--text-primary)]">
											{formatTokenCount(tokens)}
										</td>
										<td className="px-3 py-1 text-xs text-right font-medium text-[var(--text-primary)]">
											{formatCost(cost)}
										</td>
										<td className="px-3 py-1 text-xs text-right">
											{change !== undefined ? (
												<span
													className={`flex items-center justify-end space-x-1 ${
														change > 0
															? "text-success"
															: change < 0
																? "text-danger"
																: "text-[var(--text-secondary)]"
													}`}
												>
													<span>{getChangeSymbol(change)}</span>
													<span>{formatPercentage(change)}</span>
												</span>
											) : (
												<span className="text-[var(--text-secondary)]">—</span>
											)}
										</td>
									</tr>
								);
							})}
						</tbody>
					</table>
				)}
			</div>

			{/* Footer */}
			<div className="border-t border-[var(--border)] p-2">
				<div className="text-center">
					{viewMode === "hourly" ? (
						<div className="text-xs text-[var(--text-secondary)]">
							Today:{" "}
							{(() => {
								const todayTotal = (data.todayHourly || []).reduce(
									(sum, item) => sum + item.cost,
									0,
								);
								// Debug logging
								console.log("[Footer] Today's cost calculation:", {
									todayHourlyDataLength: data.todayHourly?.length || 0,
									todayTotal,
									todayHourlyData: data.todayHourly?.map(h => ({
										hour: h.hour,
										hourLabel: h.hourLabel,
										cost: h.cost
									}))
								});
								return formatCost(todayTotal);
							})()}
						</div>
					) : (
						<>
							<div className="text-xs text-[var(--text-secondary)]">
								Showing {Math.min(displayData.length, 20)} of{" "}
								{displayData.length} entries
							</div>
							<div className="text-xs font-medium mt-0.5">
								{formatCost(
									displayData.reduce((sum, item) => sum + item.cost, 0),
								)}
							</div>
						</>
					)}
				</div>
			</div>
		</div>
	);
}
