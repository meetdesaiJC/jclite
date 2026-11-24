import * as React from "react";
import { cn } from "@/lib/utils";
import { DURATION } from "@/lib/motion";
import { usePresence } from "@/lib/usePresence";
import { LockedControl, NO_ACTIONS_LOCK, type Lock } from "@/components/LockedControl";
import { Checkbox } from "@/components/Checkbox";
import {
  IconArchive,
  IconBookmark,
  IconBrandWhatsapp,
  IconCheck,
  IconChecks,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconCircleCheck,
  IconClock,
  IconClose,
  IconContacts,
  IconCopy,
  IconDotsVertical,
  IconDownload,
  IconFile,
  IconFilter,
  IconMessage2,
  IconMessages,
  IconMicrophone,
  IconNote,
  IconPhone,
  IconPhoneIncoming,
  IconPhoneOutgoing,
  IconPlayerPlay,
  IconPlus,
  IconSearch,
  IconSend,
  IconSparkles,
  IconTag,
  IconUser,
  IconUserX,
  IconUsersGroup,
} from "@/components/Icon";
import { mobileAppLocks, type License, type MobileAppLocks } from "./licenseLocks";
import {
  MOBILE_CALL_INSIGHTS,
  MOBILE_CONTACTS,
  MOBILE_INBOX,
  MOBILE_RECENTS,
  MOBILE_TEAM,
  MOBILE_THREADS,
  type MobileContact,
  type MobileRecent,
  type MobileTagTone,
  type MobileThread,
} from "./mobileAppData";
import usFlag from "./assets/dialer/us-flag.svg";

/**
 * Mobile app, as a Lite or View-only member sees it. Like the desktop app it
 * has no admin surface, so the license only shows up as locked verbs: every
 * list and record opens, and calling and sending stay visible, muted, and say
 * why on tap (LockedControl opens its reason on click — touch has no hover).
 *
 * The mobile app already ships on the new design language (the "Mobile UI DS
 * Migration" Figma), so unlike the desktop prototype it is drawn straight
 * from DS tokens: Heading 1 is text-heading-xxl, names are text-label-md,
 * body is text-paragraph-md / -sm.
 *
 * It opens on Recents for the same reason the desktop opens on Call Logs:
 * the dialer is the one screen where nothing works for these licenses.
 */
type MobileTab = "contacts" | "recents" | "dialer" | "sms";

/* ── Shared bits ────────────────────────────────────────────────────────── */

/**
 * A pushed screen — a thread, a contact — covers the tab bar, as in
 * production. It says so through this rather than the shell tracking every
 * screen's open state.
 */
const FullScreenContext = React.createContext<(on: boolean) => void>(() => {});

function useFullScreen() {
  const set = React.useContext(FullScreenContext);
  React.useEffect(() => {
    set(true);
    return () => set(false);
  }, [set]);
}

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

/** A tappable icon. Locked, it mutes and stops reacting. */
const ICON_TAP =
  "flex size-10 shrink-0 items-center justify-center rounded-full text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24 data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-transparent";

/** Production's round, lightly raised header buttons. */
const PILL_BUTTON =
  "flex h-12 min-w-12 items-center justify-center gap-1 rounded-full border border-line bg-white px-3 text-foreground shadow-100 outline-none transition-colors hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-brand/24 data-[locked=true]:text-disabled-fg data-[locked=true]:shadow-none data-[locked=true]:hover:bg-white";

function PageTitle({ title, trailing }: { title: string; trailing?: React.ReactNode }) {
  return (
    <div className="flex h-16 shrink-0 items-center justify-between px-4">
      <h2 className="text-heading-xxl text-foreground">{title}</h2>
      {trailing}
    </div>
  );
}

function SearchBox({
  placeholder,
  value,
  onChange,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative flex min-w-0 flex-1 items-center">
      <IconSearch size={20} className="pointer-events-none absolute left-4 text-foreground" />
      <input
        type="search"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={placeholder}
        className="h-11 w-full rounded-full border border-line bg-white pr-4 pl-11 text-paragraph-md text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
      />
    </label>
  );
}

function UnderlineTabs({
  items,
  value,
  onChange,
  compact,
}: {
  /** `inert` tabs are drawn but don't open — nothing behind them to show. */
  items: { key: string; label: React.ReactNode; inert?: boolean }[];
  value: string;
  onChange: (key: string) => void;
  /** Smaller labels, for tabs that carry an icon and a count each. */
  compact?: boolean;
}) {
  return (
    <div role="tablist" className="flex shrink-0 border-b border-line">
      {items.map((item) => {
        const active = item.key === value;
        if (item.inert) {
          return (
            <span
              key={item.key}
              aria-hidden
              className={cn(
                "flex flex-1 cursor-default items-center justify-center gap-1 py-3 whitespace-nowrap text-muted-foreground",
                compact ? "text-paragraph-md" : "text-paragraph-lg"
              )}
            >
              {item.label}
            </span>
          );
        }
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.key)}
            className={cn(
              "relative flex flex-1 items-center justify-center gap-1 py-3 whitespace-nowrap outline-none transition-colors duration-base focus-visible:bg-secondary-bg",
              compact ? "text-paragraph-md" : "text-paragraph-lg",
              active ? "text-brand" : "text-muted-foreground"
            )}
          >
            {item.label}
            {active ? <span className="absolute inset-x-0 bottom-0 h-0.5 bg-brand" /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** A grey band under the tabs — "Calls from Last 7 days", "View: All". */
function ScopeBar({ label, value }: { label: string; value: string }) {
  return (
    <button
      type="button"
      className="flex h-10 w-full shrink-0 items-center gap-1 bg-secondary-bg px-4 text-left text-paragraph-md text-muted-foreground outline-none focus-visible:bg-surface-hover"
    >
      {label} <span className="text-label-md text-foreground">{value}</span>
      <IconChevronDown size={16} className="text-foreground" />
    </button>
  );
}

function Initials({ text, size = "md" }: { text?: string; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-tag-grey-bg text-muted-foreground",
        size === "sm" && "size-8 text-label-sm",
        size === "md" && "size-11 text-paragraph-lg",
        size === "lg" && "size-12 text-paragraph-lg"
      )}
    >
      {text ?? <IconUser size={16} />}
    </span>
  );
}

function EmptyList({ children }: { children: React.ReactNode }) {
  return <p className="px-6 py-10 text-center text-paragraph-md text-muted-foreground">{children}</p>;
}

/* ── Recents ────────────────────────────────────────────────────────────── */

/** "17126257333" → "(712) 625-7333", as production writes US numbers. */
function formatUs(number: string): string {
  const digits = number.replace(/\D/g, "").replace(/^1(?=\d{10}$)/, "");
  return digits.length === 10
    ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : number;
}

function RecentRow({
  call,
  locks,
  onOpen,
}: {
  call: MobileRecent;
  locks: MobileAppLocks;
  onOpen: () => void;
}) {
  const [playing, setPlaying] = React.useState(false);
  return (
    // Opening a call is reading, so the whole row opens it for both licenses.
    // Its own buttons — play, and the locked call — keep their tap.
    <li
      role="button"
      tabIndex={0}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("button, [data-locked]")) return;
        onOpen();
      }}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpen();
        }
      }}
      className="flex cursor-pointer items-start gap-3 border-b border-line py-4 outline-none focus-visible:bg-secondary-bg"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-secondary-bg">
        {call.missed ? (
          <IconPhoneIncoming size={20} className="size-4 text-error" />
        ) : (
          <IconPhoneOutgoing size={20} className="size-4 text-brand" />
        )}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className={cn("truncate text-label-md", call.missed ? "text-error" : "text-foreground")}>
          {call.number}
        </span>
        <span className="truncate text-paragraph-md text-disabled-fg">{call.subline}</span>
        {/* Listening is reading: recordings and voicemails play for both. */}
        {call.duration ? (
          <button
            type="button"
            aria-pressed={playing}
            aria-label={playing ? "Pause recording" : "Play recording"}
            onClick={() => setPlaying((value) => !value)}
            className="mt-1 flex w-fit items-center gap-2 rounded-full text-paragraph-md text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <span className={cn("flex size-6 items-center justify-center rounded-full bg-secondary-bg text-foreground", playing && "bg-brand-subtle text-brand")}>
              <IconPlayerPlay size={16} className="size-3" />
            </span>
            {playing ? "Playing…" : call.duration}
          </button>
        ) : null}
      </div>
      <span className="shrink-0 text-right text-paragraph-md text-disabled-fg">
        {call.day}
        <br />
        {call.time}
      </span>
      <Gate lock={locks.call}>
        <button type="button" aria-label={`Call ${call.number}`} className={ICON_TAP}>
          <IconPhone size={24} />
        </button>
      </Gate>
    </li>
  );
}

