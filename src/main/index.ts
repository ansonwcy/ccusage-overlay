import { app, ipcMain } from "electron";
import { AppController } from "./app-controller";

// Disable security warnings in development
if (process.env.NODE_ENV === "development") {
	process.env["ELECTRON_DISABLE_SECURITY_WARNINGS"] = "true";
}

let appController: AppController | null = null;

// Handle unhandled errors
process.on("uncaughtException", (error) => {
	// biome-ignore lint/suspicious/noConsole: Required for error logging
	console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (error) => {
	// biome-ignore lint/suspicious/noConsole: Required for error logging
	console.error("Unhandled Rejection:", error);
});

// IPC Handlers
function setupIpcHandlers(controller: AppController): void {
	// Test handler
	ipcMain.handle("ping", () => "pong");

	// Usage data handlers
	ipcMain.handle("usage:request-data", async (_event, options) => {
		// The AppController's DataService handles this
		const data = controller.dataService.getAggregatedData();
		console.log("[IPC] Sending data to renderer:", {
			hasToday: !!data.today,
			hasTodayHourly: !!data.todayHourly,
			todayHourlyLength: data.todayHourly?.length || 0
		});
		return data;
	});

	ipcMain.handle("usage:refresh-data", async () => {
		// Force refresh all data
		await controller.dataService.refreshData();
		return controller.dataService.getAggregatedData();
	});

	// Settings handlers
	ipcMain.handle("settings:get", async (_event, key: string) => {
		const settings = controller.getSettings();
		return key.split(".").reduce((obj, k) => obj?.[k], settings as any);
	});

	ipcMain.handle("settings:set", async (_event, key: string, value: any) => {
		controller.updateSettings(key, value);
	});

	ipcMain.handle("settings:get-all", async () => {
		return controller.getSettings();
	});

	// Window control handlers
	ipcMain.on("window:minimize", () => {
		controller.windowManager.getMainWindow()?.minimize();
	});

	ipcMain.on("window:close", () => {
		controller.windowManager.hideWindow();
	});

	ipcMain.on("window:toggle-maximize", () => {
		const window = controller.windowManager.getMainWindow();
		if (window?.isMaximized()) {
			window.unmaximize();
		} else {
			window?.maximize();
		}
	});

	ipcMain.on("window:set-always-on-top", (_event, value: boolean) => {
		controller.windowManager.setAlwaysOnTop(value);
	});

	ipcMain.on(
		"window:set-mode",
		(_event, mode: "compact" | "standard" | "expanded") => {
			controller.windowManager.setWindowMode(mode);
		},
	);

	ipcMain.on("window:set-opacity", (_event, value: number) => {
		controller.windowManager.setOpacity(value);
	});
}

// App initialization
app.whenReady().then(async () => {
	try {
		// Configure app for menu bar
		if (process.platform === "darwin") {
			// Ensure app stays active
			app.dock?.hide(); // Hide dock icon on macOS for menu bar apps

			// Set activation policy to accessory to ensure menu bar appears on all screens
			// This is important for multi-monitor setups
			app.setActivationPolicy("accessory");
		}

		// Create and initialize the app controller
		appController = new AppController();
		await appController.initialize();

		// Set up IPC handlers
		setupIpcHandlers(appController);

		// Log successful startup
		// biome-ignore lint/suspicious/noConsole: Required for startup logging
		console.log("Claude Usage Overlay started successfully");
		console.log("App is ready, dock hidden:", !app.dock?.isVisible());
	} catch (error) {
		// biome-ignore lint/suspicious/noConsole: Required for error logging
		console.error("Failed to initialize app:", error);
		app.quit();
	}
});

// Prevent app from quitting when all windows are closed (macOS behavior)
app.on("window-all-closed", () => {
	// On macOS, keep the app running even when all windows are closed
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// Export for testing
export { appController };
