import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import path from "node:path";
import type {
	DailySummary,
	DateRange,
	HourlySummary,
	ProjectSummary,
	SessionSummary,
	UsageData,
	UsageEntry,
} from "./types";

export const getDefaultClaudePath = () => path.join(homedir(), ".claude");

export const formatDate = (dateStr: string): string => {
	const date = new Date(dateStr);
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, "0");
	const day = String(date.getDate()).padStart(2, "0");
	return `${year}-${month}-${day}`;
};

export interface LoadOptions {
	claudePath?: string;
	dateRange?: DateRange;
	projects?: string[];
}

export async function parseJsonlFile(filePath: string): Promise<UsageEntry[]> {
	const content = await readFile(filePath, "utf-8");
	const lines = content.trim().split("\n");
	const entries: UsageEntry[] = [];

	// Extract session and project from path
	const pathParts = filePath.split(path.sep);
	const projectsIndex = pathParts.findIndex((part) => part === "projects");

	if (projectsIndex === -1 || projectsIndex >= pathParts.length - 2) {
		// Invalid path structure
		return entries;
	}

	const project = pathParts[projectsIndex + 1];
	// Extract session name from filename (remove .jsonl extension)
	const fileName = pathParts[pathParts.length - 1];
	const session = fileName.replace(".jsonl", "");

	for (const line of lines) {
		if (!line.trim()) continue;

		try {
			const entry = JSON.parse(line);

			// Validate required fields
			if (
				!entry.timestamp ||
				!entry.message?.usage ||
				typeof entry.costUSD !== "number"
			) {
				continue;
			}

			entries.push({
				...entry,
				project,
				session,
				filePath,
			});
		} catch (error) {
			// Skip malformed lines
			// biome-ignore lint/suspicious/noConsole: Log parsing errors for debugging
			console.warn(`Skipping malformed line in ${filePath}`);
		}
	}

	return entries;
}

export function calculateDailySummary(entries: UsageEntry[]): DailySummary[] {
	const grouped = new Map<string, UsageEntry[]>();

	// Group by date
	for (const entry of entries) {
		const date = formatDate(entry.timestamp);
		const existing = grouped.get(date) || [];
		existing.push(entry);
		grouped.set(date, existing);
	}

	// Calculate summaries
	const summaries: DailySummary[] = [];

	for (const [date, dayEntries] of grouped.entries()) {
		const tokens = {
			inputTokens: 0,
			outputTokens: 0,
			cacheCreationTokens: 0,
			cacheReadTokens: 0,
		};

		let cost = 0;

		for (const entry of dayEntries) {
			tokens.inputTokens += entry.message.usage.input_tokens || 0;
			tokens.outputTokens += entry.message.usage.output_tokens || 0;
			tokens.cacheCreationTokens +=
				entry.message.usage.cache_creation_input_tokens || 0;
			tokens.cacheReadTokens +=
				entry.message.usage.cache_read_input_tokens || 0;
			cost += entry.costUSD;
		}

		summaries.push({
			date,
			tokens,
			cost,
			entryCount: dayEntries.length,
		});
	}

	// Sort by date descending
	summaries.sort((a, b) => b.date.localeCompare(a.date));

	// Calculate percentage changes
	for (let i = 0; i < summaries.length - 1; i++) {
		const current = summaries[i];
		const previous = summaries[i + 1];
		if (current && previous && previous.cost > 0) {
			current.percentChange =
				((current.cost - previous.cost) / previous.cost) * 100;
		}
	}

	return summaries;
}

