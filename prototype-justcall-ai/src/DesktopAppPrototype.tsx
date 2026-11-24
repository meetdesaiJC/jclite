import * as React from "react";
import { cn } from "@/lib/utils";
import { LockedControl, NO_ACTIONS_LOCK, type Lock } from "@/components/LockedControl";
import { Menu, type MenuItem } from "@/components/Menu";
import {
  IconArrowBackUp,
  IconBookmark,
  IconCheck,
  IconChevronDown,
  IconClear,
  IconClock,
  IconContacts,
  IconCopy,
  IconCallLogs,
  IconDownload,
  IconFilter,
  IconGoBack,
  IconInfoCircle,
  IconIntegrations,
  IconMessage2,
  IconMessages,
  IconMoodSmile,
  IconMore,
  IconPaperclip,
  IconPencil,
  IconPhone,
  IconPhoneIncoming,
  IconPhoneOutgoing,
  IconPlayerPlay,
  IconPlus,
  IconReload,
  IconSearch,
  IconUser,
} from "@/components/Icon";
import { IconJcaiSettings } from "./icons/JustCallAiNavIcons";
import { AvailabilityControl } from "./CallStatusControls";
import { type AvailabilityId, type BusyReasonId } from "./callDeviceData";
import { desktopAppLocks, type DesktopAppLocks, type License } from "./licenseLocks";
import {
  DESKTOP_CALL_LOGS,
  DESKTOP_CONTACTS,
  DESKTOP_INBOXES,
  DESKTOP_TEAM,
  DESKTOP_THREADS,
  type DesktopCallLog,
  type DesktopContact,
  type DesktopThread,
} from "./desktopAppData";
import usFlag from "./assets/dialer/us-flag.svg";

/**
 * Desktop app, as a Lite or View-only member sees it. There is no sidenav and
 * no admin surface here — the window is the dialer and its four sibling tabs —
 * so the license only ever shows up as locked verbs: every list still opens,
 * and calling and sending stay visible, muted, and say why (LockedControl).
 *
 * It mirrors the desktop app as it ships today, which predates Design System
 * 2.0 — so the chrome here is drawn in that older style (legacy-dialer-*
 * tokens) rather than from DS components, whose look would misrepresent the
 * product. Only the lock pattern is new, and that's the point of the demo.
 *
 * It opens on Call Logs rather than the keypad. The keypad is the one screen
 * where nothing works for these licenses, and an app that greets you with a
 * wall of dead buttons reads as broken. Phone stays in the nav and still
 * opens, so the product doesn't look smaller than it is.
 */
type DesktopTab = "phone" | "logs" | "contacts" | "messages";

/**
 * Settings has nothing the license changes, so it is drawn for completeness
 * but doesn't open — `id: null` keeps it in the bar and out of the tab order.
 */
const NAV_ITEMS: { id: DesktopTab | null; label: string; icon: React.ReactNode }[] = [
  { id: "phone", label: "Phone", icon: <IconPhone size={24} /> },
  { id: "logs", label: "Logs", icon: <IconCallLogs size={24} /> },
  { id: "contacts", label: "Contacts", icon: <IconContacts size={24} /> },
  { id: "messages", label: "Message", icon: <IconMessages size={24} /> },
  { id: null, label: "Settings", icon: <IconJcaiSettings className="size-6" /> },
];


/** A row action — production's outline icons in the accent blue. */
const ROW_ACTION =
  "flex size-7 items-center justify-center rounded-[4px] text-legacy-dialer-accent outline-none transition-colors hover:bg-legacy-dialer-muted focus-visible:ring-2 focus-visible:ring-legacy-dialer-accent/40 data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-transparent";

/** A white, lightly raised button — Back, the thread's call shortcut. */
const RAISED_BUTTON =
  "flex h-9 items-center justify-center rounded-[4px] border border-line bg-white px-3 text-label-md text-foreground shadow-100 outline-none transition-colors hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-legacy-dialer-accent/40 data-[locked=true]:text-disabled-fg data-[locked=true]:shadow-none data-[locked=true]:hover:bg-white";

/** Search and select fields share production's plain bordered box. */
const FIELD =
  "h-10 rounded-[4px] border border-control-border bg-white px-3 text-paragraph-md text-foreground outline-none placeholder:text-disabled-fg focus:border-legacy-dialer-accent";

function Gate({
  lock,
  placement,
  triggerClassName,
  children,
}: {
  lock?: Lock;
  placement?: "top" | "bottom" | "left" | "right";
  triggerClassName?: string;
  children: React.ReactElement<Record<string, unknown>>;
}) {
  return (
    <LockedControl
      locked={Boolean(lock)}
      reason={lock?.reason}
      hint={lock?.hint}
      placement={placement}
      triggerClassName={triggerClassName}
    >
      {children}
    </LockedControl>
  );
}

/**
 * The notch keeps the member's own availability toggle, exactly as a calling
 * license has it. It lives on the shell, not on each screen, so the status
 * survives switching tabs.
 */
type Availability = { status: AvailabilityId; reason: BusyReasonId | null };
const AvailabilityContext = React.createContext<{
  value: Availability;
  onChange: (next: Availability) => void;
} | null>(null);

function AvailabilityNotch() {
  const availability = React.useContext(AvailabilityContext);
  if (!availability) return null;
  return (
    <AvailabilityControl
      status={availability.value.status}
      reason={availability.value.reason}
      onStatusChange={(status, reason) => availability.onChange({ status, reason })}
    />
  );
}

function PageHeader({
  title,
  leading,
  trailing,
}: {
  title: string;
  leading?: React.ReactNode;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 flex-col items-center bg-legacy-dialer-bar">
      <AvailabilityNotch />
      <div className="relative flex h-12 w-full items-center justify-center px-2">
        {leading ? <div className="absolute left-2 flex items-center">{leading}</div> : null}
        <h2 className="text-[18px] leading-6 font-normal text-white">{title}</h2>
        {trailing ? <div className="absolute right-2 flex items-center">{trailing}</div> : null}
      </div>
    </div>
  );
}

