import { defineConfig } from "vitest/config"
import path from "node:path"

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			exclude: [
				"node_modules/",
				"dist/",
				"out/",
				"**/*.d.ts",
				"**/*.config.*",
				"**/mockData.ts",
			],
			thresholds: {
				lines: 80,
				functions: 80,
				branches: 80,
				statements: 80,
			},
		},
	},
	resolve: {
		alias: {
			"@main": path.resolve(__dirname, "./src/main"),
			"@renderer": path.resolve(__dirname, "./src/renderer"),
			"@shared": path.resolve(__dirname, "./src/shared"),
			"@preload": path.resolve(__dirname, "./src/preload"),
		},
	},
})