import { vi } from "vitest"

export const mockBrowserWindow = {
	getAllWindows: vi.fn(() => []),
	webContents: {
		send: vi.fn(),
	},
	show: vi.fn(),
	hide: vi.fn(),
	minimize: vi.fn(),
	maximize: vi.fn(),
	unmaximize: vi.fn(),
	isMaximized: vi.fn(() => false),
	setAlwaysOnTop: vi.fn(),
	on: vi.fn(),
}

export const mockApp = {
	whenReady: vi.fn(() => Promise.resolve()),
	on: vi.fn(),
	quit: vi.fn(),
	setAppUserModelId: vi.fn(),
}

export const mockIpcMain = {
	handle: vi.fn(),
	on: vi.fn(),
	removeHandler: vi.fn(),
}

export const mockTray = {
	setToolTip: vi.fn(),
	setContextMenu: vi.fn(),
	on: vi.fn(),
}

export const mockMenu = {
	buildFromTemplate: vi.fn(() => ({})),
}

export const mockNativeImage = {
	createFromPath: vi.fn(() => ({
		resize: vi.fn(() => ({})),
	})),
}

// Mock electron module
vi.mock("electron", () => ({
	app: mockApp,
	BrowserWindow: vi.fn(() => mockBrowserWindow),
	Tray: vi.fn(() => mockTray),
	Menu: mockMenu,
	ipcMain: mockIpcMain,
	nativeImage: mockNativeImage,
}))