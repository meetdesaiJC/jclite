import { Modal } from "@/components/Modal";
import { IconCoaching } from "./LiveAgentAssistPanel";
import { GuidanceSparklesIcon } from "./GuidanceCard";

/**
 * One question before an admin starts building: what kind of help is this?
 * Scripts structure a call, Guidance handles a situation, Coaching reacts to
 * behaviour. Getting this choice right is what keeps the three from blurring.
 */

export type PlaybookKind = "script" | "guidance" | "coaching";

const CHOICES: {
  kind: PlaybookKind;
  title: string;
  description: string;
  example: string;
}[] = [
  {
    kind: "script",
    title: "Script",
    description: "Guide agents through a structured call process.",
    example: "Discovery call · Account access support",
  },
  {
    kind: "guidance",
    title: "Guidance",
    description: "Help agents handle a specific conversation situation.",
    example: "Competitor objection · Cancellation request",
  },
  {
    kind: "coaching",
    title: "Coaching",
    description: "Give agents real-time feedback on conversational behaviour.",
    example: "Overtalking · Customer frustration",
  },
];

function IconScriptGlyph() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M3.5 2.5h6l3 3v8h-9v-11ZM9.5 2.5v3h3M5.5 8h5M5.5 10.5h3"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function CreatePlaybookModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (kind: PlaybookKind) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="What do you want to create?"
      description="Playbooks are how you tell Agent Assist to handle conversations. Routine questions are already answered from Knowledge."
    >
      <ul className="flex flex-col gap-2">
        {CHOICES.map((choice) => (
          <li key={choice.kind}>
            <button
              type="button"
              onClick={() => onSelect(choice.kind)}
              className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-line bg-white p-3 text-left outline-none transition-colors hover:border-brand hover:bg-brand-subtle/30 focus-visible:ring-2 focus-visible:ring-brand/24"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-secondary-bg text-muted-foreground">
                {choice.kind === "script" ? (
                  <IconScriptGlyph />
                ) : choice.kind === "guidance" ? (
                  <GuidanceSparklesIcon size={16} />
                ) : (
                  <IconCoaching className="size-4" />
                )}
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-label-md-semi text-foreground">
                  {choice.title}
                </span>
                <span className="text-pretty text-paragraph-sm text-muted-foreground">
                  {choice.description}
                </span>
                <span className="truncate text-paragraph-sm text-disabled-fg">
                  {choice.example}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}
