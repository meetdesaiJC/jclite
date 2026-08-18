import * as React from "react";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { InputField } from "@/components/InputField";
import { Modal } from "@/components/Modal";
import {
  IconCircleCheckFilled,
  IconClose,
  IconEye,
  IconFile,
  IconInfoCircle,
  IconSparkles,
} from "@/components/Icon";
import { cn } from "@/lib/utils";
import { AssignTeamAndGroups } from "./AssignTeamAndGroups";
import {
  GUIDANCE_TRIGGERED_BY_OPTIONS,
  TEAM_MEMBERS,
  USER_GROUPS,
  createEmptyGuidance,
  customerLineForGuidance,
  guidanceTriggeredBy,
  placeholdersForGuidance,
  priorityForGuidance,
  proposeGuidanceFromKnowledge,
  stanceForGuidance,
  testGuidanceAgainstSample,
  type GuidanceItem,
  type GuidanceResource,
  type GuidanceTemplateId,
  type GuidanceTriggeredBy,
} from "./guidanceData";
import {
  SEED_INTEGRATIONS,
  availableCapabilities,
  capabilityById,
  integrationById,
  type GuidanceActionConfig,
  type Integration,
  type IntegrationId,
} from "./actionsData";
import {
  SEED_KNOWLEDGE_SOURCES,
  liveKnowledgeSources,
  type KnowledgeSourceRecord,
} from "./knowledgeData";
import { BattlecardThumb, GuidanceResourceModal } from "./GuidanceCard";
import { LiveGuidanceCard } from "./LiveGuidance";

