import { useState, type Ref } from "react";
import { IconChevronRight, IconCircleCheckFilled, IconClose } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { type GuidanceResource } from "./guidanceData";
import {
  BattlecardVisual,
  GUIDANCE_AI_THEME,
  GuidanceAiHeader,
  GuidanceFeedbackBar,
  GuidanceResourceLink,
  GuidanceSparklesIcon,
  GuidanceResourcePreview,
  GuidanceSuggestedResponse,
  GuidanceTalkingPoints,
  type GuidanceFeedback,
} from "./GuidanceCard";
import type { GuidanceSuggestion } from "./callSimulation";

function DismissGuidanceButton({ onDismiss }: { onDismiss: () => void }) {
  return (
    <button
      type="button"
      aria-label="Dismiss guidance"
      onClick={(event) => {
        event.stopPropagation();
        onDismiss();
      }}
      className="-mt-0.5 flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-[4px] text-muted-foreground hover:bg-white/70 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
    >
      <IconClose size={16} />
    </button>
  );
}

export function LiveGuidanceCard({
  item,
  reduced,
  cardRef,
  expanded = true,
  arriving = false,
  exiting = false,
  attention = false,
  onExpand,
  onDismiss,
  onViewResource,
  className,
}: {
  item: GuidanceSuggestion;
  reduced: boolean;
  cardRef?: Ref<HTMLDivElement>;
  expanded?: boolean;
  arriving?: boolean;
  exiting?: boolean;
  attention?: boolean;
  onExpand?: () => void;
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
  const pulse = !reduced && attention && !exiting;

  return (
    <article
      ref={cardRef}
      role={item.priority === "critical" ? "alert" : undefined}
      className={cn(
        GUIDANCE_AI_THEME.card,
        !reduced && arriving && !exiting && "assist-card-enter",
        !reduced && exiting && "assist-card-exit",
        pulse && "assist-card-attention",
        className
      )}
    >
      {expanded ? (
        <GuidanceAiHeader
          title={item.item.name}
          onDismiss={onDismiss}
          className={pulse ? "assist-header-attention" : undefined}
        />
      ) : (
        <div className="guidance-ai-header flex items-center gap-0.5 pr-1 pl-3">
          <button
            type="button"
            aria-expanded={false}
            onClick={onExpand}
            className="flex min-h-9 min-w-0 flex-1 cursor-pointer items-center gap-1 py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/24"
          >
            <GuidanceSparklesIcon className="size-4 shrink-0" />
            <span className="guidance-ai-title min-w-0 flex-1 truncate text-label-sm font-medium">
              {item.item.name}
            </span>
            <IconChevronRight
              size={16}
              className="size-4 shrink-0 text-muted-foreground"
            />
          </button>
          <DismissGuidanceButton onDismiss={onDismiss} />
        </div>
      )}

      <div
        className={cn(
          "assist-card-body",
          expanded ? "assist-card-body-open" : "assist-card-body-closed"
        )}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex flex-col gap-4 bg-white px-4 pt-2 pb-4">
            {response ? <GuidanceSuggestedResponse text={response} /> : null}

            {hasTalking ? <GuidanceTalkingPoints points={talkingPoints} /> : null}

            {images.map((resource) => (
              <GuidanceResourcePreview
                key={resource.id}
                resource={resource}
                onView={onViewResource}
              />
            ))}

            {links.map((resource) => (
              <GuidanceResourceLink key={resource.id} resource={resource} />
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
        </div>
      </div>
    </article>
  );
}

export function InCallGuidanceSlot({
  item,
  reduced,
  expanded,
  arriving,
  exiting,
  attention,
  onExpand,
  onDismiss,
  onViewResource,
  onEngage,
  onDisengage,
  cardRef,
}: {
  item: GuidanceSuggestion;
  reduced: boolean;
  expanded: boolean;
  arriving: boolean;
  exiting: boolean;
  attention: boolean;
  onExpand: () => void;
  onDismiss: () => void;
  onViewResource: (resource: GuidanceResource) => void;
  onEngage: () => void;
  onDisengage?: () => void;
  cardRef?: Ref<HTMLDivElement>;
}) {
  return (
    <div
      ref={cardRef}
      className={cn(
        !reduced && arriving && !exiting && "assist-space-in",
        !reduced && exiting && "assist-space-out",
        (reduced || (!arriving && !exiting)) && "grid grid-rows-[1fr]"
      )}
      onPointerEnter={onEngage}
      onPointerLeave={onDisengage}
      onFocusCapture={onEngage}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="py-1.5">
          <LiveGuidanceCard
            item={item}
            reduced={reduced}
            expanded={expanded}
            arriving={arriving}
            exiting={exiting}
            attention={attention}
            onExpand={onExpand}
            onDismiss={onDismiss}
            onViewResource={onViewResource}
          />
        </div>
      </div>
    </div>
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
        !reduced && "assist-card-enter"
      )}
    >
      <GuidanceAiHeader title={item.item.name} onDismiss={onDismiss} />
      <div className="flex flex-col gap-4 bg-white px-4 pt-2 pb-4">
        {response ? <GuidanceSuggestedResponse text={response} /> : null}
        <GuidanceTalkingPoints points={talkingPoints} />
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
        {resource.battlecard ? (
          <BattlecardVisual data={resource.battlecard} className="w-full" />
        ) : (
          <div className="overflow-hidden rounded-md border border-line bg-secondary-bg">
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
        )}
      </div>
    </div>
  );
}
