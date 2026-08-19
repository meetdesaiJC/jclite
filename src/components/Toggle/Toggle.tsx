import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Toggle — synced from Figma "Design System 2.0 / Toggle" (node 2002:117890).
 *
 * Figma exposes it as:
 *   Size    → `size` (sm / md = 32×20 / 38.4×24)
 *   Checked → `checked` / `defaultChecked` (controlled or uncontrolled)
 *   Toggle  → `controlPosition` ("start" is the control-then-label row,
 *              "end" is the label-then-control row used in settings rows)
 *
 * Renders a real `<input type="checkbox" role="switch">` — the track *is*
 * the input (styled with `appearance-none`); the knob is a decorative
 * sibling positioned from `checked`/`disabled`, which are already known in
 * JS, so no `peer-*` CSS is needed here (unlike Checkbox/Radio, Figma
 * defines no separate hover state for Toggle).
 */

// Knob insets (2px sm / 2.4px md, per Figma) are baked directly into
// `knobPosition` below, so the track itself carries no padding.
const trackSize = {
  sm: "h-5 w-8",
  md: "h-6 w-[38.4px]",
} as const;

const knobPosition = {
  sm: { off: "left-0.5", on: "left-[14px]" },
  md: { off: "left-[2.4px]", on: "left-[16.8px]" },
} as const;

const knobSize = {
  sm: "size-4",
  md: "size-[19.2px]",
} as const;

const labelTextClasses = { sm: "text-paragraph-md", md: "text-paragraph-lg" } as const;
const descriptionTextClasses = { sm: "text-paragraph-sm", md: "text-paragraph-md" } as const;
// `start` indents under the label (track + gap). `end` stays flush with the label.
const descriptionPadding = {
  start: { sm: "pl-10", md: "pl-12" },
  end: { sm: "pl-0", md: "pl-0" },
} as const;

export interface ToggleProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size" | "type" | "checked" | "defaultChecked"> {
  /** Track size. Default `"sm"`. */
  size?: "sm" | "md";
  /** Controlled checked state. */
  checked?: boolean;
  /** Initial checked state when uncontrolled. */
  defaultChecked?: boolean;
  /** Called with the next checked value on any change. */
  onCheckedChange?: (checked: boolean) => void;
  /** Label rendered next to the track. */
  label?: React.ReactNode;
  /** Helper text rendered on its own line below the label. */
  description?: React.ReactNode;
  /** Optional slot rendered after the label (e.g. an info icon with a tooltip). */
  infoIcon?: React.ReactNode;
  /** Where the track sits relative to the label. Default `"start"`. */
  controlPosition?: "start" | "end";
  /** className for the outer wrapper (only relevant when `label` or `description` is set). */
  wrapperClassName?: string;
}

export const Toggle = React.forwardRef<HTMLInputElement, ToggleProps>(
  (
    {
      className,
      wrapperClassName,
      size = "sm",
      checked,
      defaultChecked,
      onCheckedChange,
      onChange,
      disabled,
      label,
      description,
      infoIcon,
      controlPosition = "start",
      id,
      ...props
    },
    ref
  ) => {
    const isControlled = checked !== undefined;
    const [internalChecked, setInternalChecked] = React.useState(defaultChecked ?? false);
    const isChecked = isControlled ? checked : internalChecked;

    const generatedId = React.useId();
    const inputId = id ?? generatedId;

    const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!isControlled) setInternalChecked(event.target.checked);
      onChange?.(event);
      onCheckedChange?.(event.target.checked);
    };

    const isEnd = controlPosition === "end";
    const trackColorClass = disabled ? "bg-control-disabled-bg" : isChecked ? "bg-brand" : "bg-control-border";
    const knobColorClass = disabled ? "bg-line" : "bg-white";

    const track = (
      <span className={cn("relative inline-flex shrink-0", trackSize[size])}>
        <input
          ref={ref}
          id={inputId}
          type="checkbox"
          role="switch"
          checked={isChecked}
          disabled={disabled}
          onChange={handleChange}
          className={cn(
            "peer m-0 size-full cursor-pointer appearance-none rounded-full transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
            "disabled:cursor-not-allowed",
            trackColorClass,
            className
          )}
          {...props}
        />
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute top-1/2 -translate-y-1/2 rounded-full transition-all",
            knobSize[size],
            knobPosition[size][isChecked ? "on" : "off"],
            knobColorClass
          )}
        />
      </span>
    );

    if (!label && !description) {
      return track;
    }

    return (
      <div className={cn("inline-flex flex-col items-start gap-1", wrapperClassName)}>
        <div className={cn("flex items-center gap-2", isEnd && "w-full justify-between")}>
          {!isEnd && track}
          {label && (
            <span className="inline-flex shrink-0 items-center gap-1">
              <label
                htmlFor={inputId}
                className={cn(
                  "cursor-pointer select-none text-foreground",
                  labelTextClasses[size],
                  disabled && "cursor-not-allowed text-disabled-fg"
                )}
              >
                {label}
              </label>
              {infoIcon}
            </span>
          )}
          {isEnd && track}
        </div>
        {description && (
          <div className={cn("flex w-full items-center", descriptionPadding[controlPosition][size])}>
            <p className={cn("text-muted-foreground", descriptionTextClasses[size])}>{description}</p>
          </div>
        )}
      </div>
    );
  }
);
Toggle.displayName = "Toggle";