export interface CreateGuidancePageProps {
  initial?: GuidanceItem | null;
  /** Defaults to edit when `initial` is set, create otherwise. */
  mode?: "create" | "edit";
  templateId?: GuidanceTemplateId | null;
  /** Sources AI can draft guidance from (§13). */
  knowledgeSources?: KnowledgeSourceRecord[];
  /** Only capabilities the admin enabled can be attached as an action (§19). */
  integrations?: Integration[];
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
    <div className="flex items-start gap-1 text-paragraph-sm">
      <span className="inline-flex h-[1lh] w-4 shrink-0 items-center justify-center text-muted-foreground">
        <IconInfoCircle
          size={16}
          className="block size-4"
          aria-hidden="true"
        />
      </span>
      <p className="m-0 text-muted-foreground">{children}</p>
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
  knowledgeSources = SEED_KNOWLEDGE_SOURCES,
  integrations = SEED_INTEGRATIONS,
  onClose,
  onSave,
}: CreateGuidancePageProps) {
  const isEditing = mode ? mode === "edit" : Boolean(initial);
  const placeholders = placeholdersForGuidance(templateId);
  const [draft, setDraft] = React.useState<GuidanceItem>(
    () => initial ?? createEmptyGuidance()
  );
  const [advancedOpen, setAdvancedOpen] = React.useState(
    () => Boolean(initial?.triggeredBy && initial.triggeredBy !== "customer")
  );
  const [generateOpen, setGenerateOpen] = React.useState(false);
  const [testOpen, setTestOpen] = React.useState(false);
  const [actionOpen, setActionOpen] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkName, setLinkName] = React.useState("");
  const [linkUrl, setLinkUrl] = React.useState("");
  const [imageOpen, setImageOpen] = React.useState(false);
  const [imageName, setImageName] = React.useState("");
  const [imageFile, setImageFile] = React.useState<File | null>(null);
  const [imagePreview, setImagePreview] = React.useState("");
  const [imageError, setImageError] = React.useState("");
  const [isDraggingImage, setIsDraggingImage] = React.useState(false);
  const [testPreviewOpen, setTestPreviewOpen] = React.useState(false);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [viewingResource, setViewingResource] =
    React.useState<GuidanceResource | null>(null);
  const imageInputRef = React.useRef<HTMLInputElement>(null);

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

  const resetImageModal = (revokePreview: boolean) => {
    if (revokePreview && imagePreview) URL.revokeObjectURL(imagePreview);
    setImageName("");
    setImageFile(null);
    setImagePreview("");
    setImageError("");
    setIsDraggingImage(false);
  };

  const closeImageModal = () => {
    setImageOpen(false);
    resetImageModal(true);
  };

  const acceptImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      setImageError("Use a PNG, JPG, GIF, or WebP image.");
      return;
    }
    setImageError("");
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageName((current) =>
      current.trim()
        ? current
        : file.name.replace(/\.[^.]+$/, "") || "Uploaded image"
    );
  };

  const addImage = () => {
    if (!imageName.trim() || !imageFile || !imagePreview) return;
    const resource: GuidanceResource = {
      id: `r-${Date.now()}`,
      type: "image",
      name: imageName.trim(),
      thumbnail: imagePreview,
    };
    patch({ resources: [...draft.resources, resource] });
    setImageOpen(false);
    resetImageModal(false);
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
            disabled={!draft.trigger.trim()}
            onClick={() => setTestOpen(true)}
          >
            Test
          </Button>
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
          {/* Guidance is for the moments a business wants to control. Routine
              questions belong in Knowledge, and saying so here keeps admins
              from rebuilding their help centre one rule at a time. */}
          {!isEditing ? (
            <div className="flex items-start gap-2 rounded-lg border border-info-border bg-info-secondary px-3 py-2.5">
              <IconInfoCircle size={16} className="mt-px size-4 shrink-0 text-info" />
              <p className="min-w-0 flex-1 text-pretty text-paragraph-sm text-foreground">
                Use Guidance for important business moments — competitor
                objections, pricing, cancellation, compliance, upsell. Factual
                questions are answered automatically from Knowledge.
              </p>
              <Button
                variant="link"
                size="sm"
                className="shrink-0"
                leftIcon={<IconSparkles size={16} />}
                onClick={() => setGenerateOpen(true)}
              >
                Draft from Knowledge
              </Button>
            </div>
          ) : null}

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

            <div className="flex flex-col gap-3">
              <button
                type="button"
                aria-expanded={advancedOpen}
                onClick={() => setAdvancedOpen((open) => !open)}
                className="w-fit cursor-pointer text-label-md text-brand outline-none hover:text-brand-hover focus-visible:ring-2 focus-visible:ring-brand/24"
              >
                {advancedOpen ? "Hide advanced controls" : "Advanced controls"}
              </button>
              {advancedOpen ? (
                <div className="flex flex-col gap-3 rounded-[4px] border border-line bg-secondary-bg p-3">
                  <Dropdown
                    label="Triggered by"
                    searchable={false}
                    options={GUIDANCE_TRIGGERED_BY_OPTIONS}
                    value={guidanceTriggeredBy(draft)}
                    onValueChange={(value) =>
                      patch({
                        triggeredBy: (Array.isArray(value)
                          ? value[0]
                          : value) as GuidanceTriggeredBy,
                      })
                    }
                    className="w-full max-w-[240px]"
                    triggerClassName="h-9"
                  />
                  <p className="text-pretty text-paragraph-sm text-muted-foreground">
                    Who has to say it before this fires. Apply-to is set by the
                    assignment on the left. CRM property, call stage, sentiment,
                    and plan conditions are coming later.
                  </p>
                </div>
              ) : null}
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
                onClick={() => setImageOpen(true)}
              >
                Upload image
              </Button>
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
                        {resource.battlecard ? (
                          <BattlecardThumb
                            data={resource.battlecard}
                            className="size-full"
                          />
                        ) : resource.thumbnail ? (
                          <img
                            src={resource.thumbnail}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <BattlecardThumb className="size-full" />
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
                        {resource.type === "image" ? "View image" : "Open link"}
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

          <SectionCard
            title="Recommended action"
            description="Optionally propose one thing the agent can do in a connected system when this guidance fires. They always review before it runs."
          >
            <RecommendedActionEditor
              config={draft.recommendedAction}
              integrations={integrations}
              onOpenPicker={() => setActionOpen(true)}
              onChange={(recommendedAction) => patch({ recommendedAction })}
            />
          </SectionCard>
        </div>
      </div>

      <ActionPickerModal
        open={actionOpen}
        integrations={integrations}
        onClose={() => setActionOpen(false)}
        onSelect={(config) => {
          patch({ recommendedAction: config });
          setActionOpen(false);
        }}
      />

      <GenerateFromKnowledgeModal
        open={generateOpen}
        sources={knowledgeSources}
        onClose={() => setGenerateOpen(false)}
        onApply={(proposal) => {
          // AI fills the form; the admin still reviews and publishes.
          setDraft((current) => ({
            ...current,
            name: proposal.name,
            trigger: proposal.trigger,
            examplePhrases: proposal.examplePhrases,
            suggestedResponse: proposal.suggestedResponse,
            talkingPoints: proposal.talkingPoints,
            resources: proposal.resources,
          }));
          setGenerateOpen(false);
        }}
      />

      <GuidanceTestModal
        open={testOpen}
        draft={draft}
        onClose={() => setTestOpen(false)}
      />

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
        open={imageOpen}
        onClose={closeImageModal}
        size="md"
        title="Upload image"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="grey-outline" size="sm" onClick={closeImageModal}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!imageName.trim() || !imageFile}
              onClick={addImage}
            >
              Upload image
            </Button>
          </div>
        }
      >
        <div className="flex flex-col gap-4">
          <InputField
            label="Name"
            placeholder="e.g. Aircall comparison battlecard"
            value={imageName}
            onChange={(e) => setImageName(e.target.value)}
            helpText="Shown as the title when this image appears during a call."
            helpIcon
            clearable={false}
          />
          <div className="flex flex-col gap-2">
            <FieldLabel htmlFor="guidance-image-upload">Image</FieldLabel>
            <input
              id="guidance-image-upload"
              ref={imageInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) acceptImageFile(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              onDragEnter={(event) => {
                event.preventDefault();
                setIsDraggingImage(true);
              }}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDraggingImage(true);
              }}
              onDragLeave={(event) => {
                event.preventDefault();
                if (!event.currentTarget.contains(event.relatedTarget as Node)) {
                  setIsDraggingImage(false);
                }
              }}
              onDrop={(event) => {
                event.preventDefault();
                setIsDraggingImage(false);
                const file = event.dataTransfer.files[0];
                if (file) acceptImageFile(file);
              }}
              className={cn(
                "flex flex-col items-center gap-3 rounded-xl border border-dashed px-6 py-10 text-center transition-colors",
                isDraggingImage
                  ? "border-brand bg-brand-subtle/60"
                  : "border-brand/40 bg-brand-subtle/20 hover:border-brand hover:bg-brand-subtle/40"
              )}
            >
              {imagePreview ? (
                <>
                  <span className="flex h-20 w-full max-w-[220px] overflow-hidden rounded-[8px] border border-line bg-white">
                    <img
                      src={imagePreview}
                      alt=""
                      className="size-full object-contain"
                    />
                  </span>
                  <span>
                    <span className="block text-label-md-semi text-foreground">
                      {imageFile?.name ?? "Image selected"}
                    </span>
                    <span className="mt-1 block text-paragraph-sm text-muted-foreground">
                      Drop a different file or click to replace.
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <span className="flex size-10 items-center justify-center rounded-[8px] bg-white text-brand shadow-[0_0_0_1px_rgba(0,76,230,0.12)]">
                    <IconFile size={20} />
                  </span>
                  <span>
                    <span className="block text-label-md-semi text-foreground">
                      Upload PNG, JPG, or WebP
                    </span>
                    <span className="mt-1 block text-paragraph-sm text-muted-foreground">
                      Drop a file or click to browse.
                    </span>
                  </span>
                </>
              )}
            </button>
            {imageError ? (
              <Banner variant="error" width="page">
                {imageError}
              </Banner>
            ) : null}
          </div>
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
          onViewResource={setViewingResource}
        />
      </Modal>

      <GuidanceResourceModal
        resource={viewingResource}
        onClose={() => setViewingResource(null)}
      />
    </main>
  );
}