/** Production's grey section header band on the call page. */
function SectionHeader({ children }: { children: React.ReactNode }) {
  return <div className="bg-secondary-bg px-4 pt-5 pb-3 text-label-lg text-foreground">{children}</div>;
}

const DISPOSITIONS = ["Interested", "Not interested", "Call back later", "Wrong number"];

/** Production's outline stars. Drawn here — the icon set has no star. */
function Star({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-8", filled ? "fill-current" : "fill-none")} stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round">
      <path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.15 1 5.85L12 16.95 6.75 19.7l1-5.85L3.5 9.7l5.9-.9z" />
    </svg>
  );
}

/**
 * A call, opened from Recents — missed calls included. Reading it is open to
 * both licenses: who, when, how long, the recording. Calling back, texting
 * and saving the number lock for both. Disposition, rating and notes edit the
 * record, so View-only loses them; the transcript is web app only.
 */
function CallDetail({
  call,
  locks,
  onBack,
}: {
  call: MobileRecent;
  locks: MobileAppLocks;
  onBack: () => void;
}) {
  useFullScreen();
  const [tab, setTab] = React.useState("info");
  const [playing, setPlaying] = React.useState(false);
  const [disposition, setDisposition] = React.useState<string | null>(null);
  const [picking, setPicking] = React.useState(false);
  const [rating, setRating] = React.useState(0);
  const [note, setNote] = React.useState("");
  const [writing, setWriting] = React.useState(false);
  const edit = locks.logDetails;

  const [actionsOpen, setActionsOpen] = React.useState(false);
  // Every row but Add to contacts is Lite's; View-only would get a sheet of
  // nothing but locked rows, so its trigger locks instead — and an open sheet
  // closes when you switch to View-only.
  React.useEffect(() => {
    if (locks.conversation) setActionsOpen(false);
  }, [locks.conversation]);
  const moreTrigger = (
    <button type="button" aria-label="More options" onClick={() => setActionsOpen(true)} className={PILL_BUTTON}>
      <IconDotsVertical size={20} />
    </button>
  );
  const more = locks.conversation ? <Gate lock={NO_ACTIONS_LOCK}>{moreTrigger}</Gate> : moreTrigger;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex shrink-0 items-center justify-between px-4 pt-2">
        <button type="button" aria-label="Back to recents" onClick={onBack} className="flex size-10 items-center justify-center text-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/24">
          <IconChevronLeft size={24} />
        </button>
        {more}
      </div>

      <div className="flex flex-col items-center gap-1 px-4 pb-6">
        <span className="flex size-14 items-center justify-center rounded-full bg-secondary-bg">
          {call.missed ? (
            <IconPhoneIncoming size={20} className="size-6 text-error" />
          ) : (
            <IconPhoneOutgoing size={20} className="size-6 text-brand" />
          )}
        </span>
        <h3 className="pt-3 text-heading-xxl text-foreground">{formatUs(call.number)}</h3>
        {/* Saving a number as a contact is web app only, even for Lite. */}
        <Gate lock={locks.addContact}>
          <button type="button" className="text-paragraph-lg text-brand outline-none focus-visible:underline data-[locked=true]:text-disabled-fg">
            + Add contact
          </button>
        </Gate>
        <div className="mt-4 grid w-full grid-cols-2 gap-5 px-4">
          <Gate lock={locks.sms} triggerClassName="flex">
            <button type="button" className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-brand text-label-md text-brand outline-none data-[locked=true]:border-line data-[locked=true]:text-disabled-fg">
              <IconMessages size={20} />
              Send SMS
            </button>
          </Gate>
          <Gate lock={locks.call} triggerClassName="flex">
            <button type="button" className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-brand text-label-md text-brand outline-none data-[locked=true]:border-line data-[locked=true]:text-disabled-fg">
              <IconPhone size={20} />
              Call
            </button>
          </Gate>
        </div>
      </div>

      <UnderlineTabs
        compact
        value={tab}
        onChange={setTab}
        items={[
          { key: "info", label: "Call Info" },
          { key: "ai", label: <><IconSparkles size={16} className="text-ai-gradient-from" />AI Insights</> },
          // CRM sync activity is web app only on the sheet: drawn, not opened.
          { key: "integrations", label: "Integrations", inert: true },
        ]}
      />

      {tab === "info" ? (
        <div className="flex flex-col">
          <SectionHeader>Call information</SectionHeader>
          <div className="flex items-center gap-3 border-b border-line px-4 py-4">
            <img src={usFlag} alt="" className="h-5 w-7 object-cover" />
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="text-label-md text-foreground">{formatUs(call.line)}</span>
              <span className="text-paragraph-md text-disabled-fg">+1 {formatUs(call.line).replace(/[()]/g, "").replace("-", " ")}</span>
            </div>
            <div className="flex flex-col items-end gap-1">
              <span
                className={cn(
                  "flex items-center gap-1 rounded-md border border-line px-2 py-0.5 text-label-sm",
                  call.missed ? "text-error" : "text-foreground"
                )}
              >
                {call.missed ? <IconPhoneIncoming size={20} className="size-4" /> : <IconPhoneOutgoing size={20} className="size-4 text-brand" />}
                {call.missed ? (call.voicemail ? "Voicemail" : "Missed") : "Outbound"}
              </span>
              <span className="text-paragraph-md text-disabled-fg">
                {call.day} {call.time}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 text-paragraph-lg text-foreground">
            <IconClock size={20} />
            <span className="flex-1">{call.voicemail ? "Voicemail length:" : "Call duration:"}</span>
            <span>{call.missed && !call.voicemail ? "—" : call.duration}</span>
          </div>

          {/* Listening is reading: open to both licenses. A missed call with
              no voicemail has nothing to play, so there's no player. */}
          {call.duration ? (
            <>
              <div className="h-6 bg-secondary-bg" />
              <div className="flex items-center gap-4 border-b border-line px-4 py-4">
                <button
                  type="button"
                  aria-pressed={playing}
                  aria-label={playing ? "Pause recording" : "Play recording"}
                  onClick={() => setPlaying((value) => !value)}
                  className="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand text-white outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
                >
                  <IconPlayerPlay size={20} />
                </button>
                <span className="relative h-1.5 flex-1 rounded-full bg-line">
                  <span className={cn("absolute top-1/2 size-4 -translate-y-1/2 rounded-full bg-brand/60", playing ? "left-1/3" : "left-0")} />
                </span>
                <button type="button" aria-label="Download recording" className="flex size-10 items-center justify-center text-muted-foreground outline-none">
                  <IconDownload size={24} />
                </button>
              </div>
              <Gate lock={locks.transcript} triggerClassName="flex w-full">
                <button type="button" className="flex h-14 w-full items-center gap-3 px-4 text-left text-paragraph-lg text-foreground outline-none data-[locked=true]:text-disabled-fg">
                  <IconFile size={20} />
                  <span className="flex-1">View call transcript</span>
                  <IconChevronRight size={20} />
                </button>
              </Gate>
            </>
          ) : null}

          <SectionHeader>Assigned agent</SectionHeader>
          <div className="flex items-center gap-3 px-4 py-3">
            <Initials text="JS" />
            <span className="text-paragraph-lg text-foreground">JustCall SaaS Labs</span>
          </div>

          <SectionHeader>Call disposition</SectionHeader>
          <Gate lock={edit} triggerClassName="flex w-full">
            <button
              type="button"
              aria-expanded={picking}
              onClick={() => setPicking((open) => !open)}
              className={cn(
                "flex h-14 w-full items-center px-4 text-left text-paragraph-lg outline-none data-[locked=true]:text-disabled-fg",
                disposition ? "text-foreground" : "text-muted-foreground"
              )}
            >
              <span className="flex-1">{disposition ?? "Select call disposition"}</span>
              <IconChevronRight size={20} className={cn("transition-[rotate] duration-fast ease-standard motion-reduce:transition-none", picking && "rotate-90")} />
            </button>
          </Gate>
          {picking && !edit ? (
            <ul className="border-t border-line">
              {DISPOSITIONS.map((option) => (
                <li key={option}>
                  <button
                    type="button"
                    onClick={() => {
                      setDisposition(option);
                      setPicking(false);
                    }}
                    className="flex h-12 w-full items-center px-6 text-left text-paragraph-md text-foreground outline-none hover:bg-secondary-bg focus-visible:bg-secondary-bg"
                  >
                    {option}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}

          <SectionHeader>How was the quality of your call?</SectionHeader>
          <Gate lock={edit} triggerClassName="flex w-full">
            <div
              role="radiogroup"
              aria-label="Call quality"
              tabIndex={edit ? 0 : undefined}
              className="flex w-full justify-center gap-4 py-4 text-warning outline-none data-[locked=true]:text-disabled-fg"
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
                  className="outline-none disabled:pointer-events-none"
                >
                  <Star filled={value <= rating} />
                </button>
              ))}
            </div>
          </Gate>

          <SectionHeader>Notes</SectionHeader>
          {writing && !edit ? (
            <div className="flex flex-col gap-2 px-4 py-3">
              <textarea
                autoFocus
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                aria-label="Notes"
                className="w-full resize-none rounded-md border border-line px-3 py-2 text-paragraph-md outline-none focus:border-brand"
              />
              <button
                type="button"
                onClick={() => setWriting(false)}
                className="self-end rounded-md bg-brand px-4 py-2 text-label-md text-white outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
              >
                Save
              </button>
            </div>
          ) : (
            <Gate lock={edit} triggerClassName="flex w-full">
              <button
                type="button"
                onClick={() => setWriting(true)}
                className="flex h-14 w-full items-center gap-3 px-4 text-left text-paragraph-lg text-brand outline-none data-[locked=true]:text-disabled-fg"
              >
                <IconNote size={20} />
                {note || "Add notes"}
              </button>
            </Gate>
          )}
          <div className="h-8 bg-secondary-bg" />
        </div>
      ) : (
        <CallAiInsights call={call} locks={locks} />
      )}
      <CallActionSheet
        open={actionsOpen && !locks.conversation}
        locks={locks}
        onClose={() => setActionsOpen(false)}
      />
    </div>
  );
}

