import * as React from "react";
import { Button } from "@/components/Button";
import { IconClose, IconFile, IconInfoCircle, IconSparkles } from "@/components/Icon";
import { cn } from "@/lib/utils";

export interface ScriptChecklistItem {
  id: string;
  title: string;
  body: string;
}

export interface ScriptChecklistEditorProps {
  items: ScriptChecklistItem[];
  onChange: (items: ScriptChecklistItem[]) => void;
}

const DUMMY_IMPORT_SCRIPTS: Omit<ScriptChecklistItem, "id">[] = [
  {
    title: "Opening greeting",
    body: "Hi, thanks for calling JustCall. How can I help you today?",
  },
  {
    title: "Qualify the need",
    body: "Can you tell me a bit more about what you're looking to solve?",
  },
  {
    title: "Confirm next steps",
    body: "I'll send a follow-up with a summary and proposed next steps. Does that work?",
  },
];

const DUMMY_AI_SCRIPTS: Omit<ScriptChecklistItem, "id">[] = [
  {
    title: "Warm introduction",
    body: "Hello, you've reached JustCall support. I'm here to help — what's going on today?",
  },
  {
    title: "Clarify the issue",
    body: "Just so I understand correctly, can you walk me through what happened before this started?",
  },
  {
    title: "Offer a resolution",
    body: "Based on what you've shared, here's what I recommend we try first.",
  },
  {
    title: "Close the call",
    body: "Is there anything else I can help with before we wrap up?",
  },
];

