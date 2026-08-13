import { useEffect, useMemo, useRef, useState, type ReactNode, type Ref } from "react";
import { cn } from "@/lib/utils";
import { Dropdown } from "@/components/Dropdown";
import {
  IconCircleCheckFilled,
  IconCircleDashed,
  IconFile,
  IconSparkles,
} from "@/components/Icon";
import progressIcon from "./assets/dialer/progress.svg";
import {
  CALL_SCENARIOS,
  simulationAt,
  type CallScenario,
  type FaqSuggestion,
  type ScriptStep,
} from "./callSimulation";

/**
 * In-call Agent Assist side sheet — Figma Dialer 46:3694 (script) and 46:3876 (FAQ cards).
 * A choreographed conversation drives script progress and FAQ surfacing together.
 */

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function formatQuoteTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export interface AgentAssistCallSheetProps {
  elapsedMs: number;
  scenario: CallScenario;
  onScenarioChange: (id: string) => void;
  className?: string;
}

export function AgentAssistCallSheet({
  elapsedMs,
  scenario,
  onScenarioChange,
  className,
}: AgentAssistCallSheetProps) {
  const [userIndex, setUserIndex] = useState(0);
  const snapshot = simulationAt(scenario, elapsedMs);
  const activeIndex = Math.min(
    Math.max(snapshot.scriptIndex, userIndex),
    scenario.steps.length
  );
  const completed = Math.min(activeIndex, scenario.steps.length);
  const suggestions = snapshot.suggestions;
  const showSuggestions = suggestions.length > 0;
  const latestFaq = suggestions[suggestions.length - 1];
  const liveQuote =
    snapshot.latestQuote && snapshot.latestQuote.quote !== latestFaq?.quote
      ? snapshot.latestQuote
      : null;
  const latestRef = useRef<HTMLDivElement | null>(null);
  const reduced = prefersReducedMotion();

  useEffect(() => {
    setUserIndex(0);
  }, [scenario.id]);

  useEffect(() => {
    if (!showSuggestions) return;
    latestRef.current?.scrollIntoView({
      behavior: reduced ? "auto" : "smooth",
      block: "nearest",
    });
  }, [suggestions.length, showSuggestions, reduced]);

  const options = useMemo(
    () => CALL_SCENARIOS.map((item) => ({ value: item.id, label: item.scriptName })),
    []
  );

  const advance = (index: number) => {
    if (index !== activeIndex) return;
    setUserIndex((current) => Math.max(current, index + 1));
  };

  const liveAnnouncement = suggestions.length > 0
    ? `FAQ: ${suggestions[suggestions.length - 1].question}. Customer said ${suggestions[suggestions.length - 1].quote}.`
    : snapshot.latestQuote
      ? `Customer said ${snapshot.latestQuote.quote}`
      : `Now: ${scenario.steps[Math.min(activeIndex, scenario.steps.length - 1)]?.title ?? ""}`;

  return (
    <aside
      aria-label="Agent Assist"
      className={cn(
        "relative flex h-full w-[480px] shrink-0 flex-col bg-white",
        className
      )}
    >
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pb-4">
        <div className="flex shrink-0 items-start gap-1">
          <IconSparkles
            size={20}
            className="size-5 shrink-0 text-[#6d4dff]"
            aria-hidden="true"
          />
          <p
            className="bg-clip-text text-[14px] leading-5 font-medium text-transparent"
            style={{
              backgroundImage:
                "linear-gradient(110deg, #3318ff 30.4%, #b46dff 148.8%)",
            }}
          >
            Agent Assist
          </p>
        </div>

        {liveQuote ? (
          <p
            key={`${liveQuote.atMs}-${liveQuote.quote}`}
            className={cn(
              "text-paragraph-md text-muted-foreground",
              !reduced && "animate-[assist-faq-in_220ms_cubic-bezier(0.23,1,0.32,1)_both]"
            )}
          >
            {`Customer (${formatQuoteTime(liveQuote.atMs)}): “${liveQuote.quote}”`}
          </p>
        ) : null}

        {showSuggestions ? (
          <div className="flex flex-col gap-3">
            <p className="text-label-md text-foreground">FAQs</p>
            {suggestions.map((item, index) => (
              <FaqCard
                key={item.id}
                cardRef={index === suggestions.length - 1 ? latestRef : undefined}
                item={item}
                reduced={reduced}
              />
            ))}
          </div>
        ) : null}

        {showSuggestions ? <div className="h-px w-full shrink-0 bg-line" /> : null}

        {showSuggestions ? (
          <div className="flex items-center justify-between">
            <p className="text-label-md-semi text-foreground">Script</p>
            <p className="text-paragraph-md text-muted-foreground">
              {completed}/{scenario.steps.length} completed
            </p>
          </div>
        ) : null}

        <Dropdown
          searchable={false}
          leftIcon={<IconFile size={20} />}
          options={options}
          value={scenario.id}
          onValueChange={(value) =>
            onScenarioChange(Array.isArray(value) ? value[0] : value)
          }
          aria-label="Call script"
        />

        <ol className="flex flex-col gap-2" aria-label="Call script">
          {scenario.steps.map((step, index) => {
            const state =
              index < activeIndex
                ? "done"
                : index === activeIndex
                  ? "active"
                  : "upcoming";
            return (
              <ScriptStepRow
                key={`${scenario.id}-${step.title}`}
                step={step}
                state={state}
                reduced={reduced}
                onSelect={() => advance(index)}
              />
            );
          })}
        </ol>
      </div>

      {!showSuggestions ? (
        <div className="shrink-0 border-t border-line bg-surface-hover px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-label-md text-foreground">Script compliance</p>
            <p className="text-paragraph-md text-muted-foreground">
              {completed}/{scenario.steps.length}
            </p>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded bg-muted">
            <div
              className="h-full rounded bg-brand"
              style={{
                width: `${scenario.steps.length === 0 ? 0 : (completed / scenario.steps.length) * 100}%`,
                transition: reduced ? "none" : "width 280ms cubic-bezier(0.23, 1, 0.32, 1)",
              }}
            />
          </div>
        </div>
      ) : null}

      <p className="sr-only" aria-live="polite">
        {liveAnnouncement}
      </p>
    </aside>
  );
}

