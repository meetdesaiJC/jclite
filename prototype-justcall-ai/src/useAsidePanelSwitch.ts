import { useLayoutEffect, useRef, useState } from "react";

export const ASIDE_SWITCH_MS = 150;

/**
 * Everything the right-side column can show. The three tools the agent opens
 * alongside the call, and the three call surfaces the bar opens — one column,
 * one at a time, so a panel never has to argue with another for the space.
 */
export type AsidePanel =
  | "notes"
  | "transcript"
  | "assist"
  | "keypad"
  | "transfer"
  | "voicemail";

/**
 * The six panels share one right-side shell. Switching keeps the column where
 * it is and only crossfades the view; open/close of the shell is owned by
 * `useCallAsidePresence`.
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
