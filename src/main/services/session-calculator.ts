import { getCurrentHourEntries } from "@shared/data-loader";
import type { HourlySummary, UsageEntry } from "@shared/types";

export function calculateCurrentSessionCost(
	todayHourlyData: HourlySummary[],
	currentTime: Date = new Date(),
	allEntries?: UsageEntry[],
): number {
	// Get current hour entries from all entries
	const currentHourEntries = allEntries
		? getCurrentHourEntries(allEntries, currentTime)
		: [];

	if (!todayHourlyData || todayHourlyData.length === 0) {
		// If we only have current hour entries, calculate from those
		if (currentHourEntries && currentHourEntries.length > 0) {
			return currentHourEntries.reduce((sum, entry) => sum + entry.costUSD, 0);
		}
		return 0;
	}

	// todayHourly is in chronological order (oldest to newest)
	// Find the most recent hour with activity
	let lastActiveIndex = -1;
	for (let i = todayHourlyData.length - 1; i >= 0; i--) {
		if (todayHourlyData[i].cost > 0) {
			lastActiveIndex = i;
			break;
		}
	}

	if (lastActiveIndex === -1) {
		return 0; // No activity today
	}

	// Check if the last activity is within the session window (5 hours from now)
	const lastActiveHour = todayHourlyData[lastActiveIndex];
	const lastActiveTime = new Date(lastActiveHour.hour).getTime();
	const timeSinceLastActivity = currentTime.getTime() - lastActiveTime;
	const hoursSinceLastActivity = timeSinceLastActivity / (60 * 60 * 1000);

	if (hoursSinceLastActivity >= 5) {
		return 0; // Session has expired
	}

	// Find the start of the current session
	// A session is continuous activity with gaps no longer than 1 hour
	let sessionStart = lastActiveIndex;
	let sessionCost = todayHourlyData[lastActiveIndex].cost;

	// Work backwards from the last active hour
	for (let i = lastActiveIndex - 1; i >= 0 && i >= lastActiveIndex - 4; i--) {
		const hour = todayHourlyData[i];

		// Check if this hour is part of the session
		// Include hours with activity or hours that bridge active hours
		let includeInSession = false;

		if (hour.cost > 0) {
			includeInSession = true;
		} else {
			// Check if this zero-cost hour is between two active hours
			// This handles the case where someone takes a short break
			let hasActivityAfter = false;
			for (let j = i + 1; j <= lastActiveIndex && j <= i + 2; j++) {
				if (todayHourlyData[j] && todayHourlyData[j].cost > 0) {
					hasActivityAfter = true;
					break;
				}
			}

			if (hasActivityAfter) {
				// Check if there's activity before this hour (within 2 hours)
				for (let j = i - 1; j >= Math.max(0, i - 2); j--) {
					if (todayHourlyData[j] && todayHourlyData[j].cost > 0) {
						includeInSession = true;
						break;
					}
				}
			}
		}

		if (includeInSession) {
			sessionStart = i;
			sessionCost += hour.cost;
		} else {
			// Found a gap in activity, session starts after this
			break;
		}
	}

	// Add current hour entries if they exist and are part of the session
	if (currentHourEntries && currentHourEntries.length > 0) {
		// Check if current hour is within session window
		const currentHourStart = new Date(currentTime);
		currentHourStart.setMinutes(0, 0, 0);

		// If we have activity in the last 5 hours, current hour is part of session
		if (hoursSinceLastActivity < 5) {
			const currentHourCost = currentHourEntries.reduce(
				(sum, entry) => sum + entry.costUSD,
				0,
			);
			sessionCost += currentHourCost;
		}
	}

	return sessionCost;
}
