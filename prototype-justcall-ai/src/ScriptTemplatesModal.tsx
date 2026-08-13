import * as React from "react";
import { Modal } from "@/components/Modal";
import { cn } from "@/lib/utils";

export type ScriptTemplateId =
  | "scratch"
  | "sales-discovery"
  | "support-triage"
  | "objection-handling"
  | "product-demo"
  | "retention-save"
  | "onboarding-welcome";

interface ScriptTemplate {
  id: Exclude<ScriptTemplateId, "scratch">;
  name: string;
  description: string;
}

const TEMPLATES: ScriptTemplate[] = [
  {
    id: "sales-discovery",
    name: "Sales discovery call",
    description:
      "Qualify need, uncover pain, map stakeholders, agree next steps",
  },
  {
    id: "support-triage",
    name: "Support call triage",
    description:
      "Identify issue, assess severity, route or resolve, confirm outcome",
  },
  {
    id: "objection-handling",
    name: "Objection handling",
    description:
      "Acknowledge concern, reframe value, handle price, close commitment",
  },
  {
    id: "product-demo",
    name: "Product demo walkthrough",
    description:
      "Set agenda, show key workflows, handle questions, agree next steps",
  },
  {
    id: "retention-save",
    name: "Retention & save offer",
    description:
      "Understand churn reason, reinforce value, present offer, confirm save",
  },
  {
    id: "onboarding-welcome",
    name: "Onboarding welcome call",
    description:
      "Welcome & goals, walk through setup, answer questions, book follow-up",
  },
];

function PlusIcon({ size = 28 }: { size?: number }) {
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

export interface ScriptTemplatesModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (templateId: ScriptTemplateId) => void;
}

export function ScriptTemplatesModal({
  open,
  onClose,
  onSelect,
}: ScriptTemplatesModalProps) {
  return (
    <Modal open={open} onClose={onClose} size="md" title="Templates">
      <div className="flex flex-col gap-3">
        <div className="grid auto-rows-fr grid-cols-1 gap-3 sm:grid-cols-2">
          {TEMPLATES.map((template) => (
            <button
              type="button"
              key={template.id}
              onClick={() => onSelect(template.id)}
              className={cn(
                "flex h-full min-h-[108px] flex-col items-start justify-start gap-1.5 rounded-lg border border-line bg-white p-4 text-left",
                "transition-colors hover:border-brand/40 hover:bg-secondary-bg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
              )}
            >
              <span className="text-label-md-semi text-foreground">
                {template.name}
              </span>
              <span className="text-paragraph-sm text-muted-foreground">
                {template.description}
              </span>
            </button>
          ))}
        </div>

        <div className="relative flex items-center">
          <div className="h-px flex-1 bg-line" />
          <span className="px-3 text-label-sm text-muted-foreground">OR</span>
          <div className="h-px flex-1 bg-line" />
        </div>

        <button
          type="button"
          onClick={() => onSelect("scratch")}
          className={cn(
            "flex min-h-[56px] flex-row items-center justify-center gap-2 rounded-lg border border-dashed border-brand bg-brand-subtle px-4 py-3 text-center",
            "transition-colors hover:border-brand-hover hover:bg-blue-200/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          )}
        >
          <span className="text-brand">
            <PlusIcon size={20} />
          </span>
          <span className="text-label-md text-brand">Start from scratch</span>
        </button>
      </div>
    </Modal>
  );
}
