import * as React from "react";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { InputField } from "@/components/InputField";
import { Modal } from "@/components/Modal";
import { IconCircleCheckFilled, IconClose, IconEye } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { AssignTeamAndGroups } from "./AssignTeamAndGroups";
import { TEAM_MEMBERS, USER_GROUPS } from "./guidanceData";
import { IconCoaching } from "./LiveAgentAssistPanel";
import {
  COACHING_FREQUENCY_OPTIONS,
  COACHING_TEMPLATES,
  coachingTemplate,
  createCoachingRuleFromTemplate,
  evaluateCoachingSample,
  type CoachingFrequency,
  type CoachingRule,
  type CoachingTemplateId,
} from "./coachingData";

/**
 * Coaching setup — the admin picks a behaviour to watch for and adjusts the
 * numbers. Templates carry the detection logic so nobody has to describe
 * "talk ratio over a rolling window" from an empty form.
 */

export function CoachingTemplatesModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (templateId: CoachingTemplateId) => void;
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="md"
      title="What should Agent Assist coach on?"
      description="Coaching reacts to how the conversation is going, not what it's about. Start from a template and tune the thresholds."
    >
      <ul className="flex flex-col gap-2">
        {COACHING_TEMPLATES.map((template) => (
          <li key={template.id}>
            <button
              type="button"
              onClick={() => onSelect(template.id)}
              className="flex w-full cursor-pointer items-start gap-3 rounded-lg border border-line bg-white p-3 text-left outline-none transition-colors hover:border-brand hover:bg-brand-subtle/30 focus-visible:ring-2 focus-visible:ring-brand/24"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-[6px] bg-secondary-bg text-muted-foreground">
                <IconCoaching className="size-4" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="text-label-md-semi text-foreground">
                  {template.name}
                </span>
                <span className="text-pretty text-paragraph-sm text-muted-foreground">
                  {template.description}
                </span>
                <span className="text-paragraph-sm text-muted-foreground">
                  {template.metricLabel} {template.comparator.toLowerCase()}{" "}
                  {template.defaultThreshold} · {template.defaultWindow.toLowerCase()}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  );
}

export interface CreateCoachingPageProps {
  initial: CoachingRule;
  mode: "create" | "edit";
  onClose: () => void;
  onSave: (rule: CoachingRule) => void;
}

export function CreateCoachingPage({
  initial,
  mode,
  onClose,
  onSave,
}: CreateCoachingPageProps) {
  const [draft, setDraft] = React.useState<CoachingRule>(initial);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const [testOpen, setTestOpen] = React.useState(false);
  const template = coachingTemplate(draft.templateId);

  const patch = (partial: Partial<CoachingRule>) =>
    setDraft((current) => ({ ...current, ...partial }));

  const canSave = draft.name.trim().length > 0 && draft.message.trim().length > 0;
  const hasAssignees = draft.teamMembers.length > 0 || draft.userGroups.length > 0;

  const toOptions = (values: string[]) =>
    values.map((value) => ({ value, label: value }));

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
            {mode === "edit" ? "Edit coaching" : "Create coaching"}
          </h1>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="grey-outline"
            size="sm"
            leftIcon={<IconEye size={16} />}
            onClick={() => setTestOpen(true)}
          >
            Test
          </Button>
          <Button size="sm" disabled={!canSave} onClick={() => setPublishOpen(true)}>
            {mode === "edit" ? "Save" : "Create"}
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
            <InputField
              label="Coaching name"
              placeholder={template.name}
              value={draft.name}
              onChange={(event) => patch({ name: event.target.value })}
              helpText="An internal name — agents never see this."
              helpIcon
              clearable={false}
            />
            <p className="text-pretty text-paragraph-sm text-muted-foreground">
              {template.description}
            </p>
          </SectionCard>

          <SectionCard
            title="Detect"
            description="The reading that has to hold before the agent is nudged."
          >
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex min-w-[200px] flex-1 flex-col gap-1.5">
                <span className="text-label-md text-foreground">Signal</span>
                <p className="flex h-9 items-center rounded-[4px] border border-line bg-secondary-bg px-3 text-paragraph-md text-foreground">
                  {draft.metricLabel}
                </p>
              </div>
              <Dropdown
                label={draft.comparator}
                searchable={false}
                options={toOptions(template.thresholdOptions)}
                value={draft.threshold}
                onValueChange={(value) =>
                  patch({ threshold: Array.isArray(value) ? value[0]! : value })
                }
                className="w-[180px]"
                triggerClassName="h-9"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Dropdown
                label="Measure over"
                searchable={false}
                options={toOptions(template.windowOptions)}
                value={draft.window}
                onValueChange={(value) =>
                  patch({ window: Array.isArray(value) ? value[0]! : value })
                }
                className="min-w-[200px] flex-1"
                triggerClassName="h-9"
              />
              <Dropdown
                label="Start detecting after"
                searchable={false}
                options={toOptions(template.startAfterOptions)}
                value={draft.startAfter}
                onValueChange={(value) =>
                  patch({ startAfter: Array.isArray(value) ? value[0]! : value })
                }
                className="min-w-[200px] flex-1"
                triggerClassName="h-9"
              />
            </div>
          </SectionCard>

          <SectionCard
            title="What should the agent see?"
            description="One short line, mid-call. Keep it about the behaviour, not the agent."
          >
            <InputField
              label="Message"
              placeholder={template.message}
              value={draft.message}
              onChange={(event) => patch({ message: event.target.value })}
              clearable={false}
            />
            <InputField
              label="Suggestion (optional)"
              placeholder={template.suggestion}
              value={draft.suggestion}
              onChange={(event) => patch({ suggestion: event.target.value })}
              clearable={false}
            />
            <CoachingPreview rule={draft} />
          </SectionCard>

          <SectionCard
            title="Frequency"
            description="Coaching should never nag. Pick how often this rule may interrupt."
          >
            <Dropdown
              searchable={false}
              options={COACHING_FREQUENCY_OPTIONS}
              value={draft.frequency}
              onValueChange={(value) =>
                patch({
                  frequency: (Array.isArray(value) ? value[0] : value) as CoachingFrequency,
                })
              }
              className="w-full max-w-[320px]"
              triggerClassName="h-9"
            />
            {draft.frequency === "cooldown" ? (
              <InputField
                label="Cooldown (minutes)"
                type="number"
                min={1}
                value={String(draft.cooldownMinutes)}
                onChange={(event) =>
                  patch({ cooldownMinutes: Math.max(1, Number(event.target.value) || 1) })
                }
                clearable={false}
                wrapperClassName="max-w-[180px]"
              />
            ) : null}
          </SectionCard>
        </div>
      </div>

      <CoachingTestModal
        open={testOpen}
        rule={draft}
        onClose={() => setTestOpen(false)}
      />

      <Modal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        size="sm"
        className="overflow-visible"
        bodyClassName="overflow-visible"
        title="Ready to publish"
        description="Assigned agents start getting this nudge when the behaviour shows up."
        footer={
          <>
            <Button variant="grey-outline" size="sm" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!hasAssignees}
              onClick={() =>
                onSave({
                  ...draft,
                  name: draft.name.trim(),
                  message: draft.message.trim(),
                  suggestion: draft.suggestion.trim(),
                  status: "live",
                  updated: "Just now",
                })
              }
            >
              Publish
            </Button>
          </>
        }
      >
        <dl className="flex flex-col gap-3">
          <div>
            <dt className="text-label-sm text-muted-foreground">Coaching</dt>
            <dd className="text-paragraph-md text-foreground">{draft.name}</dd>
          </div>
          <div>
            <dt className="text-label-sm text-muted-foreground">Detect</dt>
            <dd className="text-paragraph-md text-foreground">
              {draft.metricLabel} {draft.comparator.toLowerCase()} {draft.threshold} ·{" "}
              {draft.window.toLowerCase()}
            </dd>
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
    </main>
  );
}

