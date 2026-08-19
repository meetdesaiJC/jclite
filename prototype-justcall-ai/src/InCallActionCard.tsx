import * as React from "react";
import { InputField } from "@/components/InputField";
import { IconCircleCheckFilled } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { IconAaActions } from "./icons/AgentAssistNavIcons";
import {
  capabilityById,
  integrationById,
  integrationDeepLink,
  integrationDoneLabel,
  integrationWriteLabel,
  isSendEmailCapability,
  previewEmail,
  previewExtractedValue,
  type AgentAction,
  type EmailAttachment,
  type Integration,
} from "./actionsData";

export function ActionReviewField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-label-sm text-muted-foreground">{label}</dt>
      <dd className="text-pretty text-paragraph-md text-foreground">{value}</dd>
    </div>
  );
}

function ActionCardCta({
  label,
  busy,
  onClick,
}: {
  label: string;
  busy?: boolean;
  onClick?: () => void;
}) {
  const className =
    "-mr-1 inline-flex h-7 shrink-0 cursor-pointer items-center rounded-[4px] px-2 text-label-sm font-medium text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24 disabled:cursor-default disabled:opacity-60";
  if (onClick) {
    return (
      <button type="button" disabled={busy} onClick={onClick} className={className}>
        {label}
      </button>
    );
  }
  return <span className={cn(className, "cursor-default")}>{label}</span>;
}

function ActionReviewActions({
  cancelLabel = "Cancel",
  confirmLabel,
  confirmDisabled,
  busy,
  onCancel,
  onConfirm,
}: {
  cancelLabel?: string;
  confirmLabel: string;
  confirmDisabled?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        onClick={onCancel}
        className="inline-flex h-7 cursor-pointer items-center rounded-[4px] px-2 text-label-sm text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
      >
        {cancelLabel}
      </button>
      <button
        type="button"
        disabled={confirmDisabled || busy}
        onClick={onConfirm}
        className="inline-flex h-7 cursor-pointer items-center rounded-[4px] px-2 text-label-sm font-medium text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24 disabled:cursor-default disabled:opacity-60"
      >
        {confirmLabel}
      </button>
    </div>
  );
}

function ActionCardHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2">
      <IconAaActions className="size-4 shrink-0 text-foreground" />
      <p className="min-w-0 flex-1 text-pretty text-label-md font-medium text-foreground">
        {title}
      </p>
    </div>
  );
}

/**
 * Suggested-state Action card — the same surface the agent sees mid-call.
 * Preview and the live panel both wire `onReview` so the next state is visible.
 */
export function InCallActionSuggestionCard({
  title,
  property,
  value,
  recordLabel,
  recordValue,
  busy = false,
  onReview,
  className,
}: {
  title: string;
  property: string;
  value: string;
  recordLabel: string;
  recordValue: string;
  busy?: boolean;
  onReview?: () => void;
  className?: string;
}) {
  const cta = busy ? "Working…" : "Review action";

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 rounded-lg border border-line bg-white px-3 py-2",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <IconAaActions className="size-4 shrink-0 text-foreground" />
        <p className="min-w-0 flex-1 text-pretty text-label-md font-medium text-foreground">
          {title}
        </p>
        <ActionCardCta label={cta} busy={busy} onClick={onReview} />
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 pl-6">
        <ActionReviewField label={property} value={value} />
        <ActionReviewField label={recordLabel} value={recordValue} />
      </dl>
    </div>
  );
}

/**
 * Suggested-state Send email card — recipient, subject, and the generated
 * body. Setup preview and the live stream share this surface.
 */
export function InCallEmailSuggestionCard({
  title,
  to,
  subject,
  body,
  attachments = [],
  cta = "Review email",
  busy = false,
  onReview,
  className,
}: {
  title: string;
  to: string;
  subject: string;
  body: string;
  attachments?: EmailAttachment[];
  cta?: string;
  busy?: boolean;
  onReview?: () => void;
  className?: string;
}) {
  const label = busy ? "Working…" : cta;

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 rounded-lg border border-line bg-white px-3 py-2",
        className
      )}
    >
      <div className="flex items-center gap-2">
        <IconAaActions className="size-4 shrink-0 text-foreground" />
        <p className="min-w-0 flex-1 text-pretty text-label-md font-medium text-foreground">
          {title}
        </p>
        <ActionCardCta label={label} busy={busy} onClick={onReview} />
      </div>

      <div className="flex flex-col gap-1.5 pl-6">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-1">
          <ActionReviewField label="To" value={to} />
          <ActionReviewField label="Subject" value={subject} />
        </dl>
        <p className="line-clamp-4 whitespace-pre-wrap text-pretty text-paragraph-sm text-foreground">
          {body}
        </p>
        {attachments.length > 0 ? (
          <p className="text-label-sm text-muted-foreground">
            {attachments.length === 1
              ? attachments[0]!.name
              : `${attachments.length} attachments`}
          </p>
        ) : null}
      </div>
    </div>
  );
}

