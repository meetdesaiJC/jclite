import * as React from "react";

/**
 * Stay mounted this long after `open` goes false so `.dropdown-panel`
 * `[data-state="closed"]` (120ms ease-in in globals.css) can finish.
 */
export const DROPDOWN_CLOSE_MS = 120;

export type DropdownPresenceState = "open" | "closed";

/**
 * Keeps an overlay mounted through its close animation.
 * `state` maps onto `.dropdown-panel[data-state]`.
 */
export function useDropdownPresence(open: boolean) {
  const [mounted, setMounted] = React.useState(open);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      return;
    }
    if (!mounted) return;
    const timer = window.setTimeout(() => setMounted(false), DROPDOWN_CLOSE_MS);
    return () => window.clearTimeout(timer);
  }, [open, mounted]);

  const state: DropdownPresenceState = open && mounted ? "open" : "closed";
  return { mounted, state };
}