/** Production's text tabs: grey labels, a short accent bar under the active one. */
function LegacyTabs({
  items,
  value,
  onChange,
}: {
  items: { key: string; label: string }[];
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div role="tablist" className="flex shrink-0 border-b border-line">
      {items.map((item) => {
        const active = item.key === value;
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              "relative flex-1 py-3 text-paragraph-lg outline-none transition-colors focus-visible:bg-secondary-bg",
              active ? "text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
            {active ? (
              <span className="absolute bottom-0 left-1/2 h-[3px] w-14 -translate-x-1/2 rounded-t-full bg-brand" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function SearchField({
  placeholder,
  value,
  onChange,
  iconEnd,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  /** The inbox search carries its glass on the right, as in production. */
  iconEnd?: boolean;
}) {
  return (
    <label className="relative flex min-w-0 flex-1 items-center">
      <IconSearch
        size={20}
        className={cn("pointer-events-none absolute text-foreground", iconEnd ? "right-3" : "left-3")}
      />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={placeholder}
        className={cn(FIELD, "w-full", iconEnd ? "rounded-full pr-10" : "pl-10")}
      />
    </label>
  );
}

function EmptyList({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-6 py-10 text-center text-paragraph-md text-muted-foreground">{children}</p>
  );
}

/** Production's initials disc. `solid` is the inbox's filled navy one. */
function Initials({ text, solid }: { text?: string; solid?: boolean }) {
  return (
    <span
      className={cn(
        "flex size-10 shrink-0 items-center justify-center rounded-full text-label-md",
        solid ? "bg-legacy-dialer-bar text-white" : "bg-avatar-indigo-bg text-brand"
      )}
    >
      {text ?? <IconUser size={16} />}
    </span>
  );
}

/* ── Phone ──────────────────────────────────────────────────────────────── */

const KEYS: { digit: string; letters?: string }[] = [
  { digit: "1" },
  { digit: "2", letters: "ABC" },
  { digit: "3", letters: "DEF" },
  { digit: "4", letters: "GHI" },
  { digit: "5", letters: "JKL" },
  { digit: "6", letters: "MNO" },
  { digit: "7", letters: "PQRS" },
  { digit: "8", letters: "TUV" },
  { digit: "9", letters: "WXYZ" },
  { digit: "*" },
  { digit: "0", letters: "+" },
  { digit: "#" },
];

/**
 * The keypad, whole and locked. Each part keeps its own lock so the reason
 * appears where the pointer is — the field, the pad, Call, Message and
 * Call via.
 */
function PhoneScreen({ locks }: { locks: DesktopAppLocks }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center">
      <AvailabilityNotch />
      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-between gap-2 px-4 pt-4 pb-3">
        <div className="flex w-full items-center gap-2">
          <IconInfoCircle size={16} className="shrink-0 text-disabled-fg" />
          <Gate lock={locks.dialer} triggerClassName="flex min-w-0 flex-1">
            <div
              tabIndex={0}
              aria-label="Phone number"
              className="flex h-16 w-full items-center gap-1 rounded-md border border-line bg-legacy-dialer-muted px-3 outline-none focus-visible:ring-2 focus-visible:ring-legacy-dialer-accent/40"
            >
              <img src={usFlag} alt="" className="h-3.5 w-5 object-cover" />
              <IconChevronDown size={16} className="text-muted-foreground" />
              <span className="flex-1" />
              <IconClear size={20} className="text-disabled-fg" />
            </div>
          </Gate>
        </div>

        <Gate lock={locks.dialer} triggerClassName="flex w-full">
          <div
            tabIndex={0}
            aria-label="Keypad"
            className="group grid w-full grid-cols-3 gap-y-1 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-legacy-dialer-accent/40"
          >
            {KEYS.map((key) => (
              <span key={key.digit} className="flex h-12 flex-col items-center justify-center">
                <span className="text-[24px] leading-7 font-normal text-legacy-dialer-key group-data-[locked=true]:text-disabled-fg">
                  {key.digit}
                </span>
                <span className="min-h-3.5 text-[10px] leading-[14px] text-disabled-fg">
                  {key.letters ?? " "}
                </span>
              </span>
            ))}
          </div>
        </Gate>

        <div className="flex items-center gap-4">
          <Gate lock={locks.dialer} placement="top">
            <button
              type="button"
              aria-label="Call"
              className="flex size-16 items-center justify-center rounded-full bg-legacy-dialer-go text-white shadow-200 outline-none transition-[filter] hover:brightness-95 focus-visible:ring-4 focus-visible:ring-legacy-dialer-go/30 data-[locked=true]:bg-disabled-bg data-[locked=true]:text-disabled-fg data-[locked=true]:shadow-none data-[locked=true]:hover:brightness-100"
            >
              <IconPhone size={24} />
            </button>
          </Gate>
          <Gate lock={locks.sms} placement="top">
            <button
              type="button"
              aria-label="Send message"
              className="flex size-14 items-center justify-center rounded-full bg-legacy-dialer-muted text-muted-foreground outline-none transition-colors hover:bg-line focus-visible:ring-4 focus-visible:ring-legacy-dialer-accent/30 data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-legacy-dialer-muted"
            >
              <IconMessages size={24} />
            </button>
          </Gate>
        </div>

        <div className="flex w-full items-center gap-2">
          <IconInfoCircle size={16} className="shrink-0 text-disabled-fg" />
          <span className="text-paragraph-lg text-muted-foreground">Call via</span>
          <Gate lock={locks.dialer} placement="top" triggerClassName="flex min-w-0 flex-1">
            <button
              type="button"
              className="flex h-11 w-full items-center gap-2 rounded-[4px] border border-control-border bg-white px-2 text-paragraph-lg text-legacy-dialer-accent outline-none transition-colors hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-legacy-dialer-accent/40 data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-white"
            >
              <img src={usFlag} alt="" className="h-5 w-7 object-cover" />
              <span className="flex-1 text-left">(712) 625-7333</span>
              <IconChevronDown size={16} />
            </button>
          </Gate>
        </div>
      </div>
    </div>
  );
}

/* ── Call logs ──────────────────────────────────────────────────────────── */

const DIRECTION_STYLE: Record<DesktopCallLog["direction"], { icon: React.ReactNode; tone: string }> = {
  incoming: { icon: <IconPhoneIncoming size={20} className="text-success" />, tone: "text-brand" },
  missed: { icon: <IconPhoneIncoming size={20} className="text-error" />, tone: "text-error" },
  outgoing: { icon: <IconPhoneOutgoing size={20} className="text-brand" />, tone: "text-brand" },
};

function CallLogRow({ log, locks }: { log: DesktopCallLog; locks: DesktopAppLocks }) {
  const [playing, setPlaying] = React.useState(false);
  const [expanded, setExpanded] = React.useState(false);
  const style = DIRECTION_STYLE[log.direction];
  const playable = log.recording || log.voicemail;
  // The card opens like production's. Its own buttons — locked or not — keep
  // their click; only the rest of the card toggles the details.
  const toggleFrom = (target: EventTarget) => {
    if ((target as HTMLElement).closest("button, [data-locked]")) return;
    setExpanded((open) => !open);
  };
  return (
    <li className="flex flex-col rounded-md bg-white shadow-100">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onClick={(event) => toggleFrom(event.target)}
        onKeyDown={(event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setExpanded((open) => !open);
          }
        }}
        className="flex cursor-pointer gap-3 rounded-md p-3 outline-none focus-visible:ring-2 focus-visible:ring-legacy-dialer-accent/40"
      >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-legacy-dialer-muted">
        {style.icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1">
            <span className={cn("truncate text-paragraph-lg", style.tone)}>{log.name ?? log.number}</span>
            {/* Saving a new number as a contact is web app only, even for
                Lite; editing a saved one is open to Lite. */}
            <Gate lock={log.name ? locks.editContact : locks.addContact}>
              <button type="button" aria-label={log.name ? "Edit contact" : "Save contact"} className={ROW_ACTION}>
                {log.name ? <IconPencil size={16} /> : <IconUser size={16} />}
              </button>
            </Gate>
          </div>
          <span className="shrink-0 text-paragraph-sm text-muted-foreground">{log.ago}</span>
        </div>
        <span className="text-paragraph-md text-foreground">{log.number}</span>
        <div className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1 text-paragraph-md text-muted-foreground">
            {log.duration ? (
              <>
                <IconClock size={16} />
                {log.duration}
              </>
            ) : (
              log.outcome
            )}
          </span>
          <div className="flex items-center gap-1">
            <Gate lock={locks.call} placement="top">
              <button type="button" aria-label="Call back" className={ROW_ACTION}>
                <IconPhone size={20} />
              </button>
            </Gate>
            <Gate lock={locks.sms} placement="top">
              <button type="button" aria-label="Send SMS" className={ROW_ACTION}>
                <IconMessage2 size={20} />
              </button>
            </Gate>
            {/* Listening is reading: recordings and voicemails play for both
                licenses on desktop. */}
            {playable ? (
              <>
                <button
                  type="button"
                  aria-label={playing ? "Pause recording" : "Play recording"}
                  aria-pressed={playing}
                  onClick={() => setPlaying((value) => !value)}
                  className={cn(ROW_ACTION, playing && "bg-legacy-dialer-muted")}
                >
                  <IconPlayerPlay size={20} />
                </button>
                <button type="button" aria-label="Download recording" className={ROW_ACTION}>
                  <IconDownload size={20} />
                </button>
              </>
            ) : null}
          </div>
        </div>
        {playing ? (
          <div className="flex items-center gap-2" aria-live="polite">
            <span className="h-1 flex-1 overflow-hidden rounded-full bg-line">
              <span className="block h-full w-1/3 rounded-full bg-legacy-dialer-accent" />
            </span>
            <span className="text-paragraph-sm text-muted-foreground tabular-nums">00:03</span>
          </div>
        ) : null}
      </div>
      </div>
      {expanded ? <CallLogDetails log={log} locks={locks} /> : null}
    </li>
  );
}

const DISPOSITIONS = ["Interested", "Not interested", "Call back later", "Wrong number"];

/** Production's outline stars. Drawn here — the icon set has no star. */
function Star({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-6", filled ? "fill-current" : "fill-none")} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
      <path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.15 1 5.85L12 16.95 6.75 19.7l1-5.85L3.5 9.7l5.9-.9z" />
    </svg>
  );
}

/**
 * A call log, opened. Reading it — the number it came in on, the CRMs it
 * synced to — is open to both licenses. Everything that changes the log or
 * the number is View-only's to lose: rating, disposition and notes edit the
 * record, and Block / Add to DNC are the number controls Lite keeps on
 * desktop (the permissions sheet's DNM / DND / blacklist row).
 */
function CallLogDetails({ log, locks }: { log: DesktopCallLog; locks: DesktopAppLocks }) {
  const [rating, setRating] = React.useState(0);
  const [disposition, setDisposition] = React.useState<string | null>(null);
  const [note, setNote] = React.useState("");
  const [editingNote, setEditingNote] = React.useState(false);
  const [blocked, setBlocked] = React.useState(false);
  const [dnc, setDnc] = React.useState(false);
  const edit = locks.logDetails;

  const dispositionTrigger = (
    <button
      type="button"
      className={cn(
        FIELD,
        "flex w-full items-center justify-between gap-2 text-left data-[locked=true]:bg-secondary-bg data-[locked=true]:text-disabled-fg",
        !disposition && "text-disabled-fg"
      )}
    >
      {disposition ?? "Select call outcome"}
      <IconChevronDown size={16} className="shrink-0 text-foreground group-data-[locked=true]:text-disabled-fg" />
    </button>
  );

  return (
    <div className="mx-3 flex flex-col gap-4 border-t border-line py-4">
      <dl className="grid grid-cols-[104px_1fr] items-center gap-x-3 gap-y-4 text-paragraph-lg">
        <dt className="text-foreground">Call Rating</dt>
        <dd>
          <Gate lock={edit}>
            <div
              role="radiogroup"
              aria-label="Call rating"
              tabIndex={edit ? 0 : undefined}
              className="flex w-fit gap-0.5 rounded-[4px] text-disabled-fg outline-none focus-visible:ring-2 focus-visible:ring-legacy-dialer-accent/40"
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} star${value > 1 ? "s" : ""}`}
                  disabled={Boolean(edit)}
                  onClick={() => setRating(value)}
                  className={cn("outline-none disabled:pointer-events-none", value <= rating && "text-warning")}
                >
                  <Star filled={value <= rating} />
                </button>
              ))}
            </div>
          </Gate>
        </dd>

        <dt className="text-foreground">Disposition</dt>
        <dd className="min-w-0">
          {edit ? (
            <Gate lock={edit} triggerClassName="flex w-full">
              {dispositionTrigger}
            </Gate>
          ) : (
            <Menu
              label="Call outcome"
              align="start"
              items={DISPOSITIONS.map((option) => ({
                key: option,
                label: option,
                onSelect: () => setDisposition(option),
              }))}
              trigger={dispositionTrigger}
            />
          )}
        </dd>

        <dt className="text-foreground">{log.direction === "outgoing" ? "Called From" : "Received On"}</dt>
        <dd className="text-foreground">(712) 625-7333</dd>

        <dt className="text-foreground">CRMs</dt>
        <dd className="flex flex-wrap gap-1.5">
          {["HubSpot", "Zoho CRM"].map((crm) => (
            <span key={crm} className="rounded-[4px] bg-legacy-dialer-muted px-2 py-0.5 text-label-sm text-foreground">
              {crm}
            </span>
          ))}
        </dd>

        <dt className="self-start pt-0.5 text-foreground">Notes</dt>
        <dd className="min-w-0">
          {editingNote && !edit ? (
            <div className="flex flex-col gap-2">
              <textarea
                autoFocus
                rows={2}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                aria-label="Note"
                className={cn(FIELD, "h-auto resize-none py-2")}
              />
              <div className="flex gap-2">
                <button type="button" onClick={() => setEditingNote(false)} className={RAISED_BUTTON}>
                  Save
                </button>
              </div>
            </div>
          ) : (
            <Gate lock={edit}>
              <button
                type="button"
                onClick={() => setEditingNote(true)}
                className="text-left text-legacy-dialer-accent outline-none hover:underline focus-visible:underline data-[locked=true]:text-disabled-fg data-[locked=true]:no-underline"
              >
                {note || "Leave a note"}
              </button>
            </Gate>
          )}
        </dd>
      </dl>

      <div className="flex justify-end gap-3">
        <Gate lock={locks.blockNumber} placement="top">
          <button type="button" onClick={() => setBlocked((v) => !v)} className={RAISED_BUTTON}>
            {blocked ? "Unblock" : "Block"}
          </button>
        </Gate>
        <Gate lock={locks.blockNumber} placement="top">
          <button
            type="button"
            onClick={() => setDnc((v) => !v)}
            className={cn(RAISED_BUTTON, "border-error text-error data-[locked=true]:border-line")}
          >
            {dnc ? "Remove from DNC" : "Add to DNC"}
          </button>
        </Gate>
      </div>
    </div>
  );
}

function LogsScreen({ locks }: { locks: DesktopAppLocks }) {
  const [tab, setTab] = React.useState("recent");
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const logs = DESKTOP_CALL_LOGS.filter((log) => {
    if (tab === "missed" && log.direction !== "missed") return false;
    if (tab === "voicemail" && !log.voicemail) return false;
    return !q || log.number.includes(q) || log.name?.toLowerCase().includes(q);
  });
  return (
    <>
      <PageHeader title="Call Logs" />
      <LegacyTabs
        value={tab}
        onChange={setTab}
        items={[
          { key: "recent", label: "Recent" },
          { key: "missed", label: "Missed" },
          { key: "voicemail", label: "Voicemail" },
        ]}
      />
      <div className="flex shrink-0 items-center gap-2 border-b border-line p-2">
        <SearchField placeholder="Enter Number or Name" value={query} onChange={setQuery} />
        <button type="button" aria-label="Filter" className={cn(RAISED_BUTTON, "w-9 px-0")}>
          <IconFilter size={20} />
        </button>
        <button type="button" aria-label="Refresh" className={cn(RAISED_BUTTON, "w-9 px-0")}>
          <IconReload size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto bg-secondary-bg">
        {logs.length ? (
          <ul className="flex flex-col gap-2 p-2">
            {logs.map((log) => (
              <CallLogRow key={log.id} log={log} locks={locks} />
            ))}
          </ul>
        ) : (
          <EmptyList>No calls match your search.</EmptyList>
        )}
      </div>
    </>
  );
}

/* ── Contacts ───────────────────────────────────────────────────────────── */

function ContactRow({
  contact,
  locks,
  onOpen,
}: {
  contact: DesktopContact;
  locks: DesktopAppLocks;
  /** Absent on Team, whose rows have no contact page. */
  onOpen?: () => void;
}) {
  const body = (
    <>
      <Initials text={contact.initials} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-paragraph-lg text-foreground">{contact.name}</span>
        <span className="truncate text-paragraph-md text-muted-foreground">{contact.number}</span>
      </span>
    </>
  );
  return (
    <li className="group flex items-center gap-3 border-b border-line pr-4 transition-colors duration-micro hover:bg-secondary-bg">
      {/* Viewing a contact is reading, so the row opens it for both
          licenses. The call and SMS actions sit beside it, not inside it. */}
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left outline-none focus-visible:bg-secondary-bg"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 py-3 pl-4">{body}</div>
      )}
      {/* Revealed on hover like production — and on focus, so the locked
          reason is reachable by keyboard too. */}
      <div className="flex items-center gap-1 opacity-0 transition-opacity duration-micro group-focus-within:opacity-100 group-hover:opacity-100">
        <Gate lock={locks.call}>
          <button type="button" aria-label={`Call ${contact.name}`} className={ROW_ACTION}>
            <IconPhone size={20} />
          </button>
        </Gate>
        <Gate lock={locks.sms}>
          <button type="button" aria-label={`Message ${contact.name}`} className={ROW_ACTION}>
            <IconMessage2 size={20} />
          </button>
        </Gate>
      </div>
    </li>
  );
}

/** One cell of the contact page's joined call / SMS / edit group. */
const CONTACT_ACTION =
  "flex h-10 w-12 items-center justify-center bg-white text-legacy-dialer-accent outline-none transition-colors hover:bg-secondary-bg focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-legacy-dialer-accent/40 data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-white";

/**
 * A contact, opened from the list. Everything on it is reading — the details,
 * copying the email, expanding the CRM record — so it's open to both
 * licenses. The three actions under the name are the exceptions: calling and
 * SMS lock for both, and editing writes to the directory, which is web app
 * only even for Lite.
 */
function ContactDetail({
  contact,
  locks,
  onBack,
}: {
  contact: DesktopContact;
  locks: DesktopAppLocks;
  onBack: () => void;
}) {
  const [crmOpen, setCrmOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const copyEmail = () => {
    if (!contact.email) return;
    void navigator.clipboard?.writeText(contact.email).catch(() => {});
    setCopied(true);
  };
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-6 pt-4 pb-6">
      <button
        type="button"
        aria-label="Back to contacts"
        onClick={onBack}
        className="flex size-8 items-center justify-center rounded-[4px] text-foreground outline-none transition-colors hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-legacy-dialer-accent/40"
      >
        <IconGoBack size={20} />
      </button>
      <div className="flex flex-col items-center gap-2 pb-6">
        <span className="flex size-16 items-center justify-center rounded-full bg-avatar-indigo-bg text-heading-xl text-brand">
          {contact.initials ?? <IconUser size={24} />}
        </span>
        <h3 className="max-w-full truncate pt-2 text-heading-xl text-foreground">{contact.name}</h3>
        <span className="text-paragraph-lg text-muted-foreground">{contact.number}</span>
        <div className="mt-3 flex divide-x divide-line overflow-hidden rounded-md border border-line">
          <Gate lock={locks.call}>
            <button type="button" aria-label={`Call ${contact.name}`} className={CONTACT_ACTION}>
              <IconPhone size={20} />
            </button>
          </Gate>
          <Gate lock={locks.sms}>
            <button type="button" aria-label={`Message ${contact.name}`} className={CONTACT_ACTION}>
              <IconMessage2 size={20} />
            </button>
          </Gate>
          <Gate lock={locks.editContact}>
            <button
              type="button"
              aria-label="Edit contact"
              className={CONTACT_ACTION.replace("text-legacy-dialer-accent", "text-foreground")}
            >
              <IconPencil size={20} />
            </button>
          </Gate>
        </div>
      </div>

      <section className="flex flex-col gap-3 border-t border-line py-6">
        <h4 className="text-paragraph-lg font-medium text-foreground">About</h4>
        <dl className="grid grid-cols-[120px_1fr] gap-y-2 text-paragraph-lg">
          <dt className="text-muted-foreground">Company</dt>
          <dd className="text-foreground">{contact.company ?? "—"}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="flex min-w-0 items-center gap-1">
            {contact.email ? (
              <>
                <span className="truncate text-legacy-dialer-accent">{contact.email}</span>
                <button
                  type="button"
                  aria-label={copied ? "Email copied" : "Copy email"}
                  onClick={copyEmail}
                  className="flex size-7 shrink-0 items-center justify-center rounded-[4px] text-legacy-dialer-accent outline-none transition-colors hover:bg-legacy-dialer-muted focus-visible:ring-2 focus-visible:ring-legacy-dialer-accent/40"
                >
                  {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
                </button>
              </>
            ) : (
              <span className="text-foreground">—</span>
            )}
          </dd>
        </dl>
      </section>

      <section className="flex flex-col gap-4 border-t border-line pt-6">
        <h4 className="text-paragraph-lg font-medium text-foreground">
          CRMs ({contact.crm ? 1 : 0})
        </h4>
        {contact.crm ? (
          <div className="overflow-hidden rounded-md border border-line">
            <button
              type="button"
              aria-expanded={crmOpen}
              onClick={() => setCrmOpen((open) => !open)}
              className="flex w-full items-center gap-4 px-4 py-4 text-left outline-none transition-colors hover:bg-secondary-bg focus-visible:bg-secondary-bg"
            >
              <IconIntegrations size={20} className="shrink-0 text-muted-foreground" />
              <span className="flex-1 text-paragraph-lg text-foreground">{contact.crm.name}</span>
              <IconChevronDown
                size={20}
                className={cn(
                  "text-muted-foreground transition-[rotate] duration-fast ease-standard motion-reduce:transition-none",
                  crmOpen && "rotate-180"
                )}
              />
            </button>
            {crmOpen ? (
              <dl className="grid grid-cols-[120px_1fr] gap-y-2 border-t border-line px-4 py-3 text-paragraph-md">
                {contact.crm.fields.map((field) => (
                  <React.Fragment key={field.label}>
                    <dt className="text-muted-foreground">{field.label}</dt>
                    <dd className="text-foreground">{field.value}</dd>
                  </React.Fragment>
                ))}
              </dl>
            ) : null}
          </div>
        ) : (
          <p className="text-paragraph-md text-muted-foreground">Not synced to a CRM.</p>
        )}
      </section>
    </div>
  );
}

function ContactsScreen({ locks }: { locks: DesktopAppLocks }) {
  const [tab, setTab] = React.useState("contacts");
  const [open, setOpen] = React.useState<DesktopContact | null>(null);
  const [query, setQuery] = React.useState("");
  const q = query.trim().toLowerCase();
  const list = (tab === "team" ? DESKTOP_TEAM : DESKTOP_CONTACTS).filter(
    (c) => !q || c.name.toLowerCase().includes(q) || c.number.includes(q)
  );
  return (
    <>
      <PageHeader
        title="Contacts"
        trailing={
          <Gate lock={locks.addContact}>
            <button
              type="button"
              aria-label="Add contact"
              className="flex size-9 items-center justify-center rounded-[4px] text-white outline-none transition-colors hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-white/40 data-[locked=true]:text-white/40 data-[locked=true]:hover:bg-transparent"
            >
              <IconPlus size={20} />
            </button>
          </Gate>
        }
      />
      {open ? (
        <ContactDetail contact={open} locks={locks} onBack={() => setOpen(null)} />
      ) : (
      <>
      <LegacyTabs
        value={tab}
        onChange={setTab}
        items={[
          { key: "contacts", label: "Contacts" },
          { key: "team", label: "Team" },
        ]}
      />
      <div className="flex shrink-0 border-b border-line p-2">
        <SearchField
          placeholder={tab === "team" ? "Search team" : "Search contacts"}
          value={query}
          onChange={setQuery}
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        {list.length ? (
          <ul>
            {list.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                locks={locks}
                onOpen={tab === "contacts" ? () => setOpen(contact) : undefined}
              />
            ))}
          </ul>
        ) : (
          <EmptyList>No contacts match your search.</EmptyList>
        )}
      </div>
      </>
      )}
    </>
  );
}

/* ── Messages ───────────────────────────────────────────────────────────── */

function InboxPicker({ value, onChange }: { value: string; onChange: (inbox: string) => void }) {
  // Switching inboxes is reading, so it stays open to both licenses.
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="text-label-xs text-white">Inboxes</span>
      <Menu
        align="start"
        label="Inboxes"
        items={DESKTOP_INBOXES.map((inbox) => ({
          key: inbox,
          label: inbox,
          onSelect: () => onChange(inbox),
        }))}
        trigger={
          <button
            type="button"
            className="flex h-8 w-[120px] items-center justify-between gap-1 rounded-[2px] bg-legacy-dialer-bar-active px-2 text-label-sm text-white outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            {value}
            <IconChevronDown size={16} />
          </button>
        }
      />
    </div>
  );
}

function MessagesHeader({ locks }: { locks: DesktopAppLocks }) {
  const [inbox, setInbox] = React.useState<string>(DESKTOP_INBOXES[0]);
  return (
    <PageHeader
      title="Messages"
      leading={<InboxPicker value={inbox} onChange={setInbox} />}
      trailing={
        <Gate lock={locks.newMessage}>
          <button
            type="button"
            className="flex h-7 items-center gap-0.5 rounded-[4px] border border-white px-1.5 text-label-sm text-white outline-none transition-colors hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-white/40 data-[locked=true]:border-white/30 data-[locked=true]:text-white/40 data-[locked=true]:hover:bg-transparent"
          >
            + New Message
          </button>
        </Gate>
      }
    />
  );
}

function ThreadList({ onOpen }: { onOpen: (thread: DesktopThread) => void }) {
  const [query, setQuery] = React.useState("");
  const [filter, setFilter] = React.useState("All messages");
  const q = query.trim().toLowerCase();
  const threads = DESKTOP_THREADS.filter((t) => {
    if (filter === "Unread" && !t.unread) return false;
    return !q || t.name.toLowerCase().includes(q) || t.number.includes(q);
  });
  return (
    <>
      <div className="flex shrink-0 items-center gap-2 px-3 pt-3 pb-2">
        <SearchField placeholder="Search" value={query} onChange={setQuery} iconEnd />
        <Menu
          label="Filter messages"
          items={["All messages", "Unread"].map((option) => ({
            key: option,
            label: option,
            onSelect: () => setFilter(option),
          }))}
          trigger={
            <button
              type="button"
              className={cn(FIELD, "flex shrink-0 items-center gap-2 rounded-full")}
            >
              {filter}
              <IconChevronDown size={16} />
            </button>
          }
        />
      </div>
      <div className="flex shrink-0 items-center gap-2 px-3 pb-2" role="separator">
        <span className="h-px flex-1 bg-line" />
        <span className="text-paragraph-sm text-muted-foreground italic">Previous Conversations</span>
        <span className="h-px flex-1 bg-line" />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-2">
        {threads.length ? (
          <ul className="flex flex-col gap-1">
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => onOpen(thread)}
                  className="flex w-full items-center gap-3 rounded-[4px] bg-white px-2 py-3 text-left shadow-100 outline-none transition-colors duration-micro hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-legacy-dialer-accent/40"
                >
                  <Initials text={thread.initials} solid />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="truncate text-label-md text-legacy-dialer-accent">
                      {thread.name} ({thread.number})
                    </span>
                    <span className="flex items-center justify-between gap-2 text-paragraph-md text-muted-foreground">
                      <span className="flex min-w-0 items-center gap-1">
                        {thread.lastOutgoing ? <IconArrowBackUp size={16} className="shrink-0" /> : null}
                        <span className="truncate">{thread.preview}</span>
                      </span>
                      <span className="shrink-0 text-paragraph-sm text-foreground">{thread.timestamp}</span>
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyList>No conversations match your search.</EmptyList>
        )}
      </div>
    </>
  );
}

/**
 * The ⋯ menu, with production's three rows. Edit Contact writes to the
 * directory — web app only, even for Lite — so it stays in the menu, locked.
 * Lite keeps Delete and Mark as unread. View-only can do none of the three,
 * so the trigger itself locks rather than opening a menu of locked rows.
 */
function ConversationMenu({ locks }: { locks: DesktopAppLocks }) {
  const trigger = (
    <button
      type="button"
      aria-label="More actions"
      className="flex size-8 items-center justify-center rounded-[4px] text-muted-foreground outline-none transition-colors hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-legacy-dialer-accent/40 data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-transparent"
    >
      <IconMore size={20} />
    </button>
  );
  if (locks.conversation) return <Gate lock={NO_ACTIONS_LOCK}>{trigger}</Gate>;
  const items: MenuItem[] = [
    { key: "edit", label: "Edit Contact", locked: locks.editContact },
    { key: "delete", label: "Delete conversation" },
    { key: "unread", label: "Mark as unread" },
  ];
  return <Menu label="Conversation actions" items={items} trigger={trigger} />;
}

/** Composer tools — templates, schedule, attach. All part of sending. */
const COMPOSER_TOOL =
  "flex size-8 items-center justify-center rounded-[4px] text-legacy-dialer-accent outline-none transition-colors hover:bg-legacy-dialer-muted focus-visible:ring-2 focus-visible:ring-legacy-dialer-accent/40 data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-transparent";

/** Production's solid, square-cornered action buttons in the composer. */
const COMPOSER_BUTTON =
  "flex h-9 items-center rounded-md px-4 text-label-md text-white shadow-100 outline-none transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-legacy-dialer-accent/40 data-[locked=true]:bg-disabled-bg data-[locked=true]:text-disabled-fg data-[locked=true]:shadow-none data-[locked=true]:hover:brightness-100";

function ThreadView({
  thread,
  locks,
  onBack,
}: {
  thread: DesktopThread;
  locks: DesktopAppLocks;
  onBack: () => void;
}) {
  return (
    <>
      {/* Production's thread bar: Back, who it is, their local time, a call
          shortcut and the ⋯ menu. */}
      <div className="flex shrink-0 items-start gap-2 px-2 pt-2 pb-1">
        <button type="button" onClick={onBack} className={RAISED_BUTTON}>
          Back
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1">
          <span className="max-w-full text-center text-paragraph-lg text-brand">
            {thread.name} ({thread.number})
          </span>
          <span className="rounded-[4px] bg-legacy-dialer-accent px-2.5 py-1 text-label-md-semi text-white">
            It’s {thread.localTime} there
          </span>
        </div>
        <Gate lock={locks.call}>
          <button type="button" aria-label={`Call ${thread.name}`} className={cn(RAISED_BUTTON, "w-12 px-0")}>
            <IconPhone size={20} />
          </button>
        </Gate>
        <ConversationMenu locks={locks} />
      </div>

      {/* Reading the thread is open to both licenses. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-3 py-3">
        {thread.messages.map((message) =>
          message.direction === "in" ? (
            <div
              key={message.id}
              className="flex max-w-[75%] flex-col gap-1 self-start rounded-2xl rounded-tl-none bg-legacy-dialer-muted px-5 py-3"
            >
              <p className="text-paragraph-lg text-muted-foreground">{message.text}</p>
              <span className="text-paragraph-sm text-disabled-fg">{message.time}</span>
            </div>
          ) : (
            <div key={message.id} className="flex max-w-[85%] items-end gap-1 self-end">
              <div className="flex flex-col items-end gap-1 rounded-2xl rounded-br-none bg-legacy-dialer-accent px-5 py-3">
                <p className="text-paragraph-lg text-white">{message.text}</p>
                <span className="text-paragraph-sm text-white/80">{message.time}</span>
              </div>
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full border-2 border-line bg-muted-foreground text-[10px] font-medium text-white">
                {message.by}
              </span>
            </div>
          )
        )}
      </div>

      {/* Writing, templates, scheduling, attaching and sending are one
          capability, locked for both licenses. Close Conversation is managing
          the thread, not sending, so it follows the conversation lock: open for
          Lite, locked for View-only. */}
      <div className="flex shrink-0 flex-col gap-3 px-3 pt-1 pb-3">
        <Gate lock={locks.composer} placement="top" triggerClassName="flex w-full">
          <div tabIndex={0} className="w-full rounded-[4px] outline-none focus-visible:ring-2 focus-visible:ring-legacy-dialer-accent/40">
            <textarea
              disabled
              rows={3}
              placeholder="Type a message.."
              aria-label="Message"
              className="pointer-events-none w-full resize-none rounded-[4px] border border-control-border bg-white px-2 py-1.5 text-paragraph-lg outline-none placeholder:text-disabled-fg disabled:bg-secondary-bg"
            />
          </div>
        </Gate>
        <div className="flex items-center justify-between gap-1">
          <div className="flex items-center">
            <Gate lock={locks.composer} placement="top">
              <button type="button" aria-label="Saved templates" className={COMPOSER_TOOL}>
                <IconBookmark size={20} />
              </button>
            </Gate>
            <Gate lock={locks.composer} placement="top">
              <button type="button" aria-label="Schedule message" className={COMPOSER_TOOL}>
                <IconClock size={20} />
              </button>
            </Gate>
            <Gate lock={locks.composer} placement="top">
              <button type="button" aria-label="Attach a file" className={COMPOSER_TOOL}>
                <IconPaperclip size={20} />
              </button>
            </Gate>
          </div>
          <div className="flex items-center gap-2">
            <Gate lock={locks.composer} placement="top">
              <button
                type="button"
                aria-label="Emoji"
                className={COMPOSER_TOOL.replace("text-legacy-dialer-accent", "text-muted-foreground")}
              >
                <IconMoodSmile size={20} />
              </button>
            </Gate>
            {/* Separate, rounded buttons rather than production's butted pair:
                the two do unrelated things, and the gap says so. */}
            <div className="flex gap-2">
              <Gate lock={locks.conversation} placement="top">
                <button type="button" className={cn(COMPOSER_BUTTON, "bg-error")}>
                  Close Conversation
                </button>
              </Gate>
              <Gate lock={locks.composer} placement="top">
                <button type="button" className={cn(COMPOSER_BUTTON, "bg-legacy-dialer-go")}>
                  Send
                </button>
              </Gate>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function MessagesScreen({ locks }: { locks: DesktopAppLocks }) {
  const [open, setOpen] = React.useState<DesktopThread | null>(null);
  // The Messages bar stays put when a thread opens, as in production — the
  // thread brings its own Back.
  return (
    <>
      <MessagesHeader locks={locks} />
      {open ? (
        <ThreadView thread={open} locks={locks} onBack={() => setOpen(null)} />
      ) : (
        <ThreadList onOpen={setOpen} />
      )}
    </>
  );
}

/* ── Desktop chrome ─────────────────────────────────────────────────────── */

/** One window button: a coloured disc whose glyph shows on group hover. */
function TrafficLight({
  className,
  label,
  onClick,
  children,
}: {
  className: string;
  /** Only a working button gets a name; the others are decoration. */
  label?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      {...(onClick
        ? { type: "button" as const, "aria-label": label, onClick }
        : { "aria-hidden": true })}
      className={cn(
        "flex size-3 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/60",
        className
      )}
    >
      <svg
        viewBox="0 0 10 10"
        stroke="currentColor"
        fill="none"
        className="size-2 text-desktop-titlebar-ink/70 opacity-0 transition-opacity duration-fast group-hover:opacity-100"
      >
        {children}
      </svg>
    </Tag>
  );
}

/** The app window's title bar, with the traffic lights. */
function WindowTitleBar({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="relative flex h-8 shrink-0 items-center justify-center border-b border-desktop-titlebar-ink bg-desktop-titlebar select-none">
      {/* Hovering the group reveals all three glyphs at once, as macOS does. */}
      <div className="group absolute left-3 flex items-center gap-2">
        {/* Closing the app ends the demo: back to the prototype launcher. */}
        <TrafficLight className="bg-error" label="Close and return to prototypes" onClick={onClose}>
          <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" strokeWidth="1.3" strokeLinecap="round" />
        </TrafficLight>
        <TrafficLight className="bg-warning">
          <path d="M2 5h6" strokeWidth="1.3" strokeLinecap="round" />
        </TrafficLight>
        <TrafficLight className="bg-success">
          <path d="M2.6 6.9V2.6h4.3z M7.4 3.1v4.3H3.1z" stroke="none" fill="currentColor" />
        </TrafficLight>
      </div>
      <span aria-hidden className="text-label-md-semi text-white">{title}</span>
    </div>
  );
}

/* ── Shell ──────────────────────────────────────────────────────────────── */

function DesktopNav({ tab, onTabChange }: { tab: DesktopTab; onTabChange: (tab: DesktopTab) => void }) {
  return (
    <nav aria-label="Desktop app" className="flex w-full shrink-0 bg-legacy-dialer-bar">
      {NAV_ITEMS.map((item) => {
        const id = item.id;
        if (!id) {
          return (
            <div
              key={item.label}
              aria-hidden
              className="flex min-w-0 flex-1 cursor-default flex-col items-center gap-1 py-2.5 text-white"
            >
              {item.icon}
              <span className="text-label-sm whitespace-nowrap">{item.label}</span>
            </div>
          );
        }
        const active = tab === id;
        return (
          <button
            key={id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onTabChange(id)}
            className={cn(
              "flex min-w-0 flex-1 flex-col items-center gap-1 py-2.5 text-white outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40",
              active ? "bg-legacy-dialer-bar-active" : "hover:bg-legacy-dialer-bar-active/60"
            )}
          >
            {item.icon}
            <span className="text-label-sm whitespace-nowrap">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

/** The window's close button is the way home; a reload works too. */
export function DesktopAppPrototype({ license, onHome }: { license: License; onHome: () => void }) {
  const [tab, setTab] = React.useState<DesktopTab>("logs");
  const locks = desktopAppLocks(license);
  const [availability, setAvailability] = React.useState<Availability>({
    status: "available",
    reason: null,
  });

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-secondary-bg">
      <WindowTitleBar title="Dialer - JustCall" onClose={onHome} />
      {/* Bottom room for the license switch, which starts bottom-centre here. */}
      <div className="flex min-h-0 flex-1 items-center justify-center px-6 pt-6 pb-16">
      <AvailabilityContext.Provider value={{ value: availability, onChange: setAvailability }}>
        <div className="flex h-[680px] max-h-full w-[400px] shrink-0 flex-col overflow-hidden rounded-[24px] bg-white shadow-600">
          {tab === "phone" && <PhoneScreen locks={locks} />}
          {tab === "logs" && <LogsScreen locks={locks} />}
          {tab === "contacts" && <ContactsScreen locks={locks} />}
          {tab === "messages" && <MessagesScreen locks={locks} />}
          <DesktopNav tab={tab} onTabChange={setTab} />
        </div>
      </AvailabilityContext.Provider>
      </div>
    </div>
  );
}
