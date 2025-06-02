import { useEffect } from "react";
import { ErrorState } from "./components/ErrorState";
import { LoadingState } from "./components/LoadingState";
import { TitleBar } from "./components/TitleBar";
import { useSettingsStore } from "./stores/useSettingsStore";
import { useSystemTheme, useThemeStore } from "./stores/useThemeStore";
import { useUsageStore } from "./stores/useUsageStore";
import { ExpandedView } from "./views/ExpandedView";

function App(): JSX.Element {
	const {
		data,
		loading,
		error,
		fetchData,
		refreshData,
		viewMode,
		setViewMode,
	} = useUsageStore();
	const { loadSettings } = useSettingsStore();
	const isDark = useThemeStore((state) => state.isDark);

	// Initialize system theme
	useSystemTheme();

	// Load initial data
	useEffect(() => {
		loadSettings();
		fetchData();

		// Subscribe to real-time updates
		let unsubscribe = () => {};
		if (window.electronAPI?.usage?.onDataUpdate) {
			unsubscribe = window.electronAPI.usage.onDataUpdate((payload) => {
				console.log("[Renderer] Received data update:", {
					type: payload.type,
					hasToday: !!payload.data?.today,
					hasTodayHourly: !!payload.data?.todayHourly,
					todayHourlyLength: payload.data?.todayHourly?.length || 0
				});
				useUsageStore.getState().setData(payload.data);
			});
		}

		// Refresh data periodically
		const interval = setInterval(() => {
			fetchData();
		}, 30000); // 30 seconds

		return () => {
			unsubscribe();
			clearInterval(interval);
		};
	}, [fetchData, loadSettings]);

	// Apply theme class to body
	useEffect(() => {
		document.documentElement.classList.toggle("dark", isDark);
	}, [isDark]);

	return (
		<div className="flex flex-col h-screen overflow-hidden bg-[var(--bg-primary)] text-[var(--text-primary)]">
			<TitleBar />

			<div className="flex-1 overflow-hidden">
				{loading && !data && <LoadingState />}
				{error && <ErrorState error={error} onRetry={refreshData} />}
				{!error && data && (
					<ExpandedView
						data={data}
						viewMode={viewMode}
						onViewModeChange={setViewMode}
						onRefresh={refreshData}
					/>
				)}
			</div>
		</div>
	);
}

export default App;