/** Expanded review form after the agent clicks Review email. */
export function InCallEmailReviewCard({
  title,
  to,
  subject,
  message,
  attachments = [],
  busy = false,
  onToChange,
  onSubjectChange,
  onMessageChange,
  onCancel,
  onConfirm,
  className,
}: {
  title: string;
  to: string;
  subject: string;
  message: string;
  attachments?: EmailAttachment[];
  busy?: boolean;
  onToChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  className?: string;
}) {
  const sendBlocked = !to.trim() || !subject.trim() || !message.trim();
  const bodyId = React.useId();

  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 rounded-lg border border-brand bg-white px-3 py-2",
        className
      )}
    >
      <ActionCardHeader title={title} />

      <div className="flex flex-col gap-2.5 border-t border-line pt-2">
        <InputField
          label="To"
          value={to}
          onChange={(event) => onToChange(event.target.value)}
          clearable={false}
        />
        <InputField
          label="Subject"
          value={subject}
          onChange={(event) => onSubjectChange(event.target.value)}
          clearable={false}
        />
        <div className="flex flex-col gap-1.5">
          <label className="text-label-md text-foreground" htmlFor={bodyId}>
            Message
          </label>
          <textarea
            id={bodyId}
            rows={7}
            value={message}
            onChange={(event) => onMessageChange(event.target.value)}
            className="w-full resize-y rounded-[4px] border border-line bg-white px-3 py-2.5 text-paragraph-sm text-foreground outline-none hover:border-control-border focus:border-brand focus:ring-2 focus:ring-brand/16"
          />
        </div>
        {attachments.length > 0 ? (
          <p className="text-paragraph-sm text-muted-foreground">
            Attached: {attachments.map((item) => item.name).join(", ")}
          </p>
        ) : null}
        <p className="text-paragraph-sm text-muted-foreground">
          Nothing is sent until you confirm.
        </p>
        <ActionReviewActions
          confirmLabel="Send email"
          confirmDisabled={sendBlocked}
          busy={busy}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </div>
    </div>
  );
}

export interface ActionReviewEditableField {
  label: string;
  inputLabel: string;
  value: string;
  placeholder?: string;
  helpText?: string;
  missing?: boolean;
}

/** Expanded review form after the agent clicks Review action. */
export function InCallActionReviewCard({
  writeLabel,
  recordLabel,
  recordValue,
  readonlyFields,
  editableFields,
  integrationName,
  onFieldChange,
  onCancel,
  onConfirm,
  confirmDisabled,
  className,
}: {
  writeLabel: string;
  recordLabel: string;
  recordValue: string;
  readonlyFields: { label: string; value: string }[];
  editableFields: ActionReviewEditableField[];
  integrationName: string;
  onFieldChange: (label: string, value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  confirmDisabled?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 flex-col gap-2 rounded-lg border border-brand bg-white px-3 py-2",
        className
      )}
    >
      <ActionCardHeader title={writeLabel} />

      <div className="flex flex-col gap-2.5 border-t border-line pt-2">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
          <ActionReviewField label={recordLabel} value={recordValue} />
          {readonlyFields.map((field) => (
            <ActionReviewField
              key={field.label}
              label={field.label}
              value={field.value}
            />
          ))}
          <ActionReviewField label="Current value" value="—" />
        </dl>
        {editableFields.map((field) => (
          <InputField
            key={field.label}
            label={field.inputLabel}
            placeholder={field.placeholder}
            value={field.value}
            onChange={(event) => onFieldChange(field.label, event.target.value)}
            helpText={field.helpText}
            helpIcon={field.missing}
            clearable={false}
          />
        ))}
        <p className="text-paragraph-sm text-muted-foreground">
          Nothing is written to {integrationName} until you confirm.
        </p>
        <ActionReviewActions
          confirmLabel={writeLabel}
          confirmDisabled={confirmDisabled}
          onCancel={onCancel}
          onConfirm={onConfirm}
        />
      </div>
    </div>
  );
}

