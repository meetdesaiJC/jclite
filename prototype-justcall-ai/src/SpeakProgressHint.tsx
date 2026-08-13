import { IconVoice } from "@/components/Icon";
import { cn } from "@/lib/utils";

export function SpeakProgressHint({ className }: { className?: string }) {
  return (
    <p
      role="note"
      className={cn(
        "flex items-start gap-2 text-pretty text-paragraph-sm text-muted-foreground",
        className
      )}
    >
      <IconVoice size={20} className="mt-px size-5 shrink-0 text-info" aria-hidden="true" />
      <span>
        Speak to continue. Anything you say marks the current step complete.
      </span>
    </p>
  );
}