export function calculateSessionSummary(
	entries: UsageEntry[],
): SessionSummary[] {
	const grouped = new Map<string, UsageEntry[]>();

	// Group by project/session
	for (const entry of entries) {
		const key = `${entry.project}/${entry.session}`;
		const existing = grouped.get(key) || [];
		existing.push(entry);
		grouped.set(key, existing);
	}

	// Calculate summaries
	const summaries: SessionSummary[] = [];

	for (const [key, sessionEntries] of grouped.entries()) {
		const [project, session] = key.split("/");

		const tokens = {
			inputTokens: 0,
			outputTokens: 0,
			cacheCreationTokens: 0,
			cacheReadTokens: 0,
		};

		let cost = 0;
		let startTime = sessionEntries[0]?.timestamp || "";
		let endTime = sessionEntries[0]?.timestamp || "";

		for (const entry of sessionEntries) {
			tokens.inputTokens += entry.message.usage.input_tokens || 0;
			tokens.outputTokens += entry.message.usage.output_tokens || 0;
			tokens.cacheCreationTokens +=
				entry.message.usage.cache_creation_input_tokens || 0;
			tokens.cacheReadTokens +=
				entry.message.usage.cache_read_input_tokens || 0;
			cost += entry.costUSD;

			if (entry.timestamp < startTime) startTime = entry.timestamp;
			if (entry.timestamp > endTime) endTime = entry.timestamp;
		}

		summaries.push({
			project: project || "Unknown",
			session: session || "Unknown",
			tokens,
			cost,
			startTime,
			endTime,
			entryCount: sessionEntries.length,
		});
	}

	// Sort by cost descending
	return summaries.sort((a, b) => b.cost - a.cost);
}

export function calculateProjectSummary(
	entries: UsageEntry[],
): ProjectSummary[] {
	const grouped = new Map<string, UsageEntry[]>();
	const sessionsByProject = new Map<string, Set<string>>();

	// Group by project
	for (const entry of entries) {
		const project = entry.project || "Unknown";
		const existing = grouped.get(project) || [];
		existing.push(entry);
		grouped.set(project, existing);

		// Track unique sessions
		if (!sessionsByProject.has(project)) {
			sessionsByProject.set(project, new Set());
		}
		sessionsByProject.get(project)?.add(entry.session || "");
	}

	// Calculate total cost for percentage calculation
	let totalCost = 0;
	for (const entry of entries) {
		totalCost += entry.costUSD;
	}

	// Calculate summaries
	const summaries: ProjectSummary[] = [];

	for (const [project, projectEntries] of grouped.entries()) {
		const tokens = {
			inputTokens: 0,
			outputTokens: 0,
			cacheCreationTokens: 0,
			cacheReadTokens: 0,
		};

		let cost = 0;

		for (const entry of projectEntries) {
			tokens.inputTokens += entry.message.usage.input_tokens || 0;
			tokens.outputTokens += entry.message.usage.output_tokens || 0;
			tokens.cacheCreationTokens +=
				entry.message.usage.cache_creation_input_tokens || 0;
			tokens.cacheReadTokens +=
				entry.message.usage.cache_read_input_tokens || 0;
			cost += entry.costUSD;
		}

		summaries.push({
			project,
			tokens,
			cost,
			percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0,
			sessions: sessionsByProject.get(project)?.size || 0,
		});
	}

	// Sort by cost descending
	return summaries.sort((a, b) => b.cost - a.cost);
}

