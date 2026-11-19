import * as React from "react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { Modal } from "@/components/Modal";
import { FileDropzone, UploadedFile } from "@/components/FileDropzone";
import { Radio } from "@/components/Radio";
import { RadioCard } from "@/components/RadioCard";
import { Stepper, type StepperStep } from "@/components/Stepper";
import { Tag } from "@/components/Tag";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  IconCheck,
  IconClose,
  IconEye,
  IconInfoCircle,
  IconPhone,
  IconAdjustmentsHorizontal,
} from "@/components/Icon";
import {
  ACCOUNT_NUMBERS,
  CUSTOM_ROLES,
  LICENSE_SEATS,
} from "./teamMembersData";

/**
 * Teams › Team Members › Add Members — a full-page, three-step flow that
 * replaces the member list while it runs.
 *
 * Step 2 is "License Type & Role": the admin picks a license first, and only
 * Standard goes on to ask for a role. Lite and View-only carry fixed access,
 * so a role picker there would be a choice with no effect — the step shows
 * what the license includes instead. Every license then assigns numbers.
 */

type StepKey = "invite" | "access" | "numbers";

type InviteMode = "individual" | "bulk";
type RoleChoice = "admin" | "member" | "custom";
type License = "standard" | "lite" | "view-only";

const LICENSE_OPTIONS: {
  key: License;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    key: "standard",
    label: "Standard",
    icon: <IconPhone size={24} />,
    description: "Make and receive calls, send SMS, and run campaigns.",
  },
  {
    key: "lite",
    label: "Lite",
    icon: <IconAdjustmentsHorizontal size={24} />,
    description:
      "Manage team operations and review activity. No calling or SMS.",
  },
  {
    key: "view-only",
    label: "View-only",
    icon: <IconEye size={24} />,
    description: "View team activity and export reports. Editing is disabled.",
  },
];

// Copy is verbatim from the license access tables in the PRD.
const FIXED_ACCESS: Record<
  Exclude<License, "standard">,
  { can: string[]; cant: string[] }
> = {
  lite: {
    can: [
      "Manage phone numbers, team members, groups, and roles",
      "Manage inbox conversations, contacts, and integrations",
      "Manage Sales Dialer workflows",
      "Review call logs, recordings, transcripts, and reports",
      "Monitor live calls and whisper to agents",
      "Manage billing, payments, and plan changes",
    ],
    cant: [
      "Calling and SMS sending",
      "Campaign creation, editing, and launch",
      "Voice workflow creation, editing, and publishing",
      "Live call barge-in",
      "Plan cancellation",
    ],
  },
  "view-only": {
    can: [
      "Read inbox threads and review call logs, recordings, and transcripts",
      "View campaigns, workflows, dashboards, and analytics",
      "Export reports and download call logs",
      "View numbers, team members, groups, roles, and invoices",
      "Check integration status and update personal settings",
    ],
    cant: [
      "Calling and SMS sending",
      "Live call monitoring",
      "Inbox and campaign management",
      "Team, number, and workflow changes",
      "Integration setup and billing changes",
    ],
  },
};

const ROLE_OPTIONS: {
  key: RoleChoice;
  label: string;
  description: React.ReactNode;
}[] = [
  {
    key: "admin",
    label: "Admin",
    description:
      "The admin can add and configure numbers and members. Admin also has access to call and SMS analytics, billing, and calling credits.",
  },
  {
    key: "member",
    label: "Member",
    description:
      "A member can call & SMS using numbers assigned or shared with them. Members can only access their call & SMS analytics but cannot manage calling credits & billing information.",
  },
  {
    key: "custom",
    label: "Custom role",
    description: (
      <>
        Assign custom roles for members to enable tailored access across
        JustCall. This includes control over data access and functionality for
        individual users.{" "}
        <Button
          variant="link"
          size="sm"
          className="h-auto align-baseline text-paragraph-md"
        >
          Create Role
        </Button>
      </>
    ),
  },
];

