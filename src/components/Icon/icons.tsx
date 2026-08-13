/**
 * Icon library — framed SVGs synced from Figma Design System 2.0 / Icons.
 * Each icon ships size 16 / 20 / 24 (exact Figma frames + stroke weights).
 *
 * Pull missing icons:  pnpm icons:pull "<Figma name>" --size 16,20,24
 * Regenerate:          pnpm icons:generate
 *
 * Pair CSS box with variant: size-4↔16, size-5↔20, size-6↔24.
 */
export type { IconProps, IconSize } from "./icons.generated";
export * from "./icons.generated";
