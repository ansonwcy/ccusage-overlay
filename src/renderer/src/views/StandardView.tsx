import { UsageSummary } from "../components/UsageSummary"
import { ProjectBreakdown } from "../components/ProjectBreakdown"
import { EmptyState } from "../components/EmptyState"
import type { UsageData } from "@shared/types"
import { useSettingsStore } from "../stores/useSettingsStore"

interface StandardViewProps {
	data: UsageData | null
	onRefresh: () => void
}

export function StandardView({ data, onRefresh }: StandardViewProps) {
	const settings = useSettingsStore((state) => state.settings)
	const dailyLimit = settings?.notifications.dailyLimit || undefined
	
	if (!data) {
		return <EmptyState action={{ label: "Refresh", onClick: onRefresh }} />
	}
	
	return (
		<div className="flex flex-col h-full">
			<div className="flex-1 overflow-y-auto">
				<div className="p-4 space-y-4">
					<UsageSummary 
						title="Today" 
						data={data.today} 
						showProgress={!!dailyLimit}
						maxValue={dailyLimit}
					/>
					
					<div className="grid grid-cols-2 gap-4">
						<UsageSummary title="This Week" data={data.thisWeek} />
						<UsageSummary title="This Month" data={data.thisMonth} />
					</div>
				</div>
				
				<div className="border-t border-[var(--border)]">
					<ProjectBreakdown projects={data.projects || []} />
				</div>
			</div>
			
			<div className="border-t border-[var(--border)] p-3 flex justify-center space-x-2">
				<button
					type="button"
					onClick={() => useSettingsStore.getState().setWindowMode("expanded")}
					className="px-3 py-1.5 text-sm bg-primary text-white rounded hover:bg-primary/90 transition-colors"
				>
					▶ Floating Window
				</button>
				<button
					type="button"
					onClick={() => {/* TODO: Open full report */}}
					className="px-3 py-1.5 text-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] rounded hover:bg-[var(--bg-tertiary)]/80 transition-colors"
				>
					📊 Full Report
				</button>
			</div>
		</div>
	)
}