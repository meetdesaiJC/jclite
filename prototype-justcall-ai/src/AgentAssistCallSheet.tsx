import { useEffect, useMemo, useRef, useState, type SVGProps } from "react";
import { cn } from "@/lib/utils";
import { Dropdown } from "@/components/Dropdown";
import { IconJcaiAgentAssist } from "./icons/JustCallAiNavIcons";
import {
  CALL_SCENARIOS,
  simulationAt,
  type CallActionItem,
  type CallScenario,
  type GuidanceSuggestion,
  type ScriptStep,
  type SimulationSnapshot,
  type TranscriptTurn,
} from "./callSimulation";
import {
  SEED_GUIDANCE,
  type GuidanceItem,
  type GuidancePriority,
  type GuidanceResource,
} from "./guidanceData";
import { InCallGuidanceSlot, ResourceOverlay } from "./LiveGuidance";

/**
 * In-call Agent Assist — one stream. The full script stays open so any
 * spoken line can check off. Guidance cards insert under the step they
 * belong to. Only one card is expanded; the rest sit as compact
 * suggestions. Cards stay until the agent dismisses them — never on a
 * timer, and never because the script moved on.
 */

const PRIORITY_RANK: Record<GuidancePriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
};

const CARD_ENTER_MS = 250;
const CARD_EXIT_MS = 160;
const CARD_ATTENTION_MS = 700;
const AGENT_SCROLL_IDLE_MS = 2000;

const CHECKLIST_MOTION = {
  detectMs: 160,
  completeMs: 200,
  glowMs: 360,
  staggerMs: 120,
  nextMs: 500,
} as const;

type CheckPhase = "idle" | "detecting" | "completing" | "done";

function formatQuoteTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function IconScript(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M12.5 17.5H5C4.33696 17.5 3.70107 17.2366 3.23223 16.7678C2.76339 16.2989 2.5 15.663 2.5 15V14.1667H10.8333V15.8333C10.8333 16.2754 11.0089 16.6993 11.3215 17.0118C11.6341 17.3244 12.058 17.5 12.5 17.5ZM12.5 17.5C12.942 17.5 13.366 17.3244 13.6785 17.0118C13.9911 16.6993 14.1667 16.2754 14.1667 15.8333V4.16667C14.1667 3.83703 14.2644 3.5148 14.4476 3.24072C14.6307 2.96664 14.891 2.75301 15.1955 2.62687C15.5001 2.50072 15.8352 2.46772 16.1585 2.53203C16.4818 2.59633 16.7788 2.75507 17.0118 2.98816C17.2449 3.22124 17.4037 3.51822 17.468 3.84152C17.5323 4.16482 17.4993 4.49993 17.3731 4.80447C17.247 5.10902 17.0334 5.36931 16.7593 5.55245C16.4852 5.73559 16.163 5.83333 15.8333 5.83333H14.1667M15.8333 2.5H6.66667C6.00363 2.5 5.36774 2.76339 4.8989 3.23223C4.43006 3.70107 4.16667 4.33696 4.16667 5V14.1667M7.5 5.83333H10.8333M7.5 9.16667H10.8333"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

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

export interface AgentAssistCallSheetProps {
  elapsedMs: number;
  scenario: CallScenario;
  onScenarioChange: (id: string) => void;
  guidanceItems?: GuidanceItem[];
  /** Hangup — script and transcript yield to the generated recap. */
  ended?: boolean;
  className?: string;
}

export function AgentAssistCallSheet({
  elapsedMs,
  scenario,
  onScenarioChange,
  guidanceItems = SEED_GUIDANCE,
  ended = false,
  className,
}: AgentAssistCallSheetProps) {
  const [view, setView] = useState<"assist" | "transcript">("assist");
  const [viewingResource, setViewingResource] = useState<GuidanceResource | null>(
    null
  );
  const snapshot = simulationAt(scenario, elapsedMs, guidanceItems);
  const reduced = prefersReducedMotion();
  const latestCard = snapshot.suggestions[snapshot.suggestions.length - 1] ?? null;
  const lastChecked =
    snapshot.scriptIndex > 0 ? scenario.steps[snapshot.scriptIndex - 1] : null;
  const liveAnnouncement = ended
    ? "Writing the call summary and action items."
    : snapshot.wrapped
      ? "Script complete."
      : latestCard
        ? `${latestCard.stance}: ${latestCard.item.name}. ${latestCard.item.suggestedResponse}`
        : lastChecked
          ? `${lastChecked.title} checked.`
          : "";

  useEffect(() => {
    setViewingResource(null);
  }, [scenario.id]);

  const options = useMemo(
    () => CALL_SCENARIOS.map((item) => ({ value: item.id, label: item.scriptName })),
    []
  );

  return (
    <aside
      aria-label="Agent Assist"
      className={cn(
        "relative flex h-full min-h-0 w-[680px] shrink-0 flex-col overflow-hidden bg-white",
        className
      )}
    >
      <header className="flex h-11 shrink-0 items-center justify-between gap-3 border-b border-line px-4">
        <div className="flex min-w-0 items-center gap-1.5">
          <IconJcaiAgentAssist
            className="size-4 shrink-0 text-brand"
            aria-hidden="true"
          />
          <p className="text-label-md-semi text-foreground">Agent Assist</p>
        </div>
        {ended ? null : (
          <div className="flex min-w-0 items-center gap-1">
            <Dropdown
              searchable={false}
              variant="borderless"
              leftIcon={<IconScript />}
              options={options}
              value={scenario.id}
              onValueChange={(value) =>
                onScenarioChange(Array.isArray(value) ? value[0] : value)
              }
              aria-label="Call script"
              triggerClassName="h-7 min-w-0 max-w-[200px] px-1.5 text-paragraph-sm text-muted-foreground"
            />
            <button
              type="button"
              aria-pressed={view === "transcript"}
              onClick={() =>
                setView((current) => (current === "transcript" ? "assist" : "transcript"))
              }
              className={cn(
                "inline-flex h-7 cursor-pointer items-center rounded-[4px] px-2 text-label-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
                view === "transcript"
                  ? "bg-secondary-bg text-foreground"
                  : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
              )}
            >
              Transcript
            </button>
          </div>
        )}
      </header>

      {ended ? (
        <PostCallAssist scenario={scenario} reduced={reduced} />
      ) : view === "transcript" ? (
        <TranscriptPane turns={snapshot.transcript} reduced={reduced} />
      ) : (
        <AssistStream
          key={scenario.id}
          scenario={scenario}
          snapshot={snapshot}
          reduced={reduced}
          onViewResource={setViewingResource}
        />
      )}

      {viewingResource && !ended ? (
        <ResourceOverlay
          resource={viewingResource}
          onClose={() => setViewingResource(null)}
        />
      ) : null}

      {ended ? null : (
        <p className="sr-only" aria-live="polite">
          {liveAnnouncement}
        </p>
      )}
    </aside>
  );
}

function AssistStream({
  scenario,
  snapshot,
  reduced,
  onViewResource,
}: {
  scenario: CallScenario;
  snapshot: SimulationSnapshot;
  reduced: boolean;
  onViewResource: (resource: GuidanceResource) => void;
}) {
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [exiting, setExiting] = useState<string[]>([]);
  const [pinned, setPinned] = useState<
    { suggestion: GuidanceSuggestion; insertAfter: number }[]
  >([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [arrivingIds, setArrivingIds] = useState<Set<string>>(new Set());
  const [attentionIds, setAttentionIds] = useState<Set<string>>(new Set());
  const [scrollTargetId, setScrollTargetId] = useState<string | null>(null);

  const paneRef = useRef<HTMLDivElement>(null);
  const cardEls = useRef(new Map<string, HTMLElement>());
  const pinnedIdsRef = useRef(new Set<string>());
  const dismissedRef = useRef(dismissed);
  const expandedIdRef = useRef(expandedId);
  const pinnedRef = useRef(pinned);
  const suggestionsRef = useRef(snapshot.suggestions);
  const pointerInCard = useRef(false);
  const lastUserScrollAt = useRef(0);
  const programmaticScroll = useRef(false);
  const exitTimers = useRef<number[]>([]);

  dismissedRef.current = dismissed;
  expandedIdRef.current = expandedId;
  pinnedRef.current = pinned;
  suggestionsRef.current = snapshot.suggestions;

  const playhead = Math.min(snapshot.scriptIndex, scenario.steps.length);
  const suggestionSig = snapshot.suggestions.map((item) => item.id).join("|");

  const isReadingCard = () => {
    if (pointerInCard.current) return true;
    const active = document.activeElement;
    return Boolean(
      active &&
        [...cardEls.current.values()].some((node) => node.contains(active))
    );
  };

  const shouldHoldScroll = () =>
    isReadingCard() || Date.now() - lastUserScrollAt.current < AGENT_SCROLL_IDLE_MS;

  useEffect(() => {
    const extras = suggestionsRef.current.filter(
      (item) =>
        !pinnedIdsRef.current.has(item.id) && !dismissedRef.current.includes(item.id)
    );
    if (extras.length === 0) return;

    extras.forEach((item) => pinnedIdsRef.current.add(item.id));
    const additions = extras.map((item) => ({
      suggestion: item,
      insertAfter: insertAfterIndex(scenario.steps, playhead, item),
    }));
    setPinned((current) => [...current, ...additions]);
    setArrivingIds((current) => new Set([...current, ...extras.map((item) => item.id)]));

    const reading = isReadingCard();
    const catalog = [...pinnedRef.current, ...additions];
    let nextExpanded = expandedIdRef.current;

    for (const extra of extras) {
      if (!nextExpanded) {
        nextExpanded = extra.id;
        continue;
      }
      const currentCard = catalog.find((entry) => entry.suggestion.id === nextExpanded)
        ?.suggestion;
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
  }, [suggestionSig, playhead, scenario.steps]);

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

  useEffect(
    () => () => {
      exitTimers.current.forEach((timer) => window.clearTimeout(timer));
    },
    []
  );

  const visibleCards = pinned
    .filter((entry) => !dismissed.includes(entry.suggestion.id))
    .sort((a, b) => a.suggestion.atMs - b.suggestion.atMs);

  const dismissCard = (id: string) => {
    if (dismissed.includes(id) || exiting.includes(id)) return;
    if (reduced) {
      setDismissed((current) => (current.includes(id) ? current : [...current, id]));
      setExpandedId((current) => (current === id ? null : current));
      return;
    }
    setExiting((current) => (current.includes(id) ? current : [...current, id]));
    const timer = window.setTimeout(() => {
      setDismissed((current) => (current.includes(id) ? current : [...current, id]));
      setExiting((current) => current.filter((item) => item !== id));
      setExpandedId((current) => (current === id ? null : current));
    }, CARD_EXIT_MS);
    exitTimers.current.push(timer);
  };

  return (
    <div
      ref={paneRef}
      className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3"
      onPointerDown={() => {
        lastUserScrollAt.current = Date.now();
      }}
      onWheel={() => {
        if (!programmaticScroll.current) lastUserScrollAt.current = Date.now();
      }}
      onScroll={() => {
        if (!programmaticScroll.current) lastUserScrollAt.current = Date.now();
      }}
    >
      <FullScriptList
        scenario={scenario}
        playhead={playhead}
        reduced={reduced}
        placedCards={visibleCards.map((entry) => ({
          card: entry.suggestion,
          insertAfter: entry.insertAfter,
        }))}
        expandedId={expandedId}
        arrivingIds={arrivingIds}
        attentionIds={attentionIds}
        exitingIds={exiting}
        onExpandCard={(id) => {
          pointerInCard.current = true;
          setExpandedId(id);
        }}
        onDismissCard={dismissCard}
        onEngage={() => {
          pointerInCard.current = true;
        }}
        onDisengage={() => {
          pointerInCard.current = false;
        }}
        registerCard={(id, node) => {
          if (node) cardEls.current.set(id, node);
          else cardEls.current.delete(id);
        }}
        onViewResource={onViewResource}
      />
    </div>
  );
}

function splitSentences(text: string): string[] {
  return (
    text.match(/[^.!?]+[.!?]+(?:\s|$)/g)?.map((part) => part.trim()) ?? [text]
  );
}

function usePostCallReveal(
  sentenceCount: number,
  itemCount: number,
  reduced: boolean
) {
  const [phase, setPhase] = useState<"thinking" | "writing" | "ready">(
    reduced ? "ready" : "thinking"
  );
  const [visibleSentences, setVisibleSentences] = useState(
    reduced ? sentenceCount : 0
  );
  const [visibleItems, setVisibleItems] = useState(reduced ? itemCount : 0);

  useEffect(() => {
    if (reduced) {
      setPhase("ready");
      setVisibleSentences(sentenceCount);
      setVisibleItems(itemCount);
      return;
    }

    const timers: number[] = [];
    const thinkMs = 720;
    const sentenceMs = 220;
    const itemMs = 70;

    timers.push(
      window.setTimeout(() => {
        setPhase("writing");
        setVisibleSentences(1);
      }, thinkMs)
    );

    for (let index = 1; index < sentenceCount; index += 1) {
      timers.push(
        window.setTimeout(() => {
          setVisibleSentences(index + 1);
        }, thinkMs + index * sentenceMs)
      );
    }

    const itemsStart = thinkMs + Math.max(sentenceCount, 1) * sentenceMs;
    timers.push(
      window.setTimeout(() => {
        setPhase("ready");
      }, itemsStart)
    );

    for (let index = 0; index < itemCount; index += 1) {
      timers.push(
        window.setTimeout(() => {
          setVisibleItems(index + 1);
        }, itemsStart + 80 + index * itemMs)
      );
    }

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [sentenceCount, itemCount, reduced]);

  return { phase, visibleSentences, visibleItems };
}

function ShimmerLine({
  className,
  reduced,
}: {
  className?: string;
  reduced: boolean;
}) {
  return (
    <div
      className={cn(
        "relative h-3 overflow-hidden rounded-[4px] bg-muted",
        className
      )}
    >
      {reduced ? null : (
        <span
          aria-hidden="true"
          className="absolute inset-0 animate-[assist-shimmer_1.1s_ease-in-out_infinite] bg-gradient-to-r from-transparent via-white to-transparent"
        />
      )}
    </div>
  );
}

function PostCallAssist({
  scenario,
  reduced,
}: {
  scenario: CallScenario;
  reduced: boolean;
}) {
  const sentences = useMemo(
    () => splitSentences(scenario.wrapUp.summary),
    [scenario.wrapUp.summary]
  );
  const items = scenario.wrapUp.actionItems;
  const { phase, visibleSentences, visibleItems } = usePostCallReveal(
    sentences.length,
    items.length,
    reduced
  );
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        !reduced &&
          "animate-[assist-wrap-in_220ms_cubic-bezier(0.23,1,0.32,1)_both]"
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4">
        <section aria-labelledby="call-summary-heading" className="flex flex-col gap-2">
          <h2
            id="call-summary-heading"
            className="text-label-md-semi text-foreground"
          >
            Call summary
          </h2>
          {phase === "thinking" ? (
            <div className="flex flex-col gap-2" aria-hidden="true">
              <ShimmerLine reduced={reduced} className="w-full" />
              <ShimmerLine reduced={reduced} className="w-[92%]" />
              <ShimmerLine reduced={reduced} className="w-[76%]" />
            </div>
          ) : (
            <p className="text-pretty text-[13px] leading-5 text-foreground">
              {sentences.slice(0, visibleSentences).map((sentence, index) => (
                <span
                  key={sentence}
                  className={cn(
                    "inline",
                    !reduced &&
                      "animate-[assist-wrap-in_180ms_cubic-bezier(0.23,1,0.32,1)_both]"
                  )}
                >
                  {index > 0 ? " " : ""}
                  {sentence}
                </span>
              ))}
              {phase === "writing" && !reduced ? (
                <span
                  aria-hidden="true"
                  className="ml-0.5 inline-block h-3.5 w-px translate-y-0.5 bg-brand align-middle animate-[assist-caret_800ms_steps(1)_infinite]"
                />
              ) : null}
            </p>
          )}
        </section>

        <section aria-labelledby="action-items-heading" className="flex flex-col gap-2">
          <h2
            id="action-items-heading"
            className="text-label-md-semi text-foreground"
          >
            Action items
          </h2>
          {phase === "thinking" ? (
            <div className="flex flex-col gap-2" aria-hidden="true">
              <ShimmerLine reduced={reduced} className="h-8 w-full" />
              <ShimmerLine reduced={reduced} className="h-8 w-[88%]" />
            </div>
          ) : (
            <ol className="flex flex-col gap-2">
              {items.slice(0, visibleItems).map((item, index) => (
                <ActionItemRow
                  key={item.id}
                  item={item}
                  index={index}
                  reduced={reduced}
                />
              ))}
            </ol>
          )}
        </section>
      </div>

      <p className="sr-only" aria-live="polite">
        {phase === "ready"
          ? "Call summary and action items are ready."
          : "Writing the call summary and action items."}
      </p>
    </div>
  );
}

function ActionItemRow({
  item,
  index,
  reduced,
}: {
  item: CallActionItem;
  index: number;
  reduced: boolean;
}) {
  return (
    <li
      className={cn(
        "flex items-start gap-2.5 rounded-lg border border-line bg-white px-3 py-2.5",
        !reduced &&
          "animate-[assist-wrap-in_180ms_cubic-bezier(0.23,1,0.32,1)_both]"
      )}
    >
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded-[4px] bg-brand-subtle text-[11px] leading-5 font-medium text-brand tabular-nums"
        aria-hidden="true"
      >
        {index + 1}
      </span>
      <p className="min-w-0 flex-1 text-pretty text-paragraph-sm leading-5 font-medium text-foreground">
        {item.title}
      </p>
    </li>
  );
}

function useScriptChecklistMotion({
  playhead,
  stepCount,
  reduced,
}: {
  playhead: number;
  stepCount: number;
  reduced: boolean;
}) {
  const [phases, setPhases] = useState<CheckPhase[]>(() =>
    Array.from({ length: stepCount }, () => "idle")
  );
  const [glowing, setGlowing] = useState<Set<number>>(() => new Set());
  const [emphasizeIndex, setEmphasizeIndex] = useState<number | null>(null);

  const settledRef = useRef<Set<number>>(new Set());
  const itemTimers = useRef<Map<number, number[]>>(new Map());
  const emphasisTimers = useRef<number[]>([]);

  const cancelItem = (index: number) => {
    const timers = itemTimers.current.get(index);
    if (!timers) return;
    timers.forEach((id) => window.clearTimeout(id));
    itemTimers.current.delete(index);
  };

  const cancelEmphasis = () => {
    emphasisTimers.current.forEach((id) => window.clearTimeout(id));
    emphasisTimers.current = [];
  };

  useEffect(
    () => () => {
      itemTimers.current.forEach((timers) =>
        timers.forEach((id) => window.clearTimeout(id))
      );
      itemTimers.current.clear();
      emphasisTimers.current.forEach((id) => window.clearTimeout(id));
      settledRef.current = new Set();
    },
    []
  );

  useEffect(() => {
    const target = new Set<number>();
    for (let index = 0; index < playhead; index += 1) {
      target.add(index);
    }

    const toRevert: number[] = [];
    for (const index of settledRef.current) {
      if (!target.has(index)) toRevert.push(index);
    }

    const toComplete: number[] = [];
    for (const index of target) {
      if (!settledRef.current.has(index)) toComplete.push(index);
    }
    toComplete.sort((a, b) => a - b);

    if (toRevert.length > 0) {
      for (const index of toRevert) {
        cancelItem(index);
        settledRef.current.delete(index);
      }
      setPhases((current) => {
        const next =
          current.length === stepCount
            ? [...current]
            : Array.from({ length: stepCount }, (_, i) => current[i] ?? "idle");
        toRevert.forEach((index) => {
          next[index] = "idle";
        });
        return next;
      });
      setGlowing((current) => {
        const next = new Set(current);
        toRevert.forEach((index) => next.delete(index));
        return next;
      });
    }

    if (toComplete.length === 0) return;

    let nextIncomplete: number | null = null;
    for (let index = 0; index < stepCount; index += 1) {
      if (!target.has(index)) {
        nextIncomplete = index;
        break;
      }
    }

    if (reduced) {
      toComplete.forEach((index) => settledRef.current.add(index));
      setPhases((current) => {
        const next =
          current.length === stepCount
            ? [...current]
            : Array.from({ length: stepCount }, (_, i) => current[i] ?? "idle");
        toComplete.forEach((index) => {
          next[index] = "done";
        });
        return next;
      });
      return;
    }

    toComplete.forEach((index, order) => {
      settledRef.current.add(index);
      const start = order * CHECKLIST_MOTION.staggerMs;
      const timers: number[] = [];

      timers.push(
        window.setTimeout(() => {
          setPhases((current) => {
            const next = [...current];
            next[index] = "detecting";
            return next;
          });
        }, start)
      );

      timers.push(
        window.setTimeout(() => {
          setPhases((current) => {
            const next = [...current];
            next[index] = "completing";
            return next;
          });
        }, start + CHECKLIST_MOTION.detectMs)
      );

      timers.push(
        window.setTimeout(() => {
          setPhases((current) => {
            const next = [...current];
            next[index] = "done";
            return next;
          });
          setGlowing((current) => new Set(current).add(index));
        }, start + CHECKLIST_MOTION.detectMs + CHECKLIST_MOTION.completeMs)
      );

      timers.push(
        window.setTimeout(() => {
          setGlowing((current) => {
            const next = new Set(current);
            next.delete(index);
            return next;
          });
        }, start + CHECKLIST_MOTION.detectMs + CHECKLIST_MOTION.completeMs + CHECKLIST_MOTION.glowMs)
      );

      itemTimers.current.set(index, timers);
    });

    if (nextIncomplete == null) {
      cancelEmphasis();
      setEmphasizeIndex(null);
      return;
    }

    const lastDoneAt =
      (toComplete.length - 1) * CHECKLIST_MOTION.staggerMs +
      CHECKLIST_MOTION.detectMs +
      CHECKLIST_MOTION.completeMs;
    cancelEmphasis();
    emphasisTimers.current.push(
      window.setTimeout(() => setEmphasizeIndex(nextIncomplete), lastDoneAt)
    );
    emphasisTimers.current.push(
      window.setTimeout(() => {
        setEmphasizeIndex((current) =>
          current === nextIncomplete ? null : current
        );
      }, lastDoneAt + CHECKLIST_MOTION.nextMs)
    );
  }, [playhead, stepCount, reduced]);

  return { phases, glowing, emphasizeIndex };
}

function FullScriptList({
  scenario,
  playhead,
  reduced,
  placedCards,
  expandedId,
  arrivingIds,
  attentionIds,
  exitingIds,
  onExpandCard,
  onDismissCard,
  onEngage,
  onDisengage,
  registerCard,
  onViewResource,
}: {
  scenario: CallScenario;
  playhead: number;
  reduced: boolean;
  placedCards: { card: GuidanceSuggestion; insertAfter: number }[];
  expandedId: string | null;
  arrivingIds: Set<string>;
  attentionIds: Set<string>;
  exitingIds: string[];
  onExpandCard: (id: string) => void;
  onDismissCard: (id: string) => void;
  onEngage: () => void;
  onDisengage: () => void;
  registerCard: (id: string, node: HTMLElement | null) => void;
  onViewResource: (resource: GuidanceResource) => void;
}) {
  const { phases, glowing, emphasizeIndex } = useScriptChecklistMotion({
    playhead,
    stepCount: scenario.steps.length,
    reduced,
  });

  const cardsByStep = new Map<number, GuidanceSuggestion[]>();
  for (const { card, insertAfter } of placedCards) {
    const list = cardsByStep.get(insertAfter) ?? [];
    list.push(card);
    cardsByStep.set(insertAfter, list);
  }

  return (
    <ol className="flex flex-col" aria-label="Call script">
      {scenario.steps.map((step, index) => {
        const stepCards = cardsByStep.get(index) ?? [];
        const phase = phases[index] ?? "idle";

        return (
          <li key={`${scenario.id}-${step.title}`} className="flex flex-col">
            <ScriptStepRow
              step={step}
              phase={phase}
              glow={glowing.has(index)}
              emphasize={emphasizeIndex === index}
              reduced={reduced}
            />
            {stepCards.map((card) => (
              <InCallGuidanceSlot
                key={card.id}
                item={card}
                reduced={reduced}
                expanded={expandedId === card.id}
                arriving={arrivingIds.has(card.id)}
                exiting={exitingIds.includes(card.id)}
                attention={attentionIds.has(card.id)}
                onExpand={() => onExpandCard(card.id)}
                onDismiss={() => onDismissCard(card.id)}
                onViewResource={onViewResource}
                onEngage={onEngage}
                onDisengage={onDisengage}
                cardRef={(node) => registerCard(card.id, node)}
              />
            ))}
          </li>
        );
      })}
    </ol>
  );
}

function ScriptCheckMark({
  phase,
  glow,
}: {
  phase: CheckPhase;
  glow: boolean;
}) {
  return (
    <span
      className={cn(
        "relative flex size-4 shrink-0 items-center justify-center",
        glow && "script-check-glow"
      )}
    >
      <svg
        viewBox="0 0 16 16"
        width={16}
        height={16}
        fill="none"
        aria-hidden="true"
        data-phase={phase}
        className={cn(
          "script-check size-4 overflow-visible",
          phase === "completing" || phase === "done"
            ? "text-success"
            : "text-disabled-fg"
        )}
      >
        <circle className="script-check-fill" cx="8" cy="8" r="6" />
        <circle
          className="script-check-dash"
          cx="8"
          cy="8"
          r="6"
          stroke="currentColor"
          strokeWidth="1.15"
          strokeDasharray="1.55 2.4"
          strokeLinecap="round"
        />
        <path
          className="script-check-mark"
          d="M5.15 8.2 L7.1 10.15 L10.95 5.85"
          stroke="white"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function ScriptStepRow({
  step,
  phase,
  glow,
  emphasize,
  reduced,
}: {
  step: ScriptStep;
  phase: CheckPhase;
  glow: boolean;
  emphasize: boolean;
  reduced: boolean;
}) {
  const complete = phase === "completing" || phase === "done";

  return (
    <div
      className={cn(
        "rounded-[6px] px-1 py-1.5",
        emphasize && !reduced && "script-next-emphasis"
      )}
    >
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center overflow-visible">
          <ScriptCheckMark phase={phase} glow={glow} />
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "script-step-title min-w-0 text-pretty text-paragraph-sm",
              complete ? "is-complete text-muted-foreground" : "text-foreground",
              reduced && "transition-none"
            )}
          >
            {step.title}
          </p>
          {step.wording ? (
            <p className="mt-0.5 text-pretty text-[13px] leading-5 text-muted-foreground">
              “{step.wording}”
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function TranscriptPane({
  turns,
  reduced,
}: {
  turns: TranscriptTurn[];
  reduced: boolean;
}) {
  const endRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "end",
    });
  }, [turns.length, reduced]);

  if (turns.length === 0) {
    return (
      <div className="flex flex-1 items-start px-4 py-4">
        <p className="text-pretty text-paragraph-sm text-muted-foreground">
          Nothing to replay yet. Open this if you miss a sentence — it won’t
          sit beside you while you’re talking.
        </p>
      </div>
    );
  }

  return (
    <ol
      className={cn(
        "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-3",
        !reduced && "animate-[assist-now-in_180ms_cubic-bezier(0.23,1,0.32,1)_both]"
      )}
      aria-label="Call transcript"
    >
      {turns.map((turn, index) => (
        <li
          key={`${turn.atMs}-${turn.quote}`}
          ref={index === turns.length - 1 ? endRef : undefined}
          className="flex flex-col gap-0.5"
        >
          <p className="text-label-sm text-muted-foreground tabular-nums">
            {turn.speaker === "customer" ? "Customer" : "You"} ·{" "}
            {formatQuoteTime(turn.atMs)}
          </p>
          <p
            className={cn(
              "text-pretty text-paragraph-sm",
              turn.speaker === "customer"
                ? "text-foreground"
                : "text-muted-foreground"
            )}
          >
            {turn.quote}
          </p>
        </li>
      ))}
    </ol>
  );
}

export type { GuidanceSuggestion };
