// Token usage and cost types (matching ccusage CLI)
export interface TokenTotals {
	inputTokens: number;
	outputTokens: number;
	cacheCreationTokens: number;
	cacheReadTokens: number;
	totalCost: number;
}

export interface TokenData {
	inputTokens: number;
	outputTokens: number;
	cacheCreationTokens: number;
	cacheReadTokens: number;
}

// Claude usage entry from JSONL files
export interface UsageEntry {
	timestamp: string;
	message: {
		usage: {
			input_tokens?: number;
			output_tokens?: number;
			cache_creation_input_tokens?: number;
			cache_read_input_tokens?: number;
		};
	};
	costUSD: number;
	project?: string;
	session?: string;
	filePath?: string;
}

// Aggregated data types
export interface DailySummary {
	date: string;
	tokens: TokenData;
	cost: number;
	entryCount: number;
	percentChange?: number;
}

export interface SessionSummary {
	project: string;
	session: string;
	tokens: TokenData;
	cost: number;
	startTime: string;
	endTime: string;
	entryCount: number;
}

export interface ProjectSummary {
	project: string;
	tokens: TokenData;
	cost: number;
	percentage: number;
	sessions: number;
}

export interface HourlySummary {
	hour: string; // ISO timestamp for the hour (e.g., "2024-05-31T10:00:00")
	hourLabel: string; // Display label (e.g., "10:00 AM")
	tokens: TokenData;
	cost: number;
	entryCount: number;
}

// UI-specific types
export interface UsageData {
	daily: DailySummary[];
	sessions: SessionSummary[];
	projects: ProjectSummary[];
	hourly: HourlySummary[]; // Last 24 hours
	todayHourly: HourlySummary[]; // Today's hours only
	today: DailySummary | null;
	thisWeek: TokenTotals;
	thisMonth: TokenTotals;
}

export interface DateRange {
	start: Date;
	end: Date;
}

export type ViewMode = "daily" | "hourly";
export type WindowMode = "expanded";
export type Theme = "auto" | "light" | "dark" | "high-contrast";

// Settings types
export interface AppSettings {
	general: {
		startAtLogin: boolean;
		showMenuBarIcon: boolean;
		showCostInMenuBar: boolean;
		defaultView: ViewMode;
		updateFrequency: number; // seconds
		claudeDataDirectory: string;
	};
	appearance: {
		theme: Theme;
		opacity: number; // 0.5 to 1.0
		windowLevel: "normal" | "floating" | "desktop";
		fontSize: "small" | "medium" | "large";
		numberFormat: "locale" | "compact";
		rememberWindowPosition: boolean;
		defaultPosition:
			| "top-left"
			| "top-right"
			| "bottom-left"
			| "bottom-right"
			| "center";
		defaultMode: WindowMode;
	};
	notifications: {
		enabled: boolean;
		dailyLimit: number | null;
		weeklyLimit: number | null;
		monthlyLimit: number | null;
		showSpikes: boolean;
		soundEnabled: boolean;
		style: "banner" | "alert" | "none";
	};
	data: {
		retentionDays: number;
		exportLocation: string;
		enableDiagnostics: boolean;
		enableCrashReporting: boolean;
	};
}

// IPC message types
export interface IpcRequest<T = any> {
	id: string;
	timestamp: number;
	data: T;
}

export interface IpcResponse<T = any> {
	id: string;
	success: boolean;
	data?: T;
	error?: string;
}

export interface DataUpdateEvent {
	type: "full" | "incremental";
	data: UsageData;
	timestamp: number;
}

// File watcher events
export interface FileChangeEvent {
	type: "add" | "change" | "unlink";
	path: string;
	timestamp: number;
}

// Window state
export interface WindowState {
	mode: WindowMode;
	position: { x: number; y: number };
	size: { width: number; height: number };
	isAlwaysOnTop: boolean;
	opacity: number;
}

// Export types
export type ExportFormat = "json" | "csv" | "pdf";

export interface ExportOptions {
	format: ExportFormat;
	dateRange: DateRange;
	includeProjects?: string[];
	excludeProjects?: string[];
}
