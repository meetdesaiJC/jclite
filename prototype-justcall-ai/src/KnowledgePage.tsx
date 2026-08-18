import * as React from "react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { InputField } from "@/components/InputField";
import { Modal } from "@/components/Modal";
import { Radio } from "@/components/Radio";
import { Toggle } from "@/components/Toggle";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  IconClose,
  IconFile,
  IconSearch,
  IconSparkles,
  IconWebToDevice,
} from "@/components/Icon";
import {
  Table,
  TableBody,
  TableCell,
  TableCellText,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Table";
import { cn } from "@/lib/utils";
import faqsEmptyIllustration from "./assets/faqs-empty.png";
import { AdminPageHeader } from "./AgentAssistAdmin";
import {
  KNOWLEDGE_SOURCE_KINDS,
  KNOWLEDGE_TEAMS,
  KNOWLEDGE_USERS,
  createEmptyKnowledgeSource,
  knowledgeAudienceLabel,
  knowledgeKindMeta,
  sampleEntriesForSource,
  type KnowledgeAudience,
  type KnowledgeSourceKind,
  type KnowledgeSourceRecord,
} from "./knowledgeData";

/**
 * Knowledge admin — connect a source, say who it serves, publish. There is no
 * trigger to write and no question to enumerate: retrieval finds the answer
 * when a customer asks for it.
 */

export interface KnowledgePageProps {
  sources: KnowledgeSourceRecord[];
  onSourcesChange: (next: KnowledgeSourceRecord[]) => void;
  onBack: () => void;
}

export function KnowledgePage({
  sources,
  onSourcesChange,
  onBack,
}: KnowledgePageProps) {
  const [search, setSearch] = React.useState("");
  const [pickerOpen, setPickerOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<{
    source: KnowledgeSourceRecord;
    mode: "create" | "edit";
  } | null>(null);

  const query = search.trim().toLowerCase();
  const filtered = sources.filter(
    (source) =>
      !query ||
      source.name.toLowerCase().includes(query) ||
      source.origin.toLowerCase().includes(query) ||
      knowledgeKindMeta(source.kind).label.toLowerCase().includes(query)
  );
  const isEmpty = sources.length === 0;

  const saveSource = (next: KnowledgeSourceRecord) => {
    const exists = sources.some((source) => source.id === next.id);
    onSourcesChange(
      exists
        ? sources.map((source) => (source.id === next.id ? next : source))
        : [next, ...sources]
    );
    setEditing(null);
  };

  const patchSource = (id: string, patch: Partial<KnowledgeSourceRecord>) => {
    onSourcesChange(
      sources.map((source) =>
        source.id === id ? { ...source, ...patch, updated: "Just now" } : source
      )
    );
  };

  if (editing) {
    return (
      <KnowledgeSourcePage
        source={editing.source}
        mode={editing.mode}
        onCancel={() => setEditing(null)}
        onSave={saveSource}
      />
    );
  }

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <AdminPageHeader
        title="Knowledge"
        description="Give AI the information it needs to answer customer questions. Anything published here can be retrieved on a live call without a trigger."
        onBack={onBack}
        actions={
          <Button size="sm" onClick={() => setPickerOpen(true)}>
            Add source
          </Button>
        }
      />

      {isEmpty ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-6 pb-14">
          <div className="flex max-w-[460px] flex-col items-center gap-6 text-center">
            <img
              src={faqsEmptyIllustration}
              alt=""
              width={418}
              height={281}
              className="h-[281px] w-[418px] max-w-full object-contain"
            />
            <div className="flex flex-col gap-2">
              <p className="text-[16px] leading-6 font-semibold text-foreground">
                No knowledge sources yet
              </p>
              <p className="text-[14px] leading-5 text-muted-foreground">
                Connect a help center, upload a document, or point at your
                existing knowledge base. AI reads it and answers the routine
                questions on its own.
              </p>
            </div>
            <Button size="md" onClick={() => setPickerOpen(true)}>
              Add source
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between gap-3 px-6 py-3">
            <InputField
              placeholder="Search sources"
              leadingIcon={<IconSearch size={16} />}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              clearable={false}
              wrapperClassName="w-[280px]"
            />
            <p className="text-label-sm text-muted-foreground tabular-nums">
              {sources.filter((source) => source.status === "live" && source.useDuringCalls)
                .length}{" "}
              live on calls
            </p>
          </div>

          <div className="flex min-h-0 flex-1 flex-col overflow-auto px-6 pb-6">
            <Table className="table-fixed">
              <TableHeader className="[&_tr]:border-b-0">
                <TableRow>
                  <TableHead className="sticky top-0 z-10 w-[260px]">Source</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[160px]">Type</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[90px]">Answers</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[170px]">
                    Available to
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 w-[130px]">
                    Use on calls
                  </TableHead>
                  <TableHead className="sticky top-0 z-10 w-[110px]">Status</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[110px]">Updated</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[90px] text-center">
                    Edit
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((source) => (
                  <TableRow key={source.id} className="border-b-0">
                    <TableCell>
                      <button
                        type="button"
                        onClick={() => setEditing({ source, mode: "edit" })}
                        className="max-w-full min-w-0 bg-transparent p-0 text-left font-medium hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
                      >
                        <TableCellText
                          primary={source.name}
                          supporting={source.origin}
                        />
                      </button>
                    </TableCell>
                    <TableCell>
                      <Badge variant="blue-grey">
                        {knowledgeKindMeta(source.kind).label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-paragraph-md tabular-nums">
                      {source.entries.length}
                    </TableCell>
                    <TableCell className="truncate text-paragraph-md text-muted-foreground">
                      {knowledgeAudienceLabel(source)}
                    </TableCell>
                    <TableCell>
                      <Toggle
                        size="sm"
                        checked={source.useDuringCalls}
                        aria-label={`${source.name} available during live calls`}
                        onCheckedChange={(useDuringCalls) =>
                          patchSource(source.id, { useDuringCalls })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <StatusToggle
                        name={source.name}
                        checked={source.status === "live"}
                        disabled={source.status !== "live" && source.entries.length === 0}
                        disabledReason="Add content to this source before publishing"
                        onCheckedChange={(live) =>
                          patchSource(source.id, { status: live ? "live" : "draft" })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-paragraph-md">{source.updated}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="grey-outline"
                        size="sm"
                        onClick={() => setEditing({ source, mode: "edit" })}
                      >
                        Open
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <KnowledgeSourcePicker
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        onSelect={(kind) => {
          setPickerOpen(false);
          setEditing({ source: createEmptyKnowledgeSource(kind), mode: "create" });
        }}
      />
    </main>
  );
}

function StatusToggle({
  name,
  checked,
  disabled,
  disabledReason,
  onCheckedChange,
}: {
  name: string;
  checked: boolean;
  disabled?: boolean;
  disabledReason?: string;
  onCheckedChange: (checked: boolean) => void;
}) {
  const toggle = (
    <Toggle
      size="sm"
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      aria-label={`${name} ${checked ? "live" : "draft"}`}
    />
  );
  if (!disabled || !disabledReason) return toggle;
  return (
    <TooltipTrigger
      content={<Tooltip theme="dark" arrow="top-center" title={disabledReason} />}
    >
      <span className="inline-flex">{toggle}</span>
    </TooltipTrigger>
  );
}

function KnowledgeSourcePicker({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (kind: KnowledgeSourceKind) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Add a knowledge source"
      description="Point AI at information you already have. Nothing goes live until you publish it."
    >
      <ul className="grid grid-cols-2 gap-2">
        {KNOWLEDGE_SOURCE_KINDS.map((kind) => (
          <li key={kind.id}>
            <button
              type="button"
              onClick={() => onSelect(kind.id)}
              className="flex h-full w-full cursor-pointer flex-col gap-1 rounded-lg border border-line bg-white p-3 text-left outline-none transition-colors hover:border-brand hover:bg-brand-subtle/30 focus-visible:ring-2 focus-visible:ring-brand/24"
            >
              <span className="flex items-center gap-1.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-[4px] bg-secondary-bg text-muted-foreground">
                  {kind.input === "url" ? (
                    <IconWebToDevice size={16} className="size-3.5" />
                  ) : kind.input === "file" ? (
                    <IconFile size={16} className="size-3.5" />
                  ) : (
                    <IconSparkles size={16} className="size-3.5" />
                  )}
                </span>
                <span className="text-label-md-semi text-foreground">{kind.label}</span>
              </span>
              <span className="text-pretty text-paragraph-sm text-muted-foreground">
                {kind.description}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

const AUDIENCE_OPTIONS: { value: KnowledgeAudience; label: string; hint: string }[] = [
  { value: "everyone", label: "Everyone", hint: "Every agent on the account." },
  { value: "teams", label: "Specific teams", hint: "Pick the teams that need it." },
  { value: "users", label: "Specific users", hint: "Pick individual agents." },
];

/**
 * Source setup — name it, say who it serves, and decide whether AI may use it
 * live and whether the agent gets to see where an answer came from.
 */
function KnowledgeSourcePage({
  source,
  mode,
  onCancel,
  onSave,
}: {
  source: KnowledgeSourceRecord;
  mode: "create" | "edit";
  onCancel: () => void;
  onSave: (next: KnowledgeSourceRecord) => void;
}) {
  const [draft, setDraft] = React.useState<KnowledgeSourceRecord>(source);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const meta = knowledgeKindMeta(draft.kind);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const patch = (partial: Partial<KnowledgeSourceRecord>) =>
    setDraft((current) => ({ ...current, ...partial }));

  const needsOrigin = meta.input !== "none";
  const audienceChosen =
    draft.audience === "everyone" ||
    (draft.audience === "teams" && draft.audienceTeams.length > 0) ||
    (draft.audience === "users" && draft.audienceUsers.length > 0);
  const canPublish =
    draft.name.trim().length > 0 && (!needsOrigin || draft.origin.trim().length > 0) &&
    audienceChosen;

  const publish = () => {
    // Ingestion stands in for parsing: a published source arrives with the
    // answers AI can retrieve from it.
    const entries =
      draft.entries.length > 0
        ? draft.entries
        : sampleEntriesForSource(`${draft.name} ${draft.origin}`, draft.kind);
    onSave({
      ...draft,
      name: draft.name.trim(),
      origin: draft.origin.trim(),
      entries,
      status: "live",
      updated: "Just now",
    });
  };

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Close"
            onClick={onCancel}
            className="flex size-8 shrink-0 items-center justify-center rounded-[4px] text-foreground hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconClose size={20} />
          </button>
          <h1 className="truncate text-heading-lg text-foreground">
            {mode === "edit" ? draft.name || "Knowledge source" : `Add ${meta.label}`}
          </h1>
        </div>
        <Button size="sm" disabled={!canPublish} onClick={() => setPublishOpen(true)}>
          {mode === "edit" ? "Save" : "Publish"}
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 justify-center overflow-auto px-6 py-8">
        <div className="flex w-full max-w-[680px] flex-col gap-4">
          <SectionCard title="Source">
            <InputField
              label="Source name"
              placeholder="e.g. Sales competitive knowledge"
              value={draft.name}
              onChange={(event) => patch({ name: event.target.value })}
              helpText="An internal name so your team can tell sources apart."
              helpIcon
              clearable={false}
            />

            {meta.input === "url" ? (
              <InputField
                label="Link"
                placeholder={meta.originPlaceholder}
                value={draft.origin}
                onChange={(event) => patch({ origin: event.target.value })}
                clearable={false}
              />
            ) : null}

            {meta.input === "file" ? (
              <div className="flex flex-col gap-2">
                <span className="text-label-md text-foreground">File</span>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      patch({
                        origin: file.name,
                        name: draft.name.trim() ? draft.name : stemOf(file.name),
                      });
                    }
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const file = event.dataTransfer.files[0];
                    if (file) {
                      patch({
                        origin: file.name,
                        name: draft.name.trim() ? draft.name : stemOf(file.name),
                      });
                    }
                  }}
                  className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-brand/40 bg-brand-subtle/20 px-6 py-8 text-center transition-colors hover:border-brand hover:bg-brand-subtle/40"
                >
                  <span className="flex size-10 items-center justify-center rounded-[8px] bg-white text-brand shadow-[0_0_0_1px_rgba(0,76,230,0.12)]">
                    <IconFile size={20} />
                  </span>
                  <span className="text-label-md-semi text-foreground">
                    {draft.origin || `Upload ${meta.label}`}
                  </span>
                  <span className="text-paragraph-sm text-muted-foreground">
                    Drop a file or click to browse.
                  </span>
                </button>
              </div>
            ) : null}

            {meta.input === "none" ? (
              <p className="text-pretty text-paragraph-sm text-muted-foreground">
                {draft.kind === "justcall-kb"
                  ? "Everything already published in your JustCall knowledge base is included — no upload needed."
                  : "You'll add question and answer pairs after this source is created."}
              </p>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Available to"
            description="Only assigned agents can be helped by this source on a call."
          >
            <div className="flex flex-col gap-2">
              {AUDIENCE_OPTIONS.map((option) => (
                <Radio
                  key={option.value}
                  name="knowledge-audience"
                  label={option.label}
                  description={option.hint}
                  checked={draft.audience === option.value}
                  onCheckedChange={() => patch({ audience: option.value })}
                />
              ))}
            </div>

            {draft.audience === "teams" ? (
              <Dropdown
                label="Teams"
                placeholder="Select teams"
                searchPlaceholder="Search teams"
                appliedField="Teams"
                options={KNOWLEDGE_TEAMS}
                multiple
                searchable
                value={draft.audienceTeams}
                onValueChange={(value) =>
                  patch({ audienceTeams: Array.isArray(value) ? value : [value] })
                }
              />
            ) : null}

            {draft.audience === "users" ? (
              <Dropdown
                label="Users"
                placeholder="Select users"
                searchPlaceholder="Search users"
                appliedField="Users"
                options={KNOWLEDGE_USERS}
                multiple
                searchable
                value={draft.audienceUsers}
                onValueChange={(value) =>
                  patch({ audienceUsers: Array.isArray(value) ? value : [value] })
                }
              />
            ) : null}
          </SectionCard>

          <SectionCard title="How Agent Assist uses this">
            <Toggle
              controlPosition="end"
              label="Use during live calls"
              description="AI searches this source while the agent is on a call and surfaces the answer."
              checked={draft.useDuringCalls}
              onCheckedChange={(useDuringCalls) => patch({ useDuringCalls })}
              wrapperClassName="justify-between"
            />
            <Toggle
              controlPosition="end"
              label="Show source to agents"
              description="Agents see which source an answer came from and can open the original."
              checked={draft.showSourceToAgents}
              onCheckedChange={(showSourceToAgents) => patch({ showSourceToAgents })}
              wrapperClassName="justify-between"
            />
          </SectionCard>

          {draft.entries.length > 0 ? (
            <SectionCard
              title="What AI found here"
              description={`${draft.entries.length} answers are retrievable from this source.`}
            >
              <ul className="flex flex-col gap-2">
                {draft.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-col gap-1 rounded-lg border border-line px-3 py-2.5"
                  >
                    <p className="text-label-md-semi text-foreground">{entry.title}</p>
                    <p className="text-pretty text-paragraph-sm text-muted-foreground">
                      {entry.answer}
                    </p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </div>
      </div>

      <Modal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        size="sm"
        title={mode === "edit" ? "Save changes" : "Ready to publish"}
        description="Agents start getting answers from this source on matching questions."
        footer={
          <>
            <Button variant="grey-outline" size="sm" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={publish}>
              {mode === "edit" ? "Save" : "Publish"}
            </Button>
          </>
        }
      >
        <dl className="flex flex-col gap-3">
          <SummaryRow label="Source" value={draft.name || "Untitled source"} />
          <SummaryRow label="Type" value={meta.label} />
          <SummaryRow label="Available to" value={knowledgeAudienceLabel(draft)} />
          <SummaryRow
            label="Live calls"
            value={draft.useDuringCalls ? "AI can use this on calls" : "Off for live calls"}
          />
        </dl>
      </Modal>
    </main>
  );
}

function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-line bg-white p-4",
        className
      )}
    >
      {title ? (
        <div className="flex flex-col gap-1">
          <h2 className="text-label-md-semi text-foreground">{title}</h2>
          {description ? (
            <p className="text-pretty text-paragraph-sm text-muted-foreground">
              {description}
            </p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-label-sm text-muted-foreground">{label}</dt>
      <dd className="text-paragraph-md text-foreground">{value}</dd>
    </div>
  );
}

function stemOf(fileName: string): string {
  const stem = fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
  if (!stem) return "";
  return stem.replace(/\b\w/g, (char) => char.toUpperCase());
}

export { SectionCard as KnowledgeSectionCard };
