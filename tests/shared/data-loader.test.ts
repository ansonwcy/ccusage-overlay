import {
	calculateDailySummary,
	calculateProjectSummary,
	calculateSessionSummary,
	formatDate,
	parseJsonlFile,
} from "@shared/data-loader";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	createMockJsonlContent,
	createMockUsageEntry,
	mockFs,
} from "../mocks/fs";

vi.mock("node:fs/promises");

describe("data-loader", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe("formatDate", () => {
		it("should format date correctly", () => {
			expect(formatDate("2024-01-01T12:00:00Z")).toBe("2024-01-01");
			expect(formatDate("2024-12-31T23:59:59Z")).toBe("2024-12-31");
		});
	});

	describe("parseJsonlFile", () => {
		it("should parse valid JSONL file", async () => {
			const entries = [
				createMockUsageEntry({ timestamp: "2024-01-01T10:00:00Z" }),
				createMockUsageEntry({ timestamp: "2024-01-01T11:00:00Z" }),
			];

			mockFs.readFile.mockResolvedValueOnce(
				createMockJsonlContent(entries) as any,
			);

			const result = await parseJsonlFile(
				"/Users/test/.claude/projects/my-project/session-1/20240101_usage.jsonl",
			);

			expect(result).toHaveLength(2);
			expect(result[0]).toMatchObject({
				project: "my-project",
				session: "session-1",
				timestamp: "2024-01-01T10:00:00Z",
			});
		});

		it("should skip malformed lines", async () => {
			const content = `{"valid": "entry", "timestamp": "2024-01-01T10:00:00Z", "message": {"usage": {"input_tokens": 100}}, "costUSD": 0.5}
invalid json line
{"valid": "entry2", "timestamp": "2024-01-01T11:00:00Z", "message": {"usage": {"input_tokens": 200}}, "costUSD": 1.0}`;

			mockFs.readFile.mockResolvedValueOnce(content as any);

			const result = await parseJsonlFile(
				"/Users/test/.claude/projects/my-project/session-1/20240101_usage.jsonl",
			);

			expect(result).toHaveLength(2);
		});

		it("should handle empty file", async () => {
			mockFs.readFile.mockResolvedValueOnce("" as any);

			const result = await parseJsonlFile("/path/to/empty.jsonl");

			expect(result).toHaveLength(0);
		});
	});

	describe("calculateDailySummary", () => {
		it("should aggregate entries by date", () => {
			const entries = [
				createMockUsageEntry({
					timestamp: "2024-01-01T10:00:00Z",
					costUSD: 0.5,
				}),
				createMockUsageEntry({
					timestamp: "2024-01-01T14:00:00Z",
					costUSD: 0.3,
				}),
				createMockUsageEntry({
					timestamp: "2024-01-02T10:00:00Z",
					costUSD: 1.0,
				}),
			];

			const summary = calculateDailySummary(entries);

			expect(summary).toHaveLength(2);
			expect(summary[0]).toMatchObject({
				date: "2024-01-02",
				cost: 1.0,
				entryCount: 1,
			});
			expect(summary[1]).toMatchObject({
				date: "2024-01-01",
				cost: 0.8,
				entryCount: 2,
				tokens: {
					inputTokens: 200,
					outputTokens: 100,
				},
			});
		});

		it("should calculate percentage changes", () => {
			const entries = [
				createMockUsageEntry({
					timestamp: "2024-01-01T10:00:00Z",
					costUSD: 1.0,
				}),
				createMockUsageEntry({
					timestamp: "2024-01-02T10:00:00Z",
					costUSD: 1.5,
				}),
			];

			const summary = calculateDailySummary(entries);

			expect(summary[0].percentChange).toBe(50); // 50% increase
		});
	});

	describe("calculateSessionSummary", () => {
		it("should aggregate entries by session", () => {
			const entries = [
				createMockUsageEntry({
					project: "project-a",
					session: "session-1",
					costUSD: 0.5,
				}),
				createMockUsageEntry({
					project: "project-a",
					session: "session-1",
					costUSD: 0.3,
				}),
				createMockUsageEntry({
					project: "project-b",
					session: "session-2",
					costUSD: 1.0,
				}),
			];

			const summary = calculateSessionSummary(entries);

			expect(summary).toHaveLength(2);
			expect(summary[0]).toMatchObject({
				project: "project-b",
				session: "session-2",
				cost: 1.0,
				entryCount: 1,
			});
			expect(summary[1]).toMatchObject({
				project: "project-a",
				session: "session-1",
				cost: 0.8,
				entryCount: 2,
			});
		});
	});

	describe("calculateProjectSummary", () => {
		it("should aggregate entries by project with percentages", () => {
			const entries = [
				createMockUsageEntry({
					project: "project-a",
					session: "session-1",
					costUSD: 2.0,
				}),
				createMockUsageEntry({
					project: "project-a",
					session: "session-2",
					costUSD: 1.0,
				}),
				createMockUsageEntry({
					project: "project-b",
					session: "session-3",
					costUSD: 1.0,
				}),
			];

			const summary = calculateProjectSummary(entries);

			expect(summary).toHaveLength(2);
			expect(summary[0]).toMatchObject({
				project: "project-a",
				cost: 3.0,
				percentage: 75,
				sessions: 2,
			});
			expect(summary[1]).toMatchObject({
				project: "project-b",
				cost: 1.0,
				percentage: 25,
				sessions: 1,
			});
		});
	});
});
