import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "@/components/Modal";
import { Tabs, type TabItem } from "@/components/Tabs";
import { IconChevronRight, IconFile, IconPencil } from "@/components/Icon";
import { cn } from "@/lib/utils";
import {
  SALES_TEMPLATES,
  SUPPORT_TEMPLATES,
  type ScriptTemplateId,
  type TemplateCatalogItem,
} from "./scriptPlaybook";

export type { ScriptTemplateId };

export type ScriptStartChoice =
  | { type: "template"; templateId: ScriptTemplateId }
  | { type: "scratch"; method: "manual" | "upload" };

type TemplateCategory = "sales" | "support";

const CATEGORY_TABS: TabItem[] = [
  { key: "sales", label: "Sales" },
  { key: "support", label: "Support" },
];

const TEMPLATES_BY_CATEGORY: Record<TemplateCategory, TemplateCatalogItem[]> = {
  sales: SALES_TEMPLATES,
  support: SUPPORT_TEMPLATES,
};

const choiceCardClass =
  "rounded-lg border border-line bg-white text-left transition-[border-color,background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:border-brand/40 hover:bg-brand-subtle/40 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24";

function TemplateRow({
  template,
  onSelect,
}: {
  template: TemplateCatalogItem;
  onSelect: (id: ScriptTemplateId) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onSelect(template.id)}
      className={cn("flex w-full items-start gap-3 px-4 py-3", choiceCardClass)}
    >
      <span className="min-w-0 flex-1">
        <span className="block text-label-md-semi text-foreground">{template.name}</span>
        <span className="mt-0.5 block text-pretty text-paragraph-sm text-muted-foreground">
          {template.description}
        </span>
      </span>
      <IconChevronRight
        size={20}
        className="mt-0.5 size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
    </button>
  );
}

function ScratchOption({
  title,
  description,
  icon,
  onSelect,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn("flex items-start gap-3 px-4 py-3.5", choiceCardClass)}
    >
      <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-[6px] bg-secondary-bg text-foreground">
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-label-md-semi text-foreground">{title}</span>
        <span className="mt-0.5 block text-pretty text-paragraph-sm text-muted-foreground">
          {description}
        </span>
      </span>
    </button>
  );
}

export interface ScriptTemplatesModalProps {
  open: boolean;
  onClose: () => void;
  onSelect: (choice: ScriptStartChoice) => void;
}

export function ScriptTemplatesModal({
  open,
  onClose,
  onSelect,
}: ScriptTemplatesModalProps) {
  const [category, setCategory] = useState<TemplateCategory>("sales");
  const templates = TEMPLATES_BY_CATEGORY[category];

  useEffect(() => {
    if (!open) setCategory("sales");
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="What kind of conversation are you preparing agents for?"
      description="Start from a template, or create your own from scratch."
    >
      <div className="flex flex-col gap-5">
        <section>
          <div className="border-b border-line">
            <Tabs
              items={CATEGORY_TABS}
              value={category}
              onValueChange={(key) => setCategory(key as TemplateCategory)}
              aria-label="Template category"
            />
          </div>
          <div
            role="tabpanel"
            id={`${category}-templates`}
            className="mt-4 flex flex-col gap-2"
          >
            {templates.map((template) => (
              <TemplateRow
                key={template.id}
                template={template}
                onSelect={(templateId) => onSelect({ type: "template", templateId })}
              />
            ))}
          </div>
        </section>

        <section className="flex flex-col gap-2">
          <div className="px-1">
            <p className="text-label-md-semi text-foreground">Create your own</p>
            <p className="mt-0.5 text-pretty text-paragraph-sm text-muted-foreground">
              Start from scratch. AI can rephrase wording after you add a line.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <ScratchOption
              title="Add manually"
              description="Write the steps and suggested wording yourself."
              icon={<IconPencil size={20} />}
              onSelect={() => onSelect({ type: "scratch", method: "manual" })}
            />
            <ScratchOption
              title="Upload document"
              description="Import an existing script or process doc as steps."
              icon={<IconFile size={20} />}
              onSelect={() => onSelect({ type: "scratch", method: "upload" })}
            />
          </div>
        </section>
      </div>
    </Modal>
  );
}
