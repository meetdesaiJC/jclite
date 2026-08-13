import { useState, type Ref } from "react";
import {
  IconChevronRight,
  IconCircleCheckFilled,
  IconClose,
  IconFile,
} from "@/components/Icon";
import { cn } from "@/lib/utils";
import { type GuidanceResource } from "./guidanceData";
import {
  BattlecardVisual,
  GUIDANCE_AI_THEME,
  GuidanceFeedbackBar,
  type GuidanceFeedback,
} from "./GuidanceCard";
import type { GuidanceSuggestion } from "./callSimulation";

function formatQuoteTime(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export { formatQuoteTime };

export function LiveGuidanceCard({
  item,
  reduced,
  cardRef,
  onDismiss,
  onViewResource,
  className,
}: {
  item: GuidanceSuggestion;
  reduced: boolean;
  cardRef?: Ref<HTMLDivElement>;
  onDismiss: () => void;
  onViewResource: (resource: GuidanceResource) => void;
  className?: string;
}) {
  const [feedback, setFeedback] = useState<GuidanceFeedback>(null);
  const response = item.item.suggestedResponse.trim();
  const talkingPoints = item.item.talkingPoints.filter((point) => point.trim()).slice(0, 3);
  const images = item.item.resources.filter((resource) => resource.type === "image");
  const links = item.item.resources.filter((resource) => resource.type === "link");
  const hasTalking = talkingPoints.length > 0;

  return (
    <article
      ref={cardRef}
      className={cn(
        GUIDANCE_AI_THEME.card,
        !reduced && "animate-[assist-now-in_200ms_cubic-bezier(0.23,1,0.32,1)_both]",
        className
      )}
    >
      <span className={GUIDANCE_AI_THEME.rail} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pr-2 pb-1 pl-[15px]">
        <div className="min-w-0">
          <h3 className="text-pretty text-label-md-semi text-foreground">{item.item.name}</h3>
        </div>
        <button
          type="button"
          aria-label="Dismiss guidance"
          onClick={onDismiss}
          className="-mt-0.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-muted-foreground hover:bg-white/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconClose size={16} />
        </button>
      </div>

      <div className="flex flex-col gap-2 px-3 pb-2.5 pl-[15px]">
        {response ? (
          <p
            className={cn(
              "rounded-[6px] border px-2.5 py-2 text-pretty text-[13px] leading-5 font-medium text-foreground",
              GUIDANCE_AI_THEME.say
            )}
          >
            {response}
          </p>
        ) : null}

        {hasTalking ? (
          <div>
            <p className="text-[11px] leading-4 font-medium tracking-[0.04em] text-muted-foreground uppercase">
              Talking points
            </p>
            <ul className="mt-0.5 flex flex-col gap-1">
              {talkingPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-1.5 text-paragraph-sm text-foreground"
                >
                  <span
                    className={cn(
                      "mt-[6px] size-1.5 shrink-0 rounded-full",
                      GUIDANCE_AI_THEME.tick
                    )}
                  />
                  <span className="min-w-0 text-pretty">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {images.map((resource) => (
          <button
            key={resource.id}
            type="button"
            onClick={() => onViewResource(resource)}
            className="overflow-hidden rounded-[6px] border border-ai-border bg-white text-left outline-none hover:border-ai focus-visible:ring-2 focus-visible:ring-ai/24"
          >
            {resource.thumbnail ? (
              <img
                src={resource.thumbnail}
                alt={resource.name}
                className="max-h-28 w-full object-contain"
              />
            ) : (
              <BattlecardVisual className="max-h-28 w-full" />
            )}
          </button>
        ))}

        {links.map((resource) => (
          <button
            key={resource.id}
            type="button"
            onClick={() => onViewResource(resource)}
            className="flex cursor-pointer items-center gap-2 rounded-[4px] bg-white/70 py-0.5 text-left hover:bg-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ai/24"
          >
            <span className="flex size-7 shrink-0 items-center justify-center rounded-[6px] border border-line bg-white text-muted-foreground">
              <IconFile size={16} />
            </span>
            <span className="inline-flex min-w-0 items-center gap-0.5 text-label-md text-brand">
              <span className="truncate">{resource.name}</span>
              <IconChevronRight size={16} className="size-4 shrink-0" />
            </span>
          </button>
        ))}
      </div>

      <GuidanceFeedbackBar
        feedback={feedback}
        onHelpful={() =>
          setFeedback((current) => (current === "helpful" ? null : "helpful"))
        }
        onNotHelpful={() =>
          setFeedback((current) => (current === "not-helpful" ? null : "not-helpful"))
        }
        className={GUIDANCE_AI_THEME.feedback}
      />
    </article>
  );
}

export function GuidanceQueue({
  items,
  unseenIds,
  reduced,
  expanded,
  onOpen,
  onExpand,
}: {
  items: GuidanceSuggestion[];
  unseenIds: Set<string>;
  reduced: boolean;
  expanded: boolean;
  onOpen: (id: string) => void;
  onExpand: () => void;
}) {
  if (items.length === 0) return null;

  const visible = expanded || items.length <= 2 ? items : items.slice(0, 2);
  const hidden = items.length - visible.length;
  const unseenCount = items.filter((item) => unseenIds.has(item.id)).length;

  return (
    <div
      className={cn(
        "flex flex-col gap-1",
        !reduced && "animate-[assist-queue-in_160ms_cubic-bezier(0.23,1,0.32,1)_both]"
      )}
    >
      {unseenCount > 0 && items.length > 2 ? (
        <p className="px-0.5 text-[11px] leading-4 text-muted-foreground tabular-nums">
          {unseenCount} new guidance
        </p>
      ) : null}
      <ul className="overflow-hidden rounded-lg border border-line">
        {visible.map((item) => {
          const unseen = unseenIds.has(item.id);
          return (
            <li key={item.id} className="border-b border-line last:border-b-0">
              <button
                type="button"
                onClick={() => onOpen(item.id)}
                className={cn(
                  "flex w-full cursor-pointer items-center gap-2 px-3 py-2 text-left hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/24",
                  unseen &&
                    !reduced &&
                    "animate-[assist-new-row_900ms_cubic-bezier(0.23,1,0.32,1)_both]"
                )}
              >
                <span className="min-w-0 flex-1 truncate text-paragraph-sm text-foreground">
                  {item.item.name}
                </span>
                {unseen ? (
                  <span className="shrink-0 text-[11px] leading-4 font-medium text-brand">
                    New
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
      {hidden > 0 ? (
        <button
          type="button"
          onClick={onExpand}
          className="cursor-pointer self-start px-0.5 text-[11px] leading-4 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          +{hidden} more
        </button>
      ) : null}
    </div>
  );
}

export function CriticalPin({
  item,
  reduced,
  onDismiss,
}: {
  item: GuidanceSuggestion;
  reduced: boolean;
  onDismiss: () => void;
}) {
  const [feedback, setFeedback] = useState<GuidanceFeedback>(null);
  const response = item.item.suggestedResponse.trim();
  const talkingPoints = item.item.talkingPoints.filter((point) => point.trim()).slice(0, 3);

  return (
    <div
      role="alert"
      className={cn(
        GUIDANCE_AI_THEME.card,
        !reduced && "animate-[assist-now-in_180ms_cubic-bezier(0.23,1,0.32,1)_both]"
      )}
    >
      <span className={GUIDANCE_AI_THEME.rail} aria-hidden="true" />
      <div className="flex items-start justify-between gap-2 px-3 pt-2.5 pr-2 pl-[15px]">
        <p className="min-w-0 text-pretty text-label-md-semi text-foreground">
          {item.item.name}
        </p>
        <button
          type="button"
          aria-label="Dismiss guidance"
          onClick={onDismiss}
          className="-mt-0.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-muted-foreground hover:bg-white/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconClose size={16} />
        </button>
      </div>
      <div className="px-3 pb-2.5 pl-[15px]">
        {response ? (
          <p
            className={cn(
              "mt-1.5 rounded-[6px] border px-2.5 py-2 text-pretty text-[13px] leading-5 font-medium text-foreground",
              GUIDANCE_AI_THEME.say
            )}
          >
            {response}
          </p>
        ) : null}
        {talkingPoints.length > 0 ? (
          <div className="mt-1.5">
            <p className="text-[11px] leading-4 font-medium tracking-[0.04em] text-muted-foreground uppercase">
              Talking points
            </p>
            <ul className="mt-0.5 flex flex-col gap-1">
              {talkingPoints.map((point) => (
                <li
                  key={point}
                  className="flex items-start gap-1.5 text-paragraph-sm text-foreground"
                >
                  <span
                    className={cn(
                      "mt-[6px] size-1.5 shrink-0 rounded-full",
                      GUIDANCE_AI_THEME.tick
                    )}
                  />
                  <span className="min-w-0 text-pretty">{point}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
      <GuidanceFeedbackBar
        feedback={feedback}
        onHelpful={() =>
          setFeedback((current) => (current === "helpful" ? null : "helpful"))
        }
        onNotHelpful={() =>
          setFeedback((current) => (current === "not-helpful" ? null : "not-helpful"))
        }
        className={cn(GUIDANCE_AI_THEME.feedback, "pl-[12px]")}
      />
    </div>
  );
}

export function HandledNotice({
  name,
  reduced,
  onUndo,
}: {
  name: string;
  reduced: boolean;
  onUndo?: () => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-1.5 rounded-lg px-1 py-1",
        !reduced && "animate-[assist-queue-in_160ms_cubic-bezier(0.23,1,0.32,1)_both]"
      )}
    >
      <IconCircleCheckFilled size={16} className="size-4 shrink-0 text-success" />
      <p className="min-w-0 flex-1 truncate text-paragraph-sm text-muted-foreground">
        {name}
      </p>
      {onUndo ? (
        <button
          type="button"
          onClick={onUndo}
          className="shrink-0 cursor-pointer text-[11px] leading-4 text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          Undo
        </button>
      ) : null}
    </div>
  );
}

export function ResourceOverlay({
  resource,
  onClose,
}: {
  resource: GuidanceResource;
  onClose: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col bg-white">
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <p className="min-w-0 text-label-md-semi text-foreground">{resource.name}</p>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="-mr-1 flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-muted-foreground hover:bg-surface-hover hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconClose size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {resource.type === "image" ? (
          <div className="overflow-hidden rounded-[6px] border border-line bg-secondary-bg">
            {resource.thumbnail ? (
              <img
                src={resource.thumbnail}
                alt={resource.name}
                className="mx-auto w-full object-contain"
              />
            ) : (
              <BattlecardVisual className="w-full" />
            )}
          </div>
        ) : resource.url ? (
          <p className="text-paragraph-md text-foreground">
            <a
              href={resource.url}
              target="_blank"
              rel="noreferrer"
              className="text-brand hover:text-brand-hover"
            >
              {resource.url}
            </a>
          </p>
        ) : (
          <p className="text-paragraph-md text-muted-foreground">No link attached.</p>
        )}
      </div>
    </div>
  );
}
