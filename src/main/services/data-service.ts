import path from "node:path";
import {
	aggregateUsageData,
	getDefaultClaudePath,
	parseJsonlFile,
} from "@shared/data-loader";
import type { FileChangeEvent, UsageData, UsageEntry } from "@shared/types";
import chokidar from "chokidar";
import { BrowserWindow } from "electron";
import { glob } from "tinyglobby";

export class DataService {
	private watcher: chokidar.FSWatcher | null = null;
	private cache: Map<string, UsageEntry[]> = new Map();
	private claudePath: string;
	private updateQueue: FileChangeEvent[] = [];
	private isProcessing = false;
	private updateTimer: NodeJS.Timeout | null = null;

	constructor(claudePath?: string) {
		this.claudePath = claudePath || getDefaultClaudePath();
	}

	async initialize(): Promise<void> {
		// Initial data load
		await this.loadAllData();

		// Start watching for changes
		this.startWatching();
	}

	private async loadAllData(): Promise<void> {
		const projectsDir = path.join(this.claudePath, "projects");

		const files = await glob(["**/*.jsonl"], {
			cwd: projectsDir,
			absolute: true,
		});

		// Get current time for freshness check
		const now = new Date();
		const currentHour = new Date(now);
		currentHour.setMinutes(0, 0, 0);

		// WORKAROUND: System date is 2025, but data is from 2024
		// Look for most recent files instead of "today"
		const recentFiles: string[] = [];
		const sortedFiles = [...files].sort((a, b) => {
			const aName = path.basename(a);
			const bName = path.basename(b);
			return bName.localeCompare(aName);
		});

		// Get the 10 most recent files
		for (let i = 0; i < Math.min(10, sortedFiles.length); i++) {
			recentFiles.push(sortedFiles[i]);
		}

		// Process files in parallel with concurrency limit
		const BATCH_SIZE = 10;
		let totalEntries = 0;
		for (let i = 0; i < files.length; i += BATCH_SIZE) {
			const batch = files.slice(i, i + BATCH_SIZE);
			await Promise.all(
				batch.map(async (file) => {
					try {
						const entries = await parseJsonlFile(file);
						if (entries.length > 0) {
							this.cache.set(file, entries);
							totalEntries += entries.length;
						}
					} catch (error) {
						// biome-ignore lint/suspicious/noConsole: Log error for debugging
						console.error(`Error loading file ${file}:`, error);
					}
				}),
			);
		}
	}

	private startWatching(): void {
		const watchPath = path.join(this.claudePath, "projects", "**/*.jsonl");

		this.watcher = chokidar.watch(watchPath, {
			persistent: true,
			ignoreInitial: true,
			awaitWriteFinish: {
				stabilityThreshold: 2000,
				pollInterval: 100,
			},
		});

		this.watcher
			.on("add", (filePath) => {
				this.queueFileUpdate(filePath, "add");
			})
			.on("change", (filePath) => {
				this.queueFileUpdate(filePath, "change");
			})
			.on("unlink", (filePath) => {
				this.queueFileUpdate(filePath, "unlink");
			})
			.on("error", (error) => {
				// biome-ignore lint/suspicious/noConsole: Log watcher errors
				console.error("File watcher error:", error);
			});
	}

	private queueFileUpdate(
		filePath: string,
		type: FileChangeEvent["type"],
	): void {
		this.updateQueue.push({
			type,
			path: filePath,
			timestamp: Date.now(),
		});

		// Debounce updates
		if (this.updateTimer) {
			clearTimeout(this.updateTimer);
		}

		this.updateTimer = setTimeout(() => {
			this.processUpdateQueue();
		}, 500);
	}

	private async processUpdateQueue(): Promise<void> {
		if (this.isProcessing || this.updateQueue.length === 0) {
			return;
		}

		this.isProcessing = true;
		const updates = [...this.updateQueue];
		this.updateQueue = [];

		try {
			for (const update of updates) {
				if (update.type === "unlink") {
					this.cache.delete(update.path);
				} else {
					try {
						const entries = await parseJsonlFile(update.path);
						if (entries.length > 0) {
							this.cache.set(update.path, entries);
						} else {
							this.cache.delete(update.path);
						}
					} catch (error) {
						// biome-ignore lint/suspicious/noConsole: Log parsing errors
						console.error(`Error processing file ${update.path}:`, error);
						this.cache.delete(update.path);
					}
				}
			}

			// Notify all windows of the update
			this.broadcastDataUpdate();
		} finally {
			this.isProcessing = false;
		}
	}

	private broadcastDataUpdate(): void {
		const data = this.getAggregatedData();
		const windows = BrowserWindow.getAllWindows();

		for (const window of windows) {
			window.webContents.send("usage:data-update", {
				type: "incremental",
				data,
				timestamp: Date.now(),
			});
		}
	}

	getAggregatedData(): UsageData {
		// Flatten all entries from cache
		const allEntries: UsageEntry[] = [];
		for (const entries of this.cache.values()) {
			allEntries.push(...entries);
		}

		return aggregateUsageData(allEntries);
	}

	async refreshData(): Promise<void> {
		// Clear existing cache
		this.cache.clear();

		// Reload all data
		await this.loadAllData();

		// Broadcast the update
		this.broadcastDataUpdate();
	}

	async getFilteredData(options: {
		dateRange?: { start: Date; end: Date };
		projects?: string[];
	}): Promise<UsageData> {
		let entries: UsageEntry[] = [];

		// Flatten all entries from cache
		for (const fileEntries of this.cache.values()) {
			entries.push(...fileEntries);
		}

		// Apply filters
		if (options.dateRange) {
			const { start, end } = options.dateRange;
			entries = entries.filter((entry) => {
				const entryDate = new Date(entry.timestamp);
				return entryDate >= start && entryDate <= end;
			});
		}

		if (options.projects && options.projects.length > 0) {
			entries = entries.filter((entry) =>
				options.projects?.includes(entry.project || ""),
			);
		}

		return aggregateUsageData(entries);
	}

	destroy(): void {
		if (this.updateTimer) {
			clearTimeout(this.updateTimer);
		}

		if (this.watcher) {
			this.watcher.close();
			this.watcher = null;
		}

		this.cache.clear();
	}
}