/** A small centred sheet: enters at `base`, leaves a step quicker (§4). */
const ACTION_SHEET_EXIT_MS = DURATION.fast;

/**
 * Production's ⋮ sheet on a call — iOS-style, centred, one pill per action.
 * Blacklist, DND and DNM are the number controls the sheet gives Lite on
 * mobile; Add to contacts is web app only, so it stays in the list, locked.
 */
function CallActionSheet({
  open,
  locks,
  onClose,
}: {
  open: boolean;
  locks: MobileAppLocks;
  onClose: () => void;
}) {
  const { mounted, state } = usePresence(open, ACTION_SHEET_EXIT_MS);
  if (!mounted) return null;
  const row =
    "flex h-12 w-full items-center justify-center rounded-full bg-tag-grey-bg text-paragraph-lg text-foreground outline-none transition-colors hover:bg-line focus-visible:ring-2 focus-visible:ring-brand/24 data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-tag-grey-bg";
  const action = (label: string, lock?: Lock) => (
    <Gate key={label} lock={lock} triggerClassName="flex w-full">
      <button type="button" onClick={onClose} className={row}>
        {label}
      </button>
    </Gate>
  );
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center px-8">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onClose}
        data-state={state}
        className="absolute inset-0 bg-foreground/24 transition-opacity data-[state=closed]:opacity-0 data-[state=closed]:duration-fast data-[state=open]:opacity-100 data-[state=open]:duration-base"
      />
      <div
        role="dialog"
        aria-label="Call options"
        data-state={state}
        className="relative flex w-full flex-col gap-2 rounded-[32px] bg-white p-3 shadow-600 transition-[scale,opacity] data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=closed]:duration-fast data-[state=closed]:ease-exit data-[state=open]:scale-100 data-[state=open]:opacity-100 data-[state=open]:duration-base data-[state=open]:ease-entrance motion-reduce:scale-100"
      >
        {action("Add to contacts", locks.addContact)}
        {action("Add to black list", locks.conversation)}
        {action("Add to DND", locks.conversation)}
        {action("Add to DNM", locks.conversation)}
        {action("Cancel")}
      </div>
    </div>
  );
}

/**
 * AI Insights for a call. Reading is open to both licenses — the summary, its
 * Copy, the chapters and playing from one. Ticking an action item marks work
 * done on the record, so like disposition and notes it is Lite's, not
 * View-only's.
 */
