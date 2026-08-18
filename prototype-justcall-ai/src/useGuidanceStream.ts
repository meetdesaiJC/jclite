import { useEffect, useRef, useState } from "react";
import type { GuidanceSuggestion, ScriptStep } from "./callSimulation";

/**
 * The in-call guidance stream — arrival, expansion, ordering and expiry.
 *
 * One rule sits above the rest: the AI decides *what* to suggest, the agent
 * decides *when* their attention moves to it. So new guidance surfaces, it
 * never interrupts:
 *
 *   · one card expanded at a time — the active card
 *   · an arriving card queues collapsed under the active card, never steals it
 *   · order only changes on an agent action, so nothing moves while they read
 *   · finish a card and the next unread opens on its own
 *
 * The only sanctioned interruption is critical (compliance) guidance, and even
 * that announces itself instead of appearing silently.
 *
 * Cards are never dismissed: guidance lives in its own column, so the agent
 * only collapses and expands. Shared so guidance can sit inline under the
 * script or in its own column without the two paths drifting apart.
 */

export const CARD_ENTER_MS = 200;
export const CARD_ATTENTION_MS = 700;
export const AGENT_SCROLL_IDLE_MS = 2000;
/** How long "Relevant again" stays on a re-triggered card (§9). */
export const RELEVANT_AGAIN_MS = 2400;
/** Active card plus three queued suggestions; the rest compresses (§4). */
export const MAX_VISIBLE_CARDS = 4;
/**
 * Script steps past its own topic before a card moves to Earlier (§8). Wide
 * enough that a suggestion survives the next beat or two of the call — the
 * agent gets to come back to it, not race it.
 */
const EXPIRE_AFTER_STEPS = 3;

/**
 * new     — arrived, not opened yet
 * seen    — the agent has had it open at least once
 * expired — the conversation moved past the topic; sits in Earlier
 *
 * "active" isn't a status: it's whichever card is currently expanded.
 */
export type GuidanceCardStatus = "new" | "seen" | "expired";

/** Inline placement — the step the card belongs under, if it names one. */
function insertAfterIndex(
  steps: ScriptStep[],
  playhead: number,
  card: GuidanceSuggestion
): number {
  const related = steps.findIndex((step) =>
    step.relatedGuidanceIds?.includes(card.item.id)
  );
  if (related >= 0) return related;
  if (steps.length === 0) return 0;
  return Math.min(Math.max(playhead, 0), steps.length - 1);
}

export interface GuidanceStreamCard {
  suggestion: GuidanceSuggestion;
  insertAfter: number;
  status: GuidanceCardStatus;
}

/** Where an arriving card lands so nothing above it moves (§3, §7). */
function arrivalIndex(
  list: GuidanceStreamCard[],
  activeId: string | null,
  critical: boolean
): number {
  if (critical) {
    // Directly under the card being read — announced, never in its place.
    const active = list.findIndex((entry) => entry.suggestion.id === activeId);
    return active >= 0 ? active + 1 : 0;
  }
  // At the end of the unread run: below the active card and anything already
  // queued, above everything the agent has finished with.
  for (let index = list.length - 1; index >= 0; index -= 1) {
    const entry = list[index]!;
    if (entry.status === "new" || entry.suggestion.id === activeId) {
      return index + 1;
    }
  }
  return 0;
}

/** Head of the finished run — where a card the agent just closed belongs (§10). */
function seenIndex(list: GuidanceStreamCard[]): number {
  const first = list.findIndex((entry) => entry.status !== "new");
  return first < 0 ? list.length : first;
}

function moveEntry(
  list: GuidanceStreamCard[],
  id: string,
  toIndex: (rest: GuidanceStreamCard[]) => number
): GuidanceStreamCard[] {
  const from = list.findIndex((entry) => entry.suggestion.id === id);
  if (from < 0) return list;
  const rest = [...list];
  const [entry] = rest.splice(from, 1);
  if (!entry) return list;
  rest.splice(toIndex(rest), 0, entry);
  return rest;
}

function withStatus(
  list: GuidanceStreamCard[],
  id: string,
  status: GuidanceCardStatus
): GuidanceStreamCard[] {
  return list.map((entry) =>
    entry.suggestion.id === id && entry.status !== status
      ? { ...entry, status }
      : entry
  );
}

