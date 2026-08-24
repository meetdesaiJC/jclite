import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * FeedbackThumbs — a two-button up/down vote.
 *
 * The whole point of this control is that it costs one tap and no thought.
 * Anywhere we want to know whether something landed — an AI suggestion, the
 * audio on a call — the question has to be answerable without opening a form,
 * or nobody answers it. So: no comment box, no submit, no confirmation dialog.
 * The filled thumb is the receipt.
 *
 * It is fully controlled. The parent owns the vote because the vote is the
 * parent's data — it gets logged, it survives a re-render, and in most places
 * it arrives from the server already set.
 *
 * ── Motion ─────────────────────────────────────────────────────────────
 * The glyph presses in and back on every click, including a click that only
 * repeats an existing vote. That is deliberate: a vote you have already cast
 * is the case where nothing else on screen changes, so without the press the
 * control looks broken. The animation is re-triggered by remounting the glyph
 * under a bumped key — `animation-name` alone won't restart a running one.
 * The keyframes live on `.thumb-press` in base.css, at `base` with
 * `ease-standard`, and go away under reduced motion.
 */

export type FeedbackVote = "up" | "down" | null;

const thumbButton = cva(
  "inline-flex cursor-pointer items-center justify-center outline-none " +
    "transition-colors duration-base",
  {
    variants: {
      tone: {
        // On a card or a white pane.
        light:
          "text-muted-foreground hover:bg-surface-hover hover:text-foreground " +
          "focus-visible:ring-2 focus-visible:ring-brand/24",
        // On the dialer's dark chrome, where the semantic greys have no
        // contrast — the surface tints itself instead of taking a fill.
        dark:
          "text-white/70 hover:bg-white/10 hover:text-white " +
          "focus-visible:ring-2 focus-visible:ring-white/40",
      },
      size: {
        sm: "size-7",
        md: "size-8",
      },
      shape: {
        pill: "rounded-full",
        rounded: "rounded-md",
      },
      selected: { true: "", false: "" },
    },
    compoundVariants: [
      {
        tone: "light",
        selected: true,
        // Hover is pinned to the selected fill so re-hovering the answer you
        // already gave doesn't read as un-selecting it.
        class: "bg-brand-subtle text-brand hover:bg-brand-subtle hover:text-brand",
      },
      {
        tone: "dark",
        selected: true,
        class: "bg-white/15 text-white hover:bg-white/15 hover:text-white",
      },
    ],
    defaultVariants: { tone: "light", size: "sm", shape: "pill" },
  }
);

/*
 * The cva output is run through `cn()` at the call sites below rather than
 * used raw. The selected compound variant re-states `text-*` and `bg-*` that
 * the tone base already set, and two utilities in the same group are decided
 * by stylesheet order, not by the order they appear in `class`. Without the
 * merge the selected state silently loses to the resting one.
 */

/** Glyph box sizes, one step down from the button so the fill has a margin. */
const GLYPH: Record<FeedbackThumbsSize, number> = { sm: 14, md: 16 };

export type FeedbackThumbsTone = "light" | "dark";
export type FeedbackThumbsSize = "sm" | "md";
export type FeedbackThumbsShape = "pill" | "rounded";

/**
 * The variant props are spelled out rather than lifted off `VariantProps`:
 * cva types every variant as possibly-null, and `size` indexes GLYPH.
 */
export interface FeedbackThumbsProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  tone?: FeedbackThumbsTone;
  size?: FeedbackThumbsSize;
  shape?: FeedbackThumbsShape;
  /** The vote on record. `null` means unanswered. */
  value: FeedbackVote;
  /**
   * Fires with the new vote. Clicking the selected thumb clears it to `null`
   * unless `clearable` is off — a mis-tap should be undoable in the same
   * gesture that caused it.
   */
  onChange: (vote: FeedbackVote) => void;
  clearable?: boolean;
  upLabel?: string;
  downLabel?: string;
}

export function FeedbackThumbs({
  value,
  onChange,
  tone = "light",
  size = "sm",
  shape = "pill",
  clearable = true,
  upLabel = "Helpful",
  downLabel = "Not helpful",
  className,
  ...props
}: FeedbackThumbsProps) {
  // One counter per thumb rather than one shared: pressing up and then down
  // has to animate the thumb that was actually clicked, not both.
  const [upPress, setUpPress] = React.useState(0);
  const [downPress, setDownPress] = React.useState(0);

  const vote = (next: Exclude<FeedbackVote, null>) => {
    onChange(clearable && value === next ? null : next);
  };

  return (
    <div className={cn("flex items-center gap-1", className)} {...props}>
      <button
        type="button"
        aria-label={upLabel}
        aria-pressed={value === "up"}
        onClick={() => {
          setUpPress((current) => current + 1);
          vote("up");
        }}
        className={cn(thumbButton({ tone, size, shape, selected: value === "up" }))}
      >
        <span
          key={upPress}
          className={cn("inline-flex", upPress > 0 && "thumb-press")}
        >
          <ThumbUpIcon size={GLYPH[size]} filled={value === "up"} />
        </span>
      </button>

      <button
        type="button"
        aria-label={downLabel}
        aria-pressed={value === "down"}
        onClick={() => {
          setDownPress((current) => current + 1);
          vote("down");
        }}
        className={cn(
          thumbButton({ tone, size, shape, selected: value === "down" })
        )}
      >
        <span
          key={downPress}
          className={cn("inline-flex", downPress > 0 && "thumb-press")}
        >
          <ThumbDownIcon size={GLYPH[size]} filled={value === "down"} />
        </span>
      </button>
    </div>
  );
}

/**
 * The thumbs are drawn here rather than imported from `@/components/Icon`
 * because the Figma icon library carries no thumb yet, and because these need
 * a filled state — the generated set is stroke-only, so a selected vote would
 * have nothing to change into. Same 16-unit grid and `currentColor` stroke as
 * the library, so they sit correctly beside generated icons. Replace both with
 * generated icons once the library ships them.
 */
function ThumbUpIcon({ size, filled }: { size: number; filled: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4.5 7.5v6H3.25A1.25 1.25 0 0 1 2 12.25v-3.5A1.25 1.25 0 0 1 3.25 7.5H4.5Zm0 0 2.1-4.4A1.6 1.6 0 0 1 8.05 2.2c.7 0 1.2.6 1.07 1.28L8.75 5.5H12.2a1.8 1.8 0 0 1 1.76 2.18l-.7 3.2A2 2 0 0 1 11.3 12.5H4.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ThumbDownIcon({ size, filled }: { size: number; filled: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4.5 8.5v-6H3.25A1.25 1.25 0 0 0 2 3.75v3.5A1.25 1.25 0 0 0 3.25 8.5H4.5Zm0 0 2.1 4.4a1.6 1.6 0 0 0 1.45.9c.7 0 1.2-.6 1.07-1.28L8.75 10.5H12.2a1.8 1.8 0 0 0 1.76-2.18l-.7-3.2A2 2 0 0 0 11.3 3.5H4.5Z"
        fill={filled ? "currentColor" : "none"}
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