function CallAiInsights({ call, locks }: { call: MobileRecent; locks: MobileAppLocks }) {
  const [copied, setCopied] = React.useState(false);
  const [allChapters, setAllChapters] = React.useState(false);
  const [playing, setPlaying] = React.useState<string | null>(null);
  const [done, setDone] = React.useState<Set<number>>(() => new Set());
  const edit = locks.logDetails;

  // Only a connected call has a conversation to read.
  if (!call.duration || (call.missed && !call.voicemail)) {
    return <EmptyList>No AI insights for this call — nothing was recorded.</EmptyList>;
  }

  const { summary, chapters, actionItems } = MOBILE_CALL_INSIGHTS;
  const copy = () => {
    void navigator.clipboard?.writeText(summary).catch(() => {});
    setCopied(true);
  };
  const chapterCard = (chapter: (typeof chapters)[number], wide: boolean) => (
    <button
      key={chapter.id}
      type="button"
      aria-pressed={playing === chapter.id}
      onClick={() => setPlaying((id) => (id === chapter.id ? null : chapter.id))}
      className={cn(
        "flex shrink-0 flex-col gap-2 rounded-lg border border-line bg-white p-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
        wide ? "w-full" : "w-[170px]",
        playing === chapter.id && "border-brand"
      )}
    >
      <span className="flex items-center gap-2 text-label-md text-brand">
        <span className="flex size-5 items-center justify-center rounded-full bg-brand text-white">
          <IconPlayerPlay size={16} className="size-3" />
        </span>
        {chapter.range}
      </span>
      <span className="text-label-md text-foreground">{chapter.title}</span>
    </button>
  );

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between bg-secondary-bg px-4 pt-5 pb-3">
        <span className="text-label-lg text-foreground">Call Summary</span>
        <button
          type="button"
          onClick={copy}
          className="flex items-center gap-1 text-paragraph-lg text-brand outline-none focus-visible:underline"
        >
          {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <p className="px-4 py-4 text-paragraph-lg text-foreground">{summary}</p>

      <div className="flex flex-col gap-3 bg-secondary-bg pb-4">
        <div className="flex items-center justify-between px-4 pt-5">
          <span className="text-label-lg text-foreground">Smart Chapters</span>
          <button
            type="button"
            onClick={() => setAllChapters((v) => !v)}
            className="text-paragraph-lg text-brand outline-none focus-visible:underline"
          >
            {allChapters ? "Show less" : "View all"}
          </button>
        </div>
        {allChapters ? (
          <div className="flex flex-col gap-2 px-4">{chapters.map((c) => chapterCard(c, true))}</div>
        ) : (
          <div className="flex gap-3 overflow-x-auto px-4">{chapters.map((c) => chapterCard(c, false))}</div>
        )}
      </div>

      <SectionHeader>Action Items</SectionHeader>
      <ul className="flex flex-col gap-3 px-4 py-4">
        {actionItems.map((item, index) => (
          <li key={item}>
            <Gate lock={edit} triggerClassName="flex w-full">
              {/* Label beside the box rather than through `label`, which never
                  shrinks — a long item would run off the screen, not wrap. */}
              <div tabIndex={edit ? 0 : undefined} className="flex w-full items-start gap-2 outline-none focus-visible:ring-2 focus-visible:ring-brand/24">
                <Checkbox
                  id={`action-item-${index}`}
                  className="mt-0.5"
                  disabled={Boolean(edit)}
                  checked={done.has(index)}
                  onCheckedChange={(checked) =>
                    setDone((prev) => {
                      const next = new Set(prev);
                      if (checked) next.add(index);
                      else next.delete(index);
                      return next;
                    })
                  }
                />
                <label
                  htmlFor={`action-item-${index}`}
                  className={cn(
                    "min-w-0 flex-1 text-paragraph-md",
                    edit ? "text-disabled-fg" : "cursor-pointer text-foreground",
                    done.has(index) && "text-muted-foreground line-through"
                  )}
                >
                  {item}
                </label>
              </div>
            </Gate>
          </li>
        ))}
      </ul>
      <div className="h-8 bg-secondary-bg" />
    </div>
  );
}