export function calculateHourlySummary(
	entries: UsageEntry[],
	hoursLimit = 24,
	skipTimeFilter = false,
): HourlySummary[] {
	const now = new Date();
	const cutoffTime = new Date(now.getTime() - hoursLimit * 60 * 60 * 1000);

	// Filter entries to only include those within the time limit (unless skipTimeFilter is true)
	const recentEntries = skipTimeFilter
		? entries
		: entries.filter((entry) => {
				const entryTime = new Date(entry.timestamp);
				return entryTime >= cutoffTime;
			});

	// Group by hour
	const grouped = new Map<string, UsageEntry[]>();

	for (const entry of recentEntries) {
		const entryDate = new Date(entry.timestamp);
		// Round down to the hour
		entryDate.setMinutes(0, 0, 0);
		const hourKey = entryDate.toISOString();

		const existing = grouped.get(hourKey) || [];
		existing.push(entry);
		grouped.set(hourKey, existing);
	}

	// Calculate summaries
	const summaries: HourlySummary[] = [];

	for (const [hour, hourEntries] of grouped.entries()) {
		const tokens = {
			inputTokens: 0,
			outputTokens: 0,
			cacheCreationTokens: 0,
			cacheReadTokens: 0,
		};

		let cost = 0;

		for (const entry of hourEntries) {
			tokens.inputTokens += entry.message.usage.input_tokens || 0;
			tokens.outputTokens += entry.message.usage.output_tokens || 0;
			tokens.cacheCreationTokens +=
				entry.message.usage.cache_creation_input_tokens || 0;
			tokens.cacheReadTokens +=
				entry.message.usage.cache_read_input_tokens || 0;
			cost += entry.costUSD;
		}

		// Format hour label
		const hourDate = new Date(hour);
		const hourLabel = hourDate.toLocaleTimeString("en-US", {
			hour: "2-digit",
			minute: "2-digit",
			hour12: false,
		});

		summaries.push({
			hour,
			hourLabel,
			tokens,
			cost,
			entryCount: hourEntries.length,
		});
	}

	// Sort by hour ascending (oldest to newest)
	summaries.sort((a, b) => a.hour.localeCompare(b.hour));

	// Fill in missing hours with zero data
	const filledSummaries: HourlySummary[] = [];
	let startHour: Date;

	if (skipTimeFilter) {
		// When skipTimeFilter is true (for today's data), start from midnight today
		startHour = new Date();
		startHour.setHours(0, 0, 0, 0);
	} else {
		// Otherwise use the cutoff time
		startHour = new Date(cutoffTime);
		startHour.setMinutes(0, 0, 0);
	}

	// Calculate the actual number of hours to display
	let actualHoursLimit = hoursLimit;
	if (skipTimeFilter) {
		// For today's data, show hours up to and including the current hour
		const currentHour = new Date();
		const hoursFromStart = Math.ceil(
			(currentHour.getTime() - startHour.getTime()) / (60 * 60 * 1000),
		);
		// Use Math.ceil to ensure we always include the current hour
		actualHoursLimit = Math.min(hoursFromStart, 24); // max 24 hours
	}

	for (let i = 0; i < actualHoursLimit; i++) {
		const currentHour = new Date(startHour.getTime() + i * 60 * 60 * 1000);
		const hourKey = currentHour.toISOString();

		const existingSummary = summaries.find((s) => s.hour === hourKey);

		if (existingSummary) {
			filledSummaries.push(existingSummary);
		} else {
			// Add zero entry for missing hour
			filledSummaries.push({
				hour: hourKey,
				hourLabel: currentHour.toLocaleTimeString("en-US", {
					hour: "2-digit",
					minute: "2-digit",
					hour12: false,
				}),
				tokens: {
					inputTokens: 0,
					outputTokens: 0,
					cacheCreationTokens: 0,
					cacheReadTokens: 0,
				},
				cost: 0,
				entryCount: 0,
			});
		}
	}

	return filledSummaries;
}

export function getCurrentHourEntries(
	entries: UsageEntry[],
	referenceDate?: Date,
): UsageEntry[] {
	// If we have entries, check for year mismatch
	let effectiveNow = referenceDate || new Date();

	if (!referenceDate && entries.length > 0) {
		// Find the most recent entry to determine the actual "current" time
		const mostRecentEntry = entries.reduce((latest, entry) =>
			new Date(entry.timestamp) > new Date(latest.timestamp) ? entry : latest,
		);
		const recentDate = new Date(mostRecentEntry.timestamp);
		const systemDate = new Date();

		// If years differ significantly, use the data's date as reference
		if (Math.abs(systemDate.getFullYear() - recentDate.getFullYear()) >= 1) {
			// Use the most recent entry's date but with current time
			effectiveNow = new Date(recentDate);
			effectiveNow.setHours(
				systemDate.getHours(),
				systemDate.getMinutes(),
				systemDate.getSeconds(),
			);
		}
	}

	const currentHourStart = new Date(effectiveNow);
	currentHourStart.setMinutes(0, 0, 0);
	const currentHourEnd = new Date(currentHourStart);
	currentHourEnd.setHours(currentHourEnd.getHours() + 1);

	return entries.filter((entry) => {
		const entryTime = new Date(entry.timestamp);
		return entryTime >= currentHourStart && entryTime < currentHourEnd;
	});
}

