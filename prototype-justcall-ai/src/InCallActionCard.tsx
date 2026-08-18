import { IconAaActions } from "./icons/AgentAssistNavIcons";
import { cn } from "@/lib/utils";

export function ActionReviewField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-label-sm text-muted-foreground">{label}</dt>
      <dd className="text-pretty text-paragraph-md text-foreground">{value}</dd>
    </div>
  );
}

/**
 * Suggested-state Action card — the same surface the agent sees mid-call.
 * Setup preview renders this statically; the live panel wires `onReview`.
 */
export function InCallActionSuggestionCard({
  title,
  property,
  value,
  recordLabel,
  recordValue,
  busy = false,
  onReview,
  className,
}: {
  title: string;
  property: string;
  value: string;
  recordLabel: string;
  recordValue: string;
  busy?: boolean;
  onReview?: () => void;
  className?: string;
}) {
  const cta = busy ? "Working…" : "Review action";

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 rounded-lg border border-line bg-white px-3 py-2",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <IconAaActions className="size-4 shrink-0 text-foreground" />
        <p className="min-w-0 flex-1 text-pretty text-label-md font-medium text-foreground">
          {title}
        </p>
        {onReview ? (
          <button
            type="button"
            disabled={busy}
            onClick={onReview}
            className="-mr-1 inline-flex h-7 shrink-0 cursor-pointer items-center rounded-[4px] px-2 text-label-sm font-medium text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24 disabled:cursor-default disabled:opacity-60"
          >
            {cta}
          </button>
        ) : (
          <span className="-mr-1 inline-flex h-7 shrink-0 items-center rounded-[4px] px-2 text-label-sm font-medium text-brand">
            {cta}
          </span>
        )}
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-6">
        <ActionReviewField label={property} value={value} />
        <ActionReviewField label={recordLabel} value={recordValue} />
      </dl>
    </div>
  );
}
