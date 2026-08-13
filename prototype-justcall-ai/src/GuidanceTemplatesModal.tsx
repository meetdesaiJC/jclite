import { Modal } from "@/components/Modal";
import { cn } from "@/lib/utils";
import {
  GUIDANCE_TEMPLATES,
  type GuidanceTemplateId,
} from "./guidanceData";

export type GuidanceStartChoice =
  | { type: "template"; templateId: GuidanceTemplateId }
  | { type: "scratch" };

const choiceCardClass =
  "rounded-lg border border-line bg-white text-left transition-[border-color,background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-brand/40 hover:bg-brand-subtle/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24";

function PlusIcon({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

export interface GuidanceTemplatesModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (choice: GuidanceStartChoice) => void;
}

export function GuidanceTemplatesModal({
  open,
  onClose,
  onSelect,
}: GuidanceTemplatesModalProps) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="What would you like to help agents with?"
      description="Choose a starting point. You can customize everything later."
    >
      <div className="flex flex-col gap-5">
        <div className="grid grid-cols-2 items-stretch gap-2">
          {GUIDANCE_TEMPLATES.map((template) => (
            <button
              key={template.id}
              type="button"
              onClick={() =>
                onSelect({ type: "template", templateId: template.id })
              }
              className={cn("flex h-full flex-col gap-1 px-3.5 py-3", choiceCardClass)}
            >
              <span className="text-balance text-label-md-semi text-foreground">
                {template.name}
              </span>
              <span className="text-pretty text-paragraph-sm text-muted-foreground">
                {template.description}
              </span>
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3" role="separator" aria-label="or">
          <span className="h-px flex-1 bg-line" />
          <span className="text-label-sm tracking-[0.12em] text-muted-foreground">
            OR
          </span>
          <span className="h-px flex-1 bg-line" />
        </div>

        <button
          type="button"
          onClick={() => onSelect({ type: "scratch" })}
          className={cn("flex items-start gap-3 px-4 py-3.5", choiceCardClass)}
        >
          <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[6px] bg-secondary-bg text-foreground">
            <PlusIcon size={20} />
          </span>
          <span className="min-w-0">
            <span className="block text-label-md-semi text-foreground">
              Start from scratch
            </span>
            <span className="mt-0.5 block text-pretty text-paragraph-sm text-muted-foreground">
              Write your own trigger, response, and talking points.
            </span>
          </span>
        </button>
      </div>
    </Modal>
  );
}
