import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type SVGProps,
} from "react";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { Dropdown } from "@/components/Dropdown";
import {
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconCopy,
  IconFile,
  IconMessages,
  IconScheduler,
  IconSparkles,
} from "@/components/Icon";
import { IconJcaiAgentAssist } from "./icons/JustCallAiNavIcons";
import {
  CALL_SCENARIOS,
  simulationAt,
  type CallActionItem,
  type CallScenario,
  type GuidanceSuggestion,
  type ScriptStep,
  type SimulationSnapshot,
  type TranscriptSpeaker,
  type TranscriptTurn,
} from "./callSimulation";
import {
  SEED_GUIDANCE,
  type GuidanceItem,
  type GuidanceResource,
} from "./guidanceData";
import { InCallGuidanceSlot, ResourceOverlay } from "./LiveGuidance";
import {
  ScriptStepRow,
  useScriptChecklistMotion,
} from "./ScriptChecklist";
import { useGuidanceStream } from "./useGuidanceStream";

/**
 * In-call Agent Assist — one stream. The full script stays open so any
 * spoken line can check off. Guidance cards insert under the step they
 * belong to. Only one card is expanded; the rest sit as compact
 * suggestions. Cards stay until the agent dismisses them — never on a
 * timer, and never because the script moved on.
 */

/** Panel opens — a short prepare beat before the script is on screen. */
const PREPARE_MS = 420;
/** Script appears — each line fades upward behind the one before it. */
const SCRIPT_STEP_MS = 180;
const SCRIPT_STAGGER_MS = 35;
const SCRIPT_STAGGER_CAP = 8;