/** The banner exactly as it lands mid-call, so the wording can be judged. */
function CoachingPreview({ rule }: { rule: CoachingRule }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-label-sm text-muted-foreground">
        What the agent sees during the call
      </span>
      <div className="flex items-start gap-2 rounded-lg border border-warning-border bg-warning-secondary px-3 py-2.5">
        <IconCoaching className="mt-px size-4 shrink-0 text-warning-text" />
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <p className="text-label-sm font-medium tracking-[0.04em] text-warning-text uppercase">
            Coaching
          </p>
          <p className="text-pretty text-label-md font-medium text-foreground">
            {rule.message || "Your message shows up here"}
          </p>
          <p className="text-pretty text-paragraph-sm text-muted-foreground">
            {rule.metricLabel} {rule.comparator.toLowerCase()} {rule.threshold} ·{" "}
            {rule.window.toLowerCase()}
          </p>
          {rule.suggestion ? (
            <p className="mt-1 text-pretty text-paragraph-sm text-foreground">
              {rule.suggestion}
            </p>
          ) : null}
        </div>
        <span className="-mt-0.5 -mr-1 inline-flex h-7 shrink-0 items-center px-2 text-label-sm font-medium text-warning-text">
          Got it
        </span>
      </div>
    </div>
  );
}

/**
 * Coaching test (§34) — the admin supplies a reading rather than an audio
 * file, and sees whether their thresholds would have fired on it.
 */
