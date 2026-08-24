import { useEffect, useRef, useState } from "react";
import { DURATION } from "@/lib/motion";
import type { GuidanceSuggestion, ScriptStep } from "./callSimulation";

/**
 * The in-call guidance stream — arrival, expansion, ordering and expiry.
 *
 * One rule sits above the rest: the AI decides *what* to suggest, the agent
 * decides *when* their attention moves to it. So new guidance surfaces, it
 * never interrupts:
 *
 *   · a card arrives open and stays open — mid-call, a title alone is not
 *     guidance, and making the agent click to read it costs them the sentence
 *   · collapsing is the agent's move, never the stream's: nothing the agent
 *     opened, or was given open, closes itself
 *   · order only changes on an agent action, so nothing moves while they read
 *
 * The only sanctioned interruption is critical (compliance) guidance, and even
 * that announces itself instead of appearing silently.
 *
 * Cards are never dismissed: guidance lives in its own column, so the agent
 * only collapses and expands. Shared so guidance can sit inline under the
 * script or in its own column without the two paths drifting apart.
 */

/**
 * The three motion timings the hook has to know as numbers, taken off the
 * scale rather than re-typed: the classes that play them are cleared here, so
 * a literal would let the animation and its unmount timer drift (CLAUDE.md §4).
 */
export const CARD_ENTER_MS = DURATION.moderate;
/** One `fast` step per card in a burst — enough to read as a sequence (§12). */
export const CARD_STAGGER_MS = DURATION.fast;
/** Pulse starts as the reveal settles, so its total overlaps by one step. */
export const CARD_ATTENTION_MS = DURATION.base + DURATION.emphasis;
export const AGENT_SCROLL_IDLE_MS = 2000;
/** How long "Relevant again" stays on a re-triggered card (§9). */
export const RELEVANT_AGAIN_MS = 2400;
/**
 * How long the word "New" rides alongside the unread dot. The dot is the
 * durable marker; the word is only there to teach it, so it leaves once the
 * agent has plainly had a chance to look (§12).
 */
export const NEW_LABEL_MS = 4000;
/**
 * A burst this size or larger pulses only its first card. Three washes firing
 * down the column at once is the visual noise the pulse exists to avoid — the
 * rest arrive with their unread dot and nothing more (§12).
 */
const QUIET_BURST_FROM = 3;
/** Active card plus three queued suggestions; the rest compresses (§4). */
export const MAX_VISIBLE_CARDS = 4;
/**
 * Script steps past its own topic before a card moves to Earlier (§8). Wide
 * enough that a suggestion survives the next beat or two of the call — the
 * agent gets to come back to it, not race it.
 */
const EXPIRE_AFTER_STEPS = 3;

