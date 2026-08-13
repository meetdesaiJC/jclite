import * as React from "react";
import { Button } from "@/components/Button";
import {
  IconChevronDown,
  IconClose,
  IconDotsVertical,
  IconSparkles,
} from "@/components/Icon";
import { cn } from "@/lib/utils";
import {
  flattenSteps,
  newId,
  rewriteSuggestedWording,
  WORDING_TONES,
  type PlaybookStep,
  type ScriptPlaybook,
  type WordingTone,
} from "./scriptPlaybook";

function DragHandleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
      <circle cx="5.5" cy="4" r="1.1" />
      <circle cx="10.5" cy="4" r="1.1" />
      <circle cx="5.5" cy="8" r="1.1" />
      <circle cx="10.5" cy="8" r="1.1" />
      <circle cx="5.5" cy="12" r="1.1" />
      <circle cx="10.5" cy="12" r="1.1" />
    </svg>
  );
}

function RefreshIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M13.2 8A5.2 5.2 0 1 1 11.4 3.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <path
        d="M11.5 1.7v2.6H8.9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function createStep(overrides: Partial<PlaybookStep> = {}): PlaybookStep {
  return {
    id: newId("step"),
    title: "",
    suggestedWording: "",
    guidance: "",
    required: false,
    showWhen: { type: "always" },
    ...overrides,
  };
}

function withSteps(playbook: ScriptPlaybook, steps: PlaybookStep[]): ScriptPlaybook {
  const host = playbook.stages[0];
  return {
    ...playbook,
    stages: [
      {
        id: host?.id ?? newId("stage"),
        title: host?.title || "Script",
        steps,
      },
    ],
  };
}

const inputClass =
  "w-full rounded-[4px] border border-line bg-white px-3 py-2 text-paragraph-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/16";

interface RephraseDraft {
  stepId: string;
  source: string;
  title: string;
  tone: WordingTone;
  wording: string;
  seed: number;
}

export interface PlaybookEditorProps {
  playbook: ScriptPlaybook;
  onChange: (playbook: ScriptPlaybook) => void;
}

