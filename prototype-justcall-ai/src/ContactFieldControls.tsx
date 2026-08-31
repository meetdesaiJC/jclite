import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { IconAlertTriangleFilled, IconContacts } from "@/components/Icon";
import { InputField } from "@/components/InputField";
import { useDropdownPresence } from "@/components/Dropdown/useDropdownPresence";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  CONTACT_FIELDS,
  SAMPLE_CONTACT,
  SPARSE_SAMPLE_CONTACT,
  contactFieldMeta,
  segmentFieldText,
  type ContactFieldId,
  type ContactFieldMeta,
  type ContactRecord,
  type FieldFallbacks,
} from "./contactFields";

/**
 * The three surfaces a contact field needs in the builder: a way to put one
 * in, a way to see what it becomes, and a way to say what happens when the
 * record is empty. They are here rather than in PlaybookEditor because the
 * fallbacks belong to the script as a whole and the other two belong to a
 * step — one file for the feature reads better than the feature split across
 * the editor and the page that hosts it.
 */

/* ------------------------------------------------------------------ insert */

/**
 * Sits beside the AI control on a step's wording. Icon-only for the same
 * reason that one is: the field is 3 lines tall and the two affordances share
 * its top-right corner.
 */
export function InsertFieldButton({
  disabled,
  onInsert,
  onBeforeOpen,
  className,
}: {
  disabled?: boolean;
  onInsert: (field: ContactFieldMeta) => void;
  /** Freeze the caret before focus moves to the button. */
  onBeforeOpen?: () => void;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const anchorRef = React.useRef<HTMLButtonElement>(null);
  const presence = useDropdownPresence(open && !disabled);

  return (
    <>
      <TooltipTrigger
        placement="top"
        content={<Tooltip theme="dark" arrow="bottom-center" title="Insert contact field" />}
      >
        <button
          ref={anchorRef}
          type="button"
          disabled={disabled}
          aria-label="Insert contact field"
          aria-haspopup="menu"
          aria-expanded={open}
          onMouseDown={(event) => {
            event.preventDefault();
            onBeforeOpen?.();
          }}
          onClick={() => {
            if (disabled) return;
            setOpen((current) => !current);
          }}
          className={cn(
            "flex size-7 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-secondary-bg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24 disabled:pointer-events-none disabled:opacity-40",
            open && "bg-secondary-bg text-foreground",
            className
          )}
        >
          <IconContacts size={16} />
        </button>
      </TooltipTrigger>

      {presence.mounted ? (
        <FieldMenu
          anchorRef={anchorRef}
          panelState={presence.state}
          onClose={() => setOpen(false)}
          onPick={(field) => {
            setOpen(false);
            onInsert(field);
          }}
        />
      ) : null}
    </>
  );
}

function FieldMenu({
  anchorRef,
  panelState,
  onClose,
  onPick,
}: {
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  panelState: "open" | "closed";
  onClose: () => void;
  onPick: (field: ContactFieldMeta) => void;
}) {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const [pos, setPos] = React.useState<{ top: number; left: number } | null>(null);
  const WIDTH = 216;

  const updatePos = React.useCallback(() => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    setPos({
      top: rect.bottom + 4,
      left: Math.max(8, Math.min(rect.right - WIDTH, window.innerWidth - WIDTH - 8)),
    });
  }, [anchorRef]);

  React.useLayoutEffect(updatePos, [updatePos]);

  React.useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onClose();
    };
    const onReposition = () => updatePos();
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [anchorRef, onClose, updatePos]);

  if (!pos) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="menu"
      aria-label="Insert contact field"
      data-state={panelState}
      className="dropdown-panel z-50 overflow-hidden rounded-[8px] border border-line bg-white py-1 shadow-200"
      style={{ position: "fixed", top: pos.top, left: pos.left, width: WIDTH, transformOrigin: "top right" }}
    >
      <p className="px-3 pt-1.5 pb-1 text-label-sm text-muted-foreground">
        Insert contact field
      </p>
      {CONTACT_FIELDS.map((field) => (
        <button
          key={field.id}
          type="button"
          role="menuitem"
          onClick={() => onPick(field)}
          className="dropdown-item flex w-full items-baseline justify-between gap-3 px-3 py-1.5 text-left hover:bg-secondary-bg focus-visible:bg-secondary-bg focus-visible:outline-none"
        >
          <span className="text-paragraph-sm text-foreground">{field.label}</span>
          {/* The sample, not the token: the admin is picking what the sentence
              will say, and the braces are an implementation detail they never
              have to type. */}
          <span className="truncate text-label-sm text-muted-foreground">
            {field.sample}
          </span>
        </button>
      ))}
    </div>,
    document.body
  );
}

