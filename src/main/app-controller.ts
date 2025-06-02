import type { AppSettings } from "@shared/types";
import { app } from "electron";
import Store from "electron-store";
import { CacheManager } from "./services/cache-manager";
import { DataService } from "./services/data-service";
import { TrayManager } from "./tray/tray-manager";
import { WindowManager } from "./windows/window-manager";

export class AppController {
	public readonly windowManager: WindowManager;
	public readonly trayManager: TrayManager;
	public readonly dataService: DataService;
	public readonly cacheManager: CacheManager;
	private settingsStore: Store<AppSettings>;
	private updateInterval: NodeJS.Timeout | null = null;

	constructor() {
		// Single instance lock
		const gotTheLock = app.requestSingleInstanceLock();
		if (!gotTheLock) {
			app.quit();
			throw new Error("Another instance is already running");
		}

		// Initialize settings store
		this.settingsStore = new Store<AppSettings>({
			name: "settings",
			defaults: {
				general: {
					startAtLogin: false,
					showMenuBarIcon: true,
					showCostInMenuBar: true,
					defaultView: "daily",
					updateFrequency: 30,
					claudeDataDirectory: "",
				},
				appearance: {
					theme: "auto",
					opacity: 1.0,
					windowLevel: "floating",
					fontSize: "medium",
					numberFormat: "locale",
					rememberWindowPosition: true,
					defaultPosition: "top-right",
					defaultMode: "standard",
				},
				notifications: {
					enabled: true,
					dailyLimit: null,
					weeklyLimit: null,
					monthlyLimit: null,
					showSpikes: true,
					soundEnabled: true,
					style: "banner",
				},
				data: {
					retentionDays: 90,
					exportLocation: "",
					enableDiagnostics: false,
					enableCrashReporting: false,
				},
			},
		});

		// Initialize managers
		this.windowManager = new WindowManager();
		this.trayManager = new TrayManager(this.windowManager);
		this.cacheManager = new CacheManager();
		this.dataService = new DataService(
			this.settingsStore.get("general.claudeDataDirectory"),
		);

		// Handle second instance
		app.on("second-instance", () => {
			this.windowManager.showWindow();
		});
	}

	async initialize(): Promise<void> {
		// Create tray icon first
		this.trayManager.create();

		// Initialize data service
		await this.dataService.initialize();

		// Start periodic updates
		this.startPeriodicUpdates();

		// Update tray with initial data
		this.updateTrayWithLatestData();

		// Force another update after a short delay to ensure data is loaded
		setTimeout(() => {
			this.updateTrayWithLatestData();
		}, 2000);

		// Set up app event handlers
		this.setupAppEventHandlers();

		// Apply startup settings
		this.applyStartupSettings();

		// Show window on first launch (development)
		if (process.env.NODE_ENV === "development") {
			this.windowManager.showWindow();
		}
	}

	private setupAppEventHandlers(): void {
		app.on("activate", () => {
			// On macOS, re-create window when dock icon is clicked
			if (!this.windowManager.getMainWindow()) {
				this.windowManager.createMainWindow();
			} else {
				this.windowManager.showWindow();
			}
		});

		app.on("before-quit", () => {
			// Clean up before quitting
			this.cleanup();
		});

		// Handle system theme changes
		if (process.platform === "darwin") {
			import("electron").then(({ nativeTheme }) => {
				nativeTheme.on("updated", () => {
					// Notify renderer about theme change
					const window = this.windowManager.getMainWindow();
					window?.webContents.send(
						"theme:changed",
						nativeTheme.shouldUseDarkColors,
					);
				});
			});
		}
	}

