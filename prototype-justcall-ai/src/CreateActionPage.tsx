import * as React from "react";
import { Banner } from "@/components/Banner";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { InputField } from "@/components/InputField";
import { Radio } from "@/components/Radio";
import { Toggle } from "@/components/Toggle";
import { IconChevronRight, IconClose } from "@/components/Icon";
import { useAgentAssistTakeover } from "./agentAssistTakeover";
import { AssignTeamAndGroups } from "./AssignTeamAndGroups";
import { TEAM_MEMBERS, USER_GROUPS } from "./guidanceData";
import { InCallActionSuggestionCard } from "./InCallActionCard";
import {
  ACTION_OBJECT_OPTIONS,
  ACTION_PROPERTY_OPTIONS,
  VALUE_SOURCE_OPTIONS,
  capabilityById,
  capabilityNeedsRecord,
  createEmptyAction,
  defaultExtractPrompt,
  defaultPropertyForCapability,
  integrationById,
  operationsForIntegration,
  previewExtractedValue,
  suggestedAgentLabel,
  suggestedInternalName,
  type ActionValueSource,
  type AgentAction,
  type Integration,
  type IntegrationId,
} from "./actionsData";

export interface CreateActionPageProps {
  initial?: AgentAction | null;
  mode?: "create" | "edit";
  integrations: Integration[];
  onIntegrationsChange: (next: Integration[]) => void;
  onClose: () => void;
  onSave: (action: AgentAction) => void;
}

function pick(value: string | string[]): string {
  return Array.isArray(value) ? (value[0] ?? "") : value;
}

function SectionKicker({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-label-sm font-medium tracking-[0.08em] text-muted-foreground uppercase">
      {children}
    </p>
  );
}

