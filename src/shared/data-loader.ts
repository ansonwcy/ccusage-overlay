import { readFile } from "node:fs/promises"
import { homedir } from "node:os"
import path from "node:path"
import type {
	DailySummary,
	DateRange,
	HourlySummary,
	ProjectSummary,
	SessionSummary,
	UsageData,
	UsageEntry,
} from "./types"

export const getDefaultClaudePath = () => path.join(homedir(), ".claude")

export const formatDate = (dateStr: string): string => {
	const date = new Date(dateStr)
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, "0")
	const day = String(date.getDate()).padStart(2, "0")
	return `${year}-${month}-${day}`
}

export interface LoadOptions {
	claudePath?: string
	dateRange?: DateRange
	projects?: string[]
}

export async function parseJsonlFile(filePath: string): Promise<UsageEntry[]> {
	const content = await readFile(filePath, "utf-8")
	const lines = content.trim().split("\n")
	const entries: UsageEntry[] = []

	// Extract session and project from path
	const pathParts = filePath.split(path.sep)
	const projectsIndex = pathParts.findIndex((part) => part === "projects")
	
	if (projectsIndex === -1 || projectsIndex >= pathParts.length - 2) {
		// Invalid path structure
		return entries
	}

	const project = pathParts[projectsIndex + 1]
	// Extract session name from filename (remove .jsonl extension)
	const fileName = pathParts[pathParts.length - 1]
	const session = fileName.replace('.jsonl', '')

	for (const line of lines) {
		if (!line.trim()) continue
		
		try {
			const entry = JSON.parse(line)
			
			// Validate required fields
			if (!entry.timestamp || !entry.message?.usage || typeof entry.costUSD !== "number") {
				continue
			}

			entries.push({
				...entry,
				project,
				session,
				filePath,
			})
		} catch (error) {
			// Skip malformed lines
			// biome-ignore lint/suspicious/noConsole: Log parsing errors for debugging
			console.warn(`Skipping malformed line in ${filePath}`)
		}
	}

	return entries
}

export function calculateDailySummary(entries: UsageEntry[]): DailySummary[] {
	const grouped = new Map<string, UsageEntry[]>()

	// Group by date
	for (const entry of entries) {
		const date = formatDate(entry.timestamp)
		const existing = grouped.get(date) || []
		existing.push(entry)
		grouped.set(date, existing)
	}

	// Calculate summaries
	const summaries: DailySummary[] = []
	
	for (const [date, dayEntries] of grouped.entries()) {
		const tokens = {
			inputTokens: 0,
			outputTokens: 0,
			cacheCreationTokens: 0,
			cacheReadTokens: 0,
		}
		
		let cost = 0

		for (const entry of dayEntries) {
			tokens.inputTokens += entry.message.usage.input_tokens || 0
			tokens.outputTokens += entry.message.usage.output_tokens || 0
			tokens.cacheCreationTokens += entry.message.usage.cache_creation_input_tokens || 0
			tokens.cacheReadTokens += entry.message.usage.cache_read_input_tokens || 0
			cost += entry.costUSD
		}

		summaries.push({
			date,
			tokens,
			cost,
			entryCount: dayEntries.length,
		})
	}

	// Sort by date descending
	summaries.sort((a, b) => b.date.localeCompare(a.date))

	// Calculate percentage changes
	for (let i = 0; i < summaries.length - 1; i++) {
		const current = summaries[i]
		const previous = summaries[i + 1]
		if (current && previous && previous.cost > 0) {
			current.percentChange = ((current.cost - previous.cost) / previous.cost) * 100
		}
	}

	return summaries
}

