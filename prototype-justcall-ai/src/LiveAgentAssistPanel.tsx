import { useEffect, useMemo, useRef, useState, type SVGProps } from "react";
import { InputField } from "@/components/InputField";
import {
  IconAlertTriangleFilled,
  IconChevronDown,
  IconChevronUp,
  IconCircleCheckFilled,
  IconInfoCircle,
} from "@/components/Icon";
import { cn } from "@/lib/utils";
import { IconJcaiAgentAssist } from "./icons/JustCallAiNavIcons";
import {
  SEED_GUIDANCE,
  type GuidanceItem,
  type GuidanceResource,
} from "./guidanceData";
import { SEED_KNOWLEDGE_SOURCES, type KnowledgeSourceRecord } from "./knowledgeData";
import { SEED_COACHING_RULES, type CoachingRule } from "./coachingData";
import {
  SEED_INTEGRATIONS,
  actionOriginLabel,
  integrationById,
  type ActionState,
  type Integration,
  type SuggestedAction,
} from "./actionsData";
import {
  simulationAt,
  type CallScenario,
  type CoachingCue,
  type GuidanceSuggestion,
  type KnowledgeSurface,
} from "./callSimulation";
import {
  GuidanceFeedbackBar,
  GuidanceResourceLink,
  GuidanceResourceModal,
  GuidanceSectionLabel,
  GuidanceSparklesIcon,
  type GuidanceFeedback,
} from "./GuidanceCard";
import { InCallGuidanceSlot } from "./LiveGuidance";
import { useGuidanceStream } from "./useGuidanceStream";

/**
 * In-call Agent Assist — one panel for everything the agent gets in real time.
 * Knowledge, Guidance, Coaching, and Suggested actions share a single stream
 * with a fixed pecking order, so nothing competes for attention:
 *
 *   critical guidance → coaching → knowledge → active guidance → actions
 *
 * There are no tabs. The agent never has to decide which kind of help they
 * need before they can read it.
 */

/** Coaching is temporary — this is how long a cue holds before it leaves. */
const COACHING_HOLD_MS = 9000;
const COACHING_OUT_MS = 220;
/** Executed actions confirm, then collapse out of the way. */
const ACTION_DONE_HOLD_MS = 4200;
const ACTION_EXECUTE_MS = 750;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// ---------------------------------------------------------------------------
// Coaching
// ---------------------------------------------------------------------------

function IconCoaching(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M8 1.75a4 4 0 0 1 4 4c0 1.3-.55 2.1-1.2 2.9-.5.62-.8 1.2-.8 1.85v.25h-4v-.25c0-.65-.3-1.23-.8-1.85C4.55 7.85 4 7.05 4 5.75a4 4 0 0 1 4-4ZM6 13h4M6.75 14.75h2.5"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface ActiveCoaching {
  cue: CoachingCue;
  leaving: boolean;
}

/**
 * One cue on screen at a time, and never a nag: `once` fires a rule a single
 * time per call, `cooldown` holds it back for the configured minutes, and
 * `on-return` lets it come back when the behaviour does.
 */
