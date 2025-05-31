/// <reference types="vite/client" />

declare global {
	interface Window {
		electronAPI?: {
			ping: () => Promise<string>
			usage: {
				requestData: (options: any) => Promise<any>
				onDataUpdate: (callback: (data: any) => void) => () => void
			}
			settings: {
				get: (key: string) => Promise<any>
				set: (key: string, value: any) => Promise<void>
				getAll: () => Promise<Record<string, any>>
			}
			window: {
				minimize: () => void
				close: () => void
				toggleMaximize: () => void
				setAlwaysOnTop: (value: boolean) => void
				setMode: (mode: "compact" | "standard" | "expanded") => void
				setOpacity: (value: number) => void
			}
			theme: {
				onChange: (callback: (isDark: boolean) => void) => () => void
			}
		}
	}
}

export {}