export function calculateSessionSummary(entries: UsageEntry[]): SessionSummary[] {
	const grouped = new Map<string, UsageEntry[]>()

	// Group by project/session
	for (const entry of entries) {
		const key = `${entry.project}/${entry.session}`
		const existing = grouped.get(key) || []
		existing.push(entry)
		grouped.set(key, existing)
	}

	// Calculate summaries
	const summaries: SessionSummary[] = []
	
	for (const [key, sessionEntries] of grouped.entries()) {
		const [project, session] = key.split("/")
		
		const tokens = {
			inputTokens: 0,
			outputTokens: 0,
			cacheCreationTokens: 0,
			cacheReadTokens: 0,
		}
		
		let cost = 0
		let startTime = sessionEntries[0]?.timestamp || ""
		let endTime = sessionEntries[0]?.timestamp || ""

		for (const entry of sessionEntries) {
			tokens.inputTokens += entry.message.usage.input_tokens || 0
			tokens.outputTokens += entry.message.usage.output_tokens || 0
			tokens.cacheCreationTokens += entry.message.usage.cache_creation_input_tokens || 0
			tokens.cacheReadTokens += entry.message.usage.cache_read_input_tokens || 0
			cost += entry.costUSD
			
			if (entry.timestamp < startTime) startTime = entry.timestamp
			if (entry.timestamp > endTime) endTime = entry.timestamp
		}

		summaries.push({
			project: project || "Unknown",
			session: session || "Unknown",
			tokens,
			cost,
			startTime,
			endTime,
			entryCount: sessionEntries.length,
		})
	}

	// Sort by cost descending
	return summaries.sort((a, b) => b.cost - a.cost)
}

export function calculateProjectSummary(entries: UsageEntry[]): ProjectSummary[] {
	const grouped = new Map<string, UsageEntry[]>()
	const sessionsByProject = new Map<string, Set<string>>()

	// Group by project
	for (const entry of entries) {
		const project = entry.project || "Unknown"
		const existing = grouped.get(project) || []
		existing.push(entry)
		grouped.set(project, existing)
		
		// Track unique sessions
		if (!sessionsByProject.has(project)) {
			sessionsByProject.set(project, new Set())
		}
		sessionsByProject.get(project)?.add(entry.session || "")
	}

	// Calculate total cost for percentage calculation
	let totalCost = 0
	for (const entry of entries) {
		totalCost += entry.costUSD
	}

	// Calculate summaries
	const summaries: ProjectSummary[] = []
	
	for (const [project, projectEntries] of grouped.entries()) {
		const tokens = {
			inputTokens: 0,
			outputTokens: 0,
			cacheCreationTokens: 0,
			cacheReadTokens: 0,
		}
		
		let cost = 0

		for (const entry of projectEntries) {
			tokens.inputTokens += entry.message.usage.input_tokens || 0
			tokens.outputTokens += entry.message.usage.output_tokens || 0
			tokens.cacheCreationTokens += entry.message.usage.cache_creation_input_tokens || 0
			tokens.cacheReadTokens += entry.message.usage.cache_read_input_tokens || 0
			cost += entry.costUSD
		}

		summaries.push({
			project,
			tokens,
			cost,
			percentage: totalCost > 0 ? (cost / totalCost) * 100 : 0,
			sessions: sessionsByProject.get(project)?.size || 0,
		})
	}

	// Sort by cost descending
	return summaries.sort((a, b) => b.cost - a.cost)
}

