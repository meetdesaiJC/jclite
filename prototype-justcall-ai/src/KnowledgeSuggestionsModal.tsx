import type { ReactNode, SVGProps } from "react";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { IconChevronUp, IconClose, IconSparkles } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/Modal";
import { IconAaKnowledge } from "./icons/AgentAssistNavIcons";
import { SEED_KNOWLEDGE_SOURCES, knowledgeFacts } from "./knowledgeData";

/**
 * "Learn more" for Knowledge suggestions.
 *
 * The nav card can only afford one line about the capability, and one line is
 * not enough to decide with: an admin who has never seen a live call cannot
 * picture what "surface relevant answers" puts in front of an agent. So the
 * explanation is a picture of the thing, not a paragraph about it — the right
 * half sketches the moment as the agent sees it (a live call, then a Knowledge
 * card arriving) using the same card, colours, and entrance the live panel
 * uses. Surrounding transcript stays schematic; the question that retrieves
 * the card, and the card itself, stay readable so the picture is a cause and
 * an effect rather than a collage. The left half answers only what the
 * picture cannot: what triggers it, what the answer looks like, and where
 * the content comes from.
 *
 * It ends on the decision it opened with, so the modal is a way to say yes
 * rather than a detour on the way back to the card.
 */

const PRODUCT_KB = SEED_KNOWLEDGE_SOURCES.find(
  (source) => source.id === "ks-product-kb"
)!;
const RETENTION_ENTRY = PRODUCT_KB.entries.find(
  (entry) => entry.id === "ke-recording-retention"
)!;

/** Same cue the live demo uses to surface this entry. */
const RETENTION_QUESTION =
  "And how long do you keep call recordings? Compliance will ask.";

export interface KnowledgeSuggestionsModalProps {
  open: boolean;
  onClose: () => void;
  /** Turns the capability on. The modal closes itself first. */
  onEnable: () => void;
}

const POINTS: Array<{ icon: ReactNode; title: string; body: string }> = [
  {
    icon: <IconSparkles size={16} />,
    title: "Answers surface automatically",
    body: "Relevant knowledge appears when the conversation calls for it.",
  },
  {
    icon: <IconAaKnowledge className="size-4" />,
    title: "Ready to say",
    body: "Clear, concise answers agents can use immediately.",
  },
  {
    icon: <IconLayers />,
    title: "Uses your existing Knowledge",
    body: "Works with the Knowledge bases your team already maintains.",
  },
];

export function KnowledgeSuggestionsModal({
  open,
  onClose,
  onEnable,
}: KnowledgeSuggestionsModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      showCloseButton={false}
      bodyClassName="p-0"
    >
      <div className="relative grid md:min-h-[640px] md:grid-cols-[minmax(0,1fr)_minmax(0,1.06fr)]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-4 top-4 z-10 flex size-8 items-center justify-center rounded-full bg-white/70 text-muted-foreground backdrop-blur-sm transition-colors hover:bg-white hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconClose size={20} />
        </button>

        <div className="flex h-full flex-col gap-8 p-8 pb-10">
          <div className="flex flex-col gap-3">
            <span className="flex size-9 items-center justify-center rounded-[8px] bg-brand/10 ring-1 ring-inset ring-brand/10">
              <IconAaKnowledge className="size-[18px] text-brand" />
            </span>
            <h2 className="mt-1 text-pretty text-heading-xxl text-foreground">
              Knowledge, right when agents need it
            </h2>
            <p className="text-pretty text-paragraph-md text-muted-foreground">
              Surface relevant answers from your Knowledge automatically during
              live calls, so agents can respond without searching or switching
              tabs.
            </p>
          </div>

          <ul className="flex flex-col gap-5">
            {POINTS.map((point) => (
              <li key={point.title} className="flex gap-3">
                <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand">
                  {point.icon}
                </span>
                <span className="min-w-0">
                  <span className="block text-label-md-semi text-foreground">
                    {point.title}
                  </span>
                  <span className="mt-0.5 block text-pretty text-paragraph-sm text-muted-foreground">
                    {point.body}
                  </span>
                </span>
              </li>
            ))}
          </ul>

          <div className="mt-auto">
            <Button
              onClick={() => {
                onClose();
                onEnable();
              }}
            >
              Enable Knowledge suggestions
            </Button>
          </div>
        </div>

        <KnowledgeSurfacingIllustration />
      </div>
    </Modal>
  );
}

/**
 * The capability, drawn as the agent sees it. Decorative — `aria-hidden`, and
 * nothing in here is focusable — because the left column already carries every
 * fact it depicts.
 *
 * The rest of the transcript is pill bars so the picture stays a sketch. The
 * question that retrieves the card, and the card copy itself, stay readable:
 * asked → surfaced. The 200ms `assist-card-enter` is staggered so the
 * question still lands before the answer does.
 */
