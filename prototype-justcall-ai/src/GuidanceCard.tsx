import * as React from "react";
import { IconClose } from "@/components/Icon";
import { cn } from "@/lib/utils";
import {
  GUIDANCE_KIND_META,
  inferGuidanceKind,
  type GuidanceItem,
  type GuidanceKind,
  type GuidanceResource,
} from "./guidanceData";
import aircallBattlecard from "./assets/aircall-battlecard.png";

function ThumbUpIcon({ size = 16, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
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

function ThumbDownIcon({ size = 16, filled = false }: { size?: number; filled?: boolean }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
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

export function BattlecardVisual({ className }: { className?: string }) {
  return (
    <img
      src={aircallBattlecard}
      alt="JustCall compared with Aircall"
      className={cn("object-contain object-top", className)}
    />
  );
}

export type GuidanceFeedback = "helpful" | "not-helpful" | null;

export function GuidanceFeedbackBar({
  feedback,
  onHelpful,
  onNotHelpful,
  className,
}: {
  feedback: GuidanceFeedback;
  onHelpful?: () => void;
  onNotHelpful?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 border-t border-line/80 px-2 py-1.5 pl-[12px]",
        className
      )}
    >
      <button
        type="button"
        aria-pressed={feedback === "helpful"}
        onClick={onHelpful}
        className={cn(
          "inline-flex h-7 cursor-pointer items-center gap-1 rounded-[4px] px-2 text-paragraph-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
          feedback === "helpful"
            ? "bg-secondary-bg text-foreground"
            : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
        )}
      >
        <ThumbUpIcon size={14} filled={feedback === "helpful"} />
        Helpful
      </button>
      <button
        type="button"
        aria-pressed={feedback === "not-helpful"}
        onClick={onNotHelpful}
        className={cn(
          "inline-flex h-7 cursor-pointer items-center gap-1 rounded-[4px] px-2 text-paragraph-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
          feedback === "not-helpful"
            ? "bg-secondary-bg text-foreground"
            : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
        )}
      >
        <ThumbDownIcon size={14} filled={feedback === "not-helpful"} />
        Not helpful
      </button>
    </div>
  );
}

export interface GuidanceCardProps {
  item: GuidanceItem;
  feedback?: GuidanceFeedback;
  onHelpful?: () => void;
  onNotHelpful?: () => void;
  onDismiss?: () => void;
  onViewResource?: (resource: GuidanceResource) => void;
  /** Hide agent actions — used only if a static preview is needed. */
  showActions?: boolean;
  className?: string;
}

/** Shared AI tone — every guidance card uses the same wash and accent. */
export const GUIDANCE_AI_THEME = {
  card: "relative overflow-hidden rounded-lg border border-ai-border bg-ai-surface",
  rail: "absolute inset-y-0 left-0 w-[3px] bg-ai",
  badge: "bg-white/80 text-ai",
  tick: "bg-ai",
  say: "border-ai-border bg-white",
  feedback: "border-ai-border/70 bg-transparent",
} as const;

export function GuidanceKindMark({ kind }: { kind: GuidanceKind }) {
  const common = "shrink-0";
  if (kind === "competitor") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={common} aria-hidden="true">
        <path d="M2 8.5 8.5 2M3.5 2H8.5V7M9.5 3.5 3.5 9.5M8 10H3.5V5.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "objection") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={common} aria-hidden="true">
        <path d="M6 2.2 10.2 9.5H1.8L6 2.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M6 5.2v2M6 8.6h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "policy") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={common} aria-hidden="true">
        <path d="M3.5 2h3.2L8.5 3.8V10H3.5V2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M4.7 5.4h2.6M4.7 7.2h2.6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  if (kind === "fix") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={common} aria-hidden="true">
        <path d="M7.4 3.2a2.2 2.2 0 0 0-3.1 3.1L2 8.6 3.4 10l2.3-2.3a2.2 2.2 0 0 0 3.1-3.1L7.4 6 6 4.6l1.4-1.4Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      </svg>
    );
  }
  if (kind === "compliance") {
    return (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={common} aria-hidden="true">
        <path d="M6 2.2 10.2 9.5H1.8L6 2.2Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
        <path d="M6 5.2v2M6 8.6h.01" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={common} aria-hidden="true">
      <path d="M4.2 2.5h3.6v3.6H4.2V2.5ZM2.5 6.2H6v3.3H2.5V6.2ZM6.4 6.8H9.5V9.5H6.4V6.8Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  );
}

function ExpandHint() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9.5 2.5H13.5V6.5M13.5 2.5 9 7M6.5 13.5H2.5V9.5M2.5 13.5 7 9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ExternalLinkIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9.5 3H13.5V7M13.5 3 7.5 9M6.5 4.5H4.5A1.5 1.5 0 0 0 3 6v6.5A1.5 1.5 0 0 0 4.5 14H11a1.5 1.5 0 0 0 1.5-1.5V9.5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function GuidanceResourceLink({
  resource,
  className,
}: {
  resource: GuidanceResource;
  className?: string;
}) {
  const content = (
    <>
      <span className="min-w-0 truncate">{resource.name}</span>
      <span className="shrink-0">
        <ExternalLinkIcon size={13} />
      </span>
    </>
  );

  const linkClass = cn(
    "inline-flex min-w-0 max-w-full items-center gap-1 text-label-md text-brand",
    "hover:text-brand-hover hover:underline hover:underline-offset-2",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24 focus-visible:ring-offset-1",
    className
  );

  if (!resource.url) {
    return <span className={linkClass}>{content}</span>;
  }

  return (
    <a
      href={resource.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(linkClass, "cursor-pointer")}
    >
      {content}
    </a>
  );
}

function ResourceImage({
  resource,
  compact,
  onView,
}: {
  resource: GuidanceResource;
  compact?: boolean;
  onView?: (resource: GuidanceResource) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onView?.(resource)}
      aria-label={`Expand ${resource.name}`}
      className={cn(
        "group relative block w-full overflow-hidden rounded-[6px] border border-line bg-white text-left outline-none",
        "hover:border-control-border focus-visible:ring-2 focus-visible:ring-brand/24",
        "active:scale-[0.99] motion-safe:transition-[border-color,transform] motion-safe:duration-150 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]"
      )}
    >
      {resource.thumbnail ? (
        <img
          src={resource.thumbnail}
          alt={resource.name}
          className={cn(
            "w-full object-contain",
            compact ? "max-h-28" : "max-h-44"
          )}
        />
      ) : (
        <BattlecardVisual
          className={cn("w-full", compact ? "max-h-28" : "max-h-44")}
        />
      )}
      <span
        className="pointer-events-none absolute inset-0 rounded-[6px] shadow-[inset_0_0_0_1px_rgba(0,0,0,0.08)]"
        aria-hidden="true"
      />
      <span
        className={cn(
          "pointer-events-none absolute right-1.5 bottom-1.5 inline-flex size-7 items-center justify-center rounded-[4px] bg-white/92 text-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.06)]",
          "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100",
          "motion-safe:transition-opacity motion-safe:duration-150"
        )}
        aria-hidden="true"
      >
        <ExpandHint />
      </span>
    </button>
  );
}