function FaqCard({
  item,
  reduced,
  cardRef,
}: {
  item: FaqSuggestion;
  reduced: boolean;
  cardRef?: Ref<HTMLDivElement>;
}) {
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);

  return (
    <div
      ref={cardRef}
      className={cn(
        "assist-faq-card flex flex-col gap-2",
        !reduced && "animate-[assist-faq-in_220ms_cubic-bezier(0.23,1,0.32,1)_both]"
      )}
    >
      <p className="text-paragraph-md text-muted-foreground">
        {`Customer (${formatQuoteTime(item.atMs)}): “${item.quote}”`}
      </p>
      <article className="overflow-hidden rounded-lg shadow-200 ring-1 ring-warning-border">
        <header className="bg-warning-border px-3 py-2.5">
          <p className="text-pretty text-label-md-semi text-foreground">{item.question}</p>
        </header>
        <div className="bg-warning-secondary px-3 py-2.5">
          <p className="text-pretty text-paragraph-md text-foreground">{item.answer}</p>
        </div>
        <footer className="flex items-center justify-between gap-3 bg-white px-3 py-2">
          <p className="text-paragraph-md text-foreground">
            {feedback === "up"
              ? "Thanks for the feedback"
              : feedback === "down"
                ? "We’ll use this to improve"
                : "Was this helpful?"}
          </p>
          <div className="flex shrink-0 gap-1.5">
            <FeedbackButton
              label="Helpful"
              pressed={feedback === "up"}
              onClick={() => setFeedback((value) => (value === "up" ? null : "up"))}
            >
              <ThumbUpIcon />
            </FeedbackButton>
            <FeedbackButton
              label="Not helpful"
              pressed={feedback === "down"}
              onClick={() => setFeedback((value) => (value === "down" ? null : "down"))}
            >
              <ThumbDownIcon />
            </FeedbackButton>
          </div>
        </footer>
      </article>
    </div>
  );
}

