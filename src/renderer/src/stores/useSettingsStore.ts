import type { AppSettings, WindowMode } from "@shared/types";
import { create } from "zustand";

interface SettingsStore {
	settings: AppSettings | null;
	windowMode: WindowMode;
	isAlwaysOnTop: boolean;
	opacity: number;

	// Actions
	loadSettings: () => Promise<void>;
	updateSetting: (path: string, value: any) => Promise<void>;
	setWindowMode: (mode: WindowMode) => void;
	setAlwaysOnTop: (value: boolean) => void;
	setOpacity: (value: number) => void;
}

export const useSettingsStore = create<SettingsStore>((set, get) => ({
	settings: null,
	windowMode: "expanded" as WindowMode,
	isAlwaysOnTop: false,
	opacity: 1.0,

	loadSettings: async () => {
		try {
			if (!window.electronAPI?.settings?.getAll) {
				throw new Error("Electron API not available");
			}
			const settings = await window.electronAPI.settings.getAll();
			set({ settings });
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Log error
			console.error("Failed to load settings:", error);
		}
	},

	updateSetting: async (path: string, value: any) => {
		try {
			if (!window.electronAPI?.settings?.set) {
				throw new Error("Electron API not available");
			}
			await window.electronAPI.settings.set(path, value);
			// Reload settings to ensure consistency
			await get().loadSettings();
		} catch (error) {
			// biome-ignore lint/suspicious/noConsole: Log error
			console.error("Failed to update setting:", error);
		}
	},

	setWindowMode: (mode) => {
		// Always use expanded mode
		set({ windowMode: "expanded" as WindowMode });
		if (window.electronAPI?.window?.setMode) {
			window.electronAPI.window.setMode("expanded" as WindowMode);
		}
	},

	setAlwaysOnTop: (value) => {
		set({ isAlwaysOnTop: value });
		if (window.electronAPI?.window?.setAlwaysOnTop) {
			window.electronAPI.window.setAlwaysOnTop(value);
		}
	},

	setOpacity: (value) => {
		set({ opacity: value });
		if (window.electronAPI?.window?.setOpacity) {
			window.electronAPI.window.setOpacity(value);
		}
	},
}));
