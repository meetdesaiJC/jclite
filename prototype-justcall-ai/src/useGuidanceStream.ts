import { useEffect, useRef, useState } from "react";
import type { GuidanceSuggestion, ScriptStep } from "./callSimulation";
import type { GuidancePriority } from "./guidanceData";

/**
 * The in-call guidance stream — arrival, auto-expand and attention. Cards are
 * never dismissed: guidance has its own tab, so the agent only collapses and
 * expands. Shared so guidance can live inline under the script or in its own
 * column without the two paths drifting apart.
 */

const PRIORITY_RANK: Record<GuidancePriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
};

export const CARD_ENTER_MS = 200;
export const CARD_ATTENTION_MS = 700;
export const AGENT_SCROLL_IDLE_MS = 2000;

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
}

export function useGuidanceStream({
  suggestions,
  steps,
  playhead,
  reduced,
}: {
  suggestions: GuidanceSuggestion[];
  steps: ScriptStep[];
  playhead: number;
  reduced: boolean;
}) {
  const [pinned, setPinned] = useState<GuidanceStreamCard[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [arrivingIds, setArrivingIds] = useState<Set<string>>(new Set());
  const [attentionIds, setAttentionIds] = useState<Set<string>>(new Set());
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);

  const cardEls = useRef(new Map<string, HTMLElement>());
  const pinnedIdsRef = useRef(new Set<string>());
  const expandedIdRef = useRef(expandedId);
  const pinnedRef = useRef(pinned);
  const suggestionsRef = useRef(suggestions);
  const pointerInCard = useRef(false);
  const lastUserScrollAt = useRef(0);
  const programmaticScroll = useRef(false);

  expandedIdRef.current = expandedId;
  pinnedRef.current = pinned;
  suggestionsRef.current = suggestions;

  const suggestionSig = suggestions.map((item) => item.id).join("|");

  const isReadingCard = () => {
    if (pointerInCard.current) return true;
    const active = document.activeElement;
    return Boolean(
      active && [...cardEls.current.values()].some((node) => node.contains(active))
    );
  };

  const shouldHoldScroll = () =>
    isReadingCard() || Date.now() - lastUserScrollAt.current < AGENT_SCROLL_IDLE_MS;

  useEffect(() => {
    const extras = suggestionsRef.current.filter(
      (item) => !pinnedIdsRef.current.has(item.id)
    );
    if (extras.length === 0) return;

    extras.forEach((item) => pinnedIdsRef.current.add(item.id));
    const additions = extras.map((item) => ({
      suggestion: item,
      insertAfter: insertAfterIndex(steps, playhead, item),
    }));
    setPinned((current) => [...current, ...additions]);
    setArrivingIds(
      (current) => new Set([...current, ...extras.map((item) => item.id)])
    );

    const reading = isReadingCard();
    const catalog = [...pinnedRef.current, ...additions];
    let nextExpanded = expandedIdRef.current;

    for (const extra of extras) {
      if (!nextExpanded) {
        nextExpanded = extra.id;
        continue;
      }
      const currentCard = catalog.find(
        (entry) => entry.suggestion.id === nextExpanded
      )?.suggestion;
      if (!currentCard) {
        nextExpanded = extra.id;
        continue;
      }
      const higher =
        PRIORITY_RANK[extra.priority] < PRIORITY_RANK[currentCard.priority];
      if (higher || !reading) {
        nextExpanded = extra.id;
      }
    }

    if (nextExpanded !== expandedIdRef.current) {
      setExpandedId(nextExpanded);
      if (!shouldHoldScroll() && nextExpanded) {
        setScrollTargetId(nextExpanded);
      }
      if (nextExpanded && extras.some((item) => item.id === nextExpanded)) {
        setAttentionIds((current) => new Set([...current, nextExpanded]));
      }
    }
  }, [suggestionSig, playhead, steps]);

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
    if (!scrollTargetId) return;
    const el = cardEls.current.get(scrollTargetId);
    setScrollTargetId(null);
    if (!el || shouldHoldScroll()) return;
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

  const cards = [...pinned].sort(
    (a, b) => a.suggestion.atMs - b.suggestion.atMs
  );

  return {
    cards,
    expandedId,
    arrivingIds,
    attentionIds,
    /** Header chevron — one card open at a time, or none. */
    toggleCard: (id: string) => {
      pointerInCard.current = true;
      setExpandedId((current) => (current === id ? null : id));
    },
    engage: () => {
      pointerInCard.current = true;
    },
    disengage: () => {
      pointerInCard.current = false;
    },
    registerCard: (id: string, node: HTMLElement | null) => {
      if (node) cardEls.current.set(id, node);
      else cardEls.current.delete(id);
    },
    /** Wire onto the scrolling container so agent scroll pauses auto-scroll. */
    scrollHandlers: {
      onPointerDown: () => {
        lastUserScrollAt.current = Date.now();
      },
      onWheel: () => {
        if (!programmaticScroll.current) lastUserScrollAt.current = Date.now();
      },
      onScroll: () => {
        if (!programmaticScroll.current) lastUserScrollAt.current = Date.now();
      },
    },
  };
}
