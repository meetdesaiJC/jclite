import * as React from "react";
import { Button } from "@/components/Button";
import { InputField } from "@/components/InputField";
import { Modal } from "@/components/Modal";
import {
  IconClose,
  IconEye,
  IconFile,
  IconInfoCircle,
} from "@/components/Icon";
import { AssignTeamAndGroups } from "./AssignTeamAndGroups";
import {
  TEAM_MEMBERS,
  USER_GROUPS,
  createEmptyGuidance,
  customerLineForGuidance,
  placeholdersForGuidance,
  priorityForGuidance,
  stanceForGuidance,
  type GuidanceItem,
  type GuidanceResource,
  type GuidanceTemplateId,
} from "./guidanceData";
import { BattlecardVisual } from "./GuidanceCard";
import { LiveGuidanceCard } from "./LiveGuidance";

export interface CreateGuidancePageProps {
  initial?: GuidanceItem | null;
  /** Defaults to edit when `initial` is set, create otherwise. */
  mode?: "create" | "edit";
  templateId?: GuidanceTemplateId | null;
  onClose: () => void;
  onSave: (item: GuidanceItem) => void;
}

function PlusIcon({ size = 16 }: { size?: number }) {
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

function LinkIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.5 9.5 9.5 6.5M7 5.2l.8-.8a2.5 2.5 0 1 1 3.5 3.5l-.8.8M9 10.8l-.8.8a2.5 2.5 0 1 1-3.5-3.5l.8-.8"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const textareaClass =
  "w-full resize-y rounded-[4px] border border-line bg-white px-3 py-2.5 text-paragraph-md text-foreground placeholder:text-disabled-fg outline-none hover:border-control-border focus:border-brand focus:ring-2 focus:ring-brand/16";

function FieldLabel({
  htmlFor,
  children,
}: {
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <label htmlFor={htmlFor} className="text-label-md text-foreground">
      {children}
    </label>
  );
}

function HelpText({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-1">
      <IconInfoCircle
        size={16}
        className="mt-px size-4 shrink-0 text-muted-foreground"
        aria-hidden="true"
      />
      <p className="text-paragraph-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 rounded-lg border border-line bg-white p-4">
      {title ? (
        <div className="flex flex-col gap-1">
          <h2 className="text-label-md-semi text-foreground">{title}</h2>
          {description ? (
            <p className="text-paragraph-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function CreateGuidancePage({
  initial,
  mode,
  templateId = null,
  onClose,
  onSave,
}: CreateGuidancePageProps) {
  const isEditing = mode ? mode === "edit" : Boolean(initial);
  const placeholders = placeholdersForGuidance(templateId);
  const [draft, setDraft] = React.useState<GuidanceItem>(
    () => initial ?? createEmptyGuidance()
  );
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkName, setLinkName] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [testPreviewOpen, setTestPreviewOpen] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [viewingResource, setViewingResource] =
    React.useState<GuidanceResource | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const patch = (partial: Partial<GuidanceItem>) => {
    setDraft((current) => ({ ...current, ...partial }));
    setTestPreviewOpen(false);
  };

  const canSave =
    draft.name.trim().length > 0 &&
    draft.trigger.trim().length > 0 &&
    (draft.suggestedResponse.trim().length > 0 ||
      draft.talkingPoints.some((point) => point.trim().length > 0));
  const hasAssignees =
    draft.teamMembers.length > 0 || draft.userGroups.length > 0;
  const canConfirmPublish = canSave && hasAssignees;

  const publishedItem = (): GuidanceItem => ({
    ...draft,
    name: draft.name.trim(),
    trigger: draft.trigger.trim(),
    suggestedResponse: draft.suggestedResponse.trim(),
    talkingPoints: draft.talkingPoints.filter((point) => point.trim()),
    updated: "Just now",
    status: "live",
  });

  const addTalkingPoint = () => {
    patch({ talkingPoints: [...draft.talkingPoints, ""] });
  };

  const addLink = () => {
    if (!linkName.trim() || !linkUrl.trim()) return;
    const resource: GuidanceResource = {
      id: `r-${Date.now()}`,
      type: "link",
      name: linkName.trim(),
      url: linkUrl.trim(),
    };
    patch({ resources: [...draft.resources, resource] });
    setLinkName("");
    setLinkUrl("");
    setLinkOpen(false);
  };

  const runTest = () => {
    if (!canSave) return;
    setTestPreviewOpen(true);
  };

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-[4px] text-foreground hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconClose size={20} />
          </button>
          <h1 className="truncate text-heading-lg text-foreground">
            {isEditing ? "Edit guidance" : "Create guidance"}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="grey-outline"
            size="sm"
            disabled={!canSave}
            leftIcon={<IconEye size={16} />}
            onClick={runTest}
          >
            Preview
          </Button>
          <Button
            size="sm"
            disabled={!canSave}
            onClick={() => {
              if (!canSave) return;
              setPublishOpen(true);
            }}
          >
            {isEditing ? "Save" : "Create"}
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 gap-6 overflow-hidden p-6">
        <aside className="flex w-[300px] shrink-0 flex-col overflow-auto">
          <AssignTeamAndGroups
            members={TEAM_MEMBERS}
            groups={USER_GROUPS}
            selectedMembers={draft.teamMembers}
            selectedGroups={draft.userGroups}
            onMembersChange={(teamMembers) => patch({ teamMembers })}
            onGroupsChange={(userGroups) => patch({ userGroups })}
          />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-auto pr-1">
          <SectionCard>
            <div className="flex flex-col gap-2">
              <InputField
                label="Guidance name"
                placeholder={placeholders.name}
                value={draft.name}
                onChange={(e) => patch({ name: e.target.value })}
                helpText="Give this guidance an internal name so your team can identify it."
                helpIcon
                clearable={false}
              />
            </div>

            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="guidance-trigger">When should this appear?</FieldLabel>
              <textarea
                id="guidance-trigger"
                rows={4}
                value={draft.trigger}
                onChange={(e) => patch({ trigger: e.target.value })}
                placeholder={placeholders.trigger}
                className={textareaClass}
              />
              <HelpText>
                Describe the conversation or customer intent that should trigger this
                guidance.
              </HelpText>
            </div>
          </SectionCard>

          <SectionCard title="What should the agent see?">
            <div className="flex flex-col gap-2">
              <FieldLabel htmlFor="guidance-response">Suggested response</FieldLabel>
              <textarea
                id="guidance-response"
                rows={4}
                value={draft.suggestedResponse}
                onChange={(e) => patch({ suggestedResponse: e.target.value })}
                placeholder={placeholders.suggestedResponse}
                className={textareaClass}
              />
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex items-center justify-between gap-3">
                <FieldLabel>Key talking points</FieldLabel>
                <Button variant="link" size="sm" onClick={addTalkingPoint}>
                  Add talking point
                </Button>
              </div>
              {draft.talkingPoints.length === 0 ? (
                <p className="text-paragraph-sm text-muted-foreground">
                  Optional short bullets the agent can scan during a call. Either a
                  suggested response or talking points is enough.
                </p>
              ) : (
                <div className="flex flex-col gap-2">
                  {draft.talkingPoints.map((point, index) => (
                    <div key={`point-${index}`} className="flex items-center gap-2">
                      <span className="text-paragraph-md text-muted-foreground">•</span>
                      <InputField
                        placeholder={placeholders.talkingPoint}
                        value={point}
                        onChange={(e) => {
                          const next = [...draft.talkingPoints];
                          next[index] = e.target.value;
                          patch({ talkingPoints: next });
                        }}
                        clearable={false}
                        wrapperClassName="flex-1"
                      />
                      <button
                        type="button"
                        aria-label={`Remove talking point ${index + 1}`}
                        onClick={() =>
                          patch({
                            talkingPoints: draft.talkingPoints.filter(
                              (_, i) => i !== index
                            ),
                          })
                        }
                        className="flex size-9 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                      >
                        <IconClose size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard title="Supporting resources">
            <div className="flex items-center gap-3">
              <Button
                variant="grey-outline"
                size="sm"
                leftIcon={<LinkIcon size={16} />}
                onClick={() => setLinkOpen(true)}
              >
                Add link
              </Button>
              <Button
                variant="grey-outline"
                size="sm"
                leftIcon={<PlusIcon size={16} />}
                onClick={() => fileInputRef.current?.click()}
              >
                Upload image
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const resource: GuidanceResource = {
                    id: `r-${Date.now()}`,
                    type: "image",
                    name: file.name.replace(/\.[^.]+$/, "") || "Uploaded image",
                    thumbnail: URL.createObjectURL(file),
                  };
                  patch({ resources: [...draft.resources, resource] });
                  e.target.value = "";
                }}
              />
            </div>

            {draft.resources.length > 0 && (
              <ul className="flex flex-col gap-2">
                {draft.resources.map((resource) => (
                  <li
                    key={resource.id}
                    className="flex items-center gap-3 rounded-[4px] border border-line px-3 py-2"
                  >
                    {resource.type === "image" ? (
                      <span className="flex size-10 shrink-0 overflow-hidden rounded-[6px] border border-line bg-secondary-bg">
                        {resource.thumbnail ? (
                          <img
                            src={resource.thumbnail}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <BattlecardVisual className="size-full" />
                        )}
                      </span>
                    ) : (
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-[6px] border border-line bg-secondary-bg text-muted-foreground">
                        <IconFile size={16} />
                      </span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-label-md text-foreground">
                        {resource.name}
                      </p>
                      <button
                        type="button"
                        className="text-paragraph-sm text-brand hover:text-brand-hover"
                        onClick={() => setViewingResource(resource)}
                      >
                        {resource.type === "image"
                          ? resource.name.toLowerCase().includes("battlecard")
                            ? "View battlecard"
                            : "View image"
                          : "Open link"}
                      </button>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${resource.name}`}
                      onClick={() =>
                        patch({
                          resources: draft.resources.filter((item) => item.id !== resource.id),
                        })
                      }
                      className="flex size-8 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                    >
                      <IconClose size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>

      <Modal
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
        size="sm"
        title="Add link"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="grey-outline" size="sm" onClick={() => setLinkOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!linkName.trim() || !linkUrl.trim()}
              onClick={addLink}
            >
              Add link
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <InputField
            label="Name"
            placeholder="e.g. Aircall comparison battlecard"
            value={linkName}
            onChange={(e) => setLinkName(e.target.value)}
            clearable={false}
          />
          <InputField
            label="URL"
            placeholder="https://"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            clearable={false}
          />
        </div>
      </Modal>

      <Modal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        size="sm"
        className="overflow-visible"
        bodyClassName="overflow-visible"
        title="Ready to publish"
        description="Agents will start seeing this guidance on matching conversations."
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
                onSave(publishedItem());
              }}
            >
              Publish
            </Button>
          </>
        }
      >
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="text-label-sm text-muted-foreground">Guidance</dt>
            <dd className="text-paragraph-md text-foreground">{draft.name}</dd>
          </div>
          <AssignTeamAndGroups
            variant="summary"
            members={TEAM_MEMBERS}
            groups={USER_GROUPS}
            selectedMembers={draft.teamMembers}
            selectedGroups={draft.userGroups}
            onMembersChange={(teamMembers) => patch({ teamMembers })}
            onGroupsChange={(userGroups) => patch({ userGroups })}
          />
          {!hasAssignees ? (
            <p className="text-paragraph-sm text-muted-foreground">
              Assign at least one team member or user group to publish.
            </p>
          ) : null}
        </dl>
      </Modal>

      <Modal
        open={testPreviewOpen}
        onClose={() => setTestPreviewOpen(false)}
        size="md"
        title="Preview"
        description="What the agent would see during a call"
      >
        <LiveGuidanceCard
          item={{
            id: draft.id,
            atMs: 0,
            quote: customerLineForGuidance(draft),
            item: draft,
            priority: priorityForGuidance(draft),
            stance: stanceForGuidance(draft),
          }}
          reduced
          onDismiss={() => setTestPreviewOpen(false)}
          onViewResource={setViewingResource}
        />
      </Modal>

      <Modal
        open={Boolean(viewingResource)}
        onClose={() => setViewingResource(null)}
        size="lg"
        title={viewingResource?.name}
      >
        {viewingResource?.type === "image" ? (
          <div className="overflow-hidden rounded-[6px] border border-line bg-secondary-bg">
            {viewingResource.thumbnail ? (
              <img
                src={viewingResource.thumbnail}
                alt={viewingResource.name}
                className="mx-auto max-h-[70vh] w-full object-contain"
              />
            ) : (
              <BattlecardVisual className="w-full" />
            )}
          </div>
        ) : null}
      </Modal>
    </main>
  );
}
