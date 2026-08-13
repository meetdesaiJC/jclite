import * as React from "react";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { cn } from "@/lib/utils";
import { flattenSteps, spokenLineFor, type PlaybookStep, type ScriptPlaybook } from "./scriptPlaybook";
import { SpeakProgressHint } from "./SpeakProgressHint";

const STEP_HOLD_MS = 2400;
const COMPLETE_HOLD_MS = 1600;

export interface ScriptPreviewModalProps {
  open: boolean;
  playbook: ScriptPlaybook;
  onClose: () => void;
}

function prefersReducedMotion(): boolean {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function ScriptPreviewModal({ open, playbook, onClose }: ScriptPreviewModalProps) {
  const steps = React.useMemo(() => flattenSteps(playbook), [playbook]);
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [complete, setComplete] = React.useState(false);
  const [paused, setPaused] = React.useState(false);
  const activeRef = React.useRef<HTMLLIElement | null>(null);

  React.useEffect(() => {
    if (!open) return;
    setActiveIndex(0);
    setComplete(false);
    setPaused(false);
  }, [open, playbook.id]);

  React.useEffect(() => {
    if (!open || paused || steps.length === 0) return;

    const delay = complete ? COMPLETE_HOLD_MS : STEP_HOLD_MS;
    const timer = window.setTimeout(() => {
      if (complete) {
        setComplete(false);
        setActiveIndex(0);
        return;
      }
      if (activeIndex >= steps.length - 1) {
        setComplete(true);
        return;
      }
      setActiveIndex((index) => index + 1);
    }, delay);

    return () => window.clearTimeout(timer);
  }, [activeIndex, complete, open, paused, steps.length]);

  React.useEffect(() => {
    if (!open) return;
    activeRef.current?.scrollIntoView({
      behavior: prefersReducedMotion() ? "auto" : "smooth",
      block: "nearest",
    });
  }, [activeIndex, complete, open]);

  const replay = () => {
    setComplete(false);
    setActiveIndex(0);
    setPaused(false);
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title={playbook.name}
      description="What the agent sees during the call"
      footer={
        steps.length > 0 ? (
          <Button
            variant="grey-outline"
            size="sm"
            onClick={() => {
              if (complete) {
                replay();
                return;
              }
              setPaused((value) => !value);
            }}
          >
            {complete ? "Replay" : paused ? "Resume" : "Pause"}
          </Button>
        ) : undefined
      }
    >
      {steps.length === 0 ? (
        <p className="rounded-lg bg-secondary-bg px-4 py-6 text-center text-paragraph-sm text-muted-foreground">
          Add steps in the editor to preview this script.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5 rounded-lg bg-secondary-bg p-2">
          <SpeakProgressHint className="px-3 py-1.5" />
          <ol className="flex flex-col gap-1.5" aria-label="Script preview">
            {steps.map((step, index) => {
              const state = complete
                ? "done"
                : index < activeIndex
                  ? "done"
                  : index === activeIndex
                    ? "active"
                    : "upcoming";
              return (
                <PreviewStep
                  key={step.id}
                  ref={state === "active" ? activeRef : undefined}
                  step={step}
                  state={state}
                />
              );
            })}
          </ol>
        </div>
      )}

      <p className="sr-only" aria-live="polite">
        {complete
          ? "Script complete"
          : steps[activeIndex]
            ? `Now: ${steps[activeIndex].title}. ${spokenLineFor(steps[activeIndex])}`
            : ""}
      </p>
    </Modal>
  );
}

const PreviewStep = React.forwardRef<
  HTMLLIElement,
  { step: PlaybookStep; state: "done" | "active" | "upcoming" }
>(function PreviewStep({ step, state }, ref) {
  const line = spokenLineFor(step);
  const reduced = prefersReducedMotion();

  return (
    <li
      ref={ref}
      className={cn(
        "rounded-[10px] border px-3 py-2.5",
        reduced
          ? "transition-none"
          : "transition-[background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
        state === "done" && "border-transparent bg-muted",
        state === "active" && "border-info-border bg-info-secondary shadow-[0_0_0_1px_rgba(0,76,230,0.06)]",
        state === "upcoming" && "border-transparent bg-white"
      )}
    >
      <div className="flex items-start gap-2.5">
        <StepMark state={state} />
        <div className="min-w-0 flex-1 pt-px">
          <p
            className={cn(
              "text-label-md-semi text-pretty",
              reduced ? "transition-none" : "transition-colors duration-300",
              state === "active" ? "text-foreground" : "text-muted-foreground"
            )}
          >
            {step.title || "Untitled step"}
          </p>
          <div
            aria-hidden={state !== "active"}
            className={cn(
              "grid",
              reduced
                ? "transition-none"
                : "transition-[grid-template-rows,opacity] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
              state === "active" ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            )}
          >
            <div className="overflow-hidden">
              <p className="mt-1 text-pretty text-paragraph-sm text-brand">“{line}”</p>
            </div>
          </div>
        </div>
      </div>
    </li>
  );
});

function StepMark({ state }: { state: "done" | "active" | "upcoming" }) {
  if (state === "done") {
    return (
      <span
        className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-disabled-fg text-white"
        aria-hidden="true"
      >
        <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
          <path
            d="M3.5 8.5L6.5 11.5L12.5 4.5"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    );
  }

  return (
    <span
      className={cn("mt-0.5 size-5 shrink-0", state === "active" ? "text-brand" : "text-disabled-fg")}
      aria-hidden="true"
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle
          cx="10"
          cy="10"
          r="7"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="1.15 2.55"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}
