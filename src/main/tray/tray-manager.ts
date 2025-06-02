import path from "node:path";
import { fileURLToPath } from "node:url";
import { formatCost } from "@shared/calculate-cost";
import { Menu, Tray, app, nativeImage } from "electron";
import type { WindowManager } from "../windows/window-manager";

const __trayFilename = fileURLToPath(import.meta.url);
const __trayDirname = path.dirname(__trayFilename);

export class TrayManager {
	private tray: Tray | null = null;
	private windowManager: WindowManager;
	public currentCost = 0;
	public currentSessionCost = 0;
	private isAlertState = false;

	constructor(windowManager: WindowManager) {
		this.windowManager = windowManager;
	}

	create(): void {
		// Create tray icon
		const iconPath = path.join(__trayDirname, "../../../../resources/icon.png");
		const icon = this.createTrayIcon(iconPath);

		this.tray = new Tray(icon);
		this.updateTooltip();

		// Set initial title
		this.tray.setTitle("Loading...");
		
		// Ensure the tray is visible on all displays
		// This is particularly important for multi-monitor setups
		if (process.platform === "darwin") {
			// Force the tray to refresh its position
			this.tray.setImage(icon);
		}

		// Set up click handlers
		this.tray.on("click", () => {
			this.handleClick();
		});

		this.tray.on("right-click", () => {
			this.showContextMenu();
		});

		// Double-click to open expanded view (macOS)
		this.tray.on("double-click", () => {
			this.windowManager.showWindow();
			this.windowManager.setWindowMode("expanded");
		});
	}

	private createTrayIcon(iconPath: string): Electron.NativeImage {
		// Create a base icon
		let icon = nativeImage.createFromPath(iconPath);

		if (icon.isEmpty()) {
			// Create a small transparent icon as fallback
			icon = nativeImage.createEmpty();
		}

		// Resize for menu bar (16x16 on regular displays, 32x32 on retina)
		icon = icon.resize({ width: 16, height: 16 });

		// Make it a template image for macOS (will adapt to light/dark mode)
		if (process.platform === "darwin") {
			icon.setTemplateImage(true);
		}

		return icon;
	}

	updateCost(cost: number, sessionCost = 0): void {
		if (!this.tray) return;

		this.currentCost = cost;
		this.currentSessionCost = sessionCost;
		this.updateTooltip();

		// Update tray title (shows next to icon on macOS)
		const showCostInMenuBar = true; // TODO: Get from settings
		if (showCostInMenuBar) {
			let title = formatCost(cost);
			if (sessionCost > 0) {
				title += ` (${formatCost(sessionCost)})`;
			}
			this.tray.setTitle(title);
		} else {
			this.tray.setTitle("");
		}
	}

	setAlertState(isAlert: boolean): void {
		this.isAlertState = isAlert;
		// TODO: Update icon to show alert state
		this.updateTooltip();
	}

	private updateTooltip(): void {
		if (!this.tray) return;

		const baseTooltip = "Claude Usage";
		const costInfo = formatCost(this.currentCost);
		const alertInfo = this.isAlertState ? " ⚠️ Limit exceeded" : "";

		this.tray.setToolTip(`${baseTooltip} - Today: ${costInfo}${alertInfo}`);
	}

	private handleClick(): void {
		if (!this.tray) return;

		const trayBounds = this.tray.getBounds();
		const window = this.windowManager.getMainWindow();

		if (window?.isVisible()) {
			this.windowManager.hideWindow();
		} else {
			this.windowManager.showWindow();
			this.windowManager.positionWindowNearTray(trayBounds);
		}
	}

	private showContextMenu(): void {
		if (!this.tray) return;

		const contextMenu = Menu.buildFromTemplate([
			{
				label: "Show Window",
				click: () => this.windowManager.showWindow(),
			},
			{
				label: "Hide Window",
				click: () => this.windowManager.hideWindow(),
			},
			{ type: "separator" },
			{
				label: "View Mode",
				submenu: [
					{
						label: "Compact",
						type: "radio",
						click: () => this.windowManager.setWindowMode("compact"),
					},
					{
						label: "Standard",
						type: "radio",
						checked: true,
						click: () => this.windowManager.setWindowMode("standard"),
					},
					{
						label: "Expanded",
						type: "radio",
						click: () => this.windowManager.setWindowMode("expanded"),
					},
				],
			},
			{ type: "separator" },
			{
				label: "Always on Top",
				type: "checkbox",
				checked: false,
				click: (item) => this.windowManager.setAlwaysOnTop(item.checked),
			},
			{ type: "separator" },
			{
				label: "Settings...",
				accelerator: "CmdOrCtrl+,",
				click: () => {
					// TODO: Open settings window
					this.windowManager.showWindow();
				},
			},
			{ type: "separator" },
			{
				label: "About Claude Usage",
				click: () => {
					// TODO: Show about dialog
				},
			},
			{
				label: "Quit",
				accelerator: "CmdOrCtrl+Q",
				click: () => {
					app.quit();
				},
			},
		]);

		this.tray.popUpContextMenu(contextMenu);
	}

	getTray(): Tray | null {
		return this.tray;
	}

	destroy(): void {
		if (this.tray) {
			this.tray.destroy();
			this.tray = null;
		}
	}
}