/**
 * new     — landed recently; the agent hasn't touched it yet
 * seen    — the agent has worked it: collapsed it, or reopened it
 * expired — the conversation moved past the topic; sits in Earlier
 *
 * Cards arrive open, so this is an arrival marker rather than an unread flag —
 * the dot it drives only shows on a card the agent chose to collapse.
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
function arrivalIndex(list: GuidanceStreamCard[]): number {
  // At the end of the recent run: below anything else that just landed, above
  // everything the conversation has already moved past.
  for (let index = list.length - 1; index >= 0; index -= 1) {
    if (list[index]!.status !== "expired") return index + 1;
  }
  return 0;
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
  /**
   * Only what the agent has closed. Absence is the default, so a card is open
   * from the frame it arrives — there is no state to set to open it, and
   * therefore no path by which the stream can quietly close one.
   */
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
  /**
   * Cards mid-entrance, each mapped to its place in the burst it arrived with.
   * A Map rather than a Set because the stagger index has to reach the slot's
   * `--assist-stagger` — `.has()` still reads the same at every call site.
   */
  const [arrivingIds, setArrivingIds] = useState<Map<string, number>>(new Map());
  const [attentionIds, setAttentionIds] = useState<Set<string>>(new Set());
  /** Arrived recently enough that the dot still spells itself out as "New". */
  const [newLabelIds, setNewLabelIds] = useState<Set<string>>(new Set());
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
  const collapsedIdsRef = useRef(collapsedIds);
  const interactingRef = useRef(interacting);
  const suggestionsRef = useRef(suggestions);
  const pointerInCard = useRef(false);
  /** Focus anywhere in the column — a guidance card, or an action being filled in. */
  const focusInColumn = useRef(false);
  const scrollIdleTimer = useRef<number | null>(null);
  const programmaticScroll = useRef(false);
  const repeatSeen = useRef(new Map<string, number>());

  entriesRef.current = entries;
  collapsedIdsRef.current = collapsedIds;
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
    /** The card the column should scroll to, if any — the last thing to land. */
    let scrollTo: string | null = null;
    let announce: string | null = null;
    const attention = new Set<string>();

    // Built here rather than inside the setter: each arrival is placed relative
    // to the ones before it, so the list has to exist while we walk them.
    let next = dropped
      ? entriesRef.current.filter((entry) => live.has(entry.suggestion.id))
      : entriesRef.current;

    // A burst pulses in full only while it is small enough to follow; past
    // that, one card carries the signal for all of them (§12).
    const quietBurst = arriving.length >= QUIET_BURST_FROM;
    let pulsed = false;

    for (const suggestion of arriving) {
      const critical = suggestion.priority === "critical";
      const entry: GuidanceStreamCard = {
        suggestion,
        insertAfter: insertAfterIndex(steps, playhead, suggestion),
        status: "new",
      };
      const at = arrivalIndex(next);
      next = [...next.slice(0, at), entry, ...next.slice(at)];

      // Arrives open and readable (§2) — the pulse is what says "this one just
      // landed", and it is the only thing that says it. Every arrival gets one
      // unless the burst is big enough that a column of washes would be the
      // noise the pulse exists to avoid (§12).
      if (critical || !quietBurst || !pulsed) {
        attention.add(suggestion.id);
        pulsed = true;
      }

      if (critical && interactingNow) {
        // Compliance guidance can't wait to be noticed, but the agent is
        // mid-sentence: say it out loud rather than dragging the column (§7).
        announce = suggestion.id;
      } else if (!interactingNow) {
        scrollTo = suggestion.id;
      }
    }

    for (const suggestion of repeats) {
      const id = suggestion.id;
      const entry = next.find((item) => item.suggestion.id === id);
      if (!entry) continue;
      next = next.map((item) =>
        item.suggestion.id === id ? { ...item, suggestion } : item
      );
        // Bring it back into the queue only if that won't shuffle the column
      // under the agent's hands.
      if (entry.status === "expired" && !interactingNow) {
        next = withStatus(next, id, "new");
        next = moveEntry(next, id, arrivalIndex);
      }
    }

    // Written straight to the ref as well: StrictMode runs mount effects twice,
    // and the second pass has to see these cards as already known.
    entriesRef.current = next;
    setEntries(next);

    if (dropped) {
      // Nothing collapsed should outlive the card it belonged to.
      setCollapsedIds((current) => {
        const kept = new Set([...current].filter((id) => live.has(id)));
        return kept.size === current.size ? current : kept;
      });
    }

    if (arriving.length > 0) {
      setArrivingIds(
        (current) =>
          new Map([
            ...current,
            ...arriving.map((item, order) => [item.id, order] as const),
          ])
      );
      setNewLabelIds(
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
    if (arriving.length > 0) {
      // A replay reuses ids, so a card the agent closed last time round would
      // otherwise come back closed.
      setCollapsedIds((current) => {
        if (!arriving.some((item) => current.has(item.id))) return current;
        const nextSet = new Set(current);
        arriving.forEach((item) => nextSet.delete(item.id));
        return nextSet;
      });
    }
    if (announce) {
      setCriticalAlertId(announce);
    } else if (scrollTo) {
      setScrollTargetId(scrollTo);
    }
    // Arrival is the trigger; the suggestion list itself is derived from
    // elapsed time and changes identity on every tick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestionSig, repeatSig, playhead, steps]);

  // ---- expiry ------------------------------------------------------------
  // Relevance decides when guidance moves aside — not a countdown. A card the
  // agent covered, or one whose topic the script has moved well past, drops its
  // New state and sinks into Earlier. Expiry only ever reorders and relabels:
  // a card that sinks stays as open as the agent left it, and none of it
  // happens while they are working the column (§6, §8).
  useEffect(() => {
    if (interacting) return;
    const handled = new Set(handledIds);
    setEntries((current) => {
      const stale = current.filter((entry) => {
        if (entry.status === "expired") return false;
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
  }, [handledSig, playhead, interacting]);

  // The alert asks for one acknowledgement — it is not a permanent banner. It
  // clears once the agent has covered the guidance, or once the column settles
  // enough that the card it points at is plainly there to be read.
  useEffect(() => {
    if (!criticalAlertId) return;
    if (handledIds.includes(criticalAlertId)) {
      setCriticalAlertId(null);
      return;
    }
    if (interacting) return;
    setCriticalAlertId(null);
    setScrollTargetId(criticalAlertId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [criticalAlertId, interacting, handledSig]);

  // ---- motion timers -----------------------------------------------------
  // These classes carry `animation-fill-mode: both`, so pulling one before its
  // animation finishes snaps the card. Everything below therefore waits for
  // the *last* card in the burst, stagger included.
  const burstTailMs = arrivingIds.size === 0
    ? 0
    : Math.max(...arrivingIds.values()) * CARD_STAGGER_MS;

  useEffect(() => {
    if (arrivingIds.size === 0) return;
    const timer = window.setTimeout(
      () => setArrivingIds(new Map()),
      reduced ? 0 : burstTailMs + CARD_ENTER_MS + 10
    );
    return () => window.clearTimeout(timer);
  }, [arrivingIds, burstTailMs, reduced]);

  useEffect(() => {
    if (attentionIds.size === 0) return;
    const timer = window.setTimeout(
      () => setAttentionIds(new Set()),
      reduced ? 0 : burstTailMs + CARD_ATTENTION_MS + 10
    );
    return () => window.clearTimeout(timer);
  }, [attentionIds, burstTailMs, reduced]);

  // The dot stays; only the word it arrived with is on a clock.
  useEffect(() => {
    if (newLabelIds.size === 0) return;
    const timer = window.setTimeout(() => setNewLabelIds(new Set()), NEW_LABEL_MS);
    return () => window.clearTimeout(timer);
  }, [newLabelIds]);

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
  /**
   * How many just landed — not how many are unread. Cards arrive open, so a
   * running total of "new" guidance would only ever climb while the agent read
   * every word of it. The count therefore rides the same short window as the
   * word "New" on the card itself, and leaves with it (§3, §12).
   */
  const newCount = entries.filter((entry) =>
    newLabelIds.has(entry.suggestion.id)
  ).length;

  let visible = entries;
  if (!showAll && entries.length > MAX_VISIBLE_CARDS) {
    visible = entries.slice(0, MAX_VISIBLE_CARDS);
  }
  const hiddenCount = entries.length - visible.length;

  const criticalAlert =
    criticalAlertId === null
      ? null
      : entries.find((entry) => entry.suggestion.id === criticalAlertId) ?? null;

  /**
   * Header chevron. Closing and reopening are symmetrical and local: the card
   * the agent clicked is the only one that changes, and it stays exactly where
   * they found it — no other card opens, closes, or moves in response (§5).
   */
  const toggleCard = (id: string) => {
    markInteracting();
    setCriticalAlertId(null);
    setEntries((current) => withStatus(current, id, "seen"));
    setCollapsedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return {
    /** Every card, in the order the column should render (§10). */
    cards: entries,
    /** Compressed to the visible stack — the rest sits behind "+N more" (§4). */
    visibleCards: visible,
    hiddenCount,
    showAll,
    showAllCards: () => setShowAll(true),
    /** Suggestions that just landed — drives "Conversation guidance · 2 new". */
    newCount,
    /** Set when critical guidance queued under a card the agent was reading. */
    criticalAlert,
    /** Cards the agent has closed — everything else is open (§2). */
    collapsedIds,
    isExpanded: (id: string) => !collapsedIds.has(id),
    arrivingIds,
    attentionIds,
    /** Cards still spelling the unread dot out as "New" (§12). */
    newLabelIds,
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
