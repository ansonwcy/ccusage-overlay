import type { UsageData, ViewMode } from "@shared/types";
import { create } from "zustand";

interface UsageStore {
	data: UsageData | null;
	loading: boolean;
	error: string | null;
	viewMode: ViewMode;
	lastUpdated: Date | null;

	// Actions
	setData: (data: UsageData) => void;
	setLoading: (loading: boolean) => void;
	setError: (error: string | null) => void;
	setViewMode: (mode: ViewMode) => void;
	fetchData: () => Promise<void>;
	refreshData: () => Promise<void>;
}

export const useUsageStore = create<UsageStore>((set, get) => ({
	data: null,
	loading: true,
	error: null,
	viewMode: "hourly",
	lastUpdated: null,

	setData: (data) => set({ data, lastUpdated: new Date(), error: null }),
	setLoading: (loading) => set({ loading }),
	setError: (error) => set({ error, loading: false }),
	setViewMode: (viewMode) => set({ viewMode }),

	fetchData: async () => {
		set({ loading: true, error: null });
		try {
			if (!window.electronAPI?.usage?.requestData) {
				throw new Error("Electron API not available");
			}
			const data = await window.electronAPI.usage.requestData({
				view: get().viewMode,
			});
			set({ data, loading: false, lastUpdated: new Date() });
		} catch (error) {
			set({
				error: error instanceof Error ? error.message : "Failed to fetch data",
				loading: false,
			});
		}
	},

	refreshData: async () => {
		set({ loading: true, error: null });
		try {
			if (!window.electronAPI?.usage?.refreshData) {
				throw new Error("Electron API not available");
			}
			console.log("Refreshing all data...");
			const data = await window.electronAPI.usage.refreshData();
			set({ data, loading: false, lastUpdated: new Date() });
			console.log("Data refreshed successfully");
		} catch (error) {
			set({
				error:
					error instanceof Error ? error.message : "Failed to refresh data",
				loading: false,
			});
		}
	},
}));
