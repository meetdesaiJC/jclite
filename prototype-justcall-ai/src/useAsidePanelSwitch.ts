import { useLayoutEffect, useRef, useState } from "react";

export const ASIDE_SWITCH_MS = 150;

export type AsidePanel = "notes" | "transcript" | "assist";

/**
 * Notes, transcript, and Live Assist share one right-side shell. Switching
 * keeps the column where it is and only crossfades the view; open/close of
 * the shell is owned by `useCallAsidePresence`.
 */
export function useAsidePanelSwitch(
  panel: AsidePanel | null,
  reduced: boolean
) {
  const shownRef = useRef<AsidePanel>("transcript");
  if (panel) shownRef.current = panel;
  const shown = panel ?? shownRef.current;

  const prev = useRef(panel);
  const [switching, setSwitching] = useState(false);

  useLayoutEffect(() => {
    const was = prev.current;
    prev.current = panel;
    if (!was || !panel || was === panel) return;
    if (reduced) return;
    setSwitching(true);
    const timer = window.setTimeout(() => setSwitching(false), ASIDE_SWITCH_MS);
    return () => {
      window.clearTimeout(timer);
      setSwitching(false);
    };
  }, [panel, reduced]);

  return { shown, switching };
}