export function CreateActionPage({
  initial,
  mode,
  integrations,
  onIntegrationsChange,
  onClose,
  onSave,
}: CreateActionPageProps) {
  useAgentAssistTakeover();
  const isEditing = mode ? mode === "edit" : Boolean(initial);
  const [draft, setDraft] = React.useState<AgentAction>(
    () => initial ?? createEmptyAction()
  );
  const [extractTouched, setExtractTouched] = React.useState(
    () =>
      initial?.value.kind === "from_conversation" &&
      Boolean(initial.value.extractPrompt)
  );
  const [examplesOpen, setExamplesOpen] = React.useState(false);
  const [thenPickerOpen, setThenPickerOpen] = React.useState(
    () => !initial?.capabilityId
  );

  const integration = integrationById(integrations, draft.integrationId);
  const capability = draft.capabilityId
    ? capabilityById(integrations, draft.integrationId, draft.capabilityId)
    : undefined;
  const needsReconnect = Boolean(
    draft.capabilityId && integration && !integration.connected
  );

  const withGenerated = React.useCallback(
    (current: AgentAction, partial: Partial<AgentAction>): AgentAction => {
      const merged: AgentAction = { ...current, ...partial };
      const nextCapability = merged.capabilityId
        ? capabilityById(integrations, merged.integrationId, merged.capabilityId)
        : undefined;
      const nextIntegration = integrationById(integrations, merged.integrationId);
      const agentLabel = suggestedAgentLabel(merged, nextCapability);
      const name = suggestedInternalName(nextIntegration?.name ?? "", agentLabel);
      return { ...merged, agentLabel, name };
    },
    [integrations]
  );

  const patch = (partial: Partial<AgentAction>) =>
    setDraft((current) => withGenerated(current, partial));

  const objects = capability?.objects ?? [];
  const objectOptions =
    objects.length > 0
      ? ACTION_OBJECT_OPTIONS.filter((item) => objects.includes(item.value))
      : ACTION_OBJECT_OPTIONS;
  const needsRecord = capabilityNeedsRecord(capability);

  const valueReady =
    draft.value.kind === "fixed"
      ? draft.value.value.trim().length > 0
      : draft.value.extractPrompt.trim().length > 0;

  const hasAssignees =
    draft.teamMembers.length > 0 || draft.userGroups.length > 0;

  const canSave =
    (draft.agentLabel.trim().length > 0 || draft.name.trim().length > 0) &&
    Boolean(draft.capabilityId) &&
    Boolean(integration?.connected) &&
    valueReady &&
    (!needsRecord || (Boolean(draft.object) && Boolean(draft.property))) &&
    draft.detectWhen.trim().length > 0;

  const selectOperation = (integrationId: IntegrationId, capabilityId: string) => {
    const next = capabilityById(integrations, integrationId, capabilityId);
    const defaultObject = next?.objects?.[0] ?? "";
    const defaultProperty = capabilityNeedsRecord(next)
      ? draft.integrationId === integrationId
        ? draft.property
        : ""
      : defaultPropertyForCapability(next);
    const nextValue: ActionValueSource =
      draft.value.kind === "fixed"
        ? draft.value
        : {
            kind: "from_conversation",
            extractPrompt: defaultExtractPrompt(defaultProperty),
          };
    setExtractTouched(false);
    patch({
      integrationId,
      capabilityId,
      object: defaultObject,
      property: defaultProperty,
      value: nextValue,
    });
    setThenPickerOpen(false);
  };

  const selectDisconnected = (id: IntegrationId) => {
    patch({
      integrationId: id,
      capabilityId: "",
      object: "",
      property: "",
    });
  };

  const connectIntegration = (id: IntegrationId) => {
    onIntegrationsChange(
      integrations.map((item) =>
        item.id === id ? { ...item, connected: true } : item
      )
    );
  };

  const setValueSource = (kind: ActionValueSource["kind"]) => {
    if (kind === "fixed") {
      patch({
        value: {
          kind: "fixed",
          value: draft.value.kind === "fixed" ? draft.value.value : "",
        },
      });
      return;
    }
    const prompt =
      draft.value.kind === "from_conversation"
        ? draft.value.extractPrompt
        : defaultExtractPrompt(draft.property);
    patch({ value: { kind: "from_conversation", extractPrompt: prompt } });
  };

  const published = (): AgentAction => {
    const agentLabel = (draft.agentLabel || suggestedAgentLabel(draft, capability)).trim();
    const name = (
      draft.name ||
      suggestedInternalName(integration?.name ?? "", agentLabel)
    ).trim();
    return {
      ...draft,
      name,
      agentLabel,
      description: draft.description.trim(),
      trigger: "ai_recommended",
      detectWhen: draft.detectWhen.trim(),
      detectExamples: draft.detectExamples.filter((item) => item.trim()),
      // An unassigned action has nobody to show it to, so it saves inactive —
      // the same way an unassigned response card stays a draft.
      status:
        draft.status === "inactive" || !hasAssignees ? "inactive" : "active",
      updated: "Just now",
    };
  };

  const save = () => {
    if (!canSave) return;
    onSave(published());
  };

  const extractedPreview = previewExtractedValue(draft);

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
            {isEditing ? "Edit action" : "Create action"}
          </h1>
        </div>
        <Button size="sm" disabled={!canSave} onClick={save}>
          Save action
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        {/* Assignment reads the same here as on response cards and live coaching:
            a widget top-left, not a step in the setup flow. */}
        <aside className="hidden w-[300px] shrink-0 flex-col overflow-auto py-6 pl-6 lg:flex">
          <AssignTeamAndGroups
            members={TEAM_MEMBERS}
            groups={USER_GROUPS}
            selectedMembers={draft.teamMembers}
            selectedGroups={draft.userGroups}
            onMembersChange={(teamMembers) => patch({ teamMembers })}
            onGroupsChange={(userGroups) => patch({ userGroups })}
          />
        </aside>

        <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-auto">
          <div className="mx-auto flex w-full max-w-[720px] flex-col gap-8 px-6 py-6">
            {needsReconnect && integration ? (
              <Banner
                variant="warning"
                width="page"
                title={`Connect ${integration.name} to continue`}
                actions={
                  <Button
                    size="xs"
                    variant="grey-outline"
                    onClick={() => connectIntegration(integration.id)}
                  >
                    Connect {integration.name}
                  </Button>
                }
              >
                This setup is kept as-is. Connecting uses your existing JustCall
                integration — nothing is written yet.
              </Banner>
            ) : null}

            <section className="flex flex-col gap-4">
              <header className="flex flex-col gap-1">
                <SectionKicker>When</SectionKicker>
                <h2 className="text-label-md-semi text-foreground">
                  When should this action be available?
                </h2>
                <p className="text-pretty text-paragraph-sm text-muted-foreground">
                  AI detects a relevant moment in the conversation and recommends
                  the Action.
                </p>
              </header>

              <div className="flex flex-col gap-3">
                <InputField
                  label="When"
                  placeholder="Customer mentions a competitor they use or are evaluating"
                  value={draft.detectWhen}
                  onChange={(event) => patch({ detectWhen: event.target.value })}
                  clearable={false}
                />
                <div className="flex flex-col gap-2">
                  <Button
                    variant="link"
                    size="sm"
                    className="self-start"
                    onClick={() => setExamplesOpen((open) => !open)}
                  >
                    {examplesOpen
                      ? "Hide examples"
                      : draft.detectExamples.filter((item) => item.trim()).length > 0
                        ? `Examples (${draft.detectExamples.filter((item) => item.trim()).length})`
                        : "+ Add examples"}
                  </Button>
                  {examplesOpen ? (
                    <ExamplePhrases
                      phrases={
                        draft.detectExamples.length > 0
                          ? draft.detectExamples
                          : [""]
                      }
                      onChange={(detectExamples) => patch({ detectExamples })}
                    />
                  ) : null}
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <header className="flex flex-col gap-1">
                <SectionKicker>Then</SectionKicker>
                <h2 className="text-label-md-semi text-foreground">
                  What should the agent be able to do?
                </h2>
              </header>

              {capability && integration && !thenPickerOpen ? (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-paragraph-md text-foreground">
                    {integration.name}
                    <span className="text-muted-foreground"> → </span>
                    {capability.label.replace(/^Update a /, "Update ")}
                  </p>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => setThenPickerOpen(true)}
                  >
                    Change
                  </Button>
                </div>
              ) : (
                <ThenPicker
                  integrations={integrations}
                  selectedIntegrationId={draft.integrationId}
                  selectedCapabilityId={draft.capabilityId}
                  onSelectOperation={selectOperation}
                  onSelectDisconnected={selectDisconnected}
                  onConnect={connectIntegration}
                />
              )}

              {capability && integration?.connected ? (
                <div className="flex flex-col gap-3">
                  {needsRecord ? (
                    <ConfigChain
                      object={draft.object}
                      objectOptions={objectOptions}
                      property={draft.property}
                      valueKind={draft.value.kind}
                      onObjectChange={(object) => patch({ object })}
                      onPropertyChange={(property) => {
                        patch({
                          property,
                          value:
                            draft.value.kind === "from_conversation" &&
                            !extractTouched
                              ? {
                                  kind: "from_conversation",
                                  extractPrompt: defaultExtractPrompt(property),
                                }
                              : draft.value,
                        });
                      }}
                      onValueKindChange={setValueSource}
                    />
                  ) : (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <ChainDropdown
                        placeholder="Value"
                        options={VALUE_SOURCE_OPTIONS}
                        value={draft.value.kind}
                        onChange={(kind) =>
                          setValueSource(kind as ActionValueSource["kind"])
                        }
                      />
                    </div>
                  )}

                  {needsRecord && !draft.property ? null : draft.value.kind ===
                    "from_conversation" ? (
                    <InputField
                      label="What should AI extract?"
                      placeholder="The competitor the customer is currently using or evaluating."
                      value={draft.value.extractPrompt}
                      onChange={(event) => {
                        setExtractTouched(true);
                        patch({
                          value: {
                            kind: "from_conversation",
                            extractPrompt: event.target.value,
                          },
                        });
                      }}
                      clearable={false}
                    />
                  ) : (
                    <InputField
                      label="Fixed value"
                      placeholder="e.g. Qualified"
                      value={draft.value.value}
                      onChange={(event) =>
                        patch({
                          value: { kind: "fixed", value: event.target.value },
                        })
                      }
                      clearable={false}
                    />
                  )}

                  <Toggle
                    size="sm"
                    checked={draft.requiresConfirmation}
                    onCheckedChange={(checked) =>
                      patch({ requiresConfirmation: checked })
                    }
                    label="Ask the agent to confirm before writing"
                    description="On by default for actions that write to a connected app."
                  />
                </div>
              ) : null}
            </section>

            <div className="flex flex-col gap-4 lg:hidden">
              <AssignTeamAndGroups
                members={TEAM_MEMBERS}
                groups={USER_GROUPS}
                selectedMembers={draft.teamMembers}
                selectedGroups={draft.userGroups}
                onMembersChange={(teamMembers) => patch({ teamMembers })}
                onGroupsChange={(userGroups) => patch({ userGroups })}
              />
              <AgentPreviewPanel
                draft={draft}
                integrationName={integration?.name}
                capabilityLabel={capability?.label}
                extracted={extractedPreview}
              />
            </div>
          </div>
        </div>

        <aside className="hidden w-[340px] shrink-0 flex-col overflow-auto border-l border-line bg-secondary-bg lg:flex">
          <AgentPreviewPanel
            draft={draft}
            integrationName={integration?.name}
            capabilityLabel={capability?.label}
            extracted={extractedPreview}
          />
        </aside>
      </div>
    </main>
  );
}