// One email reads as a sentence; a row of them becomes a wall that wraps.
// The rest collapse into "+N", whose tooltip lists them for anyone checking.
const MAX_INVITEE_TAGS = 1;

// Deliberately loose: the server is the real validator. This only catches
// the obvious typo so the chip can say so before the admin presses Next.
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function splitEmails(raw: string) {
  return raw
    .split(/[\s,;]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Email entry that turns each address into a chip on Enter, comma, or paste,
 * so a list copied from a spreadsheet lands as separate invites.
 */
function EmailChipsInput({
  emails,
  onChange,
}: {
  emails: string[];
  onChange: (emails: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const commit = (raw: string) => {
    const next = splitEmails(raw).filter((e) => !emails.includes(e));
    if (next.length) onChange([...emails, ...next]);
    setDraft("");
  };

  const invalidCount = emails.filter((e) => !EMAIL_PATTERN.test(e)).length;

  return (
    <div className="flex flex-col gap-2">
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "flex min-h-10 w-full cursor-text flex-wrap items-center gap-1.5 rounded-[4px] border border-line bg-white px-1.5 py-1.5 transition-colors",
          "hover:border-control-border focus-within:border-brand focus-within:hover:border-brand",
          invalidCount > 0 &&
            "border-error hover:border-error focus-within:border-error focus-within:hover:border-error",
        )}
      >
        {emails.map((email) => (
          <Tag
            key={email}
            size="lg"
            color={EMAIL_PATTERN.test(email) ? "grey" : "red"}
            onClose={(event) => {
              event.stopPropagation();
              onChange(emails.filter((e) => e !== email));
            }}
          >
            {email}
          </Tag>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          aria-label="Email addresses"
          placeholder={emails.length ? "" : "email@example.com"}
          onChange={(event) => setDraft(event.target.value)}
          onKeyDown={(event) => {
            if ((event.key === "Enter" || event.key === ",") && draft.trim()) {
              event.preventDefault();
              commit(draft);
            } else if (event.key === "Backspace" && !draft && emails.length) {
              onChange(emails.slice(0, -1));
            }
          }}
          onPaste={(event) => {
            const text = event.clipboardData.getData("text");
            if (splitEmails(text).length > 1) {
              event.preventDefault();
              commit(text);
            }
          }}
          onBlur={() => draft.trim() && commit(draft)}
          className="h-7 min-w-[160px] flex-1 bg-transparent px-1.5 text-paragraph-md text-foreground outline-none placeholder:text-muted-foreground"
        />
      </div>
      <p
        className={cn(
          "flex items-center gap-1 text-paragraph-sm",
          invalidCount > 0 ? "text-error" : "text-muted-foreground",
        )}
      >
        <IconInfoCircle size={16} className="shrink-0" aria-hidden="true" />
        {invalidCount > 0
          ? `${invalidCount} ${invalidCount === 1 ? "email looks" : "emails look"} invalid — fix or remove ${invalidCount === 1 ? "it" : "them"} to continue`
          : "Press enter to add email(s)"}
      </p>
    </div>
  );
}

const MAX_IMPORT_BYTES = 25 * 1024 * 1024;

// When each file was accepted. The file lives in the flow's state, which this
// component doesn't own, so the timestamp rides alongside it here.
const uploadedAt = new WeakMap<File, Date>();

/** First rows of an uploaded CSV, so the admin can check it's the right file. */
function CsvPreviewModal({ file, onClose }: { file: File; onClose: () => void }) {
  const [rows, setRows] = useState<string[][] | null>(null);

  React.useEffect(() => {
    let live = true;
    void file.text().then((text) => {
      if (!live) return;
      setRows(
        text
          .split(/\r?\n/)
          .filter((line) => line.trim())
          .slice(0, 11)
          .map((line) => line.split(","))
      );
    });
    return () => {
      live = false;
    };
  }, [file]);

  const [head, ...body] = rows ?? [];
  return (
    <Modal
      open
      onClose={onClose}
      size="md"
      title={file.name}
      description="Showing the first 10 rows."
      footer={
        <Button size="sm" onClick={onClose}>
          Done
        </Button>
      }
    >
      {rows === null ? (
        <p className="text-paragraph-md text-muted-foreground">Reading file…</p>
      ) : rows.length === 0 ? (
        <p className="text-paragraph-md text-muted-foreground">This file is empty.</p>
      ) : (
        <div className="overflow-auto rounded-md border border-line">
          <table className="w-full text-left text-paragraph-sm">
            <thead className="bg-secondary-bg text-label-sm text-muted-foreground">
              <tr>
                {head.map((cell, c) => (
                  <th key={c} className="px-3 py-2 whitespace-nowrap">
                    {cell}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {body.map((row, r) => (
                <tr key={r} className="border-t border-line text-foreground">
                  {row.map((cell, c) => (
                    <td key={c} className="px-3 py-2 whitespace-nowrap">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Modal>
  );
}

function BulkImportDropzone({
  file,
  onFile,
}: {
  file: File | null;
  onFile: (file: File | null) => void;
}) {
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  if (file) {
    return (
      <>
        <UploadedFile
          name={file.name}
          size={file.size}
          uploadedAt={uploadedAt.get(file) ?? new Date()}
          onPreview={() => setPreviewing(true)}
          onRemove={() => onFile(null)}
        />
        {previewing ? <CsvPreviewModal file={file} onClose={() => setPreviewing(false)} /> : null}
      </>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <FileDropzone
        accept=".csv"
        hint={
          <>
            CSV (Max Size: <span className="text-foreground">25MB</span>)
          </>
        }
        sample={{
          appearance: "link",
          description: "Please use the attached sample as a starting reference",
          label: "Download sample CSV",
        }}
        onFiles={([picked]) => {
          // The picker's `accept` filters clicks but not drops, so check here.
          if (!picked.name.toLowerCase().endsWith(".csv")) {
            setError("That isn't a CSV file. Export your list as .csv and try again.");
            return;
          }
          if (picked.size > MAX_IMPORT_BYTES) {
            setError("That file is over 25MB. Split it into smaller files.");
            return;
          }
          setError(null);
          uploadedAt.set(picked, new Date());
          onFile(picked);
        }}
      />
      {error ? <p className="text-paragraph-sm text-error">{error}</p> : null}
    </div>
  );
}

function InviteStep({
  mode,
  onModeChange,
  emails,
  onEmailsChange,
  file,
  onFileChange,
}: {
  mode: InviteMode;
  onModeChange: (mode: InviteMode) => void;
  emails: string[];
  onEmailsChange: (emails: string[]) => void;
  file: File | null;
  onFileChange: (file: File | null) => void;
}) {
  return (
    <section className="flex w-full max-w-[580px] flex-col gap-6">
      <header className="flex flex-col gap-1">
        <h2 className="text-heading-xl text-foreground">Invite Members</h2>
        <p className="text-paragraph-md text-muted-foreground">
          Invite members one by one or simplify the process with bulk import.
        </p>
      </header>

      <div
        role="radiogroup"
        aria-label="Invite method"
        className="flex flex-col gap-5"
      >
        <div className="flex flex-col gap-3">
          <Radio
            name="invite-mode"
            size="md"
            checked={mode === "individual"}
            onCheckedChange={(checked) => checked && onModeChange("individual")}
            label={<span className="text-label-md">Invite individually</span>}
          />
          {mode === "individual" ? (
            <div className="pl-8">
              <EmailChipsInput emails={emails} onChange={onEmailsChange} />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-3">
          <Radio
            name="invite-mode"
            size="md"
            checked={mode === "bulk"}
            onCheckedChange={(checked) => checked && onModeChange("bulk")}
            label={<span className="text-label-md">Bulk import</span>}
          />
          {mode === "bulk" ? (
            <div className="pl-8">
              <BulkImportDropzone file={file} onFile={onFileChange} />
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function InviteeSummary({
  lead,
  invitees,
}: {
  lead: string;
  invitees: string[];
}) {
  const shown = invitees.slice(0, MAX_INVITEE_TAGS);
  const hidden = invitees.slice(MAX_INVITEE_TAGS);
  return (
    <div className="flex flex-wrap items-center gap-2 text-paragraph-md text-muted-foreground">
      <span>{lead}</span>
      {shown.map((email) => (
        <Tag key={email} size="lg" color="grey">
          {email}
        </Tag>
      ))}
      {hidden.length > 0 ? (
        <TooltipTrigger
          placement="bottom"
          content={
            <Tooltip theme="dark" arrow="top-center">
              <ul className="flex flex-col gap-1 text-paragraph-sm">
                {hidden.map((email) => (
                  <li key={email}>{email}</li>
                ))}
              </ul>
            </Tooltip>
          }
        >
          <Tag size="lg" color="grey">
            +{hidden.length}
          </Tag>
        </TooltipTrigger>
      ) : null}
    </div>
  );
}

function seatsLeft(license: License) {
  if (license === "standard") return null;
  const { total, used } = LICENSE_SEATS[license];
  return { left: total - used, total };
}

function SeatCount({ license }: { license: License }) {
  const seats = seatsLeft(license);
  if (!seats) return null;
  return (
    <Tag size="sm" color="grey">
      {seats.left} {seats.left === 1 ? "license" : "licenses"} left
    </Tag>
  );
}

function AccessColumn({
  title,
  items,
  included,
}: {
  title: string;
  items: readonly string[];
  included: boolean;
}) {
  const Mark = included ? IconCheck : IconClose;
  return (
    <div className="flex flex-col gap-3 p-5">
      <h4 className="text-label-md text-foreground">{title}</h4>
      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <li key={item} className="flex gap-3 text-paragraph-md text-foreground">
            <Mark
              size={20}
              className={cn("shrink-0", included ? "text-success" : "text-error")}
              aria-hidden="true"
            />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// What a fixed-access license can and can't do, in place of a Role list: one
// card, two columns with no rule between, so they read as one comparison. The
// "not included" half matters as much as the other: it's what stops an admin
// giving Lite to someone who needs to dial.
function FixedAccess({ license }: { license: Exclude<License, "standard"> }) {
  const access = FIXED_ACCESS[license];
  return (
    <section
      aria-label="License access"
      className="grid grid-cols-1 overflow-hidden rounded-md border border-line @min-[600px]:grid-cols-2"
    >
      <AccessColumn title="Included" items={access.can} included />
      <AccessColumn title="Not included" items={access.cant} included={false} />
    </section>
  );
}

function SetAccessStep({
  invitees,
  inviteeCount,
  license,
  onLicenseChange,
  role,
  onRoleChange,
  customRole,
  onCustomRoleChange,
}: {
  invitees: string[];
  /** Known only for individual invites; a CSV's size isn't known until import. */
  inviteeCount: number | null;
  license: License | undefined;
  onLicenseChange: (license: License) => void;
  role: RoleChoice | undefined;
  onRoleChange: (role: RoleChoice) => void;
  customRole: string | undefined;
  onCustomRoleChange: (role: string) => void;
}) {
  return (
    <section className="@container flex w-full max-w-[760px] flex-col gap-8">
      <header className="flex flex-col gap-2">
        <h2 className="text-heading-xl text-foreground">
          License Type &amp; Role
        </h2>
        <InviteeSummary lead="Inviting" invitees={invitees} />
      </header>

      <div className="flex flex-col gap-4">
        <h3 className="text-label-lg text-foreground">License type</h3>
        {/* Cards, side by side, because this is a comparison: the admin should
            see all three licenses at once before picking. They stack when the
            column is too narrow for three readable cards. */}
        <div
          role="radiogroup"
          aria-label="License type"
          className="grid grid-cols-1 gap-3 @min-[600px]:grid-cols-3"
        >
          {LICENSE_OPTIONS.map((option) => {
            const seats = seatsLeft(option.key);
            // Full, or too few licenses for everyone being invited at once.
            const short =
              seats !== null && seats.left < Math.max(1, inviteeCount ?? 1);
            return (
              // Every card sits in a trigger so the grid is identical either
              // way; the tooltip only switches on for a card that can't be picked.
              <TooltipTrigger
                key={option.key}
                placement="top"
                disabled={!short}
                className="flex h-full w-full"
                content={
                  short ? (
                    <Tooltip
                      theme="dark"
                      arrow="bottom-center"
                      title={`Not enough ${option.label} licenses`}
                      description={
                        seats.left === 0
                          ? `All ${option.label} licenses are in use. Ask your CSM to add more.`
                          : `You're inviting ${inviteeCount} members, but only ${seats.left} ${option.label} ${seats.left === 1 ? "license is" : "licenses are"} left. Ask your CSM to add more, or invite fewer people.`
                      }
                    />
                  ) : null
                }
              >
                <RadioCard
                  wrapperClassName="w-full"
                  name="member-license"
                  disabled={short}
                  checked={license === option.key}
                  onCheckedChange={(checked) =>
                    checked && onLicenseChange(option.key)
                  }
                  title={option.label}
                  icon={option.icon}
                  badge={<SeatCount license={option.key} />}
                  description={option.description}
                />
              </TooltipTrigger>
            );
          })}
        </div>
      </div>

      {license === "lite" || license === "view-only" ? (
        <FixedAccess license={license} />
      ) : null}

      {license === "standard" ? (
        <div className="flex flex-col gap-4">
          <h3 className="text-label-lg text-foreground">Role</h3>
          <div
            role="radiogroup"
            aria-label="Role"
            className="flex max-w-[620px] flex-col gap-5"
          >
            {ROLE_OPTIONS.map((option) => {
              const selected = role === option.key;
              return (
                <div key={option.key} className="flex flex-col gap-3">
                  <Radio
                    name="member-role"
                    size="md"
                    checked={selected}
                    onCheckedChange={(checked) =>
                      checked && onRoleChange(option.key)
                    }
                    // One style regardless of selection: the ring already says which
                    // is chosen, and a label that resizes makes the list jump.
                    label={
                      <span className="text-label-md">{option.label}</span>
                    }
                    description={
                      <span className="text-muted-foreground">
                        {option.description}
                      </span>
                    }
                  />
                  {option.key === "custom" && selected ? (
                    <div className="pl-8">
                      <Dropdown
                        placeholder="Select a custom role"
                        searchable
                        searchPlaceholder="Search roles"
                        options={CUSTOM_ROLES.map((r) => ({
                          value: r,
                          label: r,
                        }))}
                        value={customRole}
                        onValueChange={(value) =>
                          onCustomRoleChange(
                            Array.isArray(value) ? value[0] : value,
                          )
                        }
                        className="w-full max-w-[360px]"
                      />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </section>
  );
}

type NumberChoice = "own" | "share";

const NUMBER_OPTIONS: {
  key: NumberChoice;
  label: string;
  description: string;
}[] = [
  {
    key: "own",
    label: "Get Own Number",
    description: "This allows users to buy their own number",
  },
  {
    key: "share",
    label: "Share Number",
    description: "This allows members to share your existing numbers",
  },
];

function AssignNumbersStep({
  options,
  choice,
  onChoiceChange,
  sharedNumbers,
  onSharedNumbersChange,
}: {
  /** Which number options this license allows, in display order. */
  options: readonly NumberChoice[];
  choice: NumberChoice;
  onChoiceChange: (choice: NumberChoice) => void;
  sharedNumbers: string[];
  onSharedNumbersChange: (numbers: string[]) => void;
}) {
  const visible = NUMBER_OPTIONS.filter((o) => options.includes(o.key));
  // Sharing is the only option (View-only): the step is that one action, so
  // it's named for it and asks for the numbers — no choice. The helper line
  // reuses the Share Number option's copy so both paths say the same thing.
  const shareOnly = visible.length === 1 && visible[0].key === "share";
  const numberPicker = (
    <Dropdown
      multiple
      searchable
      searchPlaceholder="Search numbers"
      // Only the share-only step gets a field label; in the radio layout the
      // "Share Number" option directly above already names the picker.
      label={shareOnly ? "Select phone numbers" : undefined}
      placeholder={shareOnly ? "Select numbers to share" : "Select numbers"}
      options={ACCOUNT_NUMBERS}
      value={sharedNumbers}
      onValueChange={(value) => onSharedNumbersChange(Array.isArray(value) ? value : [value])}
      className="w-full max-w-[420px]"
    />
  );

  return (
    <section className="flex w-full max-w-[620px] flex-col gap-8">
      {shareOnly ? (
        <div className="flex flex-col gap-6">
          <header className="flex flex-col gap-2">
            <h2 className="text-heading-xl text-foreground">Share phone numbers</h2>
            <p className="text-paragraph-md text-muted-foreground">
              This allows members to share your existing numbers
            </p>
          </header>
          {numberPicker}
        </div>
      ) : (
        <>
        <header className="flex flex-col gap-2">
          <h2 className="text-heading-xl text-foreground">Assign Numbers</h2>
          <p className="text-paragraph-md text-muted-foreground">
            Assign phone numbers to newly added members
          </p>
        </header>
        <div role="radiogroup" aria-label="Number assignment" className="flex flex-col gap-5">
          {visible.map((option) => {
            const selected = choice === option.key;
            return (
              <div key={option.key} className="flex flex-col gap-3">
                <Radio
                  name="member-numbers"
                  size="md"
                  checked={selected}
                  onCheckedChange={(checked) => checked && onChoiceChange(option.key)}
                  label={<span className="text-label-md">{option.label}</span>}
                  description={
                    <span className="text-muted-foreground">{option.description}</span>
                  }
                />
                {option.key === "share" && selected ? (
                  <div className="pl-8">{numberPicker}</div>
                ) : null}
              </div>
            );
          })}
        </div>
      </>
      )}
    </section>
  );
}

/**
 * The last gate before invites go out (Figma "Prorated Charges", node
 * 2321:4920). It names no figures on purpose: contract pricing lives in each
 * account's Order Form, so the honest thing the product can say is that a
 * prorated charge is coming and on what basis, then let the admin go ahead.
 */
function ChargesNoticeModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open
      onClose={onCancel}
      size="sm"
      showCloseButton={false}
      title={<span className="text-heading-xl">Additional charges may apply</span>}
      description="Charges for additional team members will be calculated based on the rates specified in your Order Form, prorated for the remaining Contract Term."
      footer={
        <div className="flex w-full gap-4">
          <Button variant="grey-outline" size="sm" className="flex-1" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" className="flex-1" onClick={onConfirm}>
            Confirm &amp; Invite
          </Button>
        </div>
      }
    />
  );
}

/** Every distinct email address in a CSV, in file order, whatever its column. */
function emailsFromCsv(text: string) {
  const found = text
    .split(/[\r\n,;\t]+/)
    .map((cell) => cell.trim().replace(/^"|"$/g, ""))
    .filter((cell) => EMAIL_PATTERN.test(cell));
  return Array.from(new Set(found));
}

export function AddMembersFlow({
  onClose,
  onComplete,
}: {
  /** The ✕ — leaves without adding anyone. */
  onClose: () => void;
  /** Paid and invited; reports how many people were added. */
  onComplete: (count: number) => void;
}) {
  const [step, setStep] = useState<StepKey>("invite");
  const [mode, setMode] = useState<InviteMode>("individual");
  const [emails, setEmails] = useState<string[]>([]);
  const [file, setFile] = useState<File | null>(null);
  // Nothing preselected, license or role: what someone can do is the one
  // decision here an admin should make on purpose, not inherit by clicking Next.
  const [license, setLicense] = useState<License>();
  const [role, setRole] = useState<RoleChoice>();
  const [customRole, setCustomRole] = useState<string>();
  // Unlike license and role, this grants nothing, so the live default stays:
  // most new members get a number of their own.
  const [numberChoice, setNumberChoice] = useState<NumberChoice>("own");
  const [sharedNumbers, setSharedNumbers] = useState<string[]>([]);

  // A bulk import is read for its email addresses as soon as it lands, so the
  // later steps name the people being added — never the file — exactly as
  // they do for manual invites, and licenses and prices count the real total.
  const [importedEmails, setImportedEmails] = useState<string[]>([]);
  React.useEffect(() => {
    setImportedEmails([]);
    if (!file) return;
    let live = true;
    void file.text().then((text) => {
      if (live) setImportedEmails(emailsFromCsv(text));
    });
    return () => {
      live = false;
    };
  }, [file]);

  const invitees = mode === "individual" ? emails : importedEmails;
  const inviteeCount = invitees.length;

  const fixedAccess = license === "lite" || license === "view-only";
  const steps: StepperStep[] = [
    { key: "invite", label: "Invite Member" },
    { key: "access", label: "License Type & Role" },
    // Named for what the step does: View-only can only share numbers.
    { key: "numbers", label: license === "view-only" ? "Share numbers" : "Assign Numbers" },
  ];

  const inviteReady =
    mode === "individual"
      ? emails.length > 0 && emails.every((e) => EMAIL_PATTERN.test(e))
      : file !== null && importedEmails.length > 0;
  const accessReady =
    fixedAccess ||
    (license === "standard" && !!role && (role !== "custom" || !!customRole));
  // View-only can't dial or text, so it can't own a number: it can only be
  // shown numbers the account already has. Forced here rather than reset on
  // license change, so going back and switching licenses can't strand a
  // View-only invite on "Get own number".
  const numberOptions: readonly NumberChoice[] =
    license === "view-only" ? ["share"] : ["own", "share"];
  const effectiveNumberChoice: NumberChoice = numberOptions.includes(numberChoice)
    ? numberChoice
    : numberOptions[0];
  const numbersReady = effectiveNumberChoice === "own" || sharedNumbers.length > 0;
  const canAdvance =
    step === "invite"
      ? inviteReady
      : step === "access"
        ? accessReady
        : numbersReady;
  // The last step's button says what it does.
  const finishes = step === "numbers";
  const [reviewing, setReviewing] = useState(false);
  const memberWord = inviteeCount === 1 ? "Member" : "Members";

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex h-[74px] shrink-0 items-center justify-between gap-4 border-b border-line px-6 lg:px-10">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconClose size={24} />
          </button>
          <h1 className="text-heading-xxl text-foreground">Add Members</h1>
        </div>
        <Button
          size="md"
          disabled={!canAdvance}
          onClick={() => {
            if (finishes) setReviewing(true);
            else setStep(step === "invite" ? "access" : "numbers");
          }}
        >
          {finishes ? `Add ${memberWord}` : "Next"}
        </Button>
      </div>

      <div className="flex min-h-0 flex-1 gap-16 overflow-auto px-6 py-9 lg:px-10">
        <Stepper
          steps={steps}
          current={step}
          onStepSelect={(key) => setStep(key as StepKey)}
          className="w-[288px] shrink-0"
        />
        {step === "invite" ? (
          <InviteStep
            mode={mode}
            onModeChange={setMode}
            emails={emails}
            onEmailsChange={setEmails}
            file={file}
            onFileChange={setFile}
          />
        ) : step === "access" ? (
          <SetAccessStep
            invitees={invitees}
            inviteeCount={inviteeCount}
            license={license}
            onLicenseChange={setLicense}
            role={role}
            onRoleChange={setRole}
            customRole={customRole}
            onCustomRoleChange={setCustomRole}
          />
        ) : (
          <AssignNumbersStep
            options={numberOptions}
            choice={effectiveNumberChoice}
            onChoiceChange={setNumberChoice}
            sharedNumbers={sharedNumbers}
            onSharedNumbersChange={setSharedNumbers}
          />
        )}
      </div>
      {reviewing ? (
        <ChargesNoticeModal
          onCancel={() => setReviewing(false)}
          onConfirm={() => onComplete(inviteeCount)}
        />
      ) : null}
    </main>
  );
}
