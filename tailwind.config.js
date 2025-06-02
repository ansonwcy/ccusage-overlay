/** @type {import('tailwindcss').Config} */
export default {
	content: ["./src/renderer/**/*.{js,ts,jsx,tsx}", "./src/renderer/index.html"],
	theme: {
		extend: {
			colors: {
				primary: "#2563eb",
				success: "#10b981",
				warning: "#f59e0b",
				danger: "#ef4444",
			},
			fontFamily: {
				sans: [
					"-apple-system",
					"BlinkMacSystemFont",
					"SF Pro Display",
					"SF Pro Text",
					"Helvetica Neue",
					"sans-serif",
				],
			},
			fontSize: {
				xs: "11px",
				sm: "13px",
				base: "15px",
				lg: "17px",
				xl: "20px",
			},
		},
	},
	darkMode: "class",
	plugins: [],
};
