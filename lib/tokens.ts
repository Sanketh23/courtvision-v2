/**
 * JS-side handles for the design tokens defined in styles/tokens.css.
 *
 * Returns `var(--token)` strings so non-Tailwind surfaces (SVG/canvas fills in
 * the play renderer) can consume the same tokens as the rest of the app. The
 * actual values live in CSS, so theming/dark-mode stays in one place.
 */
export const tokens = {
  background: "var(--background)",
  foreground: "var(--foreground)",
  primary: "var(--primary)",
  primaryForeground: "var(--primary-foreground)",
  muted: "var(--muted)",
  mutedForeground: "var(--muted-foreground)",
  border: "var(--border)",
  ring: "var(--ring)",
  ball: "var(--ball)",
} as const;

export type TokenName = keyof typeof tokens;