function FeedbackButton({
  label,
  pressed,
  onClick,
  children,
}: {
  label: string;
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "flex size-6 items-center justify-center rounded-[4px] border outline-none transition-colors",
        pressed
          ? "border-brand bg-brand-subtle text-brand"
          : "border-line bg-white text-foreground hover:bg-surface-hover",
        "focus-visible:ring-2 focus-visible:ring-brand/24 active:scale-[0.97]"
      )}
    >
      {children}
    </button>
  );
}

function ThumbUpIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M5.333 13.333H3.2c-.737 0-1.333-.597-1.333-1.333V8.667c0-.737.596-1.334 1.333-1.334h2.133M5.333 7.333 7.067 3.6A1.467 1.467 0 0 1 8.4 2.667h.133c.86 0 1.534.747 1.4 1.593L9.6 6.667h2.933c.88 0 1.54.813 1.36 1.673l-.8 3.867a1.333 1.333 0 0 1-1.307 1.06H5.333V7.333Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M10.667 2.667H12.8c.737 0 1.333.596 1.333 1.333v3.333c0 .737-.596 1.334-1.333 1.334h-2.133M10.667 8.667 8.933 12.4a1.467 1.467 0 0 1-1.333.933h-.133c-.86 0-1.534-.747-1.4-1.593L6.4 9.333H3.467c-.88 0-1.54-.813-1.36-1.673l.8-3.867A1.333 1.333 0 0 1 4.213 2.733h6.454V8.667Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ScriptStepRow({
  step,
  state,
  reduced,
  onSelect,
}: {
  step: ScriptStep;
  state: "done" | "active" | "upcoming";
  reduced: boolean;
  onSelect: () => void;
}) {
  const clickable = state === "active";

  return (
    <li>
      <button
        type="button"
        disabled={!clickable}
        onClick={onSelect}
        className={cn(
          "flex w-full flex-col items-start rounded-lg text-left outline-none",
          reduced
            ? "transition-none"
            : "transition-[background-color,border-color,padding] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)]",
          state === "active" &&
            "gap-1.5 border border-info-border bg-avatar-indigo-bg p-3",
          state === "done" && "flex-row items-start gap-1.5 bg-surface-hover p-3",
          state === "upcoming" && "flex-row items-start gap-1.5 bg-surface-hover p-2",
          clickable && "cursor-pointer hover:brightness-[0.99] focus-visible:ring-2 focus-visible:ring-brand/24",
          !clickable && "cursor-default"
        )}
      >
        {state === "active" ? (
          <>
            <span className="flex items-center gap-1.5">
              <span className="relative size-5 shrink-0 overflow-clip">
                <img src={progressIcon} alt="" className="size-full object-contain" />
              </span>
              <span className="text-paragraph-md text-foreground">{step.title}</span>
            </span>
            {step.wording ? (
              <p className="text-pretty text-[14px] leading-5 font-medium text-brand">
                “{step.wording}”
              </p>
            ) : null}
          </>
        ) : (
          <>
            {state === "done" ? (
              <IconCircleCheckFilled
                size={20}
                className="size-5 shrink-0 text-disabled-fg"
                aria-hidden="true"
              />
            ) : (
              <IconCircleDashed
                size={20}
                className="size-5 shrink-0 text-disabled-fg"
                aria-hidden="true"
              />
            )}
            <span
              className={cn(
                "min-w-0 flex-1 text-paragraph-md",
                state === "done" ? "text-muted-foreground" : "text-muted-foreground"
              )}
            >
              {step.title}
            </span>
          </>
        )}
      </button>
    </li>
  );
}