	private applyStartupSettings(): void {
		const settings = this.settingsStore.get();

		// Apply login item setting (skip in development to avoid permission errors)
		if (
			process.platform === "darwin" &&
			process.env.NODE_ENV !== "development"
		) {
			try {
				app.setLoginItemSettings({
					openAtLogin: settings.general.startAtLogin,
					openAsHidden: true,
				});
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Log error
				console.warn("Failed to set login item settings:", error);
			}
		}

		// Show window if configured
		if (settings.general.showMenuBarIcon) {
			// Tray is already created, just ensure it's visible
		}
	}

	private startPeriodicUpdates(): void {
		const updateFrequency =
			this.settingsStore.get("general.updateFrequency") * 1000;

		this.updateInterval = setInterval(() => {
			this.updateTrayWithLatestData();
		}, updateFrequency);

		// Also update immediately
		this.updateTrayWithLatestData();
	}

	private updateTrayWithLatestData(): void {
		const data = this.dataService.getAggregatedData();

		// Try to get today's data, or fall back to most recent day
		let todayData = data.today;
		let todayHourlyData = data.todayHourly;

		if (!todayData && data.daily && data.daily.length > 0) {
			// Use the most recent day's data as "today"
			todayData = data.daily[0];
			
			// Get hourly data for that day
			const dayEntries = data.hourly?.filter(h => 
				h.hour.startsWith(todayData.date)
			) || [];
			todayHourlyData = dayEntries;
		}

		if (todayData) {
			// Calculate current session cost
			let currentSessionCost = 0;

			if (todayHourlyData && todayHourlyData.length > 0) {
				const currentTime = new Date();
				
				// todayHourly is in chronological order, we need to reverse to find the most recent session
				const reversedHours = [...todayHourlyData].reverse();

				// Find the most recent hour with activity
				let sessionStartIndex = -1;
				for (let i = 0; i < reversedHours.length; i++) {
					const hour = reversedHours[i];
					if (hour.cost > 0) {
						sessionStartIndex = i;
						break;
					}
				}

				if (sessionStartIndex >= 0) {
					// Check if this is within the current session window (5 hours)
					const mostRecentActiveHour = reversedHours[sessionStartIndex];
					const hourTime = new Date(mostRecentActiveHour.hour).getTime();
					const timeDiff = currentTime.getTime() - hourTime;
					const hoursDiff = timeDiff / (60 * 60 * 1000);
					
					// If within 5 hours, calculate session cost
					if (hoursDiff < 5) {
						// Calculate session cost starting from this hour going backwards
						for (
							let j = sessionStartIndex;
							j < Math.min(sessionStartIndex + 5, reversedHours.length);
							j++
						) {
							const sessionHour = reversedHours[j];
							currentSessionCost += sessionHour.cost;
						}
					}
				}
			}

			this.trayManager.updateCost(todayData.cost, currentSessionCost);

			// Check for alerts
			const dailyLimit = this.settingsStore.get("notifications.dailyLimit");
			if (dailyLimit && todayData.cost > dailyLimit) {
				this.trayManager.setAlertState(true);
				// TODO: Send notification
			} else {
				this.trayManager.setAlertState(false);
			}
		} else {
			// Show zero if no data
			this.trayManager.updateCost(0, 0);
		}

		// Cache the aggregated data
		this.cacheManager.set("usage-data", data, true);
	}

	getSettings(): AppSettings {
		return this.settingsStore.store;
	}

	updateSettings(path: string, value: any): void {
		this.settingsStore.set(path as any, value);

		// Apply relevant settings immediately
		if (path === "general.updateFrequency") {
			this.restartPeriodicUpdates();
		} else if (
			path === "general.startAtLogin" &&
			process.env.NODE_ENV !== "development"
		) {
			try {
				app.setLoginItemSettings({
					openAtLogin: value,
					openAsHidden: true,
				});
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Log error
				console.warn("Failed to update login item settings:", error);
			}
		}
	}

	private restartPeriodicUpdates(): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
		}
		this.startPeriodicUpdates();
	}

	private cleanup(): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
		}

		this.dataService.destroy();
		this.trayManager.destroy();
		this.windowManager.destroy();
	}
}
