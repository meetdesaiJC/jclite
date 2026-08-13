import { useEffect, useMemo, useRef, useState, type SVGProps } from "react";
import { cn } from "@/lib/utils";
import { Dropdown } from "@/components/Dropdown";
import { IconCircleCheckFilled, IconCircleDashed } from "@/components/Icon";
import { IconJcaiAgentAssist } from "./icons/JustCallAiNavIcons";
import {
  CALL_SCENARIOS,
  simulationAt,
  type CallActionItem,
  type CallScenario,
  type GuidanceSuggestion,
  type ScriptStep,
  type TranscriptTurn,
} from "./callSimulation";
import { SEED_GUIDANCE, type GuidanceItem, type GuidanceResource } from "./guidanceData";
import {
  CriticalPin,
  formatQuoteTime,
  LiveGuidanceCard,
  ResourceOverlay,
} from "./LiveGuidance";

/**
 * In-call Agent Assist — one stream. The full script stays open so any
 * spoken line can check off. Guidance cards insert under the step they
 * belong to and stay until the agent dismisses them with X.
 */

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
  const [userAdvanced, setUserAdvanced] = useState(0);
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [placements, setPlacements] = useState<Record<string, number>>({});
  const [viewingResource, setViewingResource] = useState<GuidanceResource | null>(
    null
  );
  const snapshot = simulationAt(scenario, elapsedMs, guidanceItems);
  const reduced = prefersReducedMotion();

  const playhead = Math.min(
    Math.max(snapshot.scriptIndex, userAdvanced),
    scenario.steps.length
  );

  const visibleCards = snapshot.suggestions
    .filter((item) => !dismissed.includes(item.id))
    .sort((a, b) => a.atMs - b.atMs);
  const latestCard = visibleCards[visibleCards.length - 1] ?? null;
  const visibleIds = visibleCards.map((item) => item.id).join(",");

  useEffect(() => {
    setDismissed([]);
    setPlacements({});
    setUserAdvanced(0);
    setViewingResource(null);
  }, [scenario.id]);

  useEffect(() => {
    if (visibleCards.length === 0) return;
    setPlacements((current) => {
      let next = current;
      for (const card of visibleCards) {
        if (current[card.id] !== undefined) continue;
        if (next === current) next = { ...current };
        next[card.id] = insertAfterIndex(scenario.steps, playhead, card);
      }
      return next;
    });
  }, [visibleIds, playhead, scenario.steps]);

  const options = useMemo(
    () => CALL_SCENARIOS.map((item) => ({ value: item.id, label: item.scriptName })),
    []
  );

  const placedCards = visibleCards.map((card) => ({
    card,
    insertAfter:
      placements[card.id] ?? insertAfterIndex(scenario.steps, playhead, card),
  }));

  const lastChecked = playhead > 0 ? scenario.steps[playhead - 1] : null;
  const liveAnnouncement = ended
    ? "Writing the call summary and action items."
    : snapshot.wrapped
      ? "Script complete."
      : latestCard
        ? `${latestCard.stance}: ${latestCard.item.name}. ${latestCard.item.suggestedResponse}`
        : lastChecked
          ? `${lastChecked.title} checked.`
          : "";

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
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-3">
          <FullScriptList
            scenario={scenario}
            playhead={playhead}
            reduced={reduced}
            placedCards={placedCards}
            latestCardId={latestCard?.id ?? null}
            onDismissCard={(id) => {
              setDismissed((current) =>
                current.includes(id) ? current : [...current, id]
              );
            }}
            onViewResource={setViewingResource}
          />
        </div>
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

function FullScriptList({
  scenario,
  playhead,
  reduced,
  placedCards,
  latestCardId,
  onDismissCard,
  onViewResource,
}: {
  scenario: CallScenario;
  playhead: number;
  reduced: boolean;
  placedCards: { card: GuidanceSuggestion; insertAfter: number }[];
  latestCardId: string | null;
  onDismissCard: (id: string) => void;
  onViewResource: (resource: GuidanceResource) => void;
}) {
  const cardRef = useRef<HTMLDivElement | null>(null);
  const lastSeenCardAtMs = useRef(0);
  const latestAtMs =
    placedCards.find((item) => item.card.id === latestCardId)?.card.atMs ?? 0;

  const cardsByStep = new Map<number, GuidanceSuggestion[]>();
  for (const { card, insertAfter } of placedCards) {
    const list = cardsByStep.get(insertAfter) ?? [];
    list.push(card);
    cardsByStep.set(insertAfter, list);
  }

  useEffect(() => {
    lastSeenCardAtMs.current = 0;
  }, [scenario.id]);

  useEffect(() => {
    const isNewCard = Boolean(latestCardId && latestAtMs > lastSeenCardAtMs.current);
    if (!isNewCard) return;
    lastSeenCardAtMs.current = latestAtMs;
    cardRef.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
    });
  }, [latestCardId, latestAtMs, reduced, scenario.id]);

  return (
    <ol className="flex flex-col" aria-label="Call script">
      {scenario.steps.map((step, index) => {
        const checked = index < playhead;
        const stepCards = cardsByStep.get(index) ?? [];

        return (
          <li key={`${scenario.id}-${step.title}`} className="flex flex-col">
            <ScriptStepRow step={step} checked={checked} reduced={reduced} />
            {stepCards.map((card) => (
              <div
                key={card.id}
                ref={card.id === latestCardId ? cardRef : undefined}
                className="scroll-mt-2 py-1.5"
              >
                {card.priority === "critical" ? (
                  <CriticalPin
                    item={card}
                    reduced={reduced}
                    onDismiss={() => onDismissCard(card.id)}
                  />
                ) : (
                  <LiveGuidanceCard
                    item={card}
                    reduced={reduced}
                    onDismiss={() => onDismissCard(card.id)}
                    onViewResource={onViewResource}
                  />
                )}
              </div>
            ))}
          </li>
        );
      })}
    </ol>
  );
}

function ScriptStepRow({
  step,
  checked,
  reduced,
}: {
  step: ScriptStep;
  checked: boolean;
  reduced: boolean;
}) {
  return (
    <div className="rounded-[6px] px-1 py-1.5">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
          {checked ? (
            <IconCircleCheckFilled
              size={16}
              className="size-4 text-success"
              aria-hidden="true"
            />
          ) : (
            <IconCircleDashed
              size={16}
              className="size-4 text-disabled-fg"
              aria-hidden="true"
            />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p
            className={cn(
              "min-w-0 text-pretty text-paragraph-sm",
              reduced ? "transition-none" : "transition-colors duration-150",
              checked ? "text-muted-foreground line-through" : "text-foreground"
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