export function aggregateUsageData(entries: UsageEntry[]): UsageData {
	const daily = calculateDailySummary(entries);
	const sessions = calculateSessionSummary(entries);
	const projects = calculateProjectSummary(entries);

	// Calculate hourly data
	const hourly = calculateHourlySummary(entries, 24);

	// Add current hour to hourly if not already included
	const currentHourEntries24h = getCurrentHourEntries(entries);
	if (currentHourEntries24h.length > 0) {
		const now = new Date();
		const currentHourKey = new Date(now);
		currentHourKey.setMinutes(0, 0, 0);
		const currentHourISO = currentHourKey.toISOString();

		// Check if current hour is already in hourly
		const currentHourIndex = hourly.findIndex((h) => h.hour === currentHourISO);

		if (currentHourIndex === -1) {
			// Current hour not in summary, add it
			const currentHourTokens = {
				inputTokens: 0,
				outputTokens: 0,
				cacheCreationTokens: 0,
				cacheReadTokens: 0,
			};
			let currentHourCost = 0;

			for (const entry of currentHourEntries24h) {
				currentHourTokens.inputTokens += entry.message.usage.input_tokens || 0;
				currentHourTokens.outputTokens +=
					entry.message.usage.output_tokens || 0;
				currentHourTokens.cacheCreationTokens +=
					entry.message.usage.cache_creation_input_tokens || 0;
				currentHourTokens.cacheReadTokens +=
					entry.message.usage.cache_read_input_tokens || 0;
				currentHourCost += entry.costUSD;
			}

			if (currentHourCost > 0) {
				hourly.push({
					hour: currentHourISO,
					hourLabel: currentHourKey.toLocaleTimeString("en-US", {
						hour: "2-digit",
						minute: "2-digit",
						hour12: false,
					}),
					tokens: currentHourTokens,
					cost: currentHourCost,
					entryCount: currentHourEntries24h.length,
				});
				// Re-sort to maintain chronological order
				hourly.sort((a, b) => a.hour.localeCompare(b.hour));
			}
		}
	}

	// WORKAROUND: System date is set to 2025, but data is from 2024
	// Get the most recent date from entries instead of using current date
	let today = new Date().toISOString().split("T")[0];
	if (entries.length > 0) {
		// Find the most recent entry date
		const mostRecentEntry = entries.reduce((latest, entry) =>
			new Date(entry.timestamp) > new Date(latest.timestamp) ? entry : latest,
		);
		const recentDate = new Date(mostRecentEntry.timestamp);
		// If the most recent entry is from a different year than system date, use that instead
		const systemYear = new Date().getFullYear();
		const dataYear = recentDate.getFullYear();
		if (Math.abs(systemYear - dataYear) >= 1) {
			console.log(
				`System year (${systemYear}) differs from data year (${dataYear}), using data date`,
			);
			today = formatDate(mostRecentEntry.timestamp);
		}
	}

	// For todayHourly, we need to be more careful about date filtering
	// since there might be a date mismatch between system and data
	const todayEntries = entries.filter((e) => {
		const entryDate = formatDate(e.timestamp);
		// If we adjusted the date due to year mismatch, use that
		// Otherwise use the actual system date
		return entryDate === today;
	});

	// If no entries found for "today" but we have recent entries,
	// use the most recent day's entries as "today"
	let effectiveTodayEntries = todayEntries;
	if (todayEntries.length === 0 && entries.length > 0) {
		// Get the most recent date from entries
		const recentDates = new Set(entries.map((e) => formatDate(e.timestamp)));
		const sortedDates = Array.from(recentDates).sort().reverse();
		if (sortedDates.length > 0) {
			const mostRecentDate = sortedDates[0];
			effectiveTodayEntries = entries.filter(
				(e) => formatDate(e.timestamp) === mostRecentDate,
			);
			console.log(
				`No entries for system "today" (${today}), using most recent date: ${mostRecentDate}`,
			);
		}
	}

	const todayHourly = calculateHourlySummary(effectiveTodayEntries, 24, true);

	// Add current hour if not already included
	const currentHourEntries = getCurrentHourEntries(effectiveTodayEntries);
	if (currentHourEntries.length > 0) {
		const now = new Date();
		const currentHourKey = new Date(now);
		currentHourKey.setMinutes(0, 0, 0);
		const currentHourISO = currentHourKey.toISOString();

		// Check if current hour is already in todayHourly
		const currentHourIndex = todayHourly.findIndex(
			(h) => h.hour === currentHourISO,
		);

		if (currentHourIndex === -1) {
			// Current hour not in summary, add it
			const currentHourTokens = {
				inputTokens: 0,
				outputTokens: 0,
				cacheCreationTokens: 0,
				cacheReadTokens: 0,
			};
			let currentHourCost = 0;

			for (const entry of currentHourEntries) {
				currentHourTokens.inputTokens += entry.message.usage.input_tokens || 0;
				currentHourTokens.outputTokens +=
					entry.message.usage.output_tokens || 0;
				currentHourTokens.cacheCreationTokens +=
					entry.message.usage.cache_creation_input_tokens || 0;
				currentHourTokens.cacheReadTokens +=
					entry.message.usage.cache_read_input_tokens || 0;
				currentHourCost += entry.costUSD;
			}

			if (currentHourCost > 0) {
				todayHourly.push({
					hour: currentHourISO,
					hourLabel: currentHourKey.toLocaleTimeString("en-US", {
						hour: "2-digit",
						minute: "2-digit",
						hour12: false,
					}),
					tokens: currentHourTokens,
					cost: currentHourCost,
					entryCount: currentHourEntries.length,
				});
				// Re-sort to maintain chronological order
				todayHourly.sort((a, b) => a.hour.localeCompare(b.hour));
			}
		}
	}

	// Calculate today's data
	const todayData = daily.find((d) => d.date === today) || null;

	// Calculate this week's data
	const weekStart = new Date();
	weekStart.setDate(weekStart.getDate() - weekStart.getDay());
	weekStart.setHours(0, 0, 0, 0);

	const thisWeek = {
		inputTokens: 0,
		outputTokens: 0,
		cacheCreationTokens: 0,
		cacheReadTokens: 0,
		totalCost: 0,
	};

	// Calculate this month's data
	const monthStart = new Date();
	monthStart.setDate(1);
	monthStart.setHours(0, 0, 0, 0);

	const thisMonth = {
		inputTokens: 0,
		outputTokens: 0,
		cacheCreationTokens: 0,
		cacheReadTokens: 0,
		totalCost: 0,
	};

	for (const day of daily) {
		const dayDate = new Date(day.date);

		if (dayDate >= weekStart) {
			thisWeek.inputTokens += day.tokens.inputTokens;
			thisWeek.outputTokens += day.tokens.outputTokens;
			thisWeek.cacheCreationTokens += day.tokens.cacheCreationTokens;
			thisWeek.cacheReadTokens += day.tokens.cacheReadTokens;
			thisWeek.totalCost += day.cost;
		}

		if (dayDate >= monthStart) {
			thisMonth.inputTokens += day.tokens.inputTokens;
			thisMonth.outputTokens += day.tokens.outputTokens;
			thisMonth.cacheCreationTokens += day.tokens.cacheCreationTokens;
			thisMonth.cacheReadTokens += day.tokens.cacheReadTokens;
			thisMonth.totalCost += day.cost;
		}
	}

	return {
		daily,
		sessions,
		projects,
		hourly,
		todayHourly,
		today: todayData,
		thisWeek,
		thisMonth,
	};
}
