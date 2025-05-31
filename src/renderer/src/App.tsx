import { useEffect } from "react"
import { useUsageStore } from "./stores/useUsageStore"
import { useSettingsStore } from "./stores/useSettingsStore"
import { useSystemTheme, useThemeStore } from "./stores/useThemeStore"
import { TitleBar } from "./components/TitleBar"
import { LoadingState } from "./components/LoadingState"
import { ErrorState } from "./components/ErrorState"
import { CompactView } from "./views/CompactView"
import { StandardView } from "./views/StandardView"
import { ExpandedView } from "./views/ExpandedView"
import clsx from "clsx"

function App(): JSX.Element {
	const { data, loading, error, fetchData, viewMode, setViewMode } = useUsageStore()
	const { windowMode, loadSettings } = useSettingsStore()
	const isDark = useThemeStore((state) => state.isDark)
	
	// Initialize system theme
	useSystemTheme()
	
	// Load initial data
	useEffect(() => {
		loadSettings()
		fetchData()
		
		// Subscribe to real-time updates
		let unsubscribe = () => {}
		if (window.electronAPI?.usage?.onDataUpdate) {
			unsubscribe = window.electronAPI.usage.onDataUpdate((newData) => {
				useUsageStore.getState().setData(newData)
			})
		}
		
		// Refresh data periodically
		const interval = setInterval(() => {
			fetchData()
		}, 30000) // 30 seconds
		
		return () => {
			unsubscribe()
			clearInterval(interval)
		}
	}, [fetchData, loadSettings])
	
	// Apply theme class to body
	useEffect(() => {
		document.documentElement.classList.toggle("dark", isDark)
	}, [isDark])
	
	const showTitleBar = windowMode !== "compact"
	
	return (
		<div className={clsx(
			"flex flex-col h-screen overflow-hidden",
			"bg-[var(--bg-primary)] text-[var(--text-primary)]",
			{
				"rounded-lg": windowMode === "compact",
			}
		)}>
			{showTitleBar && <TitleBar />}
			
			<div className="flex-1 overflow-hidden">
				{loading && <LoadingState />}
				{error && <ErrorState error={error} onRetry={fetchData} />}
				{!loading && !error && (
					<>
						{windowMode === "compact" && <CompactView data={data} />}
						{windowMode === "standard" && <StandardView data={data} onRefresh={fetchData} />}
						{windowMode === "expanded" && (
							<ExpandedView 
								data={data} 
								viewMode={viewMode}
								onViewModeChange={setViewMode}
								onRefresh={fetchData}
							/>
						)}
					</>
				)}
			</div>
		</div>
	)
}

export default App