export function GuidanceKindDot({
  kind,
  className,
}: {
  kind: GuidanceKind;
  className?: string;
}) {
  return (
    <span
      className={cn("size-2 shrink-0 rounded-full", GUIDANCE_AI_THEME.tick, className)}
      aria-hidden="true"
    />
  );
}

export function GuidanceCard({
  item,
  feedback = null,
  onHelpful,
  onNotHelpful,
  onDismiss,
  onViewResource,
  showActions = true,
  className,
}: GuidanceCardProps) {
  const kind = inferGuidanceKind(item);
  const theme = GUIDANCE_AI_THEME;
  const meta = GUIDANCE_KIND_META[kind];
  const talkingPoints = item.talkingPoints.filter((point) => point.trim()).slice(0, 4);
  const response = item.suggestedResponse.trim();
  const images = item.resources.filter((resource) => resource.type === "image");
  const links = item.resources.filter((resource) => resource.type === "link");

  return (
    <article className={cn(theme.card, className)}>
      <span className={theme.rail} aria-hidden="true" />

      <div className="flex items-start justify-between gap-2 py-3 pr-2 pl-[15px]">
        <div className="min-w-0">
          <span
            className={cn(
              "inline-flex h-5 items-center gap-1 rounded-full px-1.5 text-[11px] leading-4 font-medium",
              theme.badge
            )}
          >
            <GuidanceKindMark kind={kind} />
            {meta.label}
          </span>
          <h3 className="mt-1.5 min-w-0 text-pretty text-label-md-semi text-foreground">
            {item.name}
          </h3>
        </div>
        {showActions && onDismiss ? (
          <button
            type="button"
            aria-label="Dismiss guidance"
            onClick={onDismiss}
            className="-mt-0.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-muted-foreground hover:bg-white/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconClose size={16} />
          </button>
        ) : null}
      </div>

      <div className="flex flex-col gap-2.5 px-3 pb-3 pl-[15px]">
        {response ? (
          <p
            className={cn(
              "rounded-[6px] border px-2.5 py-2 text-pretty text-paragraph-sm font-medium text-foreground",
              theme.say
            )}
          >
            {response}
          </p>
        ) : null}

        {talkingPoints.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="text-[11px] leading-4 font-medium tracking-[0.04em] text-muted-foreground uppercase">
              Talking points
            </p>
            <ul className="flex flex-col gap-1">
              {talkingPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-1.5 text-paragraph-sm text-foreground"
                >
                  <span className={cn("mt-[6px] size-1.5 shrink-0 rounded-full", theme.tick)} />
                  <span className="min-w-0">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {images.length > 0 ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] leading-4 font-medium tracking-[0.04em] text-muted-foreground uppercase">
              {images.length === 1 ? "Attached image" : "Attached images"}
            </p>
            <div
              className={cn(
                "grid gap-2",
                images.length > 1 ? "grid-cols-2" : "grid-cols-1"
              )}
            >
              {images.map((resource) => (
                <ResourceImage
                  key={resource.id}
                  resource={resource}
                  compact={images.length > 1}
                  onView={onViewResource}
                />
              ))}
            </div>
          </div>
        ) : null}

        {links.map((resource) => (
          <GuidanceResourceLink key={resource.id} resource={resource} />
        ))}
      </div>

      {showActions ? (
        <GuidanceFeedbackBar
          feedback={feedback}
          onHelpful={onHelpful}
          onNotHelpful={onNotHelpful}
          className={theme.feedback}
        />
      ) : null}
    </article>
  );
}
