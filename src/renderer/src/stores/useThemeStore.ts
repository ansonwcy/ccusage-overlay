import { create } from "zustand"
import { useEffect } from "react"

interface ThemeStore {
	isDark: boolean
	setIsDark: (isDark: boolean) => void
}

export const useThemeStore = create<ThemeStore>((set) => ({
	isDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
	setIsDark: (isDark) => set({ isDark }),
}))

// Hook to sync with system theme
export function useSystemTheme() {
	const setIsDark = useThemeStore((state) => state.setIsDark)
	
	useEffect(() => {
		// Listen to Electron theme changes
		let unsubscribe: (() => void) | undefined
		
		if (window.electronAPI?.theme?.onChange) {
			unsubscribe = window.electronAPI.theme.onChange((isDark) => {
				setIsDark(isDark)
			})
		}
		
		// Also listen to browser media query changes
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
		const handleChange = (e: MediaQueryListEvent) => {
			setIsDark(e.matches)
		}
		
		mediaQuery.addEventListener("change", handleChange)
		
		return () => {
			unsubscribe?.()
			mediaQuery.removeEventListener("change", handleChange)
		}
	}, [setIsDark])
}