import * as React from "react";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { IconClose, IconEye } from "@/components/Icon";
import { Modal } from "@/components/Modal";
import { HeaderEditableTitle } from "./HeaderEditableTitle";
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

export interface ScriptBuilderPageProps {
  launch: BuilderLaunch;
  onClose: () => void;
  onPublish: (playbook: ScriptPlaybook) => void;
}

export function ScriptBuilderPage({ launch, onClose, onPublish }: ScriptBuilderPageProps) {
  const [playbook, setPlaybook] = React.useState<ScriptPlaybook>(() => {
    if (launch.type === "edit") return launch.playbook;
    if (launch.type === "template") return createPlaybookFromTemplate(launch.templateId);
    return createBlankPlaybook();
  });
  const [uploadOpen, setUploadOpen] = React.useState(launch.type === "upload");
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const canPublish = playbook.stages.some((stage) => stage.steps.length > 0);
  const hasAssignees =
    playbook.assignedMembers.length > 0 || playbook.assignedGroups.length > 0;
  const canConfirmPublish = canPublish && hasAssignees;
  const stepCount = countSteps(playbook);

  const updatePlaybook = (patch: Partial<ScriptPlaybook>) => {
    setPlaybook((current) => ({ ...current, ...patch }));
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
          <HeaderEditableTitle
            value={playbook.name}
            onChange={(name) => setPlaybook({ ...playbook, name })}
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="grey-outline"
            size="sm"
            leftIcon={<IconEye size={16} />}
            onClick={() => setPreviewOpen(true)}
          >
            Preview
          </Button>
          <Button
            size="sm"
            disabled={!canPublish}
            onClick={() => setPublishOpen(true)}
          >
            Publish
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-6 overflow-hidden bg-white px-6 py-6">
          <aside className="flex w-[300px] shrink-0 flex-col">
            <div className="flex flex-col gap-4 rounded-lg border border-line bg-white p-4">
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
            <PlaybookEditor
              playbook={playbook}
              onChange={setPlaybook}
              onImportDocument={() => setUploadOpen(true)}
            />
          </div>
        </div>

      <ScriptUploadWizard
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onImport={(next) => {
          setPlaybook(next);
          setUploadOpen(false);
        }}
      />

      <ScriptPreviewModal
        open={previewOpen}
        playbook={playbook}
        onClose={() => setPreviewOpen(false)}
      />

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
              disabled={!canConfirmPublish}
              onClick={() => {
                if (!canConfirmPublish) return;
                onPublish(playbook);
              }}
            >
              Publish
            </Button>
          </>
        }
      >
        <dl className="flex flex-col gap-3">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-8">
              <SummaryRow label="Script" value={playbook.name} />
              <SummaryRow
                label="Steps"
                value={`${stepCount} ${stepCount === 1 ? "step" : "steps"}`}
              />
            </div>
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
            {!hasAssignees ? (
              <p className="text-paragraph-sm text-muted-foreground">
                Assign at least one team member or user group to publish.
              </p>
            ) : null}
          </dl>
      </Modal>
    </main>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-label-sm text-muted-foreground">{label}</dt>
      <dd className="text-paragraph-md text-foreground tabular-nums">{value}</dd>
    </div>
  );
}
