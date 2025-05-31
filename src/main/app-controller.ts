import { app } from "electron"
import { WindowManager } from "./windows/window-manager"
import { TrayManager } from "./tray/tray-manager"
import { DataService } from "./services/data-service"
import { CacheManager } from "./services/cache-manager"
import Store from "electron-store"
import type { AppSettings } from "@shared/types"

export class AppController {
	public readonly windowManager: WindowManager
	public readonly trayManager: TrayManager
	public readonly dataService: DataService
	public readonly cacheManager: CacheManager
	private settingsStore: Store<AppSettings>
	private updateInterval: NodeJS.Timeout | null = null

	constructor() {
		// Single instance lock
		const gotTheLock = app.requestSingleInstanceLock()
		if (!gotTheLock) {
			app.quit()
			throw new Error("Another instance is already running")
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
		})

		// Initialize managers
		this.windowManager = new WindowManager()
		this.trayManager = new TrayManager(this.windowManager)
		this.cacheManager = new CacheManager()
		this.dataService = new DataService(this.settingsStore.get("general.claudeDataDirectory"))

		// Handle second instance
		app.on("second-instance", () => {
			this.windowManager.showWindow()
		})
	}

	async initialize(): Promise<void> {
		// Create tray icon first
		this.trayManager.create()

		// Initialize data service
		await this.dataService.initialize()

		// Start periodic updates
		this.startPeriodicUpdates()

		// Update tray with initial data
		this.updateTrayWithLatestData()

		// Set up app event handlers
		this.setupAppEventHandlers()

		// Apply startup settings
		this.applyStartupSettings()
		
		// Show window on first launch (development)
		if (process.env.NODE_ENV === "development") {
			this.windowManager.showWindow()
		}
	}

	private setupAppEventHandlers(): void {
		app.on("activate", () => {
			// On macOS, re-create window when dock icon is clicked
			if (!this.windowManager.getMainWindow()) {
				this.windowManager.createMainWindow()
			} else {
				this.windowManager.showWindow()
			}
		})

		app.on("before-quit", () => {
			// Clean up before quitting
			this.cleanup()
		})

		// Handle system theme changes
		if (process.platform === "darwin") {
			import("electron").then(({ nativeTheme }) => {
				nativeTheme.on("updated", () => {
					// Notify renderer about theme change
					const window = this.windowManager.getMainWindow()
					window?.webContents.send("theme:changed", nativeTheme.shouldUseDarkColors)
				})
			})
		}
	}

	private applyStartupSettings(): void {
		const settings = this.settingsStore.get()

		// Apply login item setting (skip in development to avoid permission errors)
		if (process.platform === "darwin" && process.env.NODE_ENV !== "development") {
			try {
				app.setLoginItemSettings({
					openAtLogin: settings.general.startAtLogin,
					openAsHidden: true,
				})
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Log error
				console.warn("Failed to set login item settings:", error)
			}
		}

		// Show window if configured
		if (settings.general.showMenuBarIcon) {
			// Tray is already created, just ensure it's visible
		}
	}

	private startPeriodicUpdates(): void {
		const updateFrequency = this.settingsStore.get("general.updateFrequency") * 1000

		this.updateInterval = setInterval(() => {
			this.updateTrayWithLatestData()
		}, updateFrequency)

		// Also update immediately
		this.updateTrayWithLatestData()
	}

	private updateTrayWithLatestData(): void {
		const data = this.dataService.getAggregatedData()
		
		if (data.today) {
			this.trayManager.updateCost(data.today.cost)
			
			// Check for alerts
			const dailyLimit = this.settingsStore.get("notifications.dailyLimit")
			if (dailyLimit && data.today.cost > dailyLimit) {
				this.trayManager.setAlertState(true)
				// TODO: Send notification
			} else {
				this.trayManager.setAlertState(false)
			}
		}

		// Cache the aggregated data
		this.cacheManager.set("usage-data", data, true)
	}

	getSettings(): AppSettings {
		return this.settingsStore.store
	}

	updateSettings(path: string, value: any): void {
		this.settingsStore.set(path as any, value)
		
		// Apply relevant settings immediately
		if (path === "general.updateFrequency") {
			this.restartPeriodicUpdates()
		} else if (path === "general.startAtLogin" && process.env.NODE_ENV !== "development") {
			try {
				app.setLoginItemSettings({
					openAtLogin: value,
					openAsHidden: true,
				})
			} catch (error) {
				// biome-ignore lint/suspicious/noConsole: Log error
				console.warn("Failed to update login item settings:", error)
			}
		}
	}

	private restartPeriodicUpdates(): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval)
		}
		this.startPeriodicUpdates()
	}

	private cleanup(): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval)
		}
		
		this.dataService.destroy()
		this.trayManager.destroy()
		this.windowManager.destroy()
	}
}