/** Guidance lives in its own column — the script never pins a card of its own. */
const EMPTY_SUGGESTIONS: GuidanceSuggestion[] = [];

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[parts.length - 1]?.[0] ?? ""}`.toUpperCase();
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
  /** Post-call — the pane is showing the full transcript instead of the recap. */
  transcriptOpen?: boolean;
  onTranscriptOpenChange?: (open: boolean) => void;
  /** The transcript already has its own pane beside this one — drop the toggle. */
  transcriptDetached?: boolean;
  /**
   * Guidance has its own column beside this one — the script runs clean, with
   * no cards inserted between the steps.
   */
  guidanceDetached?: boolean;
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
  transcriptOpen = false,
  onTranscriptOpenChange,
  transcriptDetached = false,
  guidanceDetached = false,
  className,
}: AgentAssistCallSheetProps) {
  const [view, setView] = useState<"assist" | "transcript">("assist");
  // The recap is written once. Reading the transcript and coming back shows it
  // as it stands — it is not generated a second time.
  const [recapRevealed, setRecapRevealed] = useState(false);
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
        "relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white",
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
          {guidanceDetached && !ended ? (
            <IconScript
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
          ) : (
            <IconJcaiAgentAssist
              className="size-4 shrink-0 text-brand"
              aria-hidden="true"
            />
          )}
          <p className="text-label-md-semi text-foreground">
            {guidanceDetached && !ended ? "Script" : "Agent Assist"}
          </p>
        </div>
        {ended ? (
          transcriptOpen ? (
            <button
              type="button"
              onClick={() => onTranscriptOpenChange?.(false)}
              className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-[4px] px-1.5 text-label-sm text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24"
            >
              <IconChevronLeft size={16} className="size-4 shrink-0" />
              Back to summary
            </button>
          ) : null
        ) : (
          <div className="flex min-w-0 items-center gap-1">
            <Dropdown
              searchable={false}
              variant="borderless"
              leftIcon={guidanceDetached ? undefined : <IconScript />}
              options={options}
              value={scenario.id}
              onValueChange={(value) =>
                onScenarioChange(Array.isArray(value) ? value[0] : value)
              }
              aria-label="Call script"
              triggerClassName="h-7 min-w-0 max-w-[200px] px-1.5 text-paragraph-sm text-muted-foreground"
            />
            {transcriptDetached ? null : (
              <button
                type="button"
                aria-pressed={view === "transcript"}
                onClick={() =>
                  setView((current) =>
                    current === "transcript" ? "assist" : "transcript"
                  )
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
            )}
          </div>
        )}
      </header>

      {ended ? (
        transcriptOpen ? (
          <TranscriptPane
            turns={snapshot.transcript}
            contactName={scenario.contactName}
            reduced={reduced}
          />
        ) : (
          <PostCallAssist
            key={scenario.id}
            scenario={scenario}
            reduced={reduced}
            instant={recapRevealed}
            onRevealed={() => setRecapRevealed(true)}
            onViewTranscript={
              onTranscriptOpenChange
                ? () => onTranscriptOpenChange(true)
                : undefined
            }
          />
        )
      ) : preparing ? (
        <PreparingPane />
      ) : view === "transcript" ? (
        <TranscriptPane
          turns={snapshot.transcript}
          contactName={scenario.contactName}
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
          guidanceDetached={guidanceDetached}
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
  guidanceDetached,
  onViewResource,
}: {
  scenario: CallScenario;
  snapshot: SimulationSnapshot;
  reduced: boolean;
  collapsing: boolean;
  guidanceDetached: boolean;
  onViewResource: (resource: GuidanceResource) => void;
}) {
  const playhead = Math.min(snapshot.scriptIndex, scenario.steps.length);
  const stream = useGuidanceStream({
    suggestions: guidanceDetached ? EMPTY_SUGGESTIONS : snapshot.suggestions,
    steps: scenario.steps,
    playhead,
    reduced,
  });

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3",
        !reduced && collapsing && "assist-stream-out"
      )}
      {...stream.scrollHandlers}
    >
      <FullScriptList
        scenario={scenario}
        playhead={playhead}
        reduced={reduced}
        placedCards={stream.cards.map((entry) => ({
          card: entry.suggestion,
          insertAfter: entry.insertAfter,
        }))}
        expandedId={stream.expandedId}
        arrivingIds={stream.arrivingIds}
        attentionIds={stream.attentionIds}
        onToggleCard={stream.toggleCard}
        onEngage={stream.engage}
        onDisengage={stream.disengage}
        registerCard={stream.registerCard}
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

/**
 * Post-call — the recap the agent reads and works from: what was said, then
 * what to do about it. Summary and action items are one continuous pane, not
 * two tabs, so nothing about the call is a click away. Disposition, notes and
 * rating live in Wrap up beside this; this pane only reports and hands off.
 */
function PostCallAssist({
  scenario,
  reduced,
  instant,
  onRevealed,
  onViewTranscript,
}: {
  scenario: CallScenario;
  reduced: boolean;
  /** Coming back from the transcript — the recap is already written. */
  instant: boolean;
  onRevealed: () => void;
  onViewTranscript?: () => void;
}) {
  const items = scenario.wrapUp.actionItems;
  const { phase, status, visibleItems } = usePostCallReveal(
    items.length,
    reduced || instant
  );
  const showSummary = phase !== "generating";
  const showText = phase === "summary" || phase === "items" || phase === "complete";
  const showItems = phase === "items" || phase === "complete";
  const complete = phase === "complete";

  useEffect(() => {
    if (complete) onRevealed();
  }, [complete, onRevealed]);

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
            <div className="flex min-h-7 items-center justify-between gap-2">
              <h2
                id="call-summary-heading"
                className="flex items-center gap-1.5 text-label-md-semi text-foreground"
              >
                <IconSparkles
                  size={16}
                  aria-hidden="true"
                  className="size-4 shrink-0 text-ai"
                />
                Call summary
              </h2>
              {/* The summary is the agent's raw material for notes — it can go
                  straight to the clipboard without being retyped. */}
              {showText ? <CopyButton text={scenario.wrapUp.summary} /> : null}
            </div>
            {showText ? (
              <p
                className={cn(
                  "text-pretty text-paragraph-md text-foreground",
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
            <div className="flex items-center gap-1.5">
              <h2
                id="action-items-heading"
                className="text-label-md-semi text-foreground"
              >
                Action items
              </h2>
            </div>
            <ol className="flex flex-col gap-2">
              {items.slice(0, visibleItems).map((item) => (
                <ActionItemRow key={item.id} item={item} reduced={reduced} />
              ))}
            </ol>
          </section>
        ) : null}

      </div>

      {/* The recap is the summary of the call; the transcript is the record of
          it. One click apart, on the pane's own edge. */}
      {complete && onViewTranscript ? (
        <div
          className={cn(
            "flex shrink-0 items-center justify-center border-t border-line px-4 py-3",
            !reduced && "recap-section-in"
          )}
        >
          <button
            type="button"
            onClick={onViewTranscript}
            className="inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-[4px] border border-line px-3 text-label-md text-foreground outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconFile size={16} className="size-4 shrink-0 text-muted-foreground" />
            View full transcript
          </button>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {status === "ready" || status === "leaving" || status === "gone"
          ? "Recap ready. Call summary and action items are ready."
          : "Generating call recap."}
      </p>
    </div>
  );
}

/** Copy to clipboard, with the confirmation on the button itself. */
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timer = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timer);
  }, [copied]);

  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard?.writeText(text).catch(() => {});
        setCopied(true);
      }}
      className="inline-flex h-7 shrink-0 cursor-pointer items-center gap-1 rounded-[4px] px-1.5 text-label-sm text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
    >
      {copied ? (
        <IconCheck size={16} className="size-4 shrink-0 text-success" />
      ) : (
        <IconCopy size={16} className="size-4 shrink-0" />
      )}
      {copied ? "Copied" : "Copy"}
    </button>
  );
}

const ACTION_CTA = {
  schedule: { label: "Schedule", icon: IconScheduler },
  message: { label: "Send message", icon: IconMessages },
} as const;

/**
 * One item, one next step. The CTA is the product surface that item belongs
 * to; rows without one keep the same height so the list reads as one stack.
 */
function ActionItemRow({
  item,
  reduced,
}: {
  item: CallActionItem;
  reduced: boolean;
}) {
  const cta = item.action ? ACTION_CTA[item.action] : null;
  const CtaIcon = cta?.icon;

  return (
    <li
      className={cn(
        // 50px = the CTA button's own height plus padding and border, so a row
        // without a CTA sits at exactly the same height as one with it.
        "flex min-h-[50px] items-center gap-2.5 rounded-lg border border-line bg-white py-2 pr-2 pl-3",
        !reduced && "recap-item-in"
      )}
    >
      <p className="min-w-0 flex-1 text-pretty text-label-md text-foreground">
        {item.title}
      </p>
      {cta && CtaIcon ? (
        <button
          type="button"
          className="inline-flex h-8 shrink-0 cursor-pointer items-center gap-1 rounded-[4px] px-2 text-label-sm text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <CtaIcon size={16} className="size-4 shrink-0" />
          {cta.label}
          <IconChevronRight size={16} className="size-4 shrink-0 opacity-70" />
        </button>
      ) : null}
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
  onToggleCard,
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
  onToggleCard: (id: string) => void;
  onEngage: () => void;
  onDisengage: () => void;
  registerCard: (id: string, node: HTMLElement | null) => void;
  onViewResource: (resource: GuidanceResource) => void;
}) {
  const { phases, glowing } = useScriptChecklistMotion({
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
              reduced={reduced}
            />
            {stepCards.map((card) => (
              <InCallGuidanceSlot
                key={card.id}
                item={card}
                reduced={reduced}
                expanded={expandedId === card.id}
                arriving={arrivingIds.has(card.id)}
                attention={attentionIds.has(card.id)}
                onToggle={() => onToggleCard(card.id)}
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

/**
 * Wide in-call layout — the transcript stops being a toggle and gets its own
 * pane beside Agent Assist. Same header rhythm as the assist panel so the two
 * read as one surface split in two.
 */
export interface LiveTranscriptPanelProps {
  elapsedMs: number;
  scenario: CallScenario;
  guidanceItems?: GuidanceItem[];
  /** Hangup — the live stream lets go before the phone changes state. */
  exiting?: boolean;
  /** When set, the parent owns collapse so notes can take the freed height. */
  expanded?: boolean;
  onExpandedChange?: (expanded: boolean) => void;
  className?: string;
}

export function LiveTranscriptPanel({
  elapsedMs,
  scenario,
  guidanceItems = SEED_GUIDANCE,
  exiting = false,
  expanded: expandedProp,
  onExpandedChange,
  className,
}: LiveTranscriptPanelProps) {
  const snapshot = simulationAt(scenario, elapsedMs, guidanceItems);
  const reduced = prefersReducedMotion();
  const bodyId = useId();
  const [uncontrolledExpanded, setUncontrolledExpanded] = useState(true);
  const expanded = expandedProp ?? uncontrolledExpanded;

  const setExpanded = (next: boolean) => {
    onExpandedChange?.(next);
    if (expandedProp === undefined) setUncontrolledExpanded(next);
  };

  return (
    <section
      aria-label="Live transcript"
      className={cn(
        "flex min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white",
        expanded ? "h-full" : "h-11",
        className
      )}
    >
      <header
        className={cn(
          "flex h-11 shrink-0 items-center border-line",
          expanded && "border-b",
          !reduced && "assist-head-in"
        )}
      >
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls={bodyId}
          aria-label={expanded ? "Collapse live transcript" : "Expand live transcript"}
          onClick={() => setExpanded(!expanded)}
          className="group flex h-full min-w-0 flex-1 cursor-pointer items-center justify-between gap-3 px-4 outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/24"
        >
          <div className="flex min-w-0 items-center gap-1.5">
            <IconWaveform className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-label-md-semi text-foreground">Live transcript</span>
          </div>
          <span
            className="flex size-6 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground transition-colors duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:bg-surface-hover group-hover:text-foreground group-active:scale-[0.97]"
            aria-hidden="true"
          >
            {expanded ? <IconMinus className="size-4" /> : <IconPlus className="size-4" />}
          </span>
        </button>
      </header>

      <div
        id={bodyId}
        role="region"
        aria-label="Call transcript"
        aria-hidden={!expanded}
        inert={!expanded || undefined}
        hidden={!expanded}
        className={cn(
          "min-h-0 overflow-hidden",
          expanded && "flex-1",
          !reduced && expanded && "assist-card-body assist-card-body-open"
        )}
      >
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          {expanded && (
            <TranscriptPane
              turns={snapshot.transcript}
              contactName={scenario.contactName}
              reduced={reduced}
              exiting={exiting}
              active={expanded}
            />
          )}
        </div>
      </div>
    </section>
  );
}

function IconWaveform(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2 6.5v3M5 4v8M8 2.5v11M11 4.5v7M14 6.5v3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconPlus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M8 3.333v9.334M3.333 8h9.334"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconMinus(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M3.333 8h9.334"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** The signed-in agent — same initials the global header shows. */
const AGENT_INITIALS = "SJ";

// ---------------------------------------------------------------------------
// Progressive transcript — chunk-based reveal
// ---------------------------------------------------------------------------

interface ProgressiveTurn {
  atMs: number;
  speaker: TranscriptSpeaker;
  fullQuote: string;
  visibleText: string;
  finalized: boolean;
}

/**
 * Split a quote into cumulative reveal chunks (each chunk is the full visible
 * string up to that point). Groups 1-3 words per chunk for a natural feel.
 */
function buildChunks(quote: string): string[] {
  const words = quote.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let cursor = 0;
  while (cursor < words.length) {
    const r = Math.random();
    const chunkSize = r < 0.35 ? 1 : r < 0.70 ? 2 : 3;
    cursor = Math.min(cursor + chunkSize, words.length);
    chunks.push(words.slice(0, cursor).join(" "));
  }
  return chunks;
}

/**
 * Takes raw simulation turns (each with a complete quote) and returns
 * ProgressiveTurn[] where each quote is revealed in word-chunks via
 * real-time intervals, finalizing ~800ms after the last chunk appears.
 */
function useProgressiveTranscript(turns: TranscriptTurn[]): ProgressiveTurn[] {
  const [state, setState] = useState<Map<number, ProgressiveTurn>>(new Map());
  const scheduled = useRef<Set<number>>(new Set());

  useEffect(() => {
    for (const turn of turns) {
      const key = turn.atMs;
      if (scheduled.current.has(key)) continue;
      scheduled.current.add(key);

      const chunks = buildChunks(turn.quote);

      // Create the row immediately with the first chunk.
      setState((prev) => {
        const next = new Map(prev);
        next.set(key, {
          atMs: turn.atMs,
          speaker: turn.speaker,
          fullQuote: turn.quote,
          visibleText: chunks[0] ?? turn.quote,
          finalized: chunks.length <= 1,
        });
        return next;
      });

      if (chunks.length <= 1) {
        setTimeout(() => {
          setState((prev) => {
            const next = new Map(prev);
            const ex = next.get(key);
            if (ex) next.set(key, { ...ex, finalized: true });
            return next;
          });
        }, 820);
        continue;
      }

      // Stream remaining chunks with 150-300ms random intervals.
      let idx = 1;
      const scheduleNext = () => {
        if (idx >= chunks.length) {
          setTimeout(() => {
            setState((prev) => {
              const next = new Map(prev);
              const ex = next.get(key);
              if (ex) next.set(key, { ...ex, finalized: true });
              return next;
            });
          }, 820);
          return;
        }
        const delay = 150 + Math.random() * 150;
        setTimeout(() => {
          const chunk = chunks[idx++];
          setState((prev) => {
            const next = new Map(prev);
            const ex = next.get(key);
            if (ex) next.set(key, { ...ex, visibleText: chunk, finalized: false });
            return next;
          });
          scheduleNext();
        }, delay);
      };

      // Small head-start so the row enter animation plays before text streams.
      setTimeout(scheduleNext, 160);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [turns.length]);

  return turns.map((turn) => {
    const p = state.get(turn.atMs);
    return p ?? {
      atMs: turn.atMs,
      speaker: turn.speaker,
      fullQuote: turn.quote,
      visibleText: "",
      finalized: false,
    };
  });
}

// ---------------------------------------------------------------------------
// Grouping
// ---------------------------------------------------------------------------

interface ProgressiveGroup {
  speaker: TranscriptSpeaker;
  atMs: number;
  quotes: ProgressiveTurn[];
}

function groupProgressiveTurns(turns: ProgressiveTurn[]): ProgressiveGroup[] {
  const groups: ProgressiveGroup[] = [];
  for (const turn of turns) {
    const last = groups[groups.length - 1];
    if (last && last.speaker === turn.speaker) {
      last.quotes.push(turn);
      continue;
    }
    groups.push({ speaker: turn.speaker, atMs: turn.atMs, quotes: [turn] });
  }
  return groups;
}

// ---------------------------------------------------------------------------
// TranscriptPane
// ---------------------------------------------------------------------------

const SCROLL_THRESHOLD = 80;

function TranscriptPane({
  turns,
  contactName,
  reduced,
  exiting = false,
  active = true,
}: {
  turns: TranscriptTurn[];
  contactName: string;
  reduced: boolean;
  exiting?: boolean;
  /** Collapsed — don't pull ancestor scroll while the pane is hidden. */
  active?: boolean;
}) {
  const progressive = useProgressiveTranscript(turns);
  const groups = useMemo(() => groupProgressiveTurns(progressive), [progressive]);

  const scrollRef = useRef<HTMLOListElement | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);
  const autoScrollActive = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const lastFingerprint = useRef("");

  // Auto-scroll when new content appears, but only when near bottom.
  useEffect(() => {
    if (!active) return;
    const fingerprint = progressive.map((t) => t.visibleText).join("|");
    if (fingerprint === lastFingerprint.current) return;
    lastFingerprint.current = fingerprint;
    if (!autoScrollActive.current || !endRef.current) return;
    endRef.current.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "end",
    });
  }, [progressive, reduced, active]);

  // Detect manual upward scroll to disable auto-scroll.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight;
      if (dist > SCROLL_THRESHOLD) {
        autoScrollActive.current = false;
        setShowJump(true);
      } else {
        autoScrollActive.current = true;
        setShowJump(false);
      }
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const jumpToLatest = () => {
    endRef.current?.scrollIntoView({ behavior: reduced ? "auto" : "smooth", block: "end" });
    autoScrollActive.current = true;
    setShowJump(false);
  };

  if (turns.length === 0) {
    return (
      <div className="flex flex-1 items-start px-4 py-4">
        <p className="text-pretty text-paragraph-sm text-muted-foreground">
          Nothing to replay yet. Open this if you miss a sentence — it won't
          sit beside you while you're talking.
        </p>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <ol
        ref={scrollRef}
        className={cn(
          "flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4",
          !reduced && !exiting && "animate-[assist-now-in_180ms_cubic-bezier(0.23,1,0.32,1)_both]",
          !reduced && exiting && "assist-stream-out"
        )}
        aria-label="Call transcript"
      >
        {groups.map((group, gIndex) => {
          const isCustomer = group.speaker === "customer";
          const name = isCustomer ? contactName : "You";
          return (
            <li
              key={`${group.atMs}-${group.speaker}`}
              className="flex gap-2.5"
              style={{ marginTop: gIndex === 0 ? 0 : "22px" }}
            >
              <Avatar
                size="sm"
                color={isCustomer ? "indigo" : "purple"}
                initials={isCustomer ? initialsFromName(name) : AGENT_INITIALS}
                className="mt-px shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col pt-0.5">
                <p className="mb-1 truncate text-label-xs uppercase tracking-[0.06em] text-muted-foreground">
                  {name}
                </p>
                {group.quotes.map((turn, qIndex) => (
                  <ProgressiveQuote
                    key={turn.atMs}
                    turn={turn}
                    isCustomer={isCustomer}
                    isFirst={qIndex === 0}
                    reduced={reduced}
                  />
                ))}
              </div>
            </li>
          );
        })}
        <div ref={endRef} aria-hidden="true" />
      </ol>

      {showJump && (
        <div className="pointer-events-none absolute inset-x-0 bottom-3 flex justify-center">
          <button
            onClick={jumpToLatest}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-line bg-white px-3 py-1.5 text-label-xs text-foreground shadow-sm transition-colors duration-100 hover:bg-surface-1"
          >
            <span aria-hidden="true">&#x2193;</span>
            <span>Jump to latest</span>
          </button>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// ProgressiveQuote — single utterance paragraph with chunk-fade animation
// ---------------------------------------------------------------------------

function ProgressiveQuote({
  turn,
  isCustomer,
  isFirst,
  reduced,
}: {
  turn: ProgressiveTurn;
  isCustomer: boolean;
  isFirst: boolean;
  reduced: boolean;
}) {
  const [entered, setEntered] = useState(false);
  const prevTextRef = useRef("");

  useEffect(() => {
    if (reduced) { setEntered(true); return; }
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  const text = turn.visibleText;
  const prev = prevTextRef.current;
  const newSuffix = text.length > prev.length ? text.slice(prev.length) : null;
  prevTextRef.current = text;

  const opacity = turn.finalized ? 1 : 0.72;

  return (
    <p
      className={cn(
        "text-pretty text-paragraph-md",
        isCustomer ? "text-foreground" : "text-muted-foreground"
      )}
      style={{
        marginTop: isFirst ? 0 : "9px",
        opacity: entered ? opacity : 0,
        transform: entered ? "translateY(0)" : "translateY(4px)",
        transition: reduced
          ? "none"
          : `opacity ${turn.finalized ? 150 : 130}ms ease-out, transform 130ms ease-out`,
      }}
    >
      {reduced ? (
        <span>{text}</span>
      ) : (
        <>
          {prev && <span>{prev}</span>}
          {newSuffix && (
            <span
              key={text}
              style={{
                display: "inline",
                opacity: 0,
                animation: "transcript-chunk-in 120ms ease-out forwards",
              }}
            >
              {newSuffix}
            </span>
          )}
        </>
      )}
    </p>
  );
}

export type { GuidanceSuggestion };