export function InCallActionDoneCard({
  label,
  viewUrl,
  viewName,
  className,
}: {
  label: string;
  viewUrl?: string;
  viewName?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-start gap-2 rounded-lg border border-success-border bg-success-secondary px-3 py-2",
        className
      )}
      role="status"
    >
      <IconCircleCheckFilled size={16} className="mt-px size-4 shrink-0 text-success" />
      <div className="min-w-0 flex-1">
        <p className="text-label-md font-medium text-foreground">{label}</p>
        {viewUrl ? (
          <a
            href={viewUrl}
            target="_blank"
            rel="noreferrer"
            className="text-label-sm font-medium text-brand hover:text-brand-hover"
          >
            View in {viewName}
          </a>
        ) : null}
      </div>
    </div>
  );
}

function previewRecordValue(object: string): string {
  const key = object.trim().toLowerCase();
  if (key === "contact" || key === "person") return "Elena Vasquez";
  return "Acme Corp";
}

type PreviewView = "suggested" | "review" | "done";

/**
 * Admin preview of an in-call Action — suggested card, then the review
 * form the agent gets after clicking Review. Same cards as the live panel.
 */
export function ActionInCallPreview({
  action,
  integrations,
  className,
}: {
  action: AgentAction;
  integrations: Integration[];
  className?: string;
}) {
  const integration = integrationById(integrations, action.integrationId);
  const capability = capabilityById(
    integrations,
    action.integrationId,
    action.capabilityId
  );
  const isEmail = isSendEmailCapability(capability);
  const canReview = !isEmail || action.requiresConfirmation;
  const extracted = previewExtractedValue(action);
  const property = action.property || capability?.label || "Value";
  const recordKind = action.object || "Record";
  const recordValue = previewRecordValue(action.object);
  const integrationName = integration?.name ?? "this app";
  const writeLabel = integrationWriteLabel(action, integrations);
  const email = isEmail ? previewEmail(action) : null;

  const [view, setView] = React.useState<PreviewView>("suggested");
  const [filled, setFilled] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    setView("suggested");
    setFilled({});
  }, [action.id, action.capabilityId]);

  React.useEffect(() => {
    if (!canReview && view === "review") setView("suggested");
  }, [canReview, view]);

  const patchFilled = (label: string, value: string) =>
    setFilled((current) => ({ ...current, [label]: value }));

  const openReview = () => {
    if (!canReview) {
      setView("done");
      return;
    }
    setFilled((current) => {
      if (email) {
        return {
          To: current.To ?? email.to,
          Subject: current.Subject ?? email.subject,
          Message: current.Message ?? email.body,
        };
      }
      return {
        ...current,
        "New value": current["New value"] ?? (extracted.trim() ? extracted : ""),
      };
    });
    setView("review");
  };

  const card =
    view === "done" ? (
      <InCallActionDoneCard
        label={integrationDoneLabel(action, integrations)}
        viewUrl={integrationDeepLink(action.integrationId)}
        viewName={integrationName}
      />
    ) : view === "review" && email ? (
      <InCallEmailReviewCard
        title={email.title}
        to={filled.To ?? email.to}
        subject={filled.Subject ?? email.subject}
        message={filled.Message ?? email.body}
        attachments={email.attachments}
        onToChange={(value) => patchFilled("To", value)}
        onSubjectChange={(value) => patchFilled("Subject", value)}
        onMessageChange={(value) => patchFilled("Message", value)}
        onCancel={() => setView("suggested")}
        onConfirm={() => setView("done")}
      />
    ) : view === "review" ? (
      <InCallActionReviewCard
        writeLabel={writeLabel}
        recordLabel={recordKind}
        recordValue={recordValue}
        readonlyFields={
          property
            ? [{ label: "Property", value: property }]
            : []
        }
        editableFields={[
          {
            label: "New value",
            inputLabel: property,
            value: filled["New value"] ?? (extracted.trim() ? extracted : ""),
            placeholder: `Select ${property.toLowerCase()}`,
            missing: !extracted.trim(),
            helpText: !extracted.trim()
              ? "Not found in the conversation — add it to continue."
              : undefined,
          },
        ]}
        integrationName={integrationName}
        onFieldChange={patchFilled}
        onCancel={() => setView("suggested")}
        onConfirm={() => setView("done")}
        confirmDisabled={!((filled["New value"] ?? extracted).trim())}
      />
    ) : email ? (
      <InCallEmailSuggestionCard
        title={email.title}
        to={email.to}
        subject={email.subject}
        body={email.body}
        attachments={email.attachments}
        cta={email.cta}
        onReview={openReview}
      />
    ) : (
      <InCallActionSuggestionCard
        title={action.agentLabel || action.name}
        property={property}
        value={extracted.trim() ? extracted : "Select a value"}
        recordLabel={integration ? `${integration.name} ${recordKind}` : recordKind}
        recordValue={recordValue}
        onReview={openReview}
      />
    );

  return <div className={className}>{card}</div>;
}