function RecentsScreen({ locks }: { locks: MobileAppLocks }) {
  const [tab, setTab] = React.useState("all");
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState<MobileRecent | null>(null);
  if (open) return <CallDetail call={open} locks={locks} onBack={() => setOpen(null)} />;
  const q = query.trim();
  const calls = MOBILE_RECENTS.filter((call) => {
    if (tab === "missed" && !call.missed) return false;
    if (tab === "voicemails" && !call.voicemail) return false;
    return !q || call.number.includes(q);
  });
  return (
    <>
      <PageTitle
        title="Recents"
        trailing={
          <div className="flex rounded-full border border-line bg-white shadow-100">
            {/* Opens the archived list — viewing call logs, which the sheet
                gives both licenses on mobile. Only archiving is web app only. */}
            <button type="button" aria-label="Archived calls" className={cn(PILL_BUTTON, "border-0 shadow-none")}>
              <IconArchive size={20} />
            </button>
            <button type="button" aria-label="Filter" className={cn(PILL_BUTTON, "border-0 shadow-none")}>
              <IconFilter size={20} />
            </button>
          </div>
        }
      />
      <div className="flex shrink-0 px-2 pb-4">
        <SearchBox placeholder="Search contact name or number" value={query} onChange={setQuery} />
      </div>
      <UnderlineTabs
        value={tab}
        onChange={setTab}
        items={[
          { key: "all", label: "All" },
          { key: "missed", label: "Missed" },
          { key: "voicemails", label: "Voicemails" },
        ]}
      />
      <ScopeBar label="Calls from" value="Last 7 days" />
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {calls.length ? (
          <ul>
            {calls.map((call) => (
              <RecentRow key={call.id} call={call} locks={locks} onOpen={() => setOpen(call)} />
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
  contact: MobileContact;
  locks: MobileAppLocks;
  onOpen?: () => void;
}) {
  const body = (
    <>
      <Initials text={contact.initials} />
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-label-md text-foreground">{contact.name}</span>
        <span className="truncate text-paragraph-md text-disabled-fg">
          {contact.number}
          {contact.company ? ` · ${contact.company}` : ""}
        </span>
      </span>
    </>
  );
  return (
    <li className="flex items-center gap-1 border-b border-line">
      {/* Viewing a contact is reading, so the row opens it for both
          licenses. The SMS and call shortcuts sit beside it. */}
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          className="flex min-w-0 flex-1 items-center gap-3 py-3 text-left outline-none focus-visible:bg-secondary-bg"
        >
          {body}
        </button>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3 py-3">{body}</div>
      )}
      <Gate lock={locks.sms}>
        <button type="button" aria-label={`Message ${contact.name}`} className={ICON_TAP}>
          <IconMessages size={24} />
        </button>
      </Gate>
      <Gate lock={locks.call}>
        <button type="button" aria-label={`Call ${contact.name}`} className={ICON_TAP}>
          <IconPhone size={24} />
        </button>
      </Gate>
    </li>
  );
}

/** A plain row on the contact page — Remove from black list, Add to DND. */
const DETAIL_ROW =
  "flex h-14 w-full items-center border-b border-line px-4 text-left text-paragraph-lg text-foreground outline-none transition-colors hover:bg-secondary-bg focus-visible:bg-secondary-bg data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-white";

/**
 * A contact, opened from the list. Reading it is open to both licenses.
 * Send SMS, Call and Edit lock for both — editing a contact is web app only.
 * Blacklist, DND and DNM are on mobile for Lite and locked for View-only.
 */
function ContactDetail({
  contact,
  locks,
  onBack,
}: {
  contact: MobileContact;
  locks: MobileAppLocks;
  onBack: () => void;
}) {
  useFullScreen();
  const [blacklisted, setBlacklisted] = React.useState(Boolean(contact.blacklisted));
  const [dnd, setDnd] = React.useState(false);
  const [dnm, setDnm] = React.useState(false);
  const field = (label: string, value?: string, actions?: React.ReactNode) => (
    <div className="flex items-center border-y border-line bg-white px-4 py-3">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="text-paragraph-md text-disabled-fg">{label}</span>
        {value ? <span className="truncate text-paragraph-lg text-foreground">{value}</span> : null}
      </div>
      {actions}
    </div>
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      <div className="flex shrink-0 items-center justify-between px-4 pt-2">
        <button type="button" aria-label="Back to contacts" onClick={onBack} className={PILL_BUTTON}>
          <IconChevronLeft size={24} />
        </button>
        <Gate lock={locks.addContact}>
          <button type="button" className={cn(PILL_BUTTON, "px-5 text-label-lg text-success-text")}>
            Edit
          </button>
        </Gate>
      </div>
      <div className="flex flex-col items-center gap-1 px-4 pb-4">
        <span className="flex size-12 items-center justify-center rounded-full bg-tag-grey-bg text-paragraph-lg text-muted-foreground">
          {contact.initials.toLowerCase()}
        </span>
        <h3 className="pt-2 text-heading-xxl text-foreground">{contact.name}</h3>
        <span className="text-paragraph-lg text-disabled-fg">{contact.number}</span>
        <div className="mt-3 grid w-full grid-cols-2 gap-6 px-6">
          <Gate lock={locks.sms} triggerClassName="flex">
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-brand text-label-md text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24 data-[locked=true]:border-line data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-white"
            >
              <IconMessages size={20} />
              Send SMS
            </button>
          </Gate>
          <Gate lock={locks.call} triggerClassName="flex">
            <button
              type="button"
              className="flex h-11 w-full items-center justify-center gap-2 rounded-md border border-brand text-label-md text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24 data-[locked=true]:border-line data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-white"
            >
              <IconPhone size={20} />
              Call
            </button>
          </Gate>
        </div>
      </div>
      <div className="flex flex-col gap-4 bg-secondary-bg py-4">
        {field(
          "Mobile",
          contact.number,
          <div className="flex">
            <Gate lock={locks.sms}>
              <button type="button" aria-label="Send SMS" className={ICON_TAP}>
                <IconMessages size={24} />
              </button>
            </Gate>
            <Gate lock={locks.call}>
              <button type="button" aria-label="Call" className={ICON_TAP}>
                <IconPhone size={24} />
              </button>
            </Gate>
          </div>
        )}
        {field("Company", contact.company)}
        {field("Email", contact.email)}
        <div className="border-y border-line bg-white px-4 py-4 text-paragraph-lg text-foreground">
          No Integration data found
        </div>
        <div className="border-t border-line bg-white">
          <Gate lock={locks.conversation} triggerClassName="flex w-full">
            <button type="button" onClick={() => setBlacklisted((v) => !v)} className={DETAIL_ROW}>
              {blacklisted ? "Remove from black list" : "Add to black list"}
            </button>
          </Gate>
          <Gate lock={locks.conversation} triggerClassName="flex w-full">
            <button type="button" onClick={() => setDnd((v) => !v)} className={DETAIL_ROW}>
              {dnd ? "Remove from DND" : "Add to DND"}
            </button>
          </Gate>
          <Gate lock={locks.conversation} triggerClassName="flex w-full">
            <button type="button" onClick={() => setDnm((v) => !v)} className={DETAIL_ROW}>
              {dnm ? "Remove from DNM" : "Add to DNM"}
            </button>
          </Gate>
        </div>
      </div>
    </div>
  );
}

function ContactsScreen({ locks }: { locks: MobileAppLocks }) {
  const [tab, setTab] = React.useState("list");
  const [query, setQuery] = React.useState("");
  const [open, setOpen] = React.useState<MobileContact | null>(null);
  if (open) return <ContactDetail contact={open} locks={locks} onBack={() => setOpen(null)} />;
  const q = query.trim().toLowerCase();
  const source = tab === "team" ? MOBILE_TEAM : MOBILE_CONTACTS;
  const list = source.filter((c) => !q || c.name.toLowerCase().includes(q) || c.number.includes(q));
  return (
    <>
      <PageTitle
        title="Contacts"
        trailing={
          // Adding a contact is web app only, even for Lite.
          <Gate lock={locks.addContact}>
            <button type="button" aria-label="Add contact" className={cn(PILL_BUTTON, "text-brand")}>
              <IconPlus size={20} />
            </button>
          </Gate>
        }
      />
      <div className="flex shrink-0 px-2 pb-4">
        <SearchBox placeholder="Search for contact" value={query} onChange={setQuery} />
      </div>
      <UnderlineTabs
        value={tab}
        onChange={setTab}
        items={[
          { key: "list", label: "Contact list" },
          { key: "team", label: "Team" },
          { key: "book", label: "Phone book" },
        ]}
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {tab === "book" ? (
          <EmptyList>Allow access to your phone’s contacts to see them here.</EmptyList>
        ) : list.length ? (
          <ul>
            {list.map((contact) => (
              <ContactRow
                key={contact.id}
                contact={contact}
                locks={locks}
                onOpen={tab === "list" ? () => setOpen(contact) : undefined}
              />
            ))}
          </ul>
        ) : (
          <EmptyList>No contacts match your search.</EmptyList>
        )}
      </div>
    </>
  );
}

/* ── Dialer ─────────────────────────────────────────────────────────────── */

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
 * The keypad, whole and locked: the number bar, the pad, Call and Calling
 * from each carry their own lock, so tapping any of them says why.
 */
function DialerScreen({ locks }: { locks: MobileAppLocks }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <Gate lock={locks.dialer} triggerClassName="flex w-full">
        <div
          tabIndex={0}
          aria-label="Phone number"
          className="mt-4 flex h-14 w-full items-center gap-3 bg-secondary-bg px-4 text-heading-xxl font-normal text-foreground outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/24 data-[locked=true]:text-disabled-fg"
        >
          <img src={usFlag} alt="" className="h-5 w-8 rounded-[2px] object-cover" />
          (US) +1
          <span className="flex-1" />
          <span className="flex size-8 items-center justify-center rounded-full border-2 border-current text-success">
            <IconUser size={16} />
          </span>
        </div>
      </Gate>
      <div className="flex min-h-0 flex-1 flex-col items-center justify-evenly">
        <Gate lock={locks.dialer}>
          <div
            tabIndex={0}
            aria-label="Keypad"
            className="group grid grid-cols-3 gap-x-5 gap-y-4 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            {KEYS.map((key) => (
              <span
                key={key.digit}
                className="flex size-[72px] flex-col items-center justify-center rounded-full border border-line"
              >
                <span className="text-[28px] leading-8 font-normal text-muted-foreground group-data-[locked=true]:text-disabled-fg">
                  {key.digit}
                </span>
                <span className="min-h-4 text-paragraph-sm text-disabled-fg">{key.letters ?? " "}</span>
              </span>
            ))}
          </div>
        </Gate>
        <Gate lock={locks.dialer} placement="top">
          <button
            type="button"
            aria-label="Call"
            className="flex size-16 items-center justify-center rounded-full bg-brand text-white shadow-300 outline-none transition-colors hover:bg-brand-hover focus-visible:ring-4 focus-visible:ring-brand/24 data-[locked=true]:bg-disabled-bg data-[locked=true]:text-disabled-fg data-[locked=true]:shadow-none data-[locked=true]:hover:bg-disabled-bg"
          >
            <IconPhone size={24} />
          </button>
        </Gate>
        <Gate lock={locks.dialer} placement="top">
          <button
            type="button"
            className="flex h-10 items-center gap-2 rounded-[4px] border border-line bg-white px-3 text-paragraph-md text-muted-foreground outline-none focus-visible:ring-2 focus-visible:ring-brand/24 data-[locked=true]:text-disabled-fg"
          >
            Calling from:
            <img src={usFlag} alt="" className="h-3.5 w-5 object-cover" />
            <span className="text-foreground group-data-[locked=true]:text-disabled-fg">(208) 965-8288</span>
            <IconChevronDown size={16} />
          </button>
        </Gate>
      </div>
    </div>
  );
}

