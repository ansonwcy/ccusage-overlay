import { useSettingsStore } from "../stores/useSettingsStore"

interface TitleBarProps {
	title?: string
	showControls?: boolean
}

export function TitleBar({ title = "Claude Usage", showControls = true }: TitleBarProps) {
	const { windowMode, setWindowMode } = useSettingsStore()
	
	const handleDrag = (e: React.MouseEvent) => {
		// Allow window dragging from title bar
		if ((e.target as HTMLElement).classList.contains("drag-region")) {
			// Electron handles this automatically with -webkit-app-region: drag
		}
	}
	
	return (
		<div 
			className="flex items-center justify-between h-8 px-3 bg-[var(--bg-secondary)] border-b border-[var(--border)] select-none"
			onMouseDown={handleDrag}
		>
			<div className="flex items-center space-x-2 drag-region flex-1">
				<span className="text-sm font-medium">{title}</span>
			</div>
			
			{showControls && (
				<div className="flex items-center space-x-1">
					{/* Window mode toggle */}
					<div className="flex rounded bg-[var(--bg-tertiary)] p-0.5">
						<button
							type="button"
							onClick={() => setWindowMode("compact")}
							className={`px-2 py-0.5 text-xs rounded transition-colors ${
								windowMode === "compact" 
									? "bg-[var(--bg-primary)] text-[var(--text-primary)]" 
									: "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
							}`}
							title="Compact mode"
						>
							━
						</button>
						<button
							type="button"
							onClick={() => setWindowMode("standard")}
							className={`px-2 py-0.5 text-xs rounded transition-colors ${
								windowMode === "standard" 
									? "bg-[var(--bg-primary)] text-[var(--text-primary)]" 
									: "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
							}`}
							title="Standard mode"
						>
							◫
						</button>
						<button
							type="button"
							onClick={() => setWindowMode("expanded")}
							className={`px-2 py-0.5 text-xs rounded transition-colors ${
								windowMode === "expanded" 
									? "bg-[var(--bg-primary)] text-[var(--text-primary)]" 
									: "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
							}`}
							title="Expanded mode"
						>
							◻
						</button>
					</div>
					
					{/* Window controls */}
					<button
						type="button"
						onClick={() => window.electronAPI?.window?.minimize?.()}
						className="w-6 h-6 flex items-center justify-center rounded hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
						title="Minimize"
					>
						<svg width="10" height="1" viewBox="0 0 10 1" fill="currentColor">
							<rect width="10" height="1" />
						</svg>
					</button>
					<button
						type="button"
						onClick={() => window.electronAPI?.window?.close?.()}
						className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-500 hover:text-white text-[var(--text-secondary)]"
						title="Close"
					>
						<svg width="10" height="10" viewBox="0 0 10 10" fill="currentColor">
							<path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" />
						</svg>
					</button>
				</div>
			)}
		</div>
	)
}

// Add CSS for drag region
const style = document.createElement("style")
style.textContent = `
	.drag-region {
		-webkit-app-region: drag;
	}
	.drag-region button,
	.drag-region input,
	.drag-region a {
		-webkit-app-region: no-drag;
	}
`
document.head.appendChild(style)