/**
 * Recommended action (§19). Nothing here invents a capability: the picker only
 * offers what an admin already enabled under Integrations & actions, so a
 * disconnected CRM simply has nothing to attach.
 */
function RecommendedActionEditor({
  config,
  integrations,
  onOpenPicker,
  onChange,
}: {
  config?: GuidanceActionConfig;
  integrations: Integration[];
  onOpenPicker: () => void;
  onChange: (next: GuidanceActionConfig | undefined) => void;
}) {
  const options = availableCapabilities(integrations);

  if (options.length === 0) {
    return (
      <p className="text-pretty text-paragraph-sm text-muted-foreground">
        No actions are enabled yet. Connect an integration and switch on the
        capabilities you want Agent Assist to offer.
      </p>
    );
  }

  if (!config) {
    return (
      <Button
        variant="grey-outline"
        size="sm"
        className="self-start"
        leftIcon={<PlusIcon size={16} />}
        onClick={onOpenPicker}
      >
        Add action
      </Button>
    );
  }

  const integration = integrationById(integrations, config.integrationId);
  const capability = capabilityById(
    integrations,
    config.integrationId,
    config.capabilityId
  );

  return (
    <div className="flex flex-col gap-3 rounded-[4px] border border-line p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-label-md-semi text-foreground">
            {integration?.name} → {capability?.label}
          </p>
          <p className="text-paragraph-sm text-muted-foreground">
            Agents see this as “{capability?.actionVerb}”.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Button variant="link" size="sm" onClick={onOpenPicker}>
            Change
          </Button>
          <button
            type="button"
            aria-label="Remove recommended action"
            onClick={() => onChange(undefined)}
            className="flex size-8 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-surface-hover hover:text-foreground"
          >
            <IconClose size={16} />
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3">
        <InputField
          label="Property"
          placeholder="e.g. Competitor"
          value={config.property}
          onChange={(event) => onChange({ ...config, property: event.target.value })}
          clearable={false}
          wrapperClassName="min-w-[180px] flex-1"
        />
        <InputField
          label="Value"
          placeholder="e.g. Aircall"
          value={config.value}
          onChange={(event) => onChange({ ...config, value: event.target.value })}
          clearable={false}
          wrapperClassName="min-w-[180px] flex-1"
        />
      </div>

      <p className="flex items-start gap-1.5 text-paragraph-sm text-muted-foreground">
        <IconInfoCircle size={16} className="mt-px size-4 shrink-0" />
        <span className="text-pretty">
          Agent confirmation is required. Agent Assist never writes to{" "}
          {integration?.name} on its own.
        </span>
      </p>
    </div>
  );
}

