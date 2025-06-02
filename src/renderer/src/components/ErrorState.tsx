interface ErrorStateProps {
	error: string;
	onRetry?: () => void;
}

export function ErrorState({ error, onRetry }: ErrorStateProps) {
	return (
		<div className="flex flex-col items-center justify-center h-full p-8 text-center">
			<svg
				className="w-12 h-12 text-danger mb-4"
				fill="none"
				stroke="currentColor"
				viewBox="0 0 24 24"
			>
				<path
					strokeLinecap="round"
					strokeLinejoin="round"
					strokeWidth={2}
					d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
				/>
			</svg>
			<h3 className="text-lg font-medium text-[var(--text-primary)] mb-2">
				Error Loading Data
			</h3>
			<p className="text-sm text-[var(--text-secondary)] mb-4 max-w-xs">
				{error}
			</p>
			{onRetry && (
				<button
					type="button"
					onClick={onRetry}
					className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors"
				>
					Try Again
				</button>
			)}
		</div>
	);
}
