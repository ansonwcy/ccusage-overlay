import { getCurrentHourEntries } from "@shared/data-loader";
import type { AppSettings } from "@shared/types";
import { app } from "electron";
import Store from "electron-store";
import { CacheManager } from "./services/cache-manager";
import { DataService } from "./services/data-service";
import { calculateCurrentSessionCost } from "./services/session-calculator";
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

		// Log notice about multi-monitor limitations
		if (process.platform === "darwin") {
			console.log(
				"Note: On macOS, menu bar icons only appear on the primary display by default.",
			);
			console.log("To show the menu bar on all displays:");
			console.log(
				"1. Go to System Settings > Desktop & Dock > Mission Control",
			);
			console.log("2. Enable 'Displays have separate Spaces'");
			console.log("3. Log out and log back in");
		}

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
			import("electron").then(({ nativeTheme, screen }) => {
				nativeTheme.on("updated", () => {
					// Notify renderer about theme change
					const window = this.windowManager.getMainWindow();
					window?.webContents.send(
						"theme:changed",
						nativeTheme.shouldUseDarkColors,
					);
				});

				// Handle display changes (monitors connected/disconnected)
				screen.on("display-added", () => {
					// Recreate tray to ensure it appears on all displays
					console.log("Display added, refreshing tray...");
					this.refreshTray();
				});

				screen.on("display-removed", () => {
					// Recreate tray to ensure it appears on remaining displays
					console.log("Display removed, refreshing tray...");
					this.refreshTray();
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
			const dayEntries =
				data.hourly?.filter((h) => h.hour.startsWith(todayData.date)) || [];
			todayHourlyData = dayEntries;
		}

		if (todayData || todayHourlyData) {
			// Get all entries to find current hour entries
			const allEntries = this.dataService.getAllEntries();
			const currentHourEntries = getCurrentHourEntries(allEntries);

			// Calculate current hour cost
			const currentHourCost = currentHourEntries.reduce(
				(sum, entry) => sum + entry.costUSD,
				0,
			);

			// Calculate today's total cost by summing all hourly data
			// This matches how the footer calculates it in ExpandedView
			let todayTotalCost = 0;
			if (todayHourlyData && todayHourlyData.length > 0) {
				// Sum up all hourly costs for today
				todayTotalCost = todayHourlyData.reduce(
					(sum, hour) => sum + hour.cost,
					0,
				);
			}

			// Add current hour cost if not already included in hourly data
			// Check if the current hour is already in todayHourlyData
			const now = new Date();
			const currentHourKey = new Date(now);
			currentHourKey.setMinutes(0, 0, 0);
			const currentHourISO = currentHourKey.toISOString();

			const isCurrentHourIncluded =
				todayHourlyData?.some((h) => h.hour === currentHourISO) || false;
			if (!isCurrentHourIncluded && currentHourCost > 0) {
				todayTotalCost += currentHourCost;
			}

			// Calculate current session cost using the session calculator
			const currentSessionCost = calculateCurrentSessionCost(
				todayHourlyData || [],
				new Date(),
				currentHourEntries,
			);

			this.trayManager.updateCost(todayTotalCost, currentSessionCost);

			// Check for alerts
			const dailyLimit = this.settingsStore.get("notifications.dailyLimit");
			if (dailyLimit && todayTotalCost > dailyLimit) {
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

	private refreshTray(): void {
		// Store current cost values
		const currentCost = this.trayManager.currentCost || 0;
		const currentSessionCost = this.trayManager.currentSessionCost || 0;

		// Destroy and recreate tray
		this.trayManager.destroy();
		this.trayManager.create();

		// Restore cost values
		this.trayManager.updateCost(currentCost, currentSessionCost);
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
