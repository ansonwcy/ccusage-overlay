import { formatCost, formatPercentage } from "@shared/calculate-cost";
import type { ProjectSummary } from "@shared/types";

interface ProjectBreakdownProps {
	projects: ProjectSummary[];
	maxItems?: number;
}

const PROJECT_COLORS = [
	"bg-blue-500",
	"bg-green-500",
	"bg-yellow-500",
	"bg-purple-500",
	"bg-pink-500",
	"bg-indigo-500",
];

export function ProjectBreakdown({
	projects,
	maxItems = 3,
}: ProjectBreakdownProps) {
	if (!projects || projects.length === 0) {
		return (
			<div className="p-4">
				<h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
					Top Projects
				</h3>
				<p className="text-xs text-[var(--text-secondary)]">
					No project data available
				</p>
			</div>
		);
	}

	const topProjects = projects.slice(0, maxItems);
	const hasMore = projects.length > maxItems;

	return (
		<div className="p-4">
			<h3 className="text-sm font-medium text-[var(--text-secondary)] mb-3">
				Top Projects
			</h3>
			<div className="space-y-2">
				{topProjects.map((project, index) => (
					<div
						key={project.project}
						className="flex items-center justify-between"
					>
						<div className="flex items-center space-x-2 flex-1 min-w-0">
							<div
								className={`w-3 h-3 rounded-sm ${PROJECT_COLORS[index % PROJECT_COLORS.length]}`}
							/>
							<span className="text-sm truncate text-[var(--text-primary)]">
								{project.project}
							</span>
						</div>
						<div className="flex items-center space-x-2 flex-shrink-0">
							<span className="text-sm font-medium text-[var(--text-primary)]">
								{formatCost(project.cost)}
							</span>
							<span className="text-xs text-[var(--text-secondary)]">
								({formatPercentage(project.percentage)})
							</span>
						</div>
					</div>
				))}
				{hasMore && (
					<p className="text-xs text-[var(--text-secondary)] mt-2">
						+{projects.length - maxItems} more projects
					</p>
				)}
			</div>
		</div>
	);
}