/* ----------------------------------------------------------------- preview */

/**
 * The resolved sentence, under the field it belongs to. Values from the record
 * are marked in brand; values standing in for missing data are marked in
 * warning — the difference is the whole point of the fallback, so it has to be
 * visible without reading the two versions side by side.
 */
export function FieldPreviewLine({
  text,
  contact,
  fallbacks,
  className,
}: {
  text: string;
  contact: ContactRecord;
  fallbacks: FieldFallbacks;
  className?: string;
}) {
  const segments = segmentFieldText(text, contact, fallbacks);
  const hasUnknown = segments.some((segment) => segment.kind === "unknown");

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <p className="flex flex-wrap items-baseline gap-x-1.5 text-paragraph-sm text-muted-foreground">
        <span className="shrink-0 text-label-sm">On this call</span>
        <span className="min-w-0 text-foreground">
          “
          {segments.map((segment, index) => {
            if (segment.kind === "text") {
              return <React.Fragment key={index}>{segment.text}</React.Fragment>;
            }
            if (segment.kind === "unknown") {
              return (
                <span
                  key={index}
                  className="rounded-[3px] bg-error-subtle px-1 text-error line-through"
                  title={`${segment.name} is not a contact field`}
                >
                  {segment.raw}
                </span>
              );
            }
            // A blank resolution has nothing to mark — the sentence simply
            // closes over it, which is exactly what the agent will hear.
            if (!segment.value) return null;
            return (
              <span
                key={index}
                className={cn(
                  "rounded-[3px] px-1",
                  segment.filled
                    ? "bg-brand-subtle text-brand"
                    : "bg-warning-secondary text-warning-text"
                )}
                title={
                  segment.filled
                    ? `${segment.field.label} from the contact record`
                    : `${segment.field.label} is empty — using the fallback`
                }
              >
                {segment.value}
              </span>
            );
          })}
          ”
        </span>
      </p>
      {hasUnknown ? (
        <p className="flex items-start gap-1.5 text-label-sm text-error">
          <IconAlertTriangleFilled size={16} className="mt-px size-4 shrink-0" />
          That field doesn’t exist. Agents will hear the sentence without it —
          insert one from the list instead.
        </p>
      ) : null}
    </div>
  );
}

/* --------------------------------------------------------------- fallbacks */

/**
 * One fallback per field, for the whole script — a script that greets by first
 * name greets the same way on every step, so asking per step would be five
 * copies of one decision.
 *
 * Only the fields the script actually uses are listed. A script with no fields
 * has nothing to configure and shows nothing.
 */
export function FieldFallbacksCard({
  used,
  fallbacks,
  onChange,
  className,
}: {
  used: ContactFieldId[];
  fallbacks: FieldFallbacks;
  onChange: (next: FieldFallbacks) => void;
  className?: string;
}) {
  if (used.length === 0) return null;

  return (
    <section
      className={cn("flex flex-col gap-3 rounded-lg border border-line bg-white p-4", className)}
    >
      <div className="flex flex-col gap-1">
        <h3 className="text-label-md-semi text-foreground">Contact fields</h3>
        <p className="text-paragraph-sm text-muted-foreground">
          What agents say when the contact record is empty. Leave one blank to
          drop the words entirely.
        </p>
      </div>

      {used.map((id) => {
        const field = contactFieldMeta(id);
        const value = fallbacks[id] ?? field.defaultFallback;
        return (
          <InputField
            key={id}
            label={field.label}
            value={value}
            placeholder="Say nothing"
            clearable={false}
            onChange={(event) => onChange({ ...fallbacks, [id]: event.target.value })}
          />
        );
      })}
    </section>
  );
}

/* -------------------------------------------------------- preview contacts */

export type PreviewContactKey = "complete" | "sparse";

export const PREVIEW_CONTACTS: Record<
  PreviewContactKey,
  { label: string; record: ContactRecord }
> = {
  complete: { label: "Complete record", record: SAMPLE_CONTACT },
  sparse: { label: "Missing details", record: SPARSE_SAMPLE_CONTACT },
};
