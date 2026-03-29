/** @type {import('tailwindcss').Config} */
export default {
	content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
	theme: {
		screens: {
			xs: "320px",
			sm: "640px",
			md: "768px",
			lg: "1024px",
			xl: "1280px",
			"2xl": "1536px",
		},
		extend: {
			colors: {
				"brand-yellow": "#f5c518",
				"brand-bg": "#f5f5f0",
				"brand-dark": "#111111",
				"brand-card-dark": "#1a1a1a",
				"brand-muted": "#6b6b6b",
				"brand-border": "#e5e5e5",
			},
			fontFamily: {
				sans: ["Inter", "sans-serif"],
				display: ["Poppins", "sans-serif"],
				body: ["Inter", "sans-serif"],
				mono: ["JetBrains Mono", "monospace"],
			},
			spacing: {
				18: "4.5rem",
				62: "15.5rem",
			},
		},
	},
	plugins: [],
};
