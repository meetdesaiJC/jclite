import { useEffect, useRef, useState, type SVGProps } from "react";
import {
  IconAlertTriangleFilled,
  IconChevronDown,
  IconChevronUp,
  IconInfoCircle,
} from "@/components/Icon";
import { cn } from "@/lib/utils";
import {
  SEED_GUIDANCE,
  type GuidanceItem,
  type GuidanceResource,
} from "./guidanceData";
import {
  SEED_KNOWLEDGE_SOURCES,
  knowledgeFacts,
  type KnowledgeSourceRecord,
} from "./knowledgeData";
import {
  SEED_COACHING_RULES,
  coachingCardMessage,
  type CoachingRule,
} from "./coachingData";
import { CoachingCardFace, coachingTone } from "./coachingVisuals";
import {
  InCallActionDoneCard,
  InCallActionReviewCard,
  InCallActionSuggestionCard,
  InCallEmailReviewCard,
  InCallEmailSuggestionCard,
} from "./InCallActionCard";
import {
  SEED_ACTIONS,
  SEED_INTEGRATIONS,
  integrationById,
  integrationDoneLabel,
  integrationFailedLabel,
  integrationWriteLabel,
  type ActionState,
  type AgentAction,
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
  GUIDANCE_AI_THEME,
  GuidanceFeedbackBar,
  GuidanceResourceLink,
  GuidanceResourceModal,
  GuidanceSparklesIcon,
  type GuidanceFeedback,
} from "./GuidanceCard";
import {
  CriticalGuidanceAlert,
  InCallGuidanceSlot,
} from "./LiveGuidance";
import {
  CARD_ENTER_MS,
  useGuidanceStream,
  type GuidanceStreamCard,
} from "./useGuidanceStream";

/**
 * In-call Agent Assist — one panel for everything the agent gets in real time.
 * There are no tabs. Cards share a single stream: each one lands in the order
 * it fired and stays there. Coaching, guidance, knowledge, and actions do not
 * regroup by type, so a newer card never gets buried under an older block.
 */

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