function KnowledgeSurfacingIllustration() {
  const { summary, points } = knowledgeFacts(RETENTION_ENTRY);

  return (
    <div
      aria-hidden="true"
      className="relative isolate hidden min-h-[640px] select-none items-center overflow-hidden border-l border-line bg-[linear-gradient(202deg,var(--color-brand-subtle)_0%,#f3f7fd_44%,#ffffff_100%)] md:flex"
    >
      <div className="pointer-events-none absolute inset-0 [background-image:linear-gradient(to_right,rgba(0,76,230,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,76,230,0.05)_1px,transparent_1px)] [background-size:28px_28px]" />
      <div className="pointer-events-none absolute -right-16 top-8 size-64 rounded-full bg-brand/10 blur-3xl" />

      <div className="relative w-full py-8 pl-8">
        <div className="assist-card-enter overflow-hidden rounded-l-[12px] border border-r-0 border-line bg-white shadow-400">
          <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
            <span className="size-1.5 rounded-full bg-error" />
            <span className="text-label-xs uppercase tracking-[0.06em] text-muted-foreground">
              Live call
            </span>
            <span className="ml-auto text-label-xs tabular-nums text-muted-foreground">
              02:41
            </span>
          </div>

          <div className="flex flex-col gap-3.5 px-3.5 py-3.5 pr-6">
            <div className="flex gap-2.5">
              <Avatar
                size="sm"
                color="indigo"
                initials="PS"
                className="mt-px shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col pt-0.5">
                <p className="mb-1 truncate text-label-xs uppercase tracking-[0.06em] text-muted-foreground">
                  Priya Sharma
                </p>
                <p className="text-pretty text-paragraph-md text-foreground">
                  {RETENTION_QUESTION}
                </p>
              </div>
            </div>

            <div
              className="assist-card-enter flex items-center gap-1.5 text-label-xs uppercase tracking-[0.06em] text-brand"
              style={{ animationDelay: "180ms" }}
            >
              <IconSparkles size={16} className="size-3.5 shrink-0" />
              Surfaced from your Knowledge
            </div>

            <article
              className="assist-card-enter overflow-hidden rounded-lg border border-info-border bg-white"
              style={{ animationDelay: "260ms" }}
            >
              <div className="flex items-center gap-2 bg-info-secondary px-3 py-2">
                <IconAaKnowledge className="size-4 shrink-0 text-brand" />
                <span className="min-w-0 flex-1 truncate text-label-md font-medium text-foreground">
                  {RETENTION_ENTRY.title}
                </span>
                <IconChevronUp
                  size={16}
                  className="-mr-1 shrink-0 text-muted-foreground"
                />
              </div>
              <div className="flex flex-col gap-3 px-4 py-3">
                {summary ? (
                  <p className="text-pretty text-label-md text-foreground">
                    {summary}
                  </p>
                ) : null}
                {points.length > 0 ? (
                  <ul className="list-disc space-y-1.5 pl-5">
                    {points.map((point) => (
                      <li
                        key={point.heading}
                        className="text-pretty text-paragraph-md text-foreground marker:text-muted-foreground"
                      >
                        {point.heading}
                      </li>
                    ))}
                  </ul>
                ) : null}
                <span className="inline-flex min-w-0 max-w-full items-center text-label-md text-brand">
                  <span className="min-w-0 truncate">{PRODUCT_KB.name}</span>
                </span>
              </div>
            </article>

            {/* The payoff, and the reason the mock keeps going past the card:
                the agent answers from it without leaving the call. */}
            <div
              className="assist-card-enter flex gap-2.5"
              style={{ animationDelay: "460ms" }}
            >
              <Avatar
                size="sm"
                color="purple"
                initials="SJ"
                className="mt-px shrink-0"
              />
              <div className="flex min-w-0 flex-1 flex-col gap-2 pt-1">
                <TextBar className="h-1.5 w-10" />
                <TextBar className="w-[84%]" />
                <TextBar className="w-[52%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Static pill used in place of copy — not an animated skeleton. */
function TextBar({ className }: { className?: string }) {
  return (
    <span className={cn("block h-2 rounded-full bg-gray-300/70", className)} />
  );
}

/** Stacked sheets — "the Knowledge you already have". */
function IconLayers(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      {...props}
    >
      <path
        d="M8 1.833 1.833 5 8 8.167 14.167 5 8 1.833ZM1.833 11 8 14.167 14.167 11M1.833 8 8 11.167 14.167 8"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
