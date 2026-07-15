/**
 * Alfagent design tokens — aligned with Alfa-Bank brand system.
 * Consumed by Tailwind v4 via `@config` in `src/index.css`.
 *
 * Brand references:
 * - Accent / CTA: Alfa Red #EF3124
 * - Surface: White #FFFFFF
 * - App canvas: #F8F9FA
 * - Primary text: #0B1F35
 * - Secondary text: #59606D
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        alfa: {
          red: "#EF3124",
          "red-hover": "#D92B20",
          "red-pressed": "#C2261C",
          "red-soft": "#FDECEA",
          "red-muted": "#F8B4AE",
        },
        canvas: "#F8F9FA",
        surface: "#FFFFFF",
        ink: {
          DEFAULT: "#0B1F35",
          muted: "#59606D",
          subtle: "#8A919C",
        },
        border: {
          DEFAULT: "#E5E7EB",
          strong: "#D1D5DB",
        },
        accent: {
          DEFAULT: "#EF3124",
          hover: "#D92B20",
          soft: "#FDECEA",
          fg: "#B42318",
        },
        warn: {
          soft: "#FFF4E5",
          fg: "#B54708",
        },
        danger: {
          soft: "#FDECEA",
          fg: "#EF3124",
        },
        success: {
          soft: "#E8F8EF",
          fg: "#0F7B3F",
        },
      },
      fontFamily: {
        sans: [
          "Inter Variable",
          "Inter",
          "Roboto",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "sans-serif",
        ],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Consolas", "monospace"],
      },
      fontSize: {
        "display-lg": ["2.5rem", { lineHeight: "1.15", letterSpacing: "-0.03em", fontWeight: "700" }],
        "display-md": ["2rem", { lineHeight: "1.2", letterSpacing: "-0.025em", fontWeight: "700" }],
        "title-lg": ["1.5rem", { lineHeight: "1.3", letterSpacing: "-0.02em", fontWeight: "700" }],
        "title-md": ["1.25rem", { lineHeight: "1.35", letterSpacing: "-0.015em", fontWeight: "600" }],
        "body-lg": ["1.0625rem", { lineHeight: "1.55", fontWeight: "400" }],
        "body-md": ["0.9375rem", { lineHeight: "1.5", fontWeight: "400" }],
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.25rem",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(11, 31, 53, 0.04), 0 1px 3px rgba(11, 31, 53, 0.06)",
        card: "0 4px 24px rgba(11, 31, 53, 0.06)",
        soft: "0 8px 32px rgba(11, 31, 53, 0.08)",
        focus: "0 0 0 4px rgba(239, 49, 36, 0.16)",
      },
      spacing: {
        "control": "3rem",
        "section": "3.5rem",
      },
    },
  },
  plugins: [],
}