export function useGuidanceStream({
  suggestions,
  steps,
  playhead,
  reduced,
  /** Guidance the AI heard the agent cover — the topic has moved on (§8). */
  handledIds = [],
}: {
  suggestions: GuidanceSuggestion[];
  steps: ScriptStep[];
  playhead: number;
  reduced: boolean;
  handledIds?: string[];
}) {
  const [entries, setEntries] = useState<GuidanceStreamCard[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [arrivingIds, setArrivingIds] = useState<Set<string>>(new Set());
  const [attentionIds, setAttentionIds] = useState<Set<string>>(new Set());
  const [relevantAgainIds, setRelevantAgainIds] = useState<Set<string>>(new Set());
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);
  const [criticalAlertId, setCriticalAlertId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  /**
   * Reading, hovering, or scrolling the column. Kept in state, not a ref: the
   * ordering effects have to be able to hold off while it's true (§6).
   */
  const [interacting, setInteracting] = useState(false);

  const cardEls = useRef(new Map<string, HTMLElement>());
  const entriesRef = useRef(entries);
  const expandedIdRef = useRef(expandedId);
  const interactingRef = useRef(interacting);
  const suggestionsRef = useRef(suggestions);
  const pointerInCard = useRef(false);
  /** Focus anywhere in the column — a guidance card, or an action being filled in. */
  const focusInColumn = useRef(false);
  const scrollIdleTimer = useRef<number | null>(null);
  const programmaticScroll = useRef(false);
  const repeatSeen = useRef(new Map<string, number>());

  entriesRef.current = entries;
  expandedIdRef.current = expandedId;
  interactingRef.current = interacting;
  suggestionsRef.current = suggestions;

  const suggestionSig = suggestions.map((item) => item.id).join("|");
  const repeatSig = suggestions
    .map((item) => `${item.id}:${item.repeatAtMs ?? 0}`)
    .join("|");
  const handledSig = handledIds.join("|");

  const stillEngaged = () => {
    if (pointerInCard.current || focusInColumn.current) return true;
    const active = document.activeElement;
    return Boolean(
      active && [...cardEls.current.values()].some((node) => node.contains(active))
    );
  };

  const markInteracting = () => {
    setInteracting(true);
    if (scrollIdleTimer.current !== null) {
      window.clearTimeout(scrollIdleTimer.current);
      scrollIdleTimer.current = null;
    }
  };

  /** Scroll and pointer both settle back to idle on their own. */
  const releaseAfterIdle = () => {
    if (scrollIdleTimer.current !== null) {
      window.clearTimeout(scrollIdleTimer.current);
    }
    scrollIdleTimer.current = window.setTimeout(() => {
      scrollIdleTimer.current = null;
      if (!stillEngaged()) setInteracting(false);
    }, AGENT_SCROLL_IDLE_MS);
  };

  useEffect(
    () => () => {
      if (scrollIdleTimer.current !== null) {
        window.clearTimeout(scrollIdleTimer.current);
      }
    },
    []
  );

  // ---- arrival -----------------------------------------------------------
  useEffect(() => {
    const known = new Set(entriesRef.current.map((entry) => entry.suggestion.id));
    const live = new Set(suggestionsRef.current.map((item) => item.id));
    const arriving = suggestionsRef.current.filter((item) => !known.has(item.id));
    const dropped = entriesRef.current.some((entry) => !live.has(entry.suggestion.id));

    // Same topic came up again — re-activate the card that already covers it
    // rather than stacking a second one (§9).
    const repeats = suggestionsRef.current.filter((item) => {
      if (!known.has(item.id) || !item.repeatAtMs) return false;
      return repeatSeen.current.get(item.id) !== item.repeatAtMs;
    });
    repeats.forEach((item) =>
      repeatSeen.current.set(item.id, item.repeatAtMs ?? 0)
    );

    if (arriving.length === 0 && repeats.length === 0 && !dropped) return;

    const interactingNow = interactingRef.current;
    let nextExpanded = expandedIdRef.current;
    let interrupted: string | null = null;
    const attention = new Set<string>();

    // Built here rather than inside the setter: placement depends on which card
    // is open, and that changes as we walk the arrivals.
    let next = dropped
      ? entriesRef.current.filter((entry) => live.has(entry.suggestion.id))
      : entriesRef.current;

    for (const suggestion of arriving) {
      const critical = suggestion.priority === "critical";
      const entry: GuidanceStreamCard = {
        suggestion,
        insertAfter: insertAfterIndex(steps, playhead, suggestion),
        status: "new",
      };
      const at = arrivalIndex(next, nextExpanded, critical);
      next = [...next.slice(0, at), entry, ...next.slice(at)];

      if (!nextExpanded && !interactingNow) {
        // Nothing open and nobody mid-sentence: open the first useful card
        // straight away so it's actionable (§2).
        nextExpanded = suggestion.id;
        next = withStatus(next, suggestion.id, "seen");
      } else if (critical) {
        // The one sanctioned interruption. The card that was open collapses
        // where it sits — it is not moved out from under the agent (§7).
        interrupted = nextExpanded;
        nextExpanded = suggestion.id;
        next = withStatus(next, suggestion.id, "seen");
        attention.add(suggestion.id);
      }
      // Anything else stays collapsed and marked New (§3).
    }

    for (const suggestion of repeats) {
      const id = suggestion.id;
      const entry = next.find((item) => item.suggestion.id === id);
      if (!entry) continue;
      next = next.map((item) =>
        item.suggestion.id === id ? { ...item, suggestion } : item
      );
      if (id === nextExpanded) continue;
      // Bring it back into the queue only if that won't shuffle the column
      // under the agent's hands.
      if (entry.status === "expired" && !interactingNow) {
        next = withStatus(next, id, "new");
        next = moveEntry(next, id, (rest) => arrivalIndex(rest, nextExpanded, false));
      }
    }

    // Written straight to the ref as well: StrictMode runs mount effects twice,
    // and the second pass has to see these cards as already known.
    entriesRef.current = next;
    setEntries(next);

    if (arriving.length > 0) {
      setArrivingIds(
        (current) => new Set([...current, ...arriving.map((item) => item.id)])
      );
    }
    if (repeats.length > 0) {
      setRelevantAgainIds(
        (current) => new Set([...current, ...repeats.map((item) => item.id)])
      );
    }
    if (attention.size > 0) {
      setAttentionIds((current) => new Set([...current, ...attention]));
    }
    if (interrupted && nextExpanded) {
      setCriticalAlertId(nextExpanded);
    }
    if (nextExpanded !== expandedIdRef.current) {
      setExpandedId(nextExpanded);
      if (nextExpanded) setScrollTargetId(nextExpanded);
    }
    // Arrival is the trigger; the suggestion list itself is derived from
    // elapsed time and changes identity on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionSig, repeatSig, playhead, steps]);

  // ---- expiry ------------------------------------------------------------
  // Relevance decides when guidance moves aside — not a countdown. A card the
  // agent covered, or one whose topic the script has moved well past, drops its
  // New state and sinks into Earlier. Never the card that's open, and never
  // while the agent is working the column (§6, §8).
  useEffect(() => {
    if (interacting) return;
    const handled = new Set(handledIds);
    setEntries((current) => {
      const stale = current.filter((entry) => {
        if (entry.status === "expired") return false;
        if (entry.suggestion.id === expandedId) return false;
        return (
          handled.has(entry.suggestion.id) ||
          playhead - entry.insertAfter >= EXPIRE_AFTER_STEPS
        );
      });
      if (stale.length === 0) return current;
      const staleIds = new Set(stale.map((entry) => entry.suggestion.id));
      return [
        ...current.filter((entry) => !staleIds.has(entry.suggestion.id)),
        ...stale.map((entry) => ({ ...entry, status: "expired" as const })),
      ];
    });
  }, [handledSig, playhead, interacting, expandedId]);

  // The alert asks for one acknowledgement — it is not a permanent banner. It
  // clears once the agent has covered the guidance or moved off the card.
  useEffect(() => {
    if (!criticalAlertId) return;
    if (expandedId !== criticalAlertId || handledIds.includes(criticalAlertId)) {
      setCriticalAlertId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criticalAlertId, expandedId, handledSig]);

  // ---- motion timers -----------------------------------------------------
  useEffect(() => {
    if (arrivingIds.size === 0) return;
    const timer = window.setTimeout(
      () => setArrivingIds(new Set()),
      reduced ? 0 : CARD_ENTER_MS + 10
    );
    return () => window.clearTimeout(timer);
  }, [arrivingIds, reduced]);

  useEffect(() => {
    if (attentionIds.size === 0) return;
    const timer = window.setTimeout(
      () => setAttentionIds(new Set()),
      reduced ? 0 : CARD_ATTENTION_MS
    );
    return () => window.clearTimeout(timer);
  }, [attentionIds, reduced]);

  useEffect(() => {
    if (relevantAgainIds.size === 0) return;
    const timer = window.setTimeout(
      () => setRelevantAgainIds(new Set()),
      RELEVANT_AGAIN_MS
    );
    return () => window.clearTimeout(timer);
  }, [relevantAgainIds]);

  useEffect(() => {
    if (!scrollTargetId) return;
    const el = cardEls.current.get(scrollTargetId);
    setScrollTargetId(null);
    if (!el || interactingRef.current) return;
    programmaticScroll.current = true;
    el.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
    });
    const timer = window.setTimeout(() => {
      programmaticScroll.current = false;
    }, 400);
    return () => window.clearTimeout(timer);
  }, [scrollTargetId, reduced]);

  // ---- derived -----------------------------------------------------------
  const newCount = entries.filter((entry) => entry.status === "new").length;

  let visible = entries;
  if (!showAll && entries.length > MAX_VISIBLE_CARDS) {
    visible = entries.slice(0, MAX_VISIBLE_CARDS);
    if (expandedId && !visible.some((entry) => entry.suggestion.id === expandedId)) {
      const active = entries.find((entry) => entry.suggestion.id === expandedId);
      if (active) visible = [...visible.slice(0, MAX_VISIBLE_CARDS - 1), active];
    }
  }
  const hiddenCount = entries.length - visible.length;

  const criticalAlert =
    criticalAlertId === null
      ? null
      : entries.find((entry) => entry.suggestion.id === criticalAlertId) ?? null;

  /** Header chevron — one card open at a time, or none. */
  const toggleCard = (id: string) => {
    markInteracting();
    setCriticalAlertId(null);
    const closing = expandedIdRef.current === id;

    if (!closing) {
      // Opening a card: it stops being unread, and it stays exactly where the
      // agent found it. The one it replaces collapses in place.
      setEntries((current) => withStatus(current, id, "seen"));
      setExpandedId(id);
      return;
    }

    // Finished with it: the card sinks under anything still unread, and the
    // next unread suggestion opens itself (§5).
    const list = entriesRef.current;
    const nextUp = list.find(
      (entry) => entry.status === "new" && entry.suggestion.id !== id
    );
    setEntries((current) => {
      let next = moveEntry(current, id, seenIndex);
      if (nextUp) next = withStatus(next, nextUp.suggestion.id, "seen");
      return next;
    });
    setExpandedId(nextUp ? nextUp.suggestion.id : null);
  };

  return {
    /** Every card, in the order the column should render (§10). */
    cards: entries,
    /** Compressed to the visible stack — the rest sits behind "+N more" (§4). */
    visibleCards: visible,
    hiddenCount,
    showAll,
    showAllCards: () => setShowAll(true),
    /** Unread suggestions waiting — drives "Live suggestions · 2 new". */
    newCount,
    /** Set when critical guidance queued under a card the agent was reading. */
    criticalAlert,
    expandedId,
    arrivingIds,
    attentionIds,
    relevantAgainIds,
    interacting,
    toggleCard,
    focusCriticalAlert: () => {
      const id = criticalAlertId;
      setCriticalAlertId(null);
      if (id) setScrollTargetId(id);
    },
    engage: () => {
      pointerInCard.current = true;
      markInteracting();
    },
    disengage: () => {
      pointerInCard.current = false;
      releaseAfterIdle();
    },
    registerCard: (id: string, node: HTMLElement | null) => {
      if (node) cardEls.current.set(id, node);
      else cardEls.current.delete(id);
    },
    /**
     * Wire onto the scrolling container. Scrolling the column freezes the order
     * as surely as reading a card does, and so does filling in an action (§6).
     */
    scrollHandlers: {
      onFocusCapture: () => {
        focusInColumn.current = true;
        markInteracting();
      },
      onBlurCapture: () => {
        focusInColumn.current = false;
        releaseAfterIdle();
      },
      onPointerDown: () => {
        markInteracting();
        releaseAfterIdle();
      },
      onWheel: () => {
        if (programmaticScroll.current) return;
        markInteracting();
        releaseAfterIdle();
      },
      onScroll: () => {
        if (programmaticScroll.current) return;
        markInteracting();
        releaseAfterIdle();
      },
    },
  };
}