function ActionPickerModal({
  open,
  integrations,
  onClose,
  onSelect,
}: {
  open: boolean;
  integrations: Integration[];
  onClose: () => void;
  onSelect: (config: GuidanceActionConfig) => void;
}) {
  const options = availableCapabilities(integrations);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Add a recommended action"
      description="Only capabilities you enabled under Integrations & actions appear here."
    >
      <ul className="flex flex-col gap-2">
        {options.map(({ integration, capability }) => (
          <li key={`${integration.id}-${capability.id}`}>
            <button
              type="button"
              onClick={() =>
                onSelect({
                  integrationId: integration.id as IntegrationId,
                  capabilityId: capability.id,
                  property: "",
                  value: "",
                  requiresConfirmation: true,
                })
              }
              className="flex w-full cursor-pointer flex-col gap-0.5 rounded-lg border border-line bg-white p-3 text-left outline-none transition-colors hover:border-brand hover:bg-brand-subtle/30 focus-visible:ring-2 focus-visible:ring-brand/24"
            >
              <span className="text-label-md-semi text-foreground">
                {integration.name} → {capability.label}
              </span>
              <span className="text-paragraph-sm text-muted-foreground">
                {capability.group} · shown as “{capability.actionVerb}”
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

/**
 * Generate from Knowledge (§13). The admin starts from something they already
 * uploaded instead of an empty form, and AI proposes the strategic parts.
 */
function GenerateFromKnowledgeModal({
  open,
  sources,
  onClose,
  onApply,
}: {
  open: boolean;
  sources: KnowledgeSourceRecord[];
  onClose: () => void;
  onApply: (proposal: GuidanceItem) => void;
}) {
  const usable = liveKnowledgeSources(sources).filter(
    (source) => source.entries.length > 0
  );
  const [sourceId, setSourceId] = React.useState<string>("");
  const [proposals, setProposals] = React.useState<GuidanceItem[]>([]);

  React.useEffect(() => {
    if (!open) {
      setSourceId("");
      setProposals([]);
    }
  }, [open]);

  const source = usable.find((item) => item.id === sourceId);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="Draft guidance from Knowledge"
      description="Pick a source and AI proposes the trigger, wording, and talking points. Nothing publishes until you review it."
      footer={
        <>
          <Button variant="grey-outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            leftIcon={<IconSparkles size={16} />}
            disabled={!source}
            onClick={() =>
              setProposals(
                source ? proposeGuidanceFromKnowledge(source.entries, source.name) : []
              )
            }
          >
            Generate
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {usable.length === 0 ? (
          <p className="text-pretty text-paragraph-md text-muted-foreground">
            No published knowledge sources yet. Add one under Knowledge and AI
            can draft guidance from it.
          </p>
        ) : (
          <Dropdown
            label="Knowledge source"
            placeholder="Select a source"
            searchable={false}
            options={usable.map((item) => ({ value: item.id, label: item.name }))}
            value={sourceId}
            onValueChange={(value) =>
              setSourceId(Array.isArray(value) ? value[0]! : value)
            }
          />
        )}

        {proposals.length > 0 ? (
          <div className="flex flex-col gap-2">
            <p className="text-label-md text-foreground">
              {proposals.length} proposals — pick one to load into the form
            </p>
            <ul className="flex flex-col gap-2">
              {proposals.map((proposal) => (
                <li key={proposal.id}>
                  <button
                    type="button"
                    onClick={() => onApply(proposal)}
                    className="flex w-full cursor-pointer flex-col gap-1 rounded-lg border border-line bg-white p-3 text-left outline-none transition-colors hover:border-brand hover:bg-brand-subtle/30 focus-visible:ring-2 focus-visible:ring-brand/24"
                  >
                    <span className="text-label-md-semi text-foreground">
                      {proposal.name}
                    </span>
                    <span className="text-pretty text-paragraph-sm text-muted-foreground">
                      Trigger: {proposal.trigger}
                    </span>
                    <span className="line-clamp-2 text-pretty text-paragraph-sm text-foreground">
                      “{proposal.suggestedResponse}”
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </Modal>
  );
}

/**
 * Test before publish (§34). The admin types a line a customer might say and
 * finds out whether their trigger would actually catch it — before an agent
 * discovers it doesn't on a live call.
 */
function GuidanceTestModal({
  open,
  draft,
  onClose,
}: {
  open: boolean;
  draft: GuidanceItem;
  onClose: () => void;
}) {
  const [sample, setSample] = React.useState("");
  const [result, setResult] = React.useState<ReturnType<
    typeof testGuidanceAgainstSample
  > | null>(null);

  React.useEffect(() => {
    if (!open) {
      setSample("");
      setResult(null);
    }
  }, [open]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="sm"
      title="Test this guidance"
      description="Enter a sample conversation line. Nothing is sent to any agent."
      footer={
        <>
          <Button variant="grey-outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            disabled={!sample.trim()}
            onClick={() => setResult(testGuidanceAgainstSample(draft, sample))}
          >
            Run test
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <FieldLabel htmlFor="guidance-test-sample">Sample conversation</FieldLabel>
          <textarea
            id="guidance-test-sample"
            rows={3}
            value={sample}
            onChange={(event) => setSample(event.target.value)}
            placeholder="We currently use Aircall but are evaluating alternatives."
            className={textareaClass}
          />
        </div>

        {result ? (
          <div
            className={cn(
              "flex flex-col gap-1.5 rounded-lg border px-3 py-2.5",
              result.matched
                ? "border-success-border bg-success-secondary"
                : "border-line bg-secondary-bg"
            )}
            aria-live="polite"
          >
            <p className="flex items-center gap-1.5 text-label-md font-medium text-foreground">
              {result.matched ? (
                <>
                  <IconCircleCheckFilled
                    size={16}
                    className="size-4 shrink-0 text-success"
                  />
                  Trigger matched
                </>
              ) : (
                "Trigger did not match"
              )}
            </p>
            {result.matched ? (
              <p className="text-pretty text-paragraph-sm text-muted-foreground">
                Guidance that would appear: {draft.name || "this guidance"}
              </p>
            ) : (
              <p className="text-pretty text-paragraph-sm text-muted-foreground">
                {result.hint}
              </p>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
  );
}