function ThenPicker({
  integrations,
  selectedIntegrationId,
  selectedCapabilityId,
  onSelectOperation,
  onSelectDisconnected,
  onConnect,
}: {
  integrations: Integration[];
  selectedIntegrationId: IntegrationId;
  selectedCapabilityId: string;
  onSelectOperation: (integrationId: IntegrationId, capabilityId: string) => void;
  onSelectDisconnected: (id: IntegrationId) => void;
  onConnect: (id: IntegrationId) => void;
}) {
  const ordered = [...integrations].sort((a, b) => {
    if (a.connected === b.connected) return 0;
    return a.connected ? -1 : 1;
  });

  return (
    <div className="flex flex-col gap-5">
      {ordered.map((item) => {
        const operations = operationsForIntegration(item);
        const selectedHere = selectedIntegrationId === item.id;
        return (
          <div key={item.id} className="flex flex-col gap-2">
            <p className="text-label-md-semi text-foreground">{item.name}</p>
            {item.connected ? (
              <ul className="flex flex-col gap-1">
                {operations.map((operation) => {
                  const selected =
                    selectedHere && selectedCapabilityId === operation.id;
                  return (
                    <li key={operation.id}>
                      <Radio
                        name="action-then"
                        size="sm"
                        label={operation.label}
                        checked={selected}
                        onChange={() => onSelectOperation(item.id, operation.id)}
                      />
                    </li>
                  );
                })}
              </ul>
            ) : selectedHere ? (
              <div className="flex flex-col gap-3 rounded-lg border border-line bg-white px-3 py-3">
                <div className="flex flex-col gap-1">
                  <p className="text-label-md-semi text-foreground">
                    Connect {item.name} to continue
                  </p>
                  <p className="text-pretty text-paragraph-sm text-muted-foreground">
                    Uses your existing JustCall connection. This setup stays
                    exactly where you left it.
                  </p>
                </div>
                <Button
                  size="sm"
                  className="self-start"
                  onClick={() => onConnect(item.id)}
                >
                  Connect {item.name}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => onSelectDisconnected(item.id)}
                className="w-fit cursor-pointer text-label-md text-brand outline-none hover:text-brand-hover focus-visible:ring-2 focus-visible:ring-brand/24"
              >
                Connect {item.name} to continue
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ConfigChain({
  object,
  objectOptions,
  property,
  valueKind,
  onObjectChange,
  onPropertyChange,
  onValueKindChange,
}: {
  object: string;
  objectOptions: { value: string; label: string }[];
  property: string;
  valueKind: ActionValueSource["kind"];
  onObjectChange: (value: string) => void;
  onPropertyChange: (value: string) => void;
  onValueKindChange: (kind: ActionValueSource["kind"]) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ChainDropdown
        placeholder="Record"
        options={objectOptions}
        value={object}
        onChange={onObjectChange}
      />
      <IconChevronRight
        size={16}
        className="size-4 shrink-0 text-muted-foreground"
      />
      <ChainDropdown
        placeholder="Field"
        searchable
        options={ACTION_PROPERTY_OPTIONS}
        value={property}
        onChange={onPropertyChange}
      />
      <IconChevronRight
        size={16}
        className="size-4 shrink-0 text-muted-foreground"
      />
      <ChainDropdown
        placeholder="Value"
        options={VALUE_SOURCE_OPTIONS}
        value={valueKind}
        onChange={(kind) => onValueKindChange(kind as ActionValueSource["kind"])}
      />
    </div>
  );
}

function ChainDropdown({
  placeholder,
  options,
  value,
  onChange,
  searchable = false,
}: {
  placeholder: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  searchable?: boolean;
}) {
  return (
    <Dropdown
      placeholder={placeholder}
      searchable={searchable}
      searchPlaceholder="Search"
      options={options}
      value={value}
      onValueChange={(next) => onChange(pick(next))}
      className="w-[168px]"
      triggerClassName="h-9"
    />
  );
}

function ExamplePhrases({
  phrases,
  onChange,
}: {
  phrases: string[];
  onChange: (next: string[]) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      {phrases.map((phrase, index) => (
        <InputField
          key={index}
          placeholder='e.g. “We currently use Aircall.”'
          value={phrase}
          onChange={(event) => {
            const next = [...phrases];
            next[index] = event.target.value;
            onChange(next);
          }}
          clearable={false}
        />
      ))}
      <Button
        variant="link"
        size="sm"
        className="self-start"
        onClick={() => onChange([...phrases, ""])}
      >
        Add example
      </Button>
    </div>
  );
}

function previewRecordValue(object: string): string {
  const key = object.trim().toLowerCase();
  if (key === "contact" || key === "person") return "Elena Vasquez";
  return "Acme Corp";
}

function AgentPreviewPanel({
  draft,
  integrationName,
  capabilityLabel,
  extracted,
}: {
  draft: AgentAction;
  integrationName?: string;
  capabilityLabel?: string;
  extracted: string;
}) {
  const ready = Boolean(draft.capabilityId);
  const property = draft.property || capabilityLabel || "Value";
  const recordKind = draft.object || "Record";

  return (
    <div className="flex flex-col gap-4 p-5">
      <div className="flex min-w-0 flex-col gap-1">
        <SectionKicker>Agent preview</SectionKicker>
        <p className="text-pretty text-paragraph-sm text-muted-foreground">
          What the agent will see during the call.
        </p>
      </div>

      {ready ? (
        <InCallActionSuggestionCard
          title={draft.agentLabel || draft.name || "Untitled action"}
          property={property}
          value={extracted.trim() ? extracted : "Select a value"}
          recordLabel={
            integrationName ? `${integrationName} ${recordKind}` : recordKind
          }
          recordValue={previewRecordValue(draft.object)}
        />
      ) : (
        <div className="rounded-lg border border-dashed border-line bg-white px-3 py-4">
          <p className="text-pretty text-paragraph-sm text-muted-foreground">
            Choose what the agent should do to see a preview.
          </p>
        </div>
      )}
    </div>
  );
}

