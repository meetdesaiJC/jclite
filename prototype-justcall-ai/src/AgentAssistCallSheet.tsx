import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type SVGProps,
} from "react";
import { cn } from "@/lib/utils";
import { Dropdown } from "@/components/Dropdown";
import { IconSparkles } from "@/components/Icon";
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
import {
  ScriptStepRow,
  useScriptChecklistMotion,
} from "./ScriptChecklist";

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

const CARD_ENTER_MS = 200;
const CARD_EXIT_MS = 160;
const CARD_ATTENTION_MS = 700;
const AGENT_SCROLL_IDLE_MS = 2000;

/** Panel opens — a short prepare beat before the script is on screen. */
const PREPARE_MS = 420;
/** Script appears — each line fades upward behind the one before it. */
const SCRIPT_STEP_MS = 180;
const SCRIPT_STAGGER_MS = 35;
const SCRIPT_STAGGER_CAP = 8;

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
  /** The panel has taken its width — play the prepare beat, then the script. */
  active?: boolean;
  /** Hangup — the live stream lets go before the phone changes state. */
  exiting?: boolean;
  /** Hangup — script and transcript yield to the generated recap. */
  ended?: boolean;
  className?: string;
}

export function AgentAssistCallSheet({
  elapsedMs,
  scenario,
  onScenarioChange,
  guidanceItems = SEED_GUIDANCE,
  active = true,
  exiting = false,
  ended = false,
  className,
}: AgentAssistCallSheetProps) {
  const [view, setView] = useState<"assist" | "transcript">("assist");
  const [viewingResource, setViewingResource] = useState<GuidanceResource | null>(
    null
  );
  const snapshot = simulationAt(scenario, elapsedMs, guidanceItems);
  const reduced = prefersReducedMotion();
  const [preparing, setPreparing] = useState(() => !reduced && !ended && active);
  const latestCard = snapshot.suggestions[snapshot.suggestions.length - 1] ?? null;
  const lastChecked =
    snapshot.scriptIndex > 0 ? scenario.steps[snapshot.scriptIndex - 1] : null;
  const liveAnnouncement = ended
    ? "Generating call recap."
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

  // Panel loading — held only as long as the content needs to be ready.
  useEffect(() => {
    if (!active || ended || reduced) {
      setPreparing(false);
      return;
    }
    setPreparing(true);
    const timer = window.setTimeout(() => setPreparing(false), PREPARE_MS);
    return () => window.clearTimeout(timer);
  }, [active, ended, reduced]);

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
      <header
        className={cn(
          "flex h-11 shrink-0 items-center justify-between gap-3 border-b border-line px-4",
          !reduced && "assist-head-in"
        )}
      >
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
        <PostCallAssist key={scenario.id} scenario={scenario} reduced={reduced} />
      ) : preparing ? (
        <PreparingPane />
      ) : view === "transcript" ? (
        <TranscriptPane
          turns={snapshot.transcript}
          reduced={reduced}
          exiting={exiting}
        />
      ) : (
        <AssistStream
          key={scenario.id}
          scenario={scenario}
          snapshot={snapshot}
          reduced={reduced}
          collapsing={exiting}
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

/**
 * Panel loading — a short, quiet beat while the script is put together.
 * No blocking loader: a shimmer where the content is about to land.
 */
function PreparingPane() {
  return (
    <div
      className="assist-prep-in flex min-h-0 flex-1 flex-col gap-2.5 px-4 py-3"
      aria-live="polite"
    >
      <div className="flex items-center gap-1.5">
        <IconSparkles
          size={16}
          aria-hidden="true"
          className="recap-sparkle-pulse size-4 shrink-0 text-ai"
        />
        <p className="text-label-sm text-muted-foreground">
          Preparing Agent Assist...
        </p>
      </div>
      <span className="assist-prep-bar w-[62%]" aria-hidden="true" />
      <span className="assist-prep-bar w-[44%]" aria-hidden="true" />
    </div>
  );
}

function AssistStream({
  scenario,
  snapshot,
  reduced,
  collapsing,
  onViewResource,
}: {
  scenario: CallScenario;
  snapshot: SimulationSnapshot;
  reduced: boolean;
  collapsing: boolean;
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
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3",
        !reduced && collapsing && "assist-stream-out"
      )}
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

type RecapPhase = "generating" | "skeleton" | "summary" | "items" | "complete";
type RecapStatus = "generating" | "ready" | "leaving" | "gone";

const RECAP_MOTION = {
  generatingMs: 820,
  skeletonMs: 980,
  summaryRevealMs: 220,
  itemStaggerMs: 150,
  completeBeatMs: 180,
  readyHoldMs: 1600,
  statusOutMs: 200,
} as const;

function usePostCallReveal(itemCount: number, reduced: boolean) {
  const [phase, setPhase] = useState<RecapPhase>(reduced ? "complete" : "generating");
  const [status, setStatus] = useState<RecapStatus>(reduced ? "gone" : "generating");
  const [visibleItems, setVisibleItems] = useState(reduced ? itemCount : 0);

  useEffect(() => {
    if (reduced) {
      setPhase("complete");
      setStatus("gone");
      setVisibleItems(itemCount);
      return;
    }

    setPhase("generating");
    setStatus("generating");
    setVisibleItems(0);

    const timers: number[] = [];
    const skeletonAt = RECAP_MOTION.generatingMs;
    const summaryAt = skeletonAt + RECAP_MOTION.skeletonMs;
    const itemsAt = summaryAt + RECAP_MOTION.summaryRevealMs;
    const completeAt =
      itemsAt + itemCount * RECAP_MOTION.itemStaggerMs + RECAP_MOTION.completeBeatMs;
    const leaveAt = completeAt + RECAP_MOTION.readyHoldMs;

    timers.push(window.setTimeout(() => setPhase("skeleton"), skeletonAt));
    timers.push(window.setTimeout(() => setPhase("summary"), summaryAt));
    timers.push(window.setTimeout(() => setPhase("items"), itemsAt));

    for (let index = 0; index < itemCount; index += 1) {
      timers.push(
        window.setTimeout(() => {
          setVisibleItems(index + 1);
        }, itemsAt + index * RECAP_MOTION.itemStaggerMs)
      );
    }

    timers.push(
      window.setTimeout(() => {
        setPhase("complete");
        setStatus("ready");
      }, completeAt)
    );
    timers.push(window.setTimeout(() => setStatus("leaving"), leaveAt));
    timers.push(
      window.setTimeout(() => setStatus("gone"), leaveAt + RECAP_MOTION.statusOutMs)
    );

    return () => {
      timers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [itemCount, reduced]);

  return { phase, status, visibleItems };
}

function RecapSparkleCheck({ ready }: { ready: boolean }) {
  return (
    <span className="relative flex size-4 shrink-0 items-center justify-center">
      <IconSparkles
        size={16}
        aria-hidden="true"
        className={cn(
          "absolute inset-0 size-4 text-ai",
          ready ? "recap-sparkle-out" : "recap-sparkle-pulse"
        )}
      />
      <svg
        viewBox="0 0 16 16"
        width={16}
        height={16}
        fill="none"
        aria-hidden="true"
        className={cn(
          "absolute inset-0 size-4 text-success",
          ready ? "recap-check-in" : "opacity-0"
        )}
      >
        <path
          className="recap-check-mark"
          d="M3.4 8.15 L6.55 11.2 L12.6 4.7"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function RecapStatusRow({
  status,
  reduced,
}: {
  status: RecapStatus;
  reduced: boolean;
}) {
  if (status === "gone") return null;

  const ready = status === "ready" || status === "leaving";

  return (
    <div className={cn("recap-status-slot", status === "leaving" && "is-leaving")}>
      <div className="overflow-hidden">
        <div
          className={cn(
            "flex items-center gap-1.5",
            !reduced && status === "generating" && "recap-status-in"
          )}
          aria-live="polite"
        >
          <RecapSparkleCheck ready={ready} />
          <p className="text-label-sm text-muted-foreground">
            {ready ? "Recap ready" : "Generating call recap..."}
          </p>
        </div>
      </div>
    </div>
  );
}

function RecapSkeleton({ reduced }: { reduced: boolean }) {
  return (
    <div
      className={cn("flex flex-col gap-2", !reduced && "recap-skeleton-in")}
      aria-hidden="true"
    >
      <span className="recap-skeleton-line w-full" />
      <span className="recap-skeleton-line w-[90%]" />
      <span className="recap-skeleton-line w-[72%]" />
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
  const items = scenario.wrapUp.actionItems;
  const { phase, status, visibleItems } = usePostCallReveal(items.length, reduced);
  const showSummary = phase !== "generating";
  const showText = phase === "summary" || phase === "items" || phase === "complete";
  const showItems = phase === "items" || phase === "complete";

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col",
        !reduced &&
          "animate-[assist-wrap-in_220ms_cubic-bezier(0.23,1,0.32,1)_both]"
      )}
    >
      <div
        className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4"
        aria-busy={status === "generating"}
      >
        <RecapStatusRow status={status} reduced={reduced} />

        {showSummary ? (
          <section
            aria-labelledby="call-summary-heading"
            className={cn(
              "flex flex-col gap-2",
              !reduced && phase === "skeleton" && "recap-section-in"
            )}
          >
            <h2
              id="call-summary-heading"
              className="text-label-md-semi text-foreground"
            >
              Call summary
            </h2>
            {showText ? (
              <p
                className={cn(
                  "text-pretty text-[13px] leading-5 text-foreground",
                  !reduced && "recap-summary-reveal"
                )}
              >
                {scenario.wrapUp.summary}
              </p>
            ) : (
              <RecapSkeleton reduced={reduced} />
            )}
          </section>
        ) : null}

        {showItems ? (
          <section
            aria-labelledby="action-items-heading"
            className={cn("flex flex-col gap-2", !reduced && "recap-section-in")}
          >
            <h2
              id="action-items-heading"
              className="text-label-md-semi text-foreground"
            >
              Action items
            </h2>
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
          </section>
        ) : null}
      </div>

      <p className="sr-only" aria-live="polite">
        {status === "ready" || status === "leaving" || status === "gone"
          ? "Recap ready. Call summary and action items are ready."
          : "Generating call recap."}
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
        !reduced && "recap-item-in"
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

  // Script appears — the list fades upward line by line, then holds still so
  // later guidance never re-triggers the entrance.
  const [entering, setEntering] = useState(!reduced);
  const stepCount = scenario.steps.length;

  useEffect(() => {
    if (!entering) return;
    const timer = window.setTimeout(
      () =>
        setEntering(false),
      Math.min(stepCount, SCRIPT_STAGGER_CAP) * SCRIPT_STAGGER_MS +
        SCRIPT_STEP_MS +
        40
    );
    return () => window.clearTimeout(timer);
  }, [entering, stepCount]);

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
          <li
            key={`${scenario.id}-${step.title}`}
            className={cn("flex flex-col", entering && "script-step-in")}
            style={
              entering
                ? ({
                    "--step-index": Math.min(index, SCRIPT_STAGGER_CAP),
                  } as CSSProperties)
                : undefined
            }
          >
            <ScriptStepRow
              title={step.title}
              wording={step.wording}
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

function TranscriptPane({
  turns,
  reduced,
  exiting = false,
}: {
  turns: TranscriptTurn[];
  reduced: boolean;
  exiting?: boolean;
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
        !reduced &&
          !exiting &&
          "animate-[assist-now-in_180ms_cubic-bezier(0.23,1,0.32,1)_both]",
        !reduced && exiting && "assist-stream-out"
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
