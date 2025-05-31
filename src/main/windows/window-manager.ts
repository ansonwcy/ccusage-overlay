import { BrowserWindow, screen, shell } from "electron"
import Store from "electron-store"
import path from "node:path"
import { fileURLToPath } from "node:url"
import type { WindowMode, WindowState } from "@shared/types"

const __windowFilename = fileURLToPath(import.meta.url)
const __windowDirname = path.dirname(__windowFilename)

interface WindowStore {
	windowState: WindowState
}

export class WindowManager {
	private mainWindow: BrowserWindow | null = null
	private store: Store<WindowStore>
	private isDev = process.env.NODE_ENV === "development"

	constructor() {
		this.store = new Store<WindowStore>({
			name: "window-state",
			defaults: {
				windowState: {
					mode: "standard",
					position: { x: 100, y: 100 },
					size: { width: 320, height: 280 },
					isAlwaysOnTop: false,
					opacity: 1.0,
				},
			},
		})
	}

	createMainWindow(): BrowserWindow {
		const state = this.store.get("windowState")
		const { workArea } = screen.getPrimaryDisplay()

		// Ensure window is within screen bounds
		const x = Math.min(Math.max(state.position.x, workArea.x), workArea.x + workArea.width - state.size.width)
		const y = Math.min(Math.max(state.position.y, workArea.y), workArea.y + workArea.height - state.size.height)

		this.mainWindow = new BrowserWindow({
			x,
			y,
			width: state.size.width,
			height: state.size.height,
			show: false,
			frame: false,
			resizable: true,
			movable: true,
			minimizable: true,
			maximizable: false,
			fullscreenable: false,
			alwaysOnTop: state.isAlwaysOnTop,
			skipTaskbar: true,
			opacity: state.opacity,
			backgroundColor: "#00000000",
			hasShadow: true,
			roundedCorners: true,
			vibrancy: "under-window",
			visualEffectState: "active",
			titleBarStyle: "hidden",
			trafficLightPosition: { x: -100, y: -100 }, // Hide traffic lights
			webPreferences: {
				preload: path.join(__windowDirname, "../preload/index.mjs"),
				sandbox: false,
				contextIsolation: true,
				nodeIntegration: false,
			},
		})

		// Handle window events
		this.mainWindow.on("moved", () => this.saveWindowState())
		this.mainWindow.on("resized", () => this.saveWindowState())
		
		this.mainWindow.on("ready-to-show", () => {
			this.mainWindow?.show()
		})

		this.mainWindow.on("close", (event) => {
			event.preventDefault()
			this.mainWindow?.hide()
		})

		this.mainWindow.on("closed", () => {
			this.mainWindow = null
		})

		// Handle external links
		this.mainWindow.webContents.setWindowOpenHandler((details) => {
			shell.openExternal(details.url)
			return { action: "deny" }
		})

		// Load the app
		if (this.isDev) {
			// In development, load from vite dev server
			this.mainWindow.loadURL("http://localhost:5173")
		} else {
			this.mainWindow.loadFile(path.join(__windowDirname, "../renderer/index.html"))
		}

		// Open DevTools in development
		// Enable DevTools for debugging the blank window issue
		if (this.isDev) {
			this.mainWindow.webContents.openDevTools({ mode: "detach" })
		}

		return this.mainWindow
	}

	getMainWindow(): BrowserWindow | null {
		return this.mainWindow
	}

	showWindow(): void {
		if (!this.mainWindow) {
			this.createMainWindow()
		} else {
			this.mainWindow.show()
			this.mainWindow.focus()
		}
	}

	hideWindow(): void {
		this.mainWindow?.hide()
	}

	toggleWindow(): void {
		if (this.mainWindow?.isVisible()) {
			this.hideWindow()
		} else {
			this.showWindow()
		}
	}

	setWindowMode(mode: WindowMode): void {
		if (!this.mainWindow) return

		const sizes = {
			compact: { width: 200, height: 40 },
			standard: { width: 320, height: 280 },
			expanded: { width: 400, height: 500 },
		}

		const size = sizes[mode]
		this.mainWindow.setSize(size.width, size.height, true)
		
		// Update click-through for compact mode
		this.mainWindow.setIgnoreMouseEvents(mode === "compact", { forward: true })
		
		// Save the new mode
		const state = this.store.get("windowState")
		state.mode = mode
		state.size = size
		this.store.set("windowState", state)
	}

	setAlwaysOnTop(value: boolean): void {
		this.mainWindow?.setAlwaysOnTop(value)
		const state = this.store.get("windowState")
		state.isAlwaysOnTop = value
		this.store.set("windowState", state)
	}

	setOpacity(value: number): void {
		const opacity = Math.max(0.5, Math.min(1.0, value))
		this.mainWindow?.setOpacity(opacity)
		const state = this.store.get("windowState")
		state.opacity = opacity
		this.store.set("windowState", state)
	}

	private saveWindowState(): void {
		if (!this.mainWindow) return

		const bounds = this.mainWindow.getBounds()
		const state = this.store.get("windowState")
		
		state.position = { x: bounds.x, y: bounds.y }
		state.size = { width: bounds.width, height: bounds.height }
		
		this.store.set("windowState", state)
	}

	positionWindowNearTray(trayBounds: Electron.Rectangle): void {
		if (!this.mainWindow) return

		const windowBounds = this.mainWindow.getBounds()
		const { workArea } = screen.getPrimaryDisplay()

		let x = Math.round(trayBounds.x + trayBounds.width / 2 - windowBounds.width / 2)
		let y = Math.round(trayBounds.y + trayBounds.height + 4)

		// Ensure window is within screen bounds
		if (x + windowBounds.width > workArea.x + workArea.width) {
			x = workArea.x + workArea.width - windowBounds.width
		}
		if (x < workArea.x) {
			x = workArea.x
		}
		if (y + windowBounds.height > workArea.y + workArea.height) {
			y = trayBounds.y - windowBounds.height - 4
		}

		this.mainWindow.setPosition(x, y, false)
	}

	destroy(): void {
		if (this.mainWindow) {
			this.mainWindow.destroy()
			this.mainWindow = null
		}
	}
}