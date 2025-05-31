import { describe, it, expect } from "vitest"
import {
	calculateTotals,
	formatCost,
	formatTokenCount,
	calculatePercentageChange,
	getChangeSymbol,
	formatPercentage,
} from "@shared/calculate-cost"
import type { DailySummary } from "@shared/types"

describe("calculate-cost utilities", () => {
	describe("calculateTotals", () => {
		it("should calculate totals from daily summaries", () => {
			const data: DailySummary[] = [
				{
					date: "2024-01-01",
					tokens: {
						inputTokens: 100,
						outputTokens: 50,
						cacheCreationTokens: 20,
						cacheReadTokens: 10,
					},
					cost: 0.5,
					entryCount: 5,
				},
				{
					date: "2024-01-02",
					tokens: {
						inputTokens: 200,
						outputTokens: 100,
						cacheCreationTokens: 40,
						cacheReadTokens: 20,
					},
					cost: 1.0,
					entryCount: 10,
				},
			]

			const totals = calculateTotals(data)

			expect(totals.inputTokens).toBe(300)
			expect(totals.outputTokens).toBe(150)
			expect(totals.cacheCreationTokens).toBe(60)
			expect(totals.cacheReadTokens).toBe(30)
			expect(totals.totalCost).toBe(1.5)
		})
	})

	describe("formatCost", () => {
		it("should format cost with dollar sign and two decimals", () => {
			expect(formatCost(10)).toBe("$10.00")
			expect(formatCost(10.5)).toBe("$10.50")
			expect(formatCost(10.123)).toBe("$10.12")
			expect(formatCost(0)).toBe("$0.00")
		})
	})

	describe("formatTokenCount", () => {
		it("should format token count with locale formatting", () => {
			expect(formatTokenCount(1234)).toBe("1,234")
			expect(formatTokenCount(1234567)).toBe("1,234,567")
		})

		it("should format token count in compact mode", () => {
			expect(formatTokenCount(999, true)).toBe("999")
			expect(formatTokenCount(1000, true)).toBe("1.0K")
			expect(formatTokenCount(1500, true)).toBe("1.5K")
			expect(formatTokenCount(1000000, true)).toBe("1.0M")
			expect(formatTokenCount(1500000, true)).toBe("1.5M")
		})
	})

	describe("calculatePercentageChange", () => {
		it("should calculate percentage change correctly", () => {
			expect(calculatePercentageChange(150, 100)).toBe(50)
			expect(calculatePercentageChange(50, 100)).toBe(-50)
			expect(calculatePercentageChange(100, 100)).toBe(0)
		})

		it("should handle zero previous value", () => {
			expect(calculatePercentageChange(100, 0)).toBe(100)
			expect(calculatePercentageChange(0, 0)).toBe(0)
		})
	})

	describe("getChangeSymbol", () => {
		it("should return correct symbol for change", () => {
			expect(getChangeSymbol(10)).toBe("↑")
			expect(getChangeSymbol(-10)).toBe("↓")
			expect(getChangeSymbol(0)).toBe("→")
		})
	})

	describe("formatPercentage", () => {
		it("should format percentage without decimals", () => {
			expect(formatPercentage(10.5)).toBe("11%")
			expect(formatPercentage(-10.5)).toBe("11%")
			expect(formatPercentage(0)).toBe("0%")
		})
	})
})