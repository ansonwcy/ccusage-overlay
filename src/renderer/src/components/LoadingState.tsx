export function LoadingState() {
	return (
		<div className="flex flex-col items-center justify-center h-full p-8">
			<div className="relative w-16 h-16">
				<div className="absolute inset-0 border-4 border-[var(--bg-tertiary)] rounded-full" />
				<div className="absolute inset-0 border-4 border-primary border-t-transparent rounded-full animate-spin" />
			</div>
			<p className="mt-4 text-sm text-[var(--text-secondary)]">Loading usage data...</p>
		</div>
	)
}