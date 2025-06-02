import { contextBridge, ipcRenderer } from "electron";

// Custom APIs for renderer
const api = {
	ping: () => ipcRenderer.invoke("ping"),

	// Usage data APIs
	usage: {
		requestData: (options: any) =>
			ipcRenderer.invoke("usage:request-data", options),
		refreshData: () => ipcRenderer.invoke("usage:refresh-data"),
		onDataUpdate: (callback: (data: any) => void) => {
			const subscription = (_event: any, data: any) => callback(data);
			ipcRenderer.on("usage:data-update", subscription);
			return () => {
				ipcRenderer.off("usage:data-update", subscription);
			};
		},
	},

	// Settings APIs
	settings: {
		get: (key: string) => ipcRenderer.invoke("settings:get", key),
		set: (key: string, value: any) =>
			ipcRenderer.invoke("settings:set", key, value),
		getAll: () => ipcRenderer.invoke("settings:get-all"),
	},

	// Window control APIs
	window: {
		minimize: () => ipcRenderer.send("window:minimize"),
		close: () => ipcRenderer.send("window:close"),
		toggleMaximize: () => ipcRenderer.send("window:toggle-maximize"),
		setAlwaysOnTop: (value: boolean) =>
			ipcRenderer.send("window:set-always-on-top", value),
		setMode: (mode: "compact" | "standard" | "expanded") =>
			ipcRenderer.send("window:set-mode", mode),
		setOpacity: (value: number) =>
			ipcRenderer.send("window:set-opacity", value),
	},

	// Theme APIs
	theme: {
		onChange: (callback: (isDark: boolean) => void) => {
			const subscription = (_event: any, isDark: boolean) => callback(isDark);
			ipcRenderer.on("theme:changed", subscription);
			return () => {
				ipcRenderer.off("theme:changed", subscription);
			};
		},
	},
};

contextBridge.exposeInMainWorld("electronAPI", api);

export type ElectronAPI = typeof api;