/* ── SMS ────────────────────────────────────────────────────────────────── */

const TAG_TONE: Record<MobileTagTone, string> = {
  dark: "bg-foreground text-white",
  blue: "bg-brand text-white",
  orange: "bg-warning text-white",
  soft: "bg-avatar-indigo-bg text-brand",
};

function Ticks({ delivered }: { delivered: boolean }) {
  return delivered ? (
    <IconChecks size={16} className="text-muted-foreground" />
  ) : (
    <IconCheck size={16} className="text-muted-foreground" />
  );
}

function ThreadList({ locks, onOpen }: { locks: MobileAppLocks; onOpen: (thread: MobileThread) => void }) {
  const [channel, setChannel] = React.useState("sms");
  const [query, setQuery] = React.useState("");
  const q = query.trim();
  const threads = channel === "sms" ? MOBILE_THREADS.filter((t) => !q || t.number.includes(q)) : [];
  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 px-4">
        <img src={usFlag} alt="" className="size-8 rounded-full object-cover" />
        {/* Switching inbox is reading, so it stays open to both. */}
        <button type="button" className="flex min-w-0 flex-1 flex-col items-start text-left outline-none">
          <span className="flex items-center gap-1 text-label-md text-foreground">
            {MOBILE_INBOX.name}
            <IconChevronDown size={16} />
            <span className="ml-1 size-2 rounded-full bg-brand" />
          </span>
          <span className="text-paragraph-sm text-muted-foreground">{MOBILE_INBOX.number}</span>
        </button>
        <Gate lock={locks.newMessage}>
          <button
            type="button"
            aria-label="New message"
            className="flex size-10 items-center justify-center rounded-md border border-brand text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24 data-[locked=true]:border-line data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-white"
          >
            <IconPlus size={20} />
          </button>
        </Gate>
      </div>
      <UnderlineTabs
        compact
        value={channel}
        onChange={setChannel}
        items={[
          { key: "sms", label: <><IconMessage2 size={20} className="size-4" />SMS <Count n={77} /></> },
          { key: "whatsapp", label: <><IconBrandWhatsapp size={16} className="text-success" />WhatsApp <Count n={4} /></> },
          { key: "group", label: <><IconUsersGroup size={16} className="text-warning" />Group SMS <Count n={1} /></> },
        ]}
      />
      <ScopeBar label="View:" value="All Conversations" />
      <div className="flex shrink-0 items-center gap-3 px-4 py-3">
        <SearchBox placeholder="Search" value={query} onChange={setQuery} />
        <button type="button" aria-label="Filter" className="flex size-10 items-center justify-center text-foreground outline-none">
          <IconFilter size={24} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {threads.length ? (
          <ul className="flex flex-col">
            {threads.map((thread) => (
              <li key={thread.id}>
                <button
                  type="button"
                  onClick={() => onOpen(thread)}
                  className="flex w-full items-start gap-3 py-3 text-left outline-none focus-visible:bg-secondary-bg"
                >
                  <Initials />
                  <span className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-label-md text-foreground">{thread.number}</span>
                      <span className="shrink-0 text-paragraph-md text-muted-foreground">{thread.date}</span>
                    </span>
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-paragraph-md text-muted-foreground">{thread.preview}</span>
                      <Ticks delivered={thread.delivered} />
                    </span>
                    {thread.tags.length ? (
                      <span className="flex flex-wrap gap-1.5 pt-1">
                        {thread.tags.map((tag) => (
                          <span key={tag.label} className={cn("rounded-[4px] px-1.5 py-0.5 text-label-sm", TAG_TONE[tag.tone])}>
                            {tag.label}
                          </span>
                        ))}
                        {thread.moreTags ? (
                          <span className="rounded-[4px] bg-secondary-bg px-1.5 py-0.5 text-label-sm text-muted-foreground">
                            +{thread.moreTags}
                          </span>
                        ) : null}
                      </span>
                    ) : null}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyList>{channel === "sms" ? "No conversations match your search." : "No conversations here yet."}</EmptyList>
        )}
      </div>
    </>
  );
}

function Count({ n }: { n: number }) {
  return <span className="rounded-full bg-brand-subtle px-1.5 text-label-sm text-brand">{n}</span>;
}

/** Bottom sheet exit takes a step less than its enter (§4 pairing rule). */
const SHEET_EXIT_MS = DURATION.moderate;

/**
 * Production's "More Options" sheet. For Lite everything the sheet holds is a
 * mobile conversation action the license keeps — except Add to Contacts,
 * which is web app only and stays in the list, locked.
 */
function MoreOptionsSheet({
  open,
  locks,
  onClose,
}: {
  open: boolean;
  locks: MobileAppLocks;
  onClose: () => void;
}) {
  const { mounted, state } = usePresence(open, SHEET_EXIT_MS);
  if (!mounted) return null;
  const row =
    "flex h-14 w-full items-center gap-4 border-b border-line px-5 text-left text-paragraph-lg text-foreground outline-none transition-colors hover:bg-secondary-bg focus-visible:bg-secondary-bg data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-white";
  const block =
    "flex h-11 flex-1 items-center justify-center gap-2 rounded-md border border-brand text-label-lg text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24";
  return (
    <div className="absolute inset-0 z-20 flex flex-col justify-end">
      <button
        type="button"
        aria-label="Close options"
        onClick={onClose}
        data-state={state}
        className="absolute inset-0 bg-foreground/24 transition-opacity data-[state=closed]:opacity-0 data-[state=closed]:duration-moderate data-[state=open]:opacity-100 data-[state=open]:duration-slow"
      />
      <div
        role="dialog"
        aria-label="More options"
        data-state={state}
        className="relative rounded-t-[32px] bg-white pb-8 shadow-600 transition-[translate,opacity] data-[state=closed]:translate-y-full data-[state=closed]:duration-moderate data-[state=closed]:ease-exit data-[state=open]:translate-y-0 data-[state=open]:duration-slow data-[state=open]:ease-entrance motion-reduce:translate-y-0 motion-reduce:data-[state=closed]:opacity-0"
      >
        <div className="relative flex h-16 items-center justify-center border-b border-line">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="absolute left-4 flex size-10 items-center justify-center rounded-full border border-line shadow-100 outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconClose size={16} />
          </button>
          <h3 className="text-heading-xl text-foreground">More Options</h3>
        </div>
        <div className="flex gap-3 px-4 py-4">
          <button type="button" onClick={onClose} className={block}>
            <IconArchive size={20} />
            Archive
          </button>
          <button type="button" onClick={onClose} className={block}>
            <IconCircleCheck size={20} />
            Close
          </button>
        </div>
        <Gate lock={locks.addContact} triggerClassName="flex w-full">
          <button type="button" className={row}>
            <IconUser size={16} className="size-5" />
            Add to Contacts
          </button>
        </Gate>
        <button type="button" onClick={onClose} className={row}>
          <IconMessage2 size={20} />
          Mark as Unread
        </button>
        <button type="button" onClick={onClose} className={row}>
          <IconMessages size={20} />
          Add to DNM
        </button>
        <button type="button" onClick={onClose} className={row}>
          <IconUserX size={16} className="size-5" />
          Add to Blacklist
        </button>
      </div>
    </div>
  );
}

/** A composer tool — attach, templates, voice note, AI. All part of sending. */
const COMPOSER_TOOL =
  "flex size-11 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-brand/24 data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-transparent";

function ThreadView({
  thread,
  locks,
  onBack,
}: {
  thread: MobileThread;
  locks: MobileAppLocks;
  onBack: () => void;
}) {
  useFullScreen();
  const [optionsOpen, setOptionsOpen] = React.useState(false);
  // And forget it, so switching back to Lite doesn't pop the sheet up again.
  React.useEffect(() => {
    if (locks.conversation) setOptionsOpen(false);
  }, [locks.conversation]);
  const more = (
    <button
      type="button"
      aria-label="More options"
      onClick={() => setOptionsOpen(true)}
      className="flex size-10 items-center justify-center rounded-full text-foreground outline-none hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-brand/24 data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-transparent"
    >
      <IconDotsVertical size={24} />
    </button>
  );
  return (
    <>
      <div className="flex h-16 shrink-0 items-center gap-3 border-b border-line px-3">
        <button type="button" aria-label="Back to messages" onClick={onBack} className="flex size-10 items-center justify-center text-foreground outline-none">
          <IconChevronLeft size={24} />
        </button>
        <Initials size="sm" />
        <span className="min-w-0 flex-1 truncate text-label-lg text-foreground">{thread.number}</span>
        <Gate lock={locks.call}>
          <button type="button" aria-label={`Call ${thread.number}`} className={cn(ICON_TAP, "text-foreground")}>
            <IconPhone size={24} />
          </button>
        </Gate>
        {/* View-only can't act on a conversation, so the trigger locks rather
            than opening a sheet of nothing but locked rows. */}
        {locks.conversation ? <Gate lock={NO_ACTIONS_LOCK}>{more}</Gate> : more}
      </div>
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-line bg-secondary-bg px-4">
        <Gate lock={locks.conversation}>
          <button
            type="button"
            className="flex items-center gap-2 text-paragraph-lg text-foreground outline-none data-[locked=true]:text-disabled-fg"
          >
            <IconTag size={20} />
            Add Tag
          </button>
        </Gate>
        <Gate lock={locks.conversation}>
          <button
            type="button"
            className="flex items-center gap-2 text-paragraph-lg text-foreground outline-none data-[locked=true]:text-disabled-fg"
          >
            <span className="flex size-6 items-center justify-center rounded-full bg-avatar-indigo-bg text-label-xs text-brand">
              JS
            </span>
            {thread.assignee}
            <IconChevronDown size={16} />
          </button>
        </Gate>
      </div>

      {/* Reading the thread is open to both licenses. */}
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5">
        <span className="self-center rounded-[4px] bg-secondary-bg px-2 py-1 text-paragraph-md text-muted-foreground">
          {thread.date}
        </span>
        {thread.messages.map((message) => (
          <React.Fragment key={message.id}>
            <div className="flex items-end gap-2 self-end">
              <div className="flex flex-col gap-1 rounded-md rounded-br-none bg-brand-subtle px-3 py-2">
                <p className="text-paragraph-lg text-foreground">{message.text}</p>
                <span className="flex items-center gap-2 text-paragraph-md text-muted-foreground">
                  {message.time}
                  <Ticks delivered={message.delivered} />
                </span>
              </div>
              <span className="flex size-7 items-center justify-center rounded-full bg-avatar-indigo-bg text-label-xs text-brand">
                JS
              </span>
            </div>
            {thread.event?.afterId === message.id ? (
              <span className="flex items-center gap-2 self-center rounded-[4px] border border-line px-2 py-1 text-paragraph-md text-muted-foreground">
                <IconUser size={16} />
                {thread.event.text}
              </span>
            ) : null}
          </React.Fragment>
        ))}
      </div>

      {/* Writing and every composer tool are one capability, locked for both. */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-line px-4 pt-3 pb-2">
        <span className="flex items-center gap-2 text-paragraph-md text-muted-foreground">
          via <img src={usFlag} alt="" className="size-4 rounded-full object-cover" />
          <span className="text-foreground">{MOBILE_INBOX.name}</span>
        </span>
        <Gate lock={locks.composer} placement="top" triggerClassName="flex w-full">
          <div tabIndex={0} aria-label="Message" className="w-full py-2 text-paragraph-lg text-disabled-fg outline-none focus-visible:ring-2 focus-visible:ring-brand/24">
            Type a message
          </div>
        </Gate>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            <Gate lock={locks.composer} placement="top">
              <button type="button" aria-label="Attach" className={cn(COMPOSER_TOOL, "bg-secondary-bg")}>
                <IconPlus size={20} />
              </button>
            </Gate>
            <Gate lock={locks.composer} placement="top">
              <button type="button" aria-label="Saved templates" className={COMPOSER_TOOL}>
                <IconBookmark size={20} />
              </button>
            </Gate>
            <Gate lock={locks.composer} placement="top">
              <button type="button" aria-label="Voice note" className={COMPOSER_TOOL}>
                <IconMicrophone size={16} className="size-5" />
              </button>
            </Gate>
            <Gate lock={locks.composer} placement="top">
              <button type="button" aria-label="AI assist" className={cn(COMPOSER_TOOL, "text-ai-gradient-from")}>
                <IconSparkles size={20} />
              </button>
            </Gate>
          </div>
          <Gate lock={locks.composer} placement="top">
            <button
              type="button"
              aria-label="Send"
              className="flex size-11 items-center justify-center rounded-full bg-brand text-white outline-none focus-visible:ring-2 focus-visible:ring-brand/24 data-[locked=true]:bg-disabled-bg data-[locked=true]:text-disabled-fg"
            >
              <IconSend size={16} className="size-5" />
            </button>
          </Gate>
        </div>
      </div>
      {/* Gated on the lock as well as the tap: switching to View-only with the
          sheet up must take it away, not leave its actions live. */}
      <MoreOptionsSheet
        open={optionsOpen && !locks.conversation}
        locks={locks}
        onClose={() => setOptionsOpen(false)}
      />
    </>
  );
}

function SmsScreen({ locks }: { locks: MobileAppLocks }) {
  const [open, setOpen] = React.useState<MobileThread | null>(null);
  return open ? (
    <ThreadView thread={open} locks={locks} onBack={() => setOpen(null)} />
  ) : (
    <ThreadList locks={locks} onOpen={setOpen} />
  );
}

/* ── Shell ──────────────────────────────────────────────────────────────── */

/** iOS status bar. Decorative, so the phone reads as a phone. */
function StatusBar() {
  return (
    <div aria-hidden className="flex h-11 shrink-0 items-center justify-between px-8 text-label-lg text-foreground">
      <span className="font-semibold">16:43</span>
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 18 12" className="h-3 w-[18px] fill-current">
          <rect x="0" y="8" width="3" height="4" rx="1" />
          <rect x="5" y="5.5" width="3" height="6.5" rx="1" />
          <rect x="10" y="3" width="3" height="9" rx="1" />
          <rect x="15" y="0" width="3" height="12" rx="1" />
        </svg>
        <svg viewBox="0 0 16 12" className="h-3 w-4 fill-current">
          <path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.3-1.4A10.3 10.3 0 0 0 8 .3 10.3 10.3 0 0 0 .7 3.2L2 4.6a8.4 8.4 0 0 1 6-2.4Zm0 3.7c1.3 0 2.5.5 3.4 1.3l1.3-1.4A6.8 6.8 0 0 0 8 4a6.8 6.8 0 0 0-4.7 1.8l1.3 1.4C5.5 6.4 6.7 5.9 8 5.9Zm0 3.6c.5 0 .9.2 1.2.5L8 11.6 6.8 10c.3-.3.7-.5 1.2-.5Z" />
        </svg>
        <svg viewBox="0 0 27 13" className="h-3 w-[27px]">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" className="fill-none stroke-current opacity-40" />
          <rect x="2" y="2" width="14" height="9" rx="2" className="fill-current" />
          <rect x="25" y="4.5" width="1.5" height="4" rx="0.75" className="fill-current opacity-40" />
        </svg>
      </span>
    </div>
  );
}

/** Production's dialer glyph: a 3×3 grid of outline dots. */
function DialerGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6">
      {[5, 12, 19].flatMap((y) => [5, 12, 19].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2.1" />))}
    </svg>
  );
}

/** Production's SMS glyph: one round speech bubble with an ellipsis. */
function SmsGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3.5c4.97 0 9 3.36 9 7.5s-4.03 7.5-9 7.5c-1.1 0-2.15-.16-3.12-.46L4 20l1.3-3.7C3.85 14.95 3 13.07 3 11c0-4.14 4.03-7.5 9-7.5Z" />
      <path d="M8.2 11h.01M12 11h.01M15.8 11h.01" strokeWidth="2.2" />
    </svg>
  );
}

/**
 * "You" has nothing the license changes, so — like the desktop's Settings —
 * it is drawn but doesn't open (`id: null`).
 */
const NAV_ITEMS: { id: MobileTab | null; label: string; icon: React.ReactNode; badge?: string }[] = [
  { id: "contacts", label: "Contacts", icon: <IconContacts size={24} /> },
  { id: "recents", label: "Recents", icon: <IconClock size={24} /> },
  { id: "dialer", label: "Dialer", icon: <DialerGlyph /> },
  { id: "sms", label: "SMS", icon: <SmsGlyph />, badge: "901" },
  { id: null, label: "You", icon: <IconUser size={16} className="size-6" /> },
];

function TabBar({ tab, onTabChange }: { tab: MobileTab; onTabChange: (tab: MobileTab) => void }) {
  return (
    // Five equal columns, so the selected pill is the same width wherever it
    // lands and the labels don't drift with their own length.
    <nav
      aria-label="Mobile app"
      className="absolute inset-x-3 bottom-4 z-10 grid grid-cols-5 rounded-full border border-line bg-white p-1.5 shadow-300"
    >
      {NAV_ITEMS.map((item) => {
        const id = item.id;
        const content = (
          <>
            <span className="relative flex size-6 items-center justify-center">
              {item.icon}
              {item.badge ? (
                <span className="absolute -top-2 left-3.5 rounded-full border-2 border-white bg-error px-1 text-label-xs text-white">
                  {item.badge}
                </span>
              ) : null}
            </span>
            <span className="text-label-sm">{item.label}</span>
          </>
        );
        // 52px tall in a ~65px column: the selected tab reaches 6px past its
        // column on each side, so it reads as production's wide capsule
        // (~77×51) rather than a near-circle.
        const cell = "flex h-[52px] flex-col items-center justify-center gap-0.5 rounded-full";
        if (!id) {
          return (
            <div key={item.label} aria-hidden className={cn(cell, "cursor-default text-foreground")}>
              {content}
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
              cell,
              "outline-none transition-colors duration-base focus-visible:ring-2 focus-visible:ring-brand/24",
              active ? "-mx-1.5 bg-tag-grey-bg text-brand" : "text-foreground"
            )}
          >
            {content}
          </button>
        );
      })}
    </nav>
  );
}