function createItem(
  overrides: Partial<ScriptChecklistItem> = {}
): ScriptChecklistItem {
  return {
    id: `script-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title: "",
    body: "",
    ...overrides,
  };
}

function DragHandleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <circle cx="5.5" cy="4" r="1.1" />
      <circle cx="10.5" cy="4" r="1.1" />
      <circle cx="5.5" cy="8" r="1.1" />
      <circle cx="10.5" cy="8" r="1.1" />
      <circle cx="5.5" cy="12" r="1.1" />
      <circle cx="10.5" cy="12" r="1.1" />
    </svg>
  );
}

function ChecklistHeaderIcon() {
  return (
    <span
      className="flex size-7 shrink-0 items-center justify-center rounded-[6px] bg-secondary-bg text-muted-foreground"
      aria-hidden="true"
    >
      <IconFile size={16} />
    </span>
  );
}

function UploadCsvIcon() {
  return (
    <span
      className="flex size-12 items-center justify-center rounded-full bg-brand-subtle text-brand"
      aria-hidden="true"
    >
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <path
          d="M14 2H8C6.895 2 6 2.895 6 4V20C6 21.105 6.895 22 8 22H16C17.105 22 18 21.105 18 20V8L14 2Z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M14 2V8H18"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M12 17V11M12 11L9.5 13.5M12 11L14.5 13.5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function OrDivider() {
  return (
    <div className="flex items-center gap-3" role="separator" aria-label="or">
      <div className="h-px flex-1 bg-line" />
      <span className="text-label-sm text-muted-foreground">OR</span>
      <div className="h-px flex-1 bg-line" />
    </div>
  );
}

function ScriptChecklistEmptyState({
  onTypeManually,
  onUploadClick,
  onSampleFile,
  onGenerateWithAi,
  onFileDrop,
}: {
  onTypeManually: () => void;
  onUploadClick: () => void;
  onSampleFile: () => void;
  onGenerateWithAi: () => void;
  onFileDrop: (file: File) => void;
}) {
  const [isDragging, setIsDragging] = React.useState(false);

  return (
    <div className="flex flex-1 flex-col justify-center gap-4 px-2 py-6">
      <button
        type="button"
        onClick={onTypeManually}
        className="flex w-full flex-col items-center gap-1 rounded-lg border border-line bg-white px-6 py-8 text-center transition-colors hover:border-brand/40 hover:bg-secondary-bg/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
      >
        <span className="text-label-md-semi text-brand">Type blocks manually</span>
        <span className="text-paragraph-sm text-muted-foreground">
          Add talking points for your script checklist manually.
        </span>
      </button>

      <OrDivider />

      <div
        role="button"
        tabIndex={0}
        onClick={onUploadClick}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onUploadClick();
          }
        }}
        onDragEnter={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          if (!e.currentTarget.contains(e.relatedTarget as Node)) {
            setIsDragging(false);
          }
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) onFileDrop(file);
        }}
        className={cn(
          "flex w-full cursor-pointer flex-col items-center gap-3 rounded-lg border border-dashed px-6 py-10 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
          isDragging
            ? "border-brand bg-brand-subtle/60"
            : "border-line bg-white hover:border-brand/40 hover:bg-secondary-bg/40"
        )}
      >
        <UploadCsvIcon />
        <div className="flex flex-col gap-1">
          <p className="text-label-md text-foreground">
            Drag and drop or{" "}
            <span className="font-medium text-brand underline underline-offset-2">
              click to upload
            </span>
          </p>
          <p className="text-paragraph-sm text-muted-foreground">
            CSV or Excel file (Max Size: 25MB)
          </p>
        </div>
        <p className="text-paragraph-sm text-muted-foreground">
          Use this sample as a starting reference{" "}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onSampleFile();
            }}
            className="font-medium text-brand underline underline-offset-2 hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            Use Sample File
          </button>
        </p>
      </div>

      <OrDivider />

      <button
        type="button"
        onClick={onGenerateWithAi}
        className="flex w-full flex-col items-center gap-1 rounded-lg border border-line bg-white px-6 py-8 text-center transition-colors hover:border-[#B46DFF]/50 hover:bg-[#FAF8FF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#673BFF]/24"
      >
        <span className="inline-flex items-center gap-1.5 text-label-md-semi text-[#673BFF]">
          <IconSparkles size={16} className="text-[#673BFF]" />
          Generate with AI
        </span>
        <span className="text-paragraph-sm text-muted-foreground">
          Create script blocks from a short description of your call flow.
        </span>
      </button>
    </div>
  );
}

export function ScriptChecklistEditor({
  items,
  onChange,
}: ScriptChecklistEditorProps) {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const dragIndexRef = React.useRef<number | null>(null);
  const overIndexRef = React.useRef<number | null>(null);
  const [dragIndex, setDragIndex] = React.useState<number | null>(null);
  const [overIndex, setOverIndex] = React.useState<number | null>(null);

  const isEmpty = items.length === 0;

  const updateItem = (id: string, patch: Partial<ScriptChecklistItem>) => {
    onChange(items.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addBlock = () => {
    onChange([...items, createItem()]);
  };

  const startManualEntry = () => {
    onChange([createItem()]);
  };

  const removeBlock = (id: string) => {
    onChange(items.filter((item) => item.id !== id));
  };

  const applyDummyImport = (fileName?: string) => {
    const imported = DUMMY_IMPORT_SCRIPTS.map((script) => createItem(script));
    onChange(imported);
    void fileName;
  };

  const applyDummyAiScripts = () => {
    onChange(DUMMY_AI_SCRIPTS.map((script) => createItem(script)));
  };

  const openFilePicker = () => {
    fileInputRef.current?.click();
  };

  const reorder = (from: number, to: number) => {
    if (from === to || from < 0 || to < 0 || from >= items.length || to >= items.length) {
      return;
    }
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    onChange(next);
  };

  return (
    <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-line bg-white">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-line px-4 py-3">
        <div className="flex min-w-0 items-center gap-2">
          <ChecklistHeaderIcon />
          <h2 className="text-label-md-semi text-foreground">Script checklist</h2>
        </div>

        {!isEmpty ? (
          <div className="flex shrink-0 items-center gap-3">
            <span className="inline-flex rounded-[4px] bg-[linear-gradient(105deg,#3318FF_0%,#B46DFF_100%)] p-px">
              <button
                type="button"
                aria-label="Generate with AI"
                className="inline-flex h-[34px] items-center gap-1.5 rounded-[3px] bg-white px-3.5 text-label-md text-foreground hover:bg-secondary-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
                onClick={applyDummyAiScripts}
              >
                <IconSparkles size={16} className="text-[#673BFF]" />
                <span>Generate with AI</span>
              </button>
            </span>

            <Button variant="link" size="sm" onClick={addBlock}>
              Add a Block
            </Button>
          </div>
        ) : null}
      </header>

      <input
        ref={fileInputRef}
        type="file"
        accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) applyDummyImport(file.name);
          e.target.value = "";
        }}
      />

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto p-4">
        {isEmpty ? (
          <ScriptChecklistEmptyState
            onTypeManually={startManualEntry}
            onUploadClick={openFilePicker}
            onSampleFile={() => applyDummyImport("sample.csv")}
            onGenerateWithAi={applyDummyAiScripts}
            onFileDrop={(file) => applyDummyImport(file.name)}
          />
        ) : (
          <>
            <div className="flex items-start gap-2 rounded-[4px] border border-line px-3 py-2.5">
              <IconInfoCircle
                size={16}
                className="mt-0.5 shrink-0 text-muted-foreground"
              />
              <p className="min-w-0 text-paragraph-sm text-foreground">
                Upload a file with multiple blocks together instead of typing them
                manually.{" "}
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="font-medium text-brand underline underline-offset-2 hover:text-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
                >
                  Upload File
                </button>
              </p>
            </div>

            {items.map((item, index) => (
              <article
                key={item.id}
                onDragOver={(e) => {
                  e.preventDefault();
                  if (overIndexRef.current !== index) {
                    overIndexRef.current = index;
                    setOverIndex(index);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = dragIndexRef.current;
                  if (from != null) reorder(from, index);
                  dragIndexRef.current = null;
                  overIndexRef.current = null;
                  setDragIndex(null);
                  setOverIndex(null);
                }}
                className={cn(
                  "rounded-lg border border-line bg-white",
                  overIndex === index && dragIndex !== null && dragIndex !== index
                    ? "border-brand"
                    : null,
                  dragIndex === index ? "opacity-60" : null
                )}
              >
                <div className="flex items-center gap-2 px-3 py-2.5">
                  <button
                    type="button"
                    draggable
                    aria-label={`Reorder Block ${index + 1}`}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      dragIndexRef.current = index;
                      setDragIndex(index);
                    }}
                    onDragEnd={() => {
                      const from = dragIndexRef.current;
                      const to = overIndexRef.current;
                      if (from != null && to != null) {
                        reorder(from, to);
                      }
                      dragIndexRef.current = null;
                      overIndexRef.current = null;
                      setDragIndex(null);
                      setOverIndex(null);
                    }}
                    className="flex size-7 cursor-grab items-center justify-center rounded-[4px] text-muted-foreground active:cursor-grabbing"
                  >
                    <DragHandleIcon size={16} />
                  </button>
                  <p className="flex-1 text-label-md-semi text-foreground">
                    Block {index + 1}
                  </p>
                  <button
                    type="button"
                    aria-label={`Remove Block ${index + 1}`}
                    onClick={() => removeBlock(item.id)}
                    className="flex size-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
                  >
                    <IconClose size={16} />
                  </button>
                </div>

                <div className="flex flex-col gap-3 border-t border-line px-3 py-3">
                  <input
                    value={item.title}
                    onChange={(e) => updateItem(item.id, { title: e.target.value })}
                    placeholder="Title of block"
                    className="w-full rounded-[4px] border border-line bg-white px-3 py-2.5 text-paragraph-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/16"
                    aria-label={`Block ${index + 1} title`}
                  />
                  <textarea
                    value={item.body}
                    onChange={(e) => updateItem(item.id, { body: e.target.value })}
                    placeholder="Type your talking point"
                    rows={4}
                    className="w-full resize-y rounded-[4px] border border-line bg-white px-3 py-2.5 text-paragraph-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-brand focus:ring-2 focus:ring-brand/16"
                    aria-label={`Block ${index + 1} content`}
                  />
                </div>
              </article>
            ))}
          </>
        )}
      </div>
    </section>
  );
}

export function createEmptyScriptItem(): ScriptChecklistItem {
  return createItem();
}
