import * as React from "react";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { IconCheck, IconClose, IconPencil } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { PlaybookEditor } from "./PlaybookEditor";
import { ScriptPreviewModal } from "./ScriptTestPanel";
import { ScriptUploadWizard } from "./ScriptUploadWizard";
import {
  countSteps,
  createBlankPlaybook,
  createPlaybookFromTemplate,
  SCRIPT_TEAM_MEMBERS,
  SCRIPT_USER_GROUPS,
  type ScriptPlaybook,
  type ScriptTemplateId,
} from "./scriptPlaybook";

export type BuilderLaunch =
  | { type: "blank" }
  | { type: "upload" }
  | { type: "template"; templateId: ScriptTemplateId }
  | { type: "edit"; playbook: ScriptPlaybook };

type BuilderPhase = "upload" | "edit";

export interface ScriptBuilderPageProps {
  launch: BuilderLaunch;
  onClose: () => void;
  onPublish: (playbook: ScriptPlaybook) => void;
}

export function ScriptBuilderPage({ launch, onClose, onPublish }: ScriptBuilderPageProps) {
  const [phase, setPhase] = React.useState<BuilderPhase>(
    launch.type === "upload" ? "upload" : "edit"
  );
  const [playbook, setPlaybook] = React.useState<ScriptPlaybook | null>(() => {
    if (launch.type === "edit") return launch.playbook;
    if (launch.type === "template") return createPlaybookFromTemplate(launch.templateId);
    if (launch.type === "blank") return createBlankPlaybook();
    return null;
  });
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const canPublish = Boolean(playbook && playbook.stages.some((stage) => stage.steps.length > 0));
  const stepCount = playbook ? countSteps(playbook) : 0;

  const updatePlaybook = (patch: Partial<ScriptPlaybook>) => {
    setPlaybook((current) => (current ? { ...current, ...patch } : current));
  };

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-6">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-[4px] text-foreground hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconClose size={20} />
          </button>
          {phase === "edit" && playbook ? (
            <HeaderEditableTitle
              value={playbook.name}
              onChange={(name) => setPlaybook({ ...playbook, name })}
            />
          ) : (
            <p className="min-w-0 truncate text-heading-lg text-foreground">Create a script</p>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {phase === "edit" ? (
            <Button
              variant="grey-outline"
              size="sm"
              onClick={() => setPreviewOpen(true)}
              disabled={!playbook}
            >
              Preview
            </Button>
          ) : null}
          {phase === "edit" ? (
            <Button
              size="sm"
              disabled={!canPublish}
              onClick={() => setPublishOpen(true)}
            >
              Publish
            </Button>
          ) : null}
        </div>
      </header>

      {phase === "upload" ? (
        <ScriptUploadWizard
          onCancel={onClose}
          onImport={(next) => {
            setPlaybook(next);
            setPhase("edit");
          }}
        />
      ) : null}

      {phase === "edit" && playbook ? (
        <div className="flex min-h-0 flex-1 gap-6 overflow-hidden bg-white px-6 py-6">
          <aside className="flex w-[300px] shrink-0 flex-col">
            <div className="flex flex-col gap-4 rounded-lg border border-line bg-white p-4">
              <p className="text-label-md-semi text-foreground">Assign this script</p>
              <Dropdown
                label="Assign team members"
                placeholder="Search team members"
                searchPlaceholder="Search team members"
                options={SCRIPT_TEAM_MEMBERS}
                multiple
                searchable
                maxVisibleTags={1}
                value={playbook.assignedMembers}
                onValueChange={(value) =>
                  updatePlaybook({
                    assignedMembers: Array.isArray(value) ? value : [value],
                  })
                }
              />
              <Dropdown
                label="Assign user groups"
                placeholder="Search user groups"
                searchPlaceholder="Search user groups"
                options={SCRIPT_USER_GROUPS}
                multiple
                searchable
                maxVisibleTags={1}
                value={playbook.assignedGroups}
                onValueChange={(value) =>
                  updatePlaybook({
                    assignedGroups: Array.isArray(value) ? value : [value],
                  })
                }
              />
              <p className="text-pretty text-paragraph-sm text-muted-foreground">
                People and groups can both be selected. Assigned agents will see this script on matching calls.
              </p>
            </div>
          </aside>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <PlaybookEditor playbook={playbook} onChange={setPlaybook} />
          </div>
        </div>
      ) : null}

      {playbook ? (
        <ScriptPreviewModal
          open={previewOpen}
          playbook={playbook}
          onClose={() => setPreviewOpen(false)}
        />
      ) : null}

      <Modal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        size="sm"
        className="overflow-visible"
        bodyClassName="overflow-visible"
        title="Ready to publish"
        description="Agents will start seeing this script on matching conversations."
        footer={
          <>
            <Button variant="grey-outline" size="sm" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!playbook || !canPublish) return;
                onPublish(playbook);
              }}
            >
              Publish
            </Button>
          </>
        }
      >
        {playbook ? (
          <dl className="flex flex-col gap-3">
            <SummaryRow label="Script" value={playbook.name} />
            <SummaryRow
              label="Steps"
              value={`${stepCount} ${stepCount === 1 ? "step" : "steps"}`}
            />
            <div>
              <dt className="text-label-sm text-muted-foreground">Assigned users</dt>
              <dd className="mt-1.5">
                <Dropdown
                  placeholder="Search team members"
                  searchPlaceholder="Search team members"
                  options={SCRIPT_TEAM_MEMBERS}
                  multiple
                  searchable
                  maxVisibleTags={1}
                  value={playbook.assignedMembers}
                  onValueChange={(value) =>
                    updatePlaybook({
                      assignedMembers: Array.isArray(value) ? value : [value],
                    })
                  }
                />
              </dd>
            </div>
            <div>
              <dt className="text-label-sm text-muted-foreground">User groups</dt>
              <dd className="mt-1.5">
                <Dropdown
                  placeholder="Search user groups"
                  searchPlaceholder="Search user groups"
                  options={SCRIPT_USER_GROUPS}
                  multiple
                  searchable
                  maxVisibleTags={1}
                  value={playbook.assignedGroups}
                  onValueChange={(value) =>
                    updatePlaybook({
                      assignedGroups: Array.isArray(value) ? value : [value],
                    })
                  }
                />
              </dd>
            </div>
          </dl>
        ) : null}
      </Modal>
    </main>
  );
}