/** Outlined bulb — `icon-library/JustCall AI/bulb.svg`. */
function IconCoaching(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
      <path
        d="M2.5 10H3.33333M10 2.5V3.33333M16.6667 10H17.5M4.66667 4.66667L5.25 5.25M15.3333 4.66667L14.75 5.25M8.08333 14.1667H11.9167M7.5 13.3333C6.80039 12.8086 6.28361 12.0771 6.02286 11.2424C5.76211 10.4076 5.77061 9.51202 6.04715 8.68238C6.3237 7.85275 6.85427 7.13116 7.56371 6.61982C8.27315 6.10849 9.12549 5.83333 10 5.83333C10.8745 5.83333 11.7269 6.10849 12.4363 6.61982C13.1457 7.13116 13.6763 7.85275 13.9528 8.68238C14.2294 9.51202 14.2379 10.4076 13.9771 11.2424C13.7164 12.0771 13.1996 12.8086 12.5 13.3333C12.1746 13.6554 11.9297 14.0495 11.7849 14.4839C11.6401 14.9182 11.5996 15.3805 11.6667 15.8333C11.6667 16.2754 11.4911 16.6993 11.1785 17.0118C10.866 17.3244 10.442 17.5 10 17.5C9.55797 17.5 9.13405 17.3244 8.82149 17.0118C8.50893 16.6993 8.33333 16.2754 8.33333 15.8333C8.40038 15.3805 8.35988 14.9182 8.21511 14.4839C8.07034 14.0495 7.82536 13.6554 7.5 13.3333Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Every cue that fires stays on screen until the agent taps Got it.
 * Frequency still gates whether a rule may fire again (`once`, `cooldown`,
 * `on-return`) — it never takes an already-shown cue away.
 */
function useCoachingStack(cues: CoachingCue[], resetKey: string, reduced: boolean) {
  const [stack, setStack] = useState<CoachingCue[]>([]);
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [arrivingIds, setArrivingIds] = useState<Set<string>>(new Set());
  const seenCueIds = useRef(new Set<string>());
  const ruleHistory = useRef(new Map<string, number>());
  const stackRef = useRef<CoachingCue[]>([]);
  const prevReset = useRef(resetKey);
  stackRef.current = stack;

  const latestSig = cues.map((cue) => cue.id).join("|");

  useEffect(() => {
    let base = stackRef.current;
    if (prevReset.current !== resetKey) {
      prevReset.current = resetKey;
      seenCueIds.current = new Set();
      ruleHistory.current = new Map();
      base = [];
      setDismissedIds(new Set());
    }

    const fresh = cues.filter((cue) => !seenCueIds.current.has(cue.id));
    if (fresh.length === 0) {
      if (base !== stackRef.current) {
        stackRef.current = base;
        setStack(base);
        setArrivingIds(new Set());
      }
      return;
    }

    const accepted: CoachingCue[] = [];
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
      accepted.push(cue);
    }

    if (accepted.length === 0) {
      if (base !== stackRef.current) {
        stackRef.current = base;
        setStack(base);
        setArrivingIds(new Set());
      }
      return;
    }

    const next = [...base, ...accepted];
    stackRef.current = next;
    setStack(next);
    setArrivingIds(new Set(accepted.map((cue) => cue.id)));
    // Cue arrival is the only trigger; the cue list itself is derived state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latestSig, resetKey]);

  const resolvedSig = cues
    .filter((cue) => cue.resolved)
    .map((cue) => cue.id)
    .join("|");

  useEffect(() => {
    if (!resolvedSig) return;
    const resolved = new Set(resolvedSig.split("|").filter(Boolean));
    setStack((current) =>
      current.map((cue) => (resolved.has(cue.id) ? { ...cue, resolved: true } : cue))
    );
  }, [resolvedSig]);

  useEffect(() => {
    if (arrivingIds.size === 0) return;
    const timer = window.setTimeout(
      () => setArrivingIds(new Set()),
      reduced ? 0 : CARD_ENTER_MS + 10
    );
    return () => window.clearTimeout(timer);
  }, [arrivingIds, reduced]);

  return {
    stack: stack.filter((cue) => !dismissedIds.has(cue.id)),
    arrivingIds,
    acknowledge: (id: string) => {
      setDismissedIds((current) => {
        const next = new Set(current);
        next.add(id);
        return next;
      });
    },
  };
}

function CoachingCard({
  cue,
  arriving,
  reduced,
  onAcknowledge,
}: {
  cue: CoachingCue;
  arriving: boolean;
  reduced: boolean;
  onAcknowledge: () => void;
}) {
  const resolved = Boolean(cue.resolved);
  const observation = cue.detail || coachingCardMessage(cue.rule);
  const tone = coachingTone(cue.rule.templateId);

  return (
    <article
      role="status"
      className={cn(
        "shrink-0 overflow-hidden rounded-lg",
        resolved ? "border border-line bg-secondary-bg" : tone.card,
        !reduced && arriving && "assist-card-enter"
      )}
    >
      <CoachingCardFace
        rule={cue.rule}
        observation={observation}
        resolved={resolved}
        action={
          resolved ? (
            <span className="-mt-0.5 -mr-1 inline-flex h-7 shrink-0 items-center px-2 text-label-sm font-medium text-muted-foreground">
              Resolved
            </span>
          ) : (
            <button
              type="button"
              onClick={onAcknowledge}
              className={cn(
                "-mt-0.5 -mr-1 inline-flex h-7 shrink-0 cursor-pointer items-center rounded-[4px] px-2 text-label-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
                tone.ink,
                tone.hover
              )}
            >
              Got it
            </button>
          )
        }
      />
    </article>
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
 * Auto-surfaced answer. Brand-blue so it reads as retrieved knowledge, not
 * generated guidance. Facts first, source as a plain title link, then
 * the same feedback Guidance collects (§33).
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
  const { summary, points } = knowledgeFacts(surface.entry);

  return (
    <article
      className={cn(
        // shrink-0 matters: `overflow-hidden` zeroes the flex automatic
        // minimum size, so without it the card collapses to its borders
        // once the panel column runs out of room.
        "shrink-0 overflow-hidden rounded-lg border border-info-border bg-white",
        !reduced && arriving && "assist-card-enter"
      )}
    >
      <button
        type="button"
        aria-expanded={expanded}
        onClick={onToggle}
        className={cn(
          "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/24",
          expanded && "bg-info-secondary"
        )}
      >
        <IconKnowledge className="size-4 shrink-0 text-brand" />
        <span className="min-w-0 flex-1 truncate text-label-md font-medium text-foreground">
          {surface.entry.title}
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
          <div className="flex flex-col gap-3 px-4 pt-3 pb-3">
            {uncertain ? (
              <p className="flex items-start gap-1.5 rounded-[6px] bg-warning-secondary px-2 py-1.5 text-paragraph-sm text-foreground">
                <IconInfoCircle size={16} className="mt-px size-4 shrink-0 text-warning" />
                <span className="text-pretty">
                  I found potentially relevant information — check it before you
                  say it.
                </span>
              </p>
            ) : null}

            {summary ? (
              <p className="text-pretty text-label-md text-foreground">
                {summary}
              </p>
            ) : null}

            {points.length > 0 ? (
              <ul className="list-disc space-y-1.5 pl-5">
                {points.map((point) => (
                  <li
                    key={point.heading}
                    className="text-pretty text-paragraph-md text-foreground marker:text-muted-foreground"
                  >
                    {point.heading}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-pretty text-paragraph-md text-foreground">
                {surface.entry.answer}
              </p>
            )}

            {surface.showSource ? (
              <GuidanceResourceLink
                resource={{
                  id: surface.entry.id,
                  type: "link",
                  name: surface.sourceName,
                  url: surface.entry.sourceUrl,
                }}
              />
            ) : null}
          </div>
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
            className={GUIDANCE_AI_THEME.feedback}
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

function proposedValue(action: SuggestedAction, runtime: ActionRuntime) {
  const field =
    resolvedFields(action, runtime).find((item) => item.label === "New value") ??
    resolvedFields(action, runtime).find((item) => item.missing) ??
    resolvedFields(action, runtime)[resolvedFields(action, runtime).length - 1];
  return field;
}

/**
 * Independent Action card. Lightning, not sparkle — this is work to perform,
 * not generated guidance. Emails stay in review until the agent sends them
 * when confirmation is on; other writes follow the same rule.
 */
function SuggestedActionRow({
  action,
  runtime,
  reduced,
  integrations,
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
  integrations: Integration[];
  onReview: () => void;
  onCancelReview: () => void;
  onFieldChange: (label: string, value: string) => void;
  onConfirm: () => void;
  onDismiss: () => void;
  onRetry: () => void;
}) {
  if (runtime.state === "dismissed") return null;

  const name = integrationName(action, integrations);
  const writeLabel = integrationWriteLabel(action, integrations);

  if (runtime.state === "done") {
    return (
      <InCallActionDoneCard
        label={integrationDoneLabel(action, integrations)}
        viewUrl={action.viewUrl}
        viewName={name}
        className={cn(!reduced && "assist-card-enter")}
      />
    );
  }

  if (runtime.state === "permission_denied") {
    return (
      <div className="flex shrink-0 flex-col gap-2 rounded-lg border border-warning-border bg-warning-secondary px-3 py-2.5">
        <div className="flex items-start gap-2">
          <IconAlertTriangleFilled
            size={16}
            className="mt-px size-4 shrink-0 text-warning"
          />
          <div className="min-w-0 flex-1">
            <p className="text-pretty text-label-md font-medium text-foreground">
              Action unavailable
            </p>
            <p className="text-pretty text-paragraph-sm text-muted-foreground">
              You don’t have permission to{" "}
              {action.email ? "send this email" : `update this ${name} record`}.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="inline-flex h-7 cursor-pointer items-center self-end rounded-[4px] px-2 text-label-sm text-muted-foreground outline-none transition-colors hover:bg-white hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          Dismiss
        </button>
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
              {integrationFailedLabel(action, integrations)}
            </p>
            <p className="text-pretty text-paragraph-sm text-muted-foreground">
              {action.email
                ? "Something went wrong while sending this email. Nothing was sent."
                : "Something went wrong while updating this record. Nothing was changed."}
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
            Try again
          </button>
        </div>
      </div>
    );
  }

  const busy = runtime.state === "executing";
  const reviewing = runtime.state === "reviewing";
  const fields = resolvedFields(action, runtime);
  const blocked = fields.some((field) => field.missing);
  const proposed = proposedValue(action, runtime);
  const property =
    fields.find((field) => field.label === "Property")?.value ?? action.summary;
  const editableFields = fields.filter(
    (field) => field.missing || runtime.filled[field.label] !== undefined
  );
  const readonlyFields = fields.filter(
    (field) => !editableFields.some((item) => item.label === field.label)
  );

  if (!reviewing && action.email) {
    const cta = action.requiresConfirmation ? "Review email" : "Send email";
    return (
      <InCallEmailSuggestionCard
        title={action.title}
        to={action.email.to}
        subject={action.email.subject}
        body={action.email.body}
        attachments={action.email.attachments}
        cta={cta}
        busy={busy}
        onReview={action.requiresConfirmation ? onReview : onConfirm}
        className={cn(!reduced && "assist-card-enter")}
      />
    );
  }

  if (!reviewing) {
    return (
      <InCallActionSuggestionCard
        title={action.title}
        property={property}
        value={
          proposed?.missing
            ? "Select a value"
            : proposed?.value || action.summary
        }
        recordLabel={`${name} ${action.recordLabel}`}
        recordValue={action.recordValue}
        busy={busy}
        onReview={onReview}
        className={cn(!reduced && "assist-card-enter")}
      />
    );
  }

  if (action.email) {
    return (
      <InCallEmailReviewCard
        title={action.title}
        to={runtime.filled.To ?? action.email.to}
        subject={runtime.filled.Subject ?? action.email.subject}
        message={runtime.filled.Message ?? action.email.body}
        attachments={action.email.attachments}
        busy={busy}
        onToChange={(value) => onFieldChange("To", value)}
        onSubjectChange={(value) => onFieldChange("Subject", value)}
        onMessageChange={(value) => onFieldChange("Message", value)}
        onCancel={onCancelReview}
        onConfirm={onConfirm}
        className={cn(!reduced && "assist-card-enter")}
      />
    );
  }

  return (
    <InCallActionReviewCard
      writeLabel={writeLabel}
      recordLabel={action.recordLabel}
      recordValue={action.recordValue}
      readonlyFields={readonlyFields.map((field) => ({
        label: field.label,
        value: field.value,
      }))}
      editableFields={editableFields.map((field) => ({
        label: field.label,
        inputLabel: field.label === "New value" ? property : field.label,
        value: runtime.filled[field.label] ?? field.value,
        placeholder: `Select ${property.toLowerCase()}`,
        missing: field.missing,
        helpText: field.missing
          ? "Not found in the conversation — add it to continue."
          : undefined,
      }))}
      integrationName={name}
      onFieldChange={onFieldChange}
      onCancel={onCancelReview}
      onConfirm={onConfirm}
      confirmDisabled={blocked}
      className={cn(!reduced && "assist-card-enter")}
    />
  );
}

function integrationName(action: SuggestedAction, integrations: Integration[]): string {
  return (
    integrationById(integrations, action.integrationId)?.name ?? action.integrationId
  );
}

// ---------------------------------------------------------------------------
// Panel
// ---------------------------------------------------------------------------

interface StreamRow {
  id: string;
  atMs: number;
}

/**
 * Arrival order, frozen. New cards prepend newest-first so the latest cue is
 * at the top; cards already on screen never swap places with each other.
 */
function useStableStreamOrder<T extends StreamRow>(rows: T[]) {
  const orderRef = useRef<string[]>([]);
  const byId = new Map(rows.map((row) => [row.id, row]));

  const kept = orderRef.current.filter((id) => byId.has(id));
  const added = rows
    .filter((row) => !kept.includes(row.id))
    .sort((a, b) => b.atMs - a.atMs)
    .map((row) => row.id);

  const order = [...added, ...kept];
  orderRef.current = order;
  return order.map((id) => byId.get(id)!).filter(Boolean);
}

export interface LiveAgentAssistPanelProps {
  elapsedMs: number;
  scenario: CallScenario;
  guidanceItems?: GuidanceItem[];
  knowledgeSources?: KnowledgeSourceRecord[];
  coachingRules?: CoachingRule[];
  integrations?: Integration[];
  actions?: AgentAction[];
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
  actions: actionLibrary = SEED_ACTIONS,
  exiting = false,
  className,
}: LiveAgentAssistPanelProps) {
  const reduced = prefersReducedMotion();
  const snapshot = simulationAt(scenario, elapsedMs, guidanceItems, {
    knowledge: knowledgeSources,
    coaching: coachingRules,
    integrations,
    actions: actionLibrary,
  });

  const [viewingResource, setViewingResource] = useState<GuidanceResource | null>(null);
  const [collapsedKnowledge, setCollapsedKnowledge] = useState<Set<string>>(new Set());
  const [knownIds, setKnownIds] = useState<Set<string>>(new Set());
  const [actionRuntimes, setActionRuntimes] = useState<Record<string, ActionRuntime>>({});

  const stream = useGuidanceStream({
    suggestions: snapshot.suggestions,
    steps: scenario.steps,
    playhead: Math.min(snapshot.scriptIndex, scenario.steps.length),
    reduced,
    handledIds: snapshot.handledIds,
  });
  const coaching = useCoachingStack(snapshot.coaching, scenario.id, reduced);

  useEffect(() => {
    setViewingResource(null);
    setActionRuntimes({});
    setKnownIds(new Set());
    setCollapsedKnowledge(new Set());
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
    const filled = { ...runtime.filled };
    if (action.email) {
      if (filled.To === undefined) filled.To = action.email.to;
      if (filled.Subject === undefined) filled.Subject = action.email.subject;
      if (filled.Message === undefined) filled.Message = action.email.body;
    } else {
      action.fields.forEach((field) => {
        if (field.missing && filled[field.label] === undefined) filled[field.label] = "";
      });
    }
    patchRuntime(action.id, { state: "reviewing", filled });
  };

  const executeAction = (action: SuggestedAction) => {
    const runtime = runtimeFor(action.id);
    patchRuntime(action.id, { state: "executing" });
    window.setTimeout(() => {
      const permission = Boolean(action.simulatePermissionDenied);
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
            state: permission
              ? "permission_denied"
              : fails
                ? "failed"
                : "done",
            attempted: true,
          },
        };
      });
    }, ACTION_EXECUTE_MS);
  };

  const demoStateSig = snapshot.actions
    .map((entry) => `${entry.id}:${entry.state ?? ""}`)
    .join("|");
  const demoDriven = snapshot.actions.some((entry) => entry.state);

  useEffect(() => {
    if (!demoDriven) return;
    setActionRuntimes((current) => {
      let changed = false;
      const next = { ...current };
      for (const entry of snapshot.actions) {
        if (!entry.state) continue;
        const previous = next[entry.id] ?? {
          state: "suggested" as ActionState,
          filled: {},
          attempted: false,
        };
        if (previous.state === entry.state) continue;
        next[entry.id] = {
          ...previous,
          state: entry.state,
          attempted: entry.state === "done" || previous.attempted,
        };
        changed = true;
      }
      return changed ? next : current;
    });
    // Demo clock drives this; the action list is derived from elapsed time.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demoStateSig]);

  // A confirmation is a receipt, not a permanent row — it collapses on its own
  // unless the demo is already choreographing completion and collapse.
  useEffect(() => {
    if (demoDriven) return;
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
    demoDriven,
    Object.entries(actionRuntimes)
      .filter(([, runtime]) => runtime.state === "done")
      .map(([id]) => id)
      .join("|"),
  ]);

  const visibleStreamActions = snapshot.actions
    .map((entry) => entry.action)
    .filter((action) => runtimeFor(action.id).state !== "dismissed");

  const renderAction = (action: SuggestedAction) => (
    <SuggestedActionRow
      key={action.id}
      action={action}
      runtime={runtimeFor(action.id)}
      reduced={reduced}
      integrations={integrations}
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

  const renderGuidance = (entry: GuidanceStreamCard) => (
    <InCallGuidanceSlot
      key={entry.suggestion.id}
      item={entry.suggestion}
      reduced={reduced}
      expanded={stream.expandedId === entry.suggestion.id}
      status={entry.status}
      relevantAgain={stream.relevantAgainIds.has(entry.suggestion.id)}
      arriving={stream.arrivingIds.has(entry.suggestion.id)}
      attention={stream.attentionIds.has(entry.suggestion.id)}
      onToggle={() => stream.toggleCard(entry.suggestion.id)}
      onViewResource={setViewingResource}
      onEngage={stream.engage}
      onDisengage={stream.disengage}
      cardRef={(node) => stream.registerCard(entry.suggestion.id, node)}
    />
  );

  // One line, one card each. Arrival time is the only order — a coaching cue
  // that fires between two guidance cards sits between them, not under both.
  const streamStack = [
    ...stream.cards.map((entry) => ({
      kind: "guidance" as const,
      atMs: entry.suggestion.atMs,
      id: entry.suggestion.id,
      entry,
    })),
    ...coaching.stack.map((cue) => ({
      kind: "coaching" as const,
      atMs: cue.atMs,
      id: cue.id,
      cue,
    })),
    ...snapshot.knowledge.map((surface) => ({
      kind: "knowledge" as const,
      atMs: surface.atMs,
      id: surface.id,
      surface,
    })),
    ...snapshot.actions
      .filter((entry) => runtimeFor(entry.id).state !== "dismissed")
      .map((entry) => ({
        kind: "action" as const,
        atMs: entry.atMs,
        id: entry.id,
        action: entry.action,
      })),
  ];

  const ordered = useStableStreamOrder(streamStack);

  const nothingYet =
    stream.cards.length === 0 &&
    snapshot.knowledge.length === 0 &&
    visibleStreamActions.length === 0 &&
    coaching.stack.length === 0;

  const renderKnowledge = (surface: KnowledgeSurface) => (
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
  );

  return (
    <section
      aria-label="Conversation guidance"
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
        <GuidanceSparklesIcon className="size-4 shrink-0" />
        <p className="text-label-md-semi text-foreground">Conversation guidance</p>
        {/* Something landed while they were reading — said once, quietly (§3). */}
        {stream.newCount > 0 ? (
          <p
            aria-live="polite"
            className={cn(
              "text-label-md text-muted-foreground tabular-nums",
              !reduced && "assist-badge-in"
            )}
          >
            · {stream.newCount} new
          </p>
        ) : null}
      </header>

      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-4 py-2.5",
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

        {stream.criticalAlert ? (
          <CriticalGuidanceAlert
            name={stream.criticalAlert.suggestion.item.name}
            reduced={reduced}
            onFocus={stream.focusCriticalAlert}
          />
        ) : null}

        {ordered.map((item) =>
          item.kind === "coaching" ? (
            <CoachingCard
              key={item.id}
              cue={item.cue}
              arriving={coaching.arrivingIds.has(item.id)}
              reduced={reduced}
              onAcknowledge={() => coaching.acknowledge(item.id)}
            />
          ) : item.kind === "guidance" ? (
            renderGuidance(item.entry)
          ) : item.kind === "action" ? (
            renderAction(item.action)
          ) : (
            renderKnowledge(item.surface)
          )
        )}
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
