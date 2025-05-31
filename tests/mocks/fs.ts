import { vi } from "vitest"
import type { UsageEntry } from "@shared/types"

export function createMockUsageEntry(overrides?: Partial<UsageEntry>): UsageEntry {
	return {
		timestamp: "2024-01-01T12:00:00Z",
		message: {
			usage: {
				input_tokens: 100,
				output_tokens: 50,
				cache_creation_input_tokens: 20,
				cache_read_input_tokens: 10,
			},
		},
		costUSD: 0.5,
		project: "test-project",
		session: "test-session",
		filePath: "/path/to/file.jsonl",
		...overrides,
	}
}

export function createMockJsonlContent(entries: UsageEntry[]): string {
	return entries.map((entry) => JSON.stringify(entry)).join("\n")
}

export const mockFs = {
	readFile: vi.fn(),
	readdir: vi.fn(),
	stat: vi.fn(),
	access: vi.fn(),
}

export const mockGlob = vi.fn(() => Promise.resolve([]))

vi.mock("node:fs/promises", () => mockFs)
vi.mock("tinyglobby", () => ({
	glob: mockGlob,
}))