export function HeaderEditableTitle({
  value,
  onChange,
  placeholder = "Untitled script",
  nameLabel = "Script name",
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  nameLabel?: string;
}) {
  const [editing, setEditing] = React.useState(false);
  const [draft, setDraft] = React.useState(value);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!editing) return;
    setDraft(value);
    const id = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    });
    return () => window.cancelAnimationFrame(id);
  }, [editing, value]);

  const commit = () => {
    const next = draft.trim() || placeholder;
    if (next !== value) onChange(next);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  if (editing) {
    return (
      <div
        ref={rootRef}
        className="inline-flex max-w-full items-center gap-0.5 rounded-[4px] border border-brand bg-white pl-2.5 pr-1 ring-2 ring-brand/16"
      >
        <span className="grid min-w-[4ch] max-w-[min(28rem,calc(100vw-18rem))]">
          <span
            aria-hidden
            className="invisible col-start-1 row-start-1 whitespace-pre py-1 text-heading-lg"
          >
            {draft || placeholder}
            {"\u2008"}
          </span>
          <input
            ref={inputRef}
            value={draft}
            size={1}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={(event) => {
              if (rootRef.current?.contains(event.relatedTarget as Node)) return;
              commit();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commit();
              }
              if (event.key === "Escape") {
                event.preventDefault();
                cancel();
              }
            }}
            aria-label={nameLabel}
            className="col-start-1 row-start-1 w-full min-w-0 border-0 bg-transparent py-1 text-heading-lg text-foreground outline-none"
          />
        </span>
        <button
          type="button"
          aria-label="Save name"
          onMouseDown={(event) => event.preventDefault()}
          onClick={commit}
          className="flex size-7 shrink-0 items-center justify-center rounded-[4px] text-brand hover:bg-brand-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconCheck size={16} />
        </button>
        <button
          type="button"
          aria-label="Cancel renaming"
          onMouseDown={(event) => event.preventDefault()}
          onClick={cancel}
          className="flex size-7 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-secondary-bg hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconClose size={16} />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      aria-label={`Rename ${nameLabel.toLowerCase()}`}
      className="group/title inline-flex min-w-0 max-w-full items-center rounded-[4px] py-0.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
    >
      <span className="truncate text-heading-lg text-foreground">
        {value.trim() || placeholder}
      </span>
      <span className="ml-1.5 hidden group-hover/title:inline-flex group-focus-visible/title:inline-flex">
        <IconPencil size={16} className="text-brand" />
      </span>
    </button>
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