export function calculateHourlySummary(entries: UsageEntry[], hoursLimit = 24): HourlySummary[] {
	const now = new Date()
	const cutoffTime = new Date(now.getTime() - hoursLimit * 60 * 60 * 1000)
	
	// Filter entries to only include those within the time limit
	const recentEntries = entries.filter(entry => {
		const entryTime = new Date(entry.timestamp)
		return entryTime >= cutoffTime
	})
	
	// Group by hour
	const grouped = new Map<string, UsageEntry[]>()
	
	for (const entry of recentEntries) {
		const entryDate = new Date(entry.timestamp)
		// Round down to the hour
		entryDate.setMinutes(0, 0, 0)
		const hourKey = entryDate.toISOString()
		
		const existing = grouped.get(hourKey) || []
		existing.push(entry)
		grouped.set(hourKey, existing)
	}
	
	// Calculate summaries
	const summaries: HourlySummary[] = []
	
	for (const [hour, hourEntries] of grouped.entries()) {
		const tokens = {
			inputTokens: 0,
			outputTokens: 0,
			cacheCreationTokens: 0,
			cacheReadTokens: 0,
		}
		
		let cost = 0
		
		for (const entry of hourEntries) {
			tokens.inputTokens += entry.message.usage.input_tokens || 0
			tokens.outputTokens += entry.message.usage.output_tokens || 0
			tokens.cacheCreationTokens += entry.message.usage.cache_creation_input_tokens || 0
			tokens.cacheReadTokens += entry.message.usage.cache_read_input_tokens || 0
			cost += entry.costUSD
		}
		
		// Format hour label
		const hourDate = new Date(hour)
		const hourLabel = hourDate.toLocaleTimeString('en-US', {
			hour: 'numeric',
			hour12: true,
		})
		
		summaries.push({
			hour,
			hourLabel,
			tokens,
			cost,
			entryCount: hourEntries.length,
		})
	}
	
	// Sort by hour ascending (oldest to newest)
	summaries.sort((a, b) => a.hour.localeCompare(b.hour))
	
	// Fill in missing hours with zero data
	const filledSummaries: HourlySummary[] = []
	const startHour = new Date(cutoffTime)
	startHour.setMinutes(0, 0, 0)
	
	for (let i = 0; i < hoursLimit; i++) {
		const currentHour = new Date(startHour.getTime() + i * 60 * 60 * 1000)
		const hourKey = currentHour.toISOString()
		
		const existingSummary = summaries.find(s => s.hour === hourKey)
		
		if (existingSummary) {
			filledSummaries.push(existingSummary)
		} else {
			// Add zero entry for missing hour
			filledSummaries.push({
				hour: hourKey,
				hourLabel: currentHour.toLocaleTimeString('en-US', {
					hour: 'numeric',
					hour12: true,
				}),
				tokens: {
					inputTokens: 0,
					outputTokens: 0,
					cacheCreationTokens: 0,
					cacheReadTokens: 0,
				},
				cost: 0,
				entryCount: 0,
			})
		}
	}
	
	return filledSummaries
}

export function aggregateUsageData(entries: UsageEntry[]): UsageData {
	const daily = calculateDailySummary(entries)
	const sessions = calculateSessionSummary(entries)
	const projects = calculateProjectSummary(entries)
	
	// Calculate hourly data
	const hourly = calculateHourlySummary(entries, 24)
	const today = new Date().toISOString().split("T")[0]
	const todayEntries = entries.filter(e => {
		const entryDate = formatDate(e.timestamp)
		return entryDate === today
	})
	const todayHourly = calculateHourlySummary(todayEntries, 24)
	
	// Calculate today's data
	const todayData = daily.find((d) => d.date === today) || null
	
	// Calculate this week's data
	const weekStart = new Date()
	weekStart.setDate(weekStart.getDate() - weekStart.getDay())
	weekStart.setHours(0, 0, 0, 0)
	
	const thisWeek = {
		inputTokens: 0,
		outputTokens: 0,
		cacheCreationTokens: 0,
		cacheReadTokens: 0,
		totalCost: 0,
	}
	
	// Calculate this month's data
	const monthStart = new Date()
	monthStart.setDate(1)
	monthStart.setHours(0, 0, 0, 0)
	
	const thisMonth = {
		inputTokens: 0,
		outputTokens: 0,
		cacheCreationTokens: 0,
		cacheReadTokens: 0,
		totalCost: 0,
	}
	
	for (const day of daily) {
		const dayDate = new Date(day.date)
		
		if (dayDate >= weekStart) {
			thisWeek.inputTokens += day.tokens.inputTokens
			thisWeek.outputTokens += day.tokens.outputTokens
			thisWeek.cacheCreationTokens += day.tokens.cacheCreationTokens
			thisWeek.cacheReadTokens += day.tokens.cacheReadTokens
			thisWeek.totalCost += day.cost
		}
		
		if (dayDate >= monthStart) {
			thisMonth.inputTokens += day.tokens.inputTokens
			thisMonth.outputTokens += day.tokens.outputTokens
			thisMonth.cacheCreationTokens += day.tokens.cacheCreationTokens
			thisMonth.cacheReadTokens += day.tokens.cacheReadTokens
			thisMonth.totalCost += day.cost
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
	}
}