export function PlaybookEditor({ playbook, onChange }: PlaybookEditorProps) {
  const [aiBusyStepId, setAiBusyStepId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState<RephraseDraft | null>(null);
  const dragRef = React.useRef<number | null>(null);
  const [overIndex, setOverIndex] = React.useState<number | null>(null);

  const steps = flattenSteps(playbook);
  const setSteps = (next: PlaybookStep[]) => onChange(withSteps(playbook, next));

  const updateStep = (stepId: string, patch: Partial<PlaybookStep>) => {
    setSteps(steps.map((item) => (item.id === stepId ? { ...item, ...patch } : item)));
  };

  const addStep = () => {
    setSteps([...steps, createStep()]);
  };

  const removeStep = (stepId: string) => {
    if (draft?.stepId === stepId) setDraft(null);
    setSteps(steps.filter((item) => item.id !== stepId));
  };

  const reorderStep = (from: number, to: number) => {
    if (from === to) return;
    const next = [...steps];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setSteps(next);
  };

  const generateDraft = (
    step: PlaybookStep,
    tone: WordingTone,
    seed: number,
    source = step.suggestedWording
  ) => {
    if (aiBusyStepId) return;
    setAiBusyStepId(step.id);
    setDraft((current) => ({
      stepId: step.id,
      source,
      title: step.title,
      tone,
      wording: current?.stepId === step.id ? current.wording : "",
      seed,
    }));
    window.setTimeout(() => {
      const result = rewriteSuggestedWording({
        title: step.title,
        wording: source,
        tone,
        seed,
      });
      setDraft({
        stepId: step.id,
        source,
        title: step.title,
        tone,
        wording: result.wording,
        seed,
      });
      setAiBusyStepId(null);
    }, 380);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-lg border border-line bg-white">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto px-5 py-5">
        {steps.map((item, stepIndex) => {
          const isOver = overIndex === stepIndex && dragRef.current !== null && dragRef.current !== stepIndex;
          const canRewrite = Boolean(item.title.trim() || item.suggestedWording.trim());
          const rephraseOpen = draft?.stepId === item.id;

          return (
            <article
              key={item.id}
              onDragOver={(event) => {
                event.preventDefault();
                setOverIndex(stepIndex);
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (dragRef.current !== null) {
                  reorderStep(dragRef.current, stepIndex);
                }
                dragRef.current = null;
                setOverIndex(null);
              }}
              className={cn(
                "rounded-[8px] border border-line bg-white p-3",
                isOver && "border-brand/40 bg-brand-subtle/40"
              )}
            >
              <div className="mb-2 flex items-center gap-1.5">
                <button
                  type="button"
                  draggable
                  aria-label={`Reorder ${item.title || "step"}`}
                  onDragStart={() => {
                    dragRef.current = stepIndex;
                  }}
                  onDragEnd={() => {
                    dragRef.current = null;
                    setOverIndex(null);
                  }}
                  className="flex size-7 shrink-0 cursor-grab items-center justify-center rounded-[4px] text-muted-foreground hover:bg-secondary-bg hover:text-foreground active:cursor-grabbing"
                >
                  <DragHandleIcon />
                </button>
                <input
                  value={item.title}
                  onChange={(event) => updateStep(item.id, { title: event.target.value })}
                  placeholder="Title"
                  aria-label="Step title"
                  className={cn(inputClass, "min-w-0 flex-1")}
                />
                <button
                  type="button"
                  aria-label={`Remove ${item.title || "step"}`}
                  onClick={() => removeStep(item.id)}
                  className="flex size-7 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-secondary-bg hover:text-foreground"
                >
                  <IconClose size={16} />
                </button>
              </div>

              <div className="relative">
                <textarea
                  value={item.suggestedWording}
                  onChange={(event) => updateStep(item.id, { suggestedWording: event.target.value })}
                  placeholder="What the agent should say"
                  aria-label="Suggested wording"
                  rows={3}
                  className={cn(inputClass, "min-h-[72px] resize-y pr-10")}
                />
                <button
                  type="button"
                  disabled={!canRewrite || Boolean(aiBusyStepId)}
                  aria-label="Rephrase this line"
                  aria-pressed={rephraseOpen}
                  onClick={() => {
                    if (rephraseOpen && draft) {
                      generateDraft(item, draft.tone, draft.seed + 1, draft.source);
                      return;
                    }
                    generateDraft(item, "empathetic", 0);
                  }}
                  className={cn(
                    "absolute top-1.5 right-1.5 flex size-7 items-center justify-center rounded-[4px] text-[#673BFF] hover:bg-[#673BFF]/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#673BFF]/24 disabled:pointer-events-none disabled:opacity-40",
                    rephraseOpen && "bg-[#673BFF]/8",
                    aiBusyStepId === item.id && "animate-pulse"
                  )}
                >
                  <IconSparkles size={16} />
                </button>
              </div>

              {rephraseOpen && draft ? (
                <RephraseCard
                  wording={draft.wording}
                  tone={draft.tone}
                  busy={aiBusyStepId === item.id}
                  onToneChange={(tone) => generateDraft(item, tone, 0, draft.source)}
                  onRefresh={() => generateDraft(item, draft.tone, draft.seed + 1, draft.source)}
                  onUse={() => {
                    if (!draft.wording.trim()) return;
                    updateStep(item.id, { suggestedWording: draft.wording });
                    setDraft(null);
                  }}
                  onDismiss={() => setDraft(null)}
                />
              ) : null}
            </article>
          );
        })}

        <button
          type="button"
          onClick={addStep}
          className="flex h-8 items-center self-start rounded-[4px] px-1 text-label-sm text-brand hover:bg-brand-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          + Add step
        </button>
      </div>
    </div>
  );
}

function RephraseCard({
  wording,
  tone,
  busy,
  onToneChange,
  onRefresh,
  onUse,
  onDismiss,
}: {
  wording: string;
  tone: WordingTone;
  busy: boolean;
  onToneChange: (tone: WordingTone) => void;
  onRefresh: () => void;
  onUse: () => void;
  onDismiss: () => void;
}) {
  const [toneOpen, setToneOpen] = React.useState(false);
  const [menuOpen, setMenuOpen] = React.useState(false);
  const toneRef = React.useRef<HTMLDivElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);
  const toneLabel = WORDING_TONES.find((item) => item.value === tone)?.label ?? "Empathetic";

  React.useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!toneRef.current?.contains(target)) setToneOpen(false);
      if (!menuRef.current?.contains(target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, []);

  return (
    <div className="mt-2 rounded-[8px] border border-line bg-white px-3 py-2.5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <p className="text-label-sm text-foreground">Rephrase</p>
          <button
            type="button"
            aria-label="Regenerate"
            disabled={busy}
            onClick={onRefresh}
            className="flex size-7 items-center justify-center rounded-[4px] text-brand hover:bg-brand-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24 disabled:pointer-events-none disabled:opacity-40"
          >
            <RefreshIcon size={16} />
          </button>
        </div>
        <div className="relative" ref={menuRef}>
          <button
            type="button"
            aria-label="Rephrase actions"
            aria-expanded={menuOpen}
            onClick={() => {
              setMenuOpen((open) => !open);
              setToneOpen(false);
            }}
            className="flex size-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-secondary-bg hover:text-foreground"
          >
            <IconDotsVertical size={16} />
          </button>
          {menuOpen ? (
            <div className="absolute top-8 right-0 z-20 w-32 overflow-hidden rounded-[6px] border border-line bg-white py-1 shadow-200">
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false);
                  onDismiss();
                }}
                className="flex w-full px-3 py-2 text-left text-paragraph-sm text-foreground hover:bg-secondary-bg"
              >
                Dismiss
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="rounded-[6px] bg-[#673BFF]/10 px-3 py-2.5">
        <p
          className={cn(
            "text-pretty text-paragraph-sm text-foreground",
            busy && "animate-pulse text-muted-foreground"
          )}
        >
          {busy && !wording ? "Rephrasing…" : wording || "Rephrasing…"}
        </p>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="relative" ref={toneRef}>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={toneOpen}
            disabled={busy}
            onClick={() => {
              setToneOpen((open) => !open);
              setMenuOpen(false);
            }}
            className="flex h-7 items-center gap-1 rounded-[4px] px-1 text-label-sm text-foreground hover:bg-secondary-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24 disabled:pointer-events-none disabled:opacity-40"
          >
            <span className="text-muted-foreground">Tone:</span>
            {toneLabel}
            <IconChevronDown size={16} className="text-muted-foreground" />
          </button>
          {toneOpen ? (
            <ul
              role="listbox"
              className="absolute bottom-full left-0 z-20 mb-1 min-w-[168px] overflow-hidden rounded-[6px] border border-line bg-white py-1 shadow-200"
            >
              {WORDING_TONES.map((option) => (
                <li key={option.value} role="none">
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === tone}
                    onClick={() => {
                      setToneOpen(false);
                      if (option.value !== tone) onToneChange(option.value);
                    }}
                    className={cn(
                      "flex w-full px-3 py-2 text-left text-paragraph-sm text-foreground hover:bg-secondary-bg",
                      option.value === tone && "bg-brand-subtle"
                    )}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <Button variant="link" size="xs" disabled={busy || !wording.trim()} onClick={onUse}>
          Use This
        </Button>
      </div>
    </div>
  );
}