/** A reload returns to the launcher; there is no window chrome to close. */
export function MobileAppPrototype({ license }: { license: License }) {
  const [tab, setTab] = React.useState<MobileTab>("recents");
  const [fullScreen, setFullScreen] = React.useState(false);
  const locks = mobileAppLocks(license);
  return (
    // Bottom room for the license switch, which starts bottom-centre here.
    <div className="flex h-screen items-center justify-center overflow-hidden bg-secondary-bg px-6 pt-6 pb-16">
      {/* The phone's edges are the screen's: tooltips stay inside them. */}
      <div
        data-tooltip-boundary
        className="relative flex h-[812px] max-h-full w-[375px] shrink-0 flex-col overflow-hidden rounded-[44px] border-[6px] border-foreground bg-white shadow-600"
      >
        <StatusBar />
        <FullScreenContext.Provider value={setFullScreen}>
          {/* Room under every screen for the floating tab bar. */}
          <div className={cn("flex min-h-0 flex-1 flex-col", !fullScreen && "pb-24")}>
            {tab === "recents" && <RecentsScreen locks={locks} />}
            {tab === "contacts" && <ContactsScreen locks={locks} />}
            {tab === "dialer" && <DialerScreen locks={locks} />}
            {tab === "sms" && <SmsScreen locks={locks} />}
          </div>
        </FullScreenContext.Provider>
        {fullScreen ? null : <TabBar tab={tab} onTabChange={setTab} />}
      </div>
    </div>
  );
}