function useCoachingBanner(cues: CoachingCue[], reduced: boolean) {
  const [active, setActive] = useState<ActiveCoaching | null>(null);
  const seenCueIds = useRef(new Set<string>());
  const ruleHistory = useRef(new Map<string, number>());

  const latestSig = cues.map((cue) => cue.id).join("|");

  useEffect(() => {
    const fresh = cues.filter((cue) => !seenCueIds.current.has(cue.id));
    if (fresh.length === 0) return;

    let next: CoachingCue | null = null;
    for (const cue of fresh) {
      seenCueIds.current.add(cue.id);
      const rule = cue.rule;
      const lastAt = ruleHistory.current.get(rule.id);
      if (lastAt !== undefined) {
        if (rule.frequency === "once") continue;
        if (
          rule.frequency === "cooldown" &&
          cue.atMs - lastAt < rule.cooldownMinutes * 60_000
        ) {
          continue;
        }
      }
      ruleHistory.current.set(rule.id, cue.atMs);
      next = cue;
    }

    if (next) setActive({ cue: next, leaving: false });
    // Cue arrival is the only trigger; the cue list itself is derived state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestSig]);

  // Acknowledged or timed out, the banner gives the space back.
  useEffect(() => {
    if (!active || active.leaving) return;
    const timer = window.setTimeout(
      () => setActive((current) => (current ? { ...current, leaving: true } : null)),
      COACHING_HOLD_MS
    );
    return () => window.clearTimeout(timer);
  }, [active]);

  useEffect(() => {
    if (!active?.leaving) return;
    const timer = window.setTimeout(() => setActive(null), reduced ? 0 : COACHING_OUT_MS);
    return () => window.clearTimeout(timer);
  }, [active, reduced]);

  return {
    active,
    acknowledge: () =>
      setActive((current) => (current ? { ...current, leaving: true } : null)),
  };
}

function CoachingBanner({
  cue,
  leaving,
  reduced,
  onAcknowledge,
}: {
  cue: CoachingCue;
  leaving: boolean;
  reduced: boolean;
  onAcknowledge: () => void;
}) {
  return (
    <div
      className={cn(
        "assist-coaching-slot shrink-0",
        leaving && "is-leaving",
        !reduced && !leaving && "assist-coaching-in"
      )}
    >
      <div className="min-h-0 overflow-hidden pb-1.5">
        <div
          role="status"
          className="flex items-start gap-2 rounded-lg border border-warning-border bg-warning-secondary px-3 py-2.5"
        >
          <IconCoaching className="mt-px size-4 shrink-0 text-warning-text" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <p className="text-label-sm font-medium tracking-[0.04em] text-warning-text uppercase">
              Coaching
            </p>
            <p className="text-pretty text-label-md font-medium text-foreground">
              {cue.rule.message}
            </p>
            <p className="text-pretty text-paragraph-sm text-muted-foreground">
              {cue.detail}
            </p>
            {cue.rule.suggestion ? (
              <p className="mt-1 text-pretty text-paragraph-sm text-foreground">
                {cue.rule.suggestion}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onAcknowledge}
            className="-mr-1 -mt-0.5 inline-flex h-7 shrink-0 cursor-pointer items-center rounded-[4px] px-2 text-label-sm font-medium text-warning-text outline-none transition-colors hover:bg-white/70 focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Knowledge
// ---------------------------------------------------------------------------

function IconKnowledge(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2.5 3.25A1.25 1.25 0 0 1 3.75 2H7a1.5 1.5 0 0 1 1 .38A1.5 1.5 0 0 1 9 2h3.25a1.25 1.25 0 0 1 1.25 1.25v8.5A1.25 1.25 0 0 1 12.25 13H9.5a1.5 1.5 0 0 0-1.5 1 1.5 1.5 0 0 0-1.5-1H3.75A1.25 1.25 0 0 1 2.5 11.75v-8.5ZM8 3.5V14"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Auto-surfaced answer. Deliberately quieter than a Guidance card: neutral
 * chrome, collapsed once the conversation moves past it, and honest when
 * retrieval wasn't confident (§36) rather than stating a shaky answer.
 */
function KnowledgeCard({
  surface,
  expanded,
  arriving,
  reduced,
  onToggle,
}: {
  surface: KnowledgeSurface;
  expanded: boolean;
  arriving: boolean;
  reduced: boolean;
  onToggle: () => void;
}) {
  const [feedback, setFeedback] = useState<GuidanceFeedback>(null);
  const uncertain = surface.confidence === "low";

  return (
    <article
      className={cn(
        // shrink-0 matters: `overflow-hidden` zeroes the flex automatic
        // minimum size, so without it the card collapses to its borders
        // once the panel column runs out of room.
        "shrink-0 overflow-hidden rounded-lg border border-line bg-white",
        !reduced && arriving && "assist-card-enter"
      )}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className="flex w-full cursor-pointer items-center gap-1.5 px-3 py-1.5 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/24"
      >
        <IconKnowledge className="size-4 shrink-0 text-muted-foreground" />
        <span className="flex min-w-0 flex-1 flex-col">
          <span className="text-label-sm font-medium tracking-[0.04em] text-disabled-fg uppercase">
            Knowledge
          </span>
          <span className="min-w-0 truncate text-label-md font-medium text-foreground">
            {surface.entry.title}
          </span>
        </span>
        <span
          className="-mr-1 flex size-6 shrink-0 items-center justify-center text-muted-foreground"
          aria-hidden="true"
        >
          {expanded ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
        </span>
      </button>

      <div
        className={cn(
          "assist-card-body",
          expanded ? "assist-card-body-open" : "assist-card-body-closed"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-2 border-t border-line px-3 pt-2.5 pb-3">
            {uncertain ? (
              <p className="flex items-start gap-1.5 text-paragraph-sm text-muted-foreground">
                <IconInfoCircle size={16} className="mt-px size-4 shrink-0" />
                <span className="text-pretty">
                  I found potentially relevant information — check it before you
                  say it.
                </span>
              </p>
            ) : null}
            <p className="text-pretty text-paragraph-md text-foreground">
              {surface.entry.answer}
            </p>
            {surface.showSource ? (
              <div className="flex items-center gap-1.5">
                <span className="shrink-0 text-paragraph-sm text-muted-foreground">
                  Source:
                </span>
                <GuidanceResourceLink
                  resource={{
                    id: `${surface.id}-source`,
                    type: "link",
                    name: surface.sourceName,
                    url: surface.entry.sourceUrl,
                  }}
                  className="text-paragraph-sm"
                />
              </div>
            ) : null}
          </div>
          {/* Same lightweight signal Guidance collects (§33), so retrieval
              and rules improve off the same feedback. */}
          <GuidanceFeedbackBar
            feedback={feedback}
            onHelpful={() =>
              setFeedback((current) => (current === "helpful" ? null : "helpful"))
            }
            onNotHelpful={() =>
              setFeedback((current) =>
                current === "not-helpful" ? null : "not-helpful"
              )
            }
          />
        </div>
      </div>
    </article>
  );
}

// ---------------------------------------------------------------------------
// Suggested actions
// ---------------------------------------------------------------------------

function IconRetry(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 16 16" fill="none" aria-hidden="true" {...props}>
      <path
        d="M13.5 8a5.5 5.5 0 1 1-1.9-4.16M13.5 2.5V6H10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface ActionRuntime {
  state: ActionState;
  /** Values the agent filled in for anything the conversation didn't supply. */
  filled: Record<string, string>;
  /** True once a first attempt has failed, so a retry can succeed. */
  attempted: boolean;
}

function resolvedFields(action: SuggestedAction, runtime: ActionRuntime) {
  return action.fields.map((field) => ({
    ...field,
    value: field.missing ? runtime.filled[field.label] ?? "" : field.value,
    missing: field.missing && !runtime.filled[field.label]?.trim(),
  }));
}

/**
 * The action as the agent first meets it: what it would do, where it came
 * from, and two ways out. Review happens in place rather than in a dialog —
 * confirming a CRM write should never cover the conversation the agent is
 * still having.
 */
function SuggestedActionRow({
  action,
  runtime,
  reduced,
  onReview,
  onCancelReview,
  onFieldChange,
  onConfirm,
  onDismiss,
  onRetry,
}: {
  action: SuggestedAction;
  runtime: ActionRuntime;
  reduced: boolean;
  onReview: () => void;
  onCancelReview: () => void;
  onFieldChange: (label: string, value: string) => void;
  onConfirm: () => void;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  if (runtime.state === "dismissed") return null;

  if (runtime.state === "done") {
    return (
      <div
        className={cn(
          "flex shrink-0 items-start gap-2 rounded-lg border border-success-border bg-success-secondary px-3 py-2",
          !reduced && "assist-card-enter"
        )}
        role="status"
      >
        <IconCircleCheckFilled size={16} className="mt-px size-4 shrink-0 text-success" />
        <div className="min-w-0 flex-1">
          <p className="text-label-md font-medium text-foreground">
            {doneLabel(action)}
          </p>
          <p className="truncate text-paragraph-sm text-muted-foreground">
            {action.summary}
          </p>
        </div>
      </div>
    );
  }

  if (runtime.state === "failed") {
    return (
      <div className="flex shrink-0 flex-col gap-2 rounded-lg border border-error-border bg-error-subtle px-3 py-2.5">
        <div className="flex items-start gap-2">
          <IconAlertTriangleFilled
            size={16}
            className="mt-px size-4 shrink-0 text-error"
          />
          <div className="min-w-0 flex-1">
            <p className="text-pretty text-label-md font-medium text-foreground">
              Unable to connect to {integrationName(action)}.
            </p>
            <p className="text-pretty text-paragraph-sm text-muted-foreground">
              Nothing was changed. You can retry now or finish this after the call.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 self-end">
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-7 cursor-pointer items-center rounded-[4px] px-2 text-label-sm text-muted-foreground outline-none transition-colors hover:bg-white hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            Dismiss
          </button>
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-[4px] px-2 text-label-sm font-medium text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconRetry className="size-4 shrink-0" />
            Retry
          </button>
        </div>
      </div>
    );
  }

  const busy = runtime.state === "executing";
  const reviewing = runtime.state === "reviewing";
  const fields = resolvedFields(action, runtime);
  const blocked = fields.some((field) => field.missing);

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 rounded-lg border bg-white px-3 py-2.5",
        reviewing ? "border-brand" : "border-line",
        !reduced && "assist-card-enter"
      )}
    >
      <div className="flex items-start gap-2">
        <GuidanceSparklesIcon size={16} className="mt-px size-4 shrink-0" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <GuidanceSectionLabel>Recommended action</GuidanceSectionLabel>
          <p className="text-pretty text-label-md font-medium text-foreground">
            {action.title}
          </p>
          <p className="text-pretty text-paragraph-sm text-foreground">
            {action.summary}
          </p>
          <p className="text-paragraph-sm text-muted-foreground">
            {actionOriginLabel(action)}
          </p>
        </div>
      </div>

      {/* Review (§28) — every value about to be written, in place. */}
      {reviewing ? (
        <div className="flex flex-col gap-2.5 border-t border-line pt-2.5">
          <ActionReviewField label={action.recordLabel} value={action.recordValue} />
          {fields.map((field) =>
            runtime.filled[field.label] !== undefined ? (
              <InputField
                key={field.label}
                label={field.label}
                placeholder={`Add ${field.label.toLowerCase()}`}
                value={runtime.filled[field.label] ?? ""}
                onChange={(event) => onFieldChange(field.label, event.target.value)}
                helpText={
                  field.missing
                    ? "Not found in the conversation — add it to continue."
                    : undefined
                }
                helpIcon={field.missing}
                clearable={false}
              />
            ) : (
              <ActionReviewField
                key={field.label}
                label={field.label}
                value={field.value}
              />
            )
          )}
          <p className="text-paragraph-sm text-muted-foreground">
            Nothing is written to {integrationName(action)} until you confirm.
          </p>
        </div>
      ) : null}

      <div className="flex items-center gap-1.5 self-end">
        <button
          type="button"
          onClick={reviewing ? onCancelReview : onDismiss}
          className="inline-flex h-7 cursor-pointer items-center rounded-[4px] px-2 text-label-sm text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          {reviewing ? "Cancel" : "Dismiss"}
        </button>
        <button
          type="button"
          disabled={busy || (reviewing && blocked)}
          onClick={reviewing ? onConfirm : onReview}
          className="inline-flex h-7 cursor-pointer items-center rounded-[4px] px-2 text-label-sm font-medium text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24 disabled:cursor-default disabled:opacity-60"
        >
          {busy ? "Working…" : reviewing ? action.title : reviewLabel(action)}
        </button>
      </div>
    </div>
  );
}

function ActionReviewField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-label-sm text-muted-foreground">{label}</p>
      <p className="text-pretty text-paragraph-md text-foreground">{value}</p>
    </div>
  );
}

function integrationName(action: SuggestedAction): string {
  return (
    integrationById(SEED_INTEGRATIONS, action.integrationId)?.name ??
    action.integrationId
  );
}

function reviewLabel(action: SuggestedAction): string {
  return action.requiresConfirmation ? "Review & confirm" : "Run action";
}

function doneLabel(action: SuggestedAction): string {
  return `${action.title.replace(/^Create /, "Created ").replace(/^Update /, "Updated ").replace(/^Add /, "Added ")}`;
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

export interface LiveAgentAssistPanelProps {
  elapsedMs: number;
  scenario: CallScenario;
  guidanceItems?: GuidanceItem[];
  knowledgeSources?: KnowledgeSourceRecord[];
  coachingRules?: CoachingRule[];
  integrations?: Integration[];
  /** Hangup — the live stream lets go before the phone changes state. */
  exiting?: boolean;
  className?: string;
}

export function LiveAgentAssistPanel({
  elapsedMs,
  scenario,
  guidanceItems = SEED_GUIDANCE,
  knowledgeSources = SEED_KNOWLEDGE_SOURCES,
  coachingRules = SEED_COACHING_RULES,
  integrations = SEED_INTEGRATIONS,
  exiting = false,
  className,
}: LiveAgentAssistPanelProps) {
  const reduced = prefersReducedMotion();
  const snapshot = simulationAt(scenario, elapsedMs, guidanceItems, {
    knowledge: knowledgeSources,
    coaching: coachingRules,
    integrations,
  });

  const [viewingResource, setViewingResource] = useState<GuidanceResource | null>(null);
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [collapsedKnowledge, setCollapsedKnowledge] = useState<Set<string>>(new Set());
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [actionRuntimes, setActionRuntimes] = useState<Record<string, ActionRuntime>>({});

  const stream = useGuidanceStream({
    suggestions: snapshot.suggestions,
    steps: scenario.steps,
    playhead: Math.min(snapshot.scriptIndex, scenario.steps.length),
    reduced,
  });
  const coaching = useCoachingBanner(snapshot.coaching, reduced);

  useEffect(() => {
    setViewingResource(null);
    setSecondaryOpen(false);
    setActionRuntimes({});
  }, [scenario.id]);

  // Knowledge collapses as soon as the conversation asks something else (§32).
  const knowledgeSig = snapshot.knowledge.map((item) => item.id).join("|");
  useEffect(() => {
    const arriving = snapshot.knowledge.filter((item) => !knownIds.has(item.id));
    if (arriving.length === 0) return;
    const newest = snapshot.knowledge[snapshot.knowledge.length - 1];
    setKnownIds(new Set(snapshot.knowledge.map((item) => item.id)));
    setCollapsedKnowledge(
      new Set(
        snapshot.knowledge
          .filter((item) => item.id !== newest?.id)
          .map((item) => item.id)
      )
    );
    // Arrival drives this; the list itself is derived from elapsed time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knowledgeSig]);

  const runtimeFor = (id: string): ActionRuntime =>
    actionRuntimes[id] ?? { state: "suggested", filled: {}, attempted: false };

  const patchRuntime = (id: string, patch: Partial<ActionRuntime>) => {
    setActionRuntimes((current) => ({
      ...current,
      [id]: { ...runtimeFor(id), ...patch },
    }));
  };

  const openReview = (action: SuggestedAction) => {
    const runtime = runtimeFor(action.id);
    // Seed the editable fields so a missing value has somewhere to land.
    const filled = { ...runtime.filled };
    action.fields.forEach((field) => {
      if (field.missing && filled[field.label] === undefined) filled[field.label] = "";
    });
    patchRuntime(action.id, { state: "reviewing", filled });
  };

  const executeAction = (action: SuggestedAction) => {
    const runtime = runtimeFor(action.id);
    patchRuntime(action.id, { state: "executing" });
    window.setTimeout(() => {
      const fails = Boolean(action.simulateFailure) && !runtime.attempted;
      setActionRuntimes((current) => {
        const previous = current[action.id] ?? {
          state: "executing" as ActionState,
          filled: {},
          attempted: false,
        };
        return {
          ...current,
          [action.id]: {
            ...previous,
            state: fails ? "failed" : "done",
            attempted: true,
          },
        };
      });
    }, ACTION_EXECUTE_MS);
  };

  // A confirmation is a receipt, not a permanent row — it collapses on its own.
  useEffect(() => {
    const doneIds = Object.entries(actionRuntimes)
      .filter(([, runtime]) => runtime.state === "done")
      .map(([id]) => id);
    if (doneIds.length === 0) return;
    const timers = doneIds.map((id) =>
      window.setTimeout(
        () => patchRuntime(id, { state: "dismissed" }),
        ACTION_DONE_HOLD_MS
      )
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    Object.entries(actionRuntimes)
      .filter(([, runtime]) => runtime.state === "done")
      .map(([id]) => id)
      .join("|"),
  ]);

  const actionsByGuidance = useMemo(() => {
    const map = new Map<string, SuggestedAction[]>();
    for (const entry of snapshot.actions) {
      if (!entry.action.guidanceId) continue;
      const list = map.get(entry.action.guidanceId) ?? [];
      list.push(entry.action);
      map.set(entry.action.guidanceId, list);
    }
    return map;
  }, [snapshot.actions]);

  // Compliance outranks everything, including the coaching banner.
  const critical = stream.cards.filter(
    (entry) => entry.suggestion.priority === "critical"
  );
  const ordinary = stream.cards.filter(
    (entry) => entry.suggestion.priority !== "critical"
  );
  const primary = ordinary[ordinary.length - 1] ?? null;
  const secondary = ordinary.slice(0, Math.max(0, ordinary.length - 1)).reverse();

  /**
   * An action belongs at the bottom of its guidance (§27) — but only while
   * that card is open. Collapse the card and the action would vanish with it,
   * so it moves out into the panel on its own and stays there until the agent
   * completes or dismisses it (§32).
   */
  const openGuidanceIds = new Set<string>(
    critical.map((entry) => entry.suggestion.item.id)
  );
  if (stream.expandedId) {
    const open = stream.cards.find(
      (entry) => entry.suggestion.id === stream.expandedId
    );
    if (open) openGuidanceIds.add(open.suggestion.item.id);
  }

  const standaloneActions = snapshot.actions
    .filter(
      (entry) =>
        !entry.action.guidanceId || !openGuidanceIds.has(entry.action.guidanceId)
    )
    .map((entry) => entry.action);

  const renderAction = (action: SuggestedAction) => (
    <SuggestedActionRow
      key={action.id}
      action={action}
      runtime={runtimeFor(action.id)}
      reduced={reduced}
      onReview={() => openReview(action)}
      onCancelReview={() => patchRuntime(action.id, { state: "suggested" })}
      onFieldChange={(label, value) =>
        patchRuntime(action.id, {
          filled: { ...runtimeFor(action.id).filled, [label]: value },
        })
      }
      onConfirm={() => executeAction(action)}
      onDismiss={() => patchRuntime(action.id, { state: "dismissed" })}
      onRetry={() => executeAction(action)}
    />
  );

  const renderGuidance = (
    entry: { suggestion: GuidanceSuggestion },
    expanded: boolean
  ) => {
    const attached = actionsByGuidance.get(entry.suggestion.item.id) ?? [];
    return (
      <InCallGuidanceSlot
        key={entry.suggestion.id}
        item={entry.suggestion}
        reduced={reduced}
        expanded={expanded}
        arriving={stream.arrivingIds.has(entry.suggestion.id)}
        attention={stream.attentionIds.has(entry.suggestion.id)}
        onToggle={() => stream.toggleCard(entry.suggestion.id)}
        onViewResource={setViewingResource}
        onEngage={stream.engage}
        onDisengage={stream.disengage}
        cardRef={(node) => stream.registerCard(entry.suggestion.id, node)}
        actionSlot={
          attached.length > 0 && expanded ? (
            <div className="flex flex-col gap-2 border-t border-line bg-white px-3 py-2.5">
              {attached.map(renderAction)}
            </div>
          ) : null
        }
      />
    );
  };

  const nothingYet =
    stream.cards.length === 0 &&
    snapshot.knowledge.length === 0 &&
    standaloneActions.length === 0 &&
    !coaching.active;

  return (
    <section
      aria-label="Agent Assist"
      className={cn(
        "relative flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white",
        className
      )}
    >
      <header
        className={cn(
          "flex h-11 shrink-0 items-center gap-1.5 border-b border-line px-4",
          !reduced && "assist-head-in"
        )}
      >
        <IconJcaiAgentAssist
          className="size-4 shrink-0 text-brand"
          aria-hidden="true"
        />
        <p className="text-label-md-semi text-foreground">Agent Assist</p>
      </header>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-1.5 overflow-y-auto px-4 py-2.5",
          !reduced && exiting && "assist-stream-out"
        )}
        {...stream.scrollHandlers}
      >
        {nothingYet ? (
          <p className="px-0.5 py-1 text-pretty text-paragraph-sm text-muted-foreground">
            Answers, guidance, and next steps show up here as the conversation
            gives Agent Assist something to work with.
          </p>
        ) : null}

        {/* 1 — compliance and other urgent interventions, always open. */}
        {critical.map((entry) => renderGuidance(entry, true))}

        {/* 2 — coaching, temporary and compact. */}
        {coaching.active ? (
          <CoachingBanner
            cue={coaching.active.cue}
            leaving={coaching.active.leaving}
            reduced={reduced}
            onAcknowledge={coaching.acknowledge}
          />
        ) : null}

        {/* 3 — knowledge, quietest of the four. */}
        {snapshot.knowledge.map((surface) => (
          <KnowledgeCard
            key={surface.id}
            surface={surface}
            expanded={!collapsedKnowledge.has(surface.id)}
            arriving={!knownIds.has(surface.id)}
            reduced={reduced}
            onToggle={() =>
              setCollapsedKnowledge((current) => {
                const next = new Set(current);
                if (next.has(surface.id)) next.delete(surface.id);
                else next.add(surface.id);
                return next;
              })
            }
          />
        ))}

        {/* 4 — the active guidance card, with its action attached. */}
        {primary
          ? renderGuidance(primary, stream.expandedId === primary.suggestion.id)
          : null}

        {/* 5 — actions with no open card of their own to sit inside. */}
        {standaloneActions.map(renderAction)}

        {/* 6 — everything earlier, folded away until asked for. */}
        {secondary.length > 0 ? (
          <div className="flex shrink-0 flex-col gap-1.5">
            <button
              type="button"
              aria-expanded={secondaryOpen}
              onClick={() => setSecondaryOpen((open) => !open)}
              className="flex cursor-pointer items-center gap-1 self-start rounded-[4px] px-0.5 py-1 text-label-sm text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
            >
              {secondaryOpen
                ? "Hide earlier suggestions"
                : `${secondary.length} more suggestion${secondary.length === 1 ? "" : "s"}`}
              <span className="flex size-4 items-center justify-center" aria-hidden="true">
                {secondaryOpen ? (
                  <IconChevronUp size={16} />
                ) : (
                  <IconChevronDown size={16} />
                )}
              </span>
            </button>
            {secondaryOpen
              ? secondary.map((entry) =>
                  renderGuidance(entry, stream.expandedId === entry.suggestion.id)
                )
              : null}
          </div>
        ) : null}
      </div>

      <GuidanceResourceModal
        resource={viewingResource}
        onClose={() => setViewingResource(null)}
      />
    </section>
  );
}

export { IconKnowledge, IconCoaching, SuggestedActionRow };
export type { ActionRuntime };
