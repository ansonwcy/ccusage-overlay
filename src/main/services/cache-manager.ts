import type { UsageData } from "@shared/types";
import Store from "electron-store";

interface CacheEntry<T> {
	value: T;
	timestamp: number;
	size: number;
}

interface CacheSchema {
	usageData: CacheEntry<UsageData>;
	lastSync: number;
	version: number;
}

export class CacheManager {
	private memoryCache = new Map<string, CacheEntry<any>>();
	private persistentStore: Store<CacheSchema>;
	private maxMemorySize = 10 * 1024 * 1024; // 10MB
	private currentMemorySize = 0;

	constructor() {
		this.persistentStore = new Store<CacheSchema>({
			name: "usage-cache",
			encryptionKey: "claude-usage-overlay-encryption-key",
			schema: {
				version: {
					type: "number",
					default: 1,
				},
				lastSync: {
					type: "number",
					default: 0,
				},
				usageData: {
					type: "object",
					properties: {
						value: { type: "object" },
						timestamp: { type: "number" },
						size: { type: "number" },
					},
				},
			},
		});

		// Load persistent cache on startup
		this.loadPersistentCache();
	}

	private loadPersistentCache(): void {
		try {
			const cached = this.persistentStore.get("usageData");
			if (cached && this.isValidCache(cached)) {
				this.memoryCache.set("usage-data", cached);
				this.currentMemorySize = cached.size;
			}
		} catch (error) {
			// Error loading persistent cache
			this.persistentStore.clear();
		}
	}

	private isValidCache(entry: CacheEntry<any>): boolean {
		const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours
		return Date.now() - entry.timestamp < CACHE_TTL;
	}

	set<T>(key: string, value: T, persist = false): void {
		const serialized = JSON.stringify(value);
		const size = new Blob([serialized]).size;

		const entry: CacheEntry<T> = {
			value,
			timestamp: Date.now(),
			size,
		};

		// Update memory cache
		const oldEntry = this.memoryCache.get(key);
		if (oldEntry) {
			this.currentMemorySize -= oldEntry.size;
		}

		this.memoryCache.set(key, entry);
		this.currentMemorySize += size;

		// Evict if over size limit
		this.evictIfNeeded();

		// Persist important data
		if (persist && key === "usage-data") {
			this.persistentStore.set("usageData", entry as CacheEntry<UsageData>);
			this.persistentStore.set("lastSync", Date.now());
		}
	}

	get<T>(key: string): T | null {
		const entry = this.memoryCache.get(key);
		if (!entry || !this.isValidCache(entry)) {
			this.memoryCache.delete(key);
			return null;
		}
		return entry.value;
	}

	private evictIfNeeded(): void {
		if (this.currentMemorySize <= this.maxMemorySize) {
			return;
		}

		// Convert to array and sort by timestamp (LRU)
		const entries = Array.from(this.memoryCache.entries()).sort(
			(a, b) => a[1].timestamp - b[1].timestamp,
		);

		// Remove oldest entries until we're under the limit
		let removed = 0;
		for (const [key, entry] of entries) {
			if (this.currentMemorySize <= this.maxMemorySize * 0.8) {
				break;
			}

			// Don't evict the main usage data
			if (key === "usage-data") {
				continue;
			}

			this.memoryCache.delete(key);
			this.currentMemorySize -= entry.size;
			removed++;
		}

		// Cache eviction complete
	}

	clear(): void {
		this.memoryCache.clear();
		this.currentMemorySize = 0;
		this.persistentStore.clear();
	}

	getStats() {
		return {
			entries: this.memoryCache.size,
			memoryUsage: this.currentMemorySize,
			maxMemory: this.maxMemorySize,
			lastSync: this.persistentStore.get("lastSync", 0),
		};
	}
}