function CoachingTestModal({
  open,
  rule,
  onClose,
}: {
  open: boolean;
  rule: CoachingRule;
  onClose: () => void;
}) {
  const [sample, setSample] = React.useState("");
  const [result, setResult] = React.useState<ReturnType<
    typeof evaluateCoachingSample
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
      title="Test this coaching rule"
      description="Enter a reading from a real call. Nothing is sent to any agent."
      footer={
        <>
          <Button variant="grey-outline" size="sm" onClick={onClose}>
            Close
          </Button>
          <Button
            size="sm"
            disabled={!sample.trim()}
            onClick={() => setResult(evaluateCoachingSample(rule, sample))}
          >
            Run test
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <InputField
          label={`Simulated ${rule.metricLabel.toLowerCase()}`}
          placeholder={rule.threshold}
          value={sample}
          onChange={(event) => setSample(event.target.value)}
          helpText={`Rule fires when ${rule.metricLabel.toLowerCase()} is ${rule.comparator.toLowerCase()} ${rule.threshold}.`}
          helpIcon
          clearable={false}
        />

        {result ? (
          <div
            className={cn(
              "flex flex-col gap-1.5 rounded-lg border px-3 py-2.5",
              result.triggered
                ? "border-success-border bg-success-secondary"
                : "border-line bg-secondary-bg"
            )}
            aria-live="polite"
          >
            <p className="text-paragraph-md text-foreground">
              {result.measuredLabel}: {result.measuredValue}
            </p>
            <p className="flex items-center gap-1.5 text-label-md font-medium text-foreground">
              {result.triggered ? (
                <>
                  <IconCircleCheckFilled
                    size={16}
                    className="size-4 shrink-0 text-success"
                  />
                  Rule triggered
                </>
              ) : (
                "Rule did not trigger"
              )}
            </p>
            {result.triggered ? (
              <p className="text-pretty text-paragraph-sm text-muted-foreground">
                The agent would see: “{rule.message}”
              </p>
            ) : (
              <p className="text-pretty text-paragraph-sm text-muted-foreground">
                Lower the threshold if you expected this reading to be coached.
              </p>
            )}
          </div>
        ) : null}
      </div>
    </Modal>
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

export { createCoachingRuleFromTemplate };
