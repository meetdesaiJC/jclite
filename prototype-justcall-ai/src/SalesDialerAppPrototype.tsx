import * as React from "react";
import { cn } from "@/lib/utils";
import { DURATION } from "@/lib/motion";
import { usePresence } from "@/lib/usePresence";
import { LockedControl, type Lock } from "@/components/LockedControl";
import {
  IconArchive,
  IconCalendar,
  IconChevronDown,
  IconChevronLeft,
  IconChevronRight,
  IconClock,
  IconDotsVertical,
  IconFilter,
  IconPencil,
  IconPhone,
  IconSearch,
  IconUsersGroup,
} from "@/components/Icon";
import { salesDialerAppLocks, type License, type SalesDialerAppLocks } from "./licenseLocks";
import {
  SD_CALLS,
  SD_CAMPAIGNS,
  SD_CHART,
  SD_DASHBOARD,
  SD_DISPOSITIONS,
  type SdCall,
  type SdCampaign,
} from "./salesDialerAppData";
import usFlag from "./assets/dialer/us-flag.svg";

/**
 * Sales Dialer mobile app, as a Lite or View-only member sees it. A separate
 * app from JustCall's, built for one job — working through a campaign — so
 * for these licenses it is mostly a reading app: the dashboard, the campaign
 * lists and their analytics, and the calls already made all open. Every way
 * to run, edit or reconfigure stays visible, muted, and says why on tap.
 *
 * It ships on its own older slate look rather than DS 2.0, so like the
 * desktop prototype the chrome is drawn in that style, from the
 * sales-dialer-* component tokens.
 *
 * It opens on Campaigns: that is the screen the licenses change most, and the
 * reason someone with a non-calling seat opens this app at all.
 */
type SdTab = "dashboard" | "campaigns" | "calls" | "settings";

/* ── Shared bits ────────────────────────────────────────────────────────── */

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

/** White glyph on the slate bar. Decorative ones are drawn, not wired. */
const BAR_ICON =
  "flex size-10 items-center justify-center rounded-full text-white outline-none transition-colors hover:bg-white/12 focus-visible:ring-2 focus-visible:ring-white/40";

/** Production's slate pill — Resume, Start, Re-run, Update Settings. */
const SLATE_BUTTON =
  "flex h-10 items-center justify-center rounded-md bg-sales-dialer-bar px-5 text-paragraph-lg text-white outline-none transition-colors hover:bg-sales-dialer-bar/90 focus-visible:ring-2 focus-visible:ring-sales-dialer-bar/40 data-[locked=true]:bg-disabled-bg data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-disabled-bg";

const CARD = "rounded-lg bg-white shadow-200";

function BarTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-heading-lg text-white">{children}</h2>;
}

/** A pushed screen's header: back chevron, centred title. */
function PushedHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="relative flex h-14 shrink-0 items-center justify-center bg-sales-dialer-bar px-2">
      <button type="button" aria-label="Back" onClick={onBack} className={cn(BAR_ICON, "absolute left-2")}>
        <IconChevronLeft size={24} />
      </button>
      <BarTitle>{title}</BarTitle>
    </div>
  );
}

/* ── Dashboard ──────────────────────────────────────────────────────────── */

/** Production's dial-pad glyph: a 3×3 grid with a tail dot. */
function DialpadGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 fill-current">
      {[4, 10, 16].flatMap((y) => [6, 12, 18].map((x) => <circle key={`${x}-${y}`} cx={x} cy={y} r="2" />))}
      <circle cx="12" cy="22" r="2" />
    </svg>
  );
}

function VoicemailGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.4">
      <circle cx="6" cy="12" r="4" />
      <circle cx="18" cy="12" r="4" />
      <path d="M6 16h12" />
    </svg>
  );
}

function TrendGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 17l6-6 4 4 8-8" />
    </svg>
  );
}

type Stat = { icon: React.ReactNode; tone: string; label: string; value: React.ReactNode };

function StatsCard({ headline, stats }: { headline: { label: string; value: string }; stats: Stat[] }) {
  return (
    <div className={cn(CARD, "px-6 pt-5 pb-2")}>
      <div className="flex items-center justify-between border-b border-line pb-4 text-heading-lg text-muted-foreground">
        <span>{headline.label}</span>
        <span className="text-foreground">{headline.value}</span>
      </div>
      <ul>
        {stats.map((stat, index) => (
          <li
            key={stat.label}
            className={cn("flex h-12 items-center gap-5", index < stats.length - 1 && "border-b border-line")}
          >
            <span className={cn("flex w-7 justify-center", stat.tone)}>{stat.icon}</span>
            <span className="flex-1 text-paragraph-lg text-muted-foreground">{stat.label}</span>
            <span className="text-paragraph-lg text-foreground">{stat.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Dialled (area) and answered (line) per day. Tapping a day moves the
 * marker and its D / A readout — reading, so open to both licenses.
 */
function ActivityChart() {
  const [active, setActive] = React.useState(6);
  const W = 300;
  const H = 150;
  const max = 10;
  const step = W / (SD_CHART.length - 1);
  const x = (i: number) => i * step;
  const y = (v: number) => H - (v / max) * H;
  // Smooth through each point with horizontal tangents, as production does.
  const curve = (values: number[]) =>
    values
      .map((v, i) => {
        if (i === 0) return `M${x(0)},${y(v)}`;
        const mid = (x(i - 1) + x(i)) / 2;
        return `C${mid},${y(values[i - 1])} ${mid},${y(v)} ${x(i)},${y(v)}`;
      })
      .join(" ");
  const dialled = SD_CHART.map((d) => d.dialled);
  const answered = SD_CHART.map((d) => d.answered);
  const point = SD_CHART[active];
  const readoutAt = (active / (SD_CHART.length - 1)) * 100;

  return (
    <div className={cn(CARD, "px-3 pt-4 pb-2")}>
      <div className="relative ml-6">
        <svg viewBox={`0 -8 ${W} ${H + 16}`} className="w-full overflow-visible" aria-label="Dialled and answered calls by day">
          {[0, 2, 4, 6, 8, 10].map((tick) => (
            <g key={tick}>
              <line x1={0} x2={W} y1={y(tick)} y2={y(tick)} className="stroke-line" strokeWidth="1" />
              <text x={-8} y={y(tick) + 4} textAnchor="end" className="fill-foreground text-label-xs">
                {tick}
              </text>
            </g>
          ))}
          <path d={`${curve(dialled)} L${W},${H} L0,${H} Z`} className="fill-sales-dialer-chart-fill" />
          <path d={curve(dialled)} className="fill-none stroke-sales-dialer-chart" strokeWidth="2" />
          <path d={curve(answered)} className="fill-none stroke-sales-dialer-chart-line" strokeWidth="2" />
          <line x1={x(active)} x2={x(active)} y1={-8} y2={H} className="stroke-sales-dialer-chart-line" strokeWidth="1.5" />
          {SD_CHART.map((d, i) => (
            <rect
              key={d.day}
              x={x(i) - step / 2}
              y={-8}
              width={step}
              height={H + 16}
              // Keyboard focus shows as a slate outline on the day's band,
              // not the browser's ring, which a mouse tap also triggers.
              className="fill-transparent outline-none focus-visible:stroke-sales-dialer-bar"
              strokeWidth="1.5"
              role="button"
              tabIndex={0}
              aria-label={`${d.day}: ${d.dialled} dialled, ${d.answered} answered`}
              onClick={() => setActive(i)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  setActive(i);
                }
              }}
            />
          ))}
        </svg>
        <div
          className="pointer-events-none absolute rounded-md bg-foreground px-2 py-1 text-label-md text-white"
          // Past the middle it anchors from the right, so the last days'
          // readout stays inside the card instead of being clipped.
          style={{
            top: "48%",
            ...(readoutAt > 50 ? { right: `max(0px, calc(${100 - readoutAt}% - 20px))` } : { left: `calc(${readoutAt}% - 20px)` }),
          }}
        >
          <div>D: {point.dialled}</div>
          <div>A: {point.answered}</div>
        </div>
      </div>
      {/* Day numbers under each point, the month once beneath — production
          rotates full dates, which a 375pt frame can't fit legibly. */}
      <div className="mt-2 ml-6 flex justify-between text-label-xs text-muted-foreground">
        {SD_CHART.map((d) => (
          <span key={d.day} className="flex w-0 justify-center">
            {d.day.slice(0, 2)}
          </span>
        ))}
      </div>
      <p className="pt-1 pb-2 text-center text-label-xs text-muted-foreground">Nov 2026</p>
    </div>
  );
}

function DashboardScreen() {
  const s = SD_DASHBOARD;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 bg-sales-dialer-bar px-4 pb-4">
        {/* Filter and date range narrow what's read — never locked. */}
        <div className="flex justify-end gap-1">
          <button type="button" aria-label="Filter" className={BAR_ICON}>
            <IconFilter size={24} />
          </button>
          <button type="button" aria-label="Date range" className={BAR_ICON}>
            <IconCalendar size={24} />
          </button>
        </div>
        <h2 className="pt-2 text-heading-xl text-white">Welcome, Johnn Smith</h2>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-secondary-bg px-4 py-4">
        <StatsCard
          headline={{ label: "Success index", value: s.successIndex }}
          stats={[
            { icon: <TrendGlyph />, tone: "text-sales-dialer-stat-teal", label: "Campaigns", value: s.campaigns },
            { icon: <IconUsersGroup size={24} />, tone: "text-success", label: "Contacts called", value: s.contactsCalled },
            { icon: <IconPhone size={24} />, tone: "text-sales-dialer-stat-teal", label: "Answered calls", value: s.answered },
            { icon: <IconClock size={24} />, tone: "text-warning", label: "Outbound minutes", value: s.outboundMinutes },
            { icon: <DialpadGlyph />, tone: "text-sales-dialer-stat-indigo", label: "Dialled calls", value: s.dialled },
            { icon: <VoicemailGlyph />, tone: "text-error", label: "Voicemail drops", value: s.voicemailDrops },
          ]}
        />
        <ActivityChart />
      </div>
    </div>
  );
}

/* ── Campaigns ──────────────────────────────────────────────────────────── */

const MENU_EXIT_MS = DURATION.fast;

/**
 * The card's ⋮ menu. Analytics reads, so it opens for both licenses. The
 * other three change the campaign — its settings, its contacts, whether it's
 * archived — and the sheet keeps all of that from both.
 */
function CampaignMenu({
  open,
  locks,
  onClose,
  onAnalytics,
}: {
  open: boolean;
  locks: SalesDialerAppLocks;
  onClose: () => void;
  onAnalytics: () => void;
}) {
  const { mounted, state } = usePresence(open, MENU_EXIT_MS);
  // Escape closes it, as it does the shared Menu.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!mounted) return null;
  const item =
    "flex h-12 w-full items-center px-6 text-left text-paragraph-lg text-foreground outline-none transition-colors hover:bg-secondary-bg focus-visible:bg-secondary-bg data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-transparent";
  const row = (label: string, lock?: Lock, onClick: () => void = onClose) => (
    <Gate lock={lock} placement="top" triggerClassName="flex w-full">
      <button type="button" role="menuitem" onClick={onClick} className={item}>
        {label}
      </button>
    </Gate>
  );
  return (
    <>
      <button type="button" aria-label="Close menu" tabIndex={-1} onClick={onClose} className="fixed inset-0 z-20 cursor-default" />
      <div
        role="menu"
        data-state={state}
        className="absolute top-14 right-2 z-30 w-[220px] origin-top-right rounded-[24px] border border-line bg-white py-2 shadow-500 transition-[scale,opacity] data-[state=closed]:scale-95 data-[state=closed]:opacity-0 data-[state=closed]:duration-fast data-[state=closed]:ease-exit data-[state=open]:scale-100 data-[state=open]:opacity-100 data-[state=open]:duration-base data-[state=open]:ease-entrance motion-reduce:scale-100"
      >
        {row("Analytics", undefined, () => {
          onClose();
          onAnalytics();
        })}
        {row("Campaign Settings", locks.campaignSettings)}
        {row("Contacts Lists", locks.contactLists)}
        {row("Archive Campaign", locks.archiveCampaign)}
      </div>
    </>
  );
}

function CampaignCard({
  campaign,
  locks,
  menuOpen,
  onMenu,
  onAnalytics,
}: {
  campaign: SdCampaign;
  locks: SalesDialerAppLocks;
  menuOpen: boolean;
  onMenu: (open: boolean) => void;
  onAnalytics: () => void;
}) {
  const action =
    campaign.status === "completed" ? "Re-run" : campaign.status === "not-started" ? "Start" : "Resume";
  return (
    <div className={cn(CARD, "relative flex items-center gap-2 py-5 pr-2 pl-6", menuOpen && "z-30")}>
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-heading-lg text-foreground">{campaign.name}</span>
        <span className="text-paragraph-md text-muted-foreground">#{campaign.id}</span>
        <span className="pt-3 text-paragraph-md text-foreground">Contacts: {campaign.contacts}</span>
        <span className="text-paragraph-md text-foreground">Assigned to: {campaign.assignee}</span>
      </div>
      {/* Start, Resume and Re-run all launch dialling: locked for both. */}
      <Gate lock={locks.runCampaign} placement="top">
        <button type="button" className={cn(SLATE_BUTTON, "w-24")}>
          {action}
        </button>
      </Gate>
      <button
        type="button"
        aria-label={`More options for ${campaign.name}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        onClick={() => onMenu(!menuOpen)}
        className="flex size-10 items-center justify-center rounded-full text-foreground outline-none hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-sales-dialer-bar/40"
      >
        <IconDotsVertical size={24} />
      </button>
      <CampaignMenu open={menuOpen} locks={locks} onClose={() => onMenu(false)} onAnalytics={onAnalytics} />
    </div>
  );
}

function CampaignsScreen({
  locks,
  onAnalytics,
}: {
  locks: SalesDialerAppLocks;
  onAnalytics: (campaign: SdCampaign) => void;
}) {
  const [segment, setSegment] = React.useState<"remaining" | "completed">("remaining");
  const [query, setQuery] = React.useState("");
  const [menuFor, setMenuFor] = React.useState<string | null>(null);
  const list = SD_CAMPAIGNS.filter((c) =>
    segment === "completed" ? c.status === "completed" : c.status !== "completed"
  ).filter((c) => !query || `${c.name} ${c.id}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 bg-sales-dialer-bar px-4 pb-4">
        <div className="relative flex h-14 items-center justify-center">
          <BarTitle>Campaigns</BarTitle>
          {/* Archived campaigns and the date range only change what's
              listed, so they're drawn as production has them, unlocked. */}
          <div className="absolute right-0 flex gap-1">
            <button type="button" aria-label="Archived campaigns" className={BAR_ICON}>
              <IconArchive size={24} />
            </button>
            <button type="button" aria-label="Date range" className={BAR_ICON}>
              <IconCalendar size={24} />
            </button>
          </div>
        </div>
        <label className="relative flex items-center">
          <IconSearch size={20} className="pointer-events-none absolute left-3 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search here"
            aria-label="Search campaigns"
            className="h-11 w-full rounded-md bg-secondary-bg pr-3 pl-10 text-paragraph-lg text-foreground outline-none placeholder:text-muted-foreground focus:ring-2 focus:ring-white/40"
          />
        </label>
        <div role="tablist" className="mt-4 grid grid-cols-2 rounded-md bg-secondary-bg p-0.5">
          {(["remaining", "completed"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={segment === key}
              onClick={() => {
                setSegment(key);
                setMenuFor(null);
              }}
              className={cn(
                "h-9 rounded-md text-paragraph-lg capitalize outline-none transition-colors duration-base focus-visible:ring-2 focus-visible:ring-sales-dialer-bar/40",
                segment === key ? "bg-sales-dialer-bar text-white" : "text-muted-foreground"
              )}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-secondary-bg px-4 py-4">
        {list.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            locks={locks}
            menuOpen={menuFor === campaign.id}
            onMenu={(open) => setMenuFor(open ? campaign.id : null)}
            onAnalytics={() => onAnalytics(campaign)}
          />
        ))}
        {list.length === 0 ? (
          <p className="py-12 text-center text-paragraph-md text-muted-foreground">No campaigns match your search.</p>
        ) : null}
      </div>
    </div>
  );
}

/** A campaign's own analytics: the sheet opens this on mobile to both. */
function CampaignAnalytics({ campaign, onBack }: { campaign: SdCampaign; onBack: () => void }) {
  const index = campaign.dialled ? Math.round((campaign.answered / campaign.dialled) * 100) : 0;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PushedHeader title="Analytics" onBack={onBack} />
      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto bg-secondary-bg px-4 py-4">
        <div className="px-2">
          <p className="text-heading-lg text-foreground">{campaign.name}</p>
          <p className="text-paragraph-md text-muted-foreground">
            #{campaign.id} · Assigned to {campaign.assignee}
          </p>
        </div>
        <StatsCard
          headline={{ label: "Success index", value: `${index}%` }}
          stats={[
            { icon: <IconUsersGroup size={24} />, tone: "text-success", label: "Contacts", value: campaign.contacts },
            { icon: <DialpadGlyph />, tone: "text-sales-dialer-stat-indigo", label: "Dialled calls", value: campaign.dialled },
            { icon: <IconPhone size={24} />, tone: "text-sales-dialer-stat-teal", label: "Answered calls", value: campaign.answered },
            { icon: <IconClock size={24} />, tone: "text-warning", label: "Outbound minutes", value: `${campaign.minutes}m` },
            { icon: <VoicemailGlyph />, tone: "text-error", label: "Voicemail drops", value: campaign.voicemailDrops },
          ]}
        />
      </div>
    </div>
  );
}

/* ── All Calls ──────────────────────────────────────────────────────────── */

function CallsScreen({ onOpen }: { onOpen: (call: SdCall) => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center justify-center bg-sales-dialer-bar">
        <BarTitle>All Calls</BarTitle>
      </div>
      {/* No call-back on a row: the list is a log, and opening a call is
          reading — open to both licenses. */}
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {SD_CALLS.map((call) => (
          <li key={call.id} className="border-b border-line">
            <button
              type="button"
              onClick={() => onOpen(call)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left outline-none hover:bg-secondary-bg focus-visible:bg-secondary-bg"
            >
              <div className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-paragraph-lg text-foreground">{call.contact ?? call.clientNumber}</span>
                <span className="truncate text-paragraph-sm text-muted-foreground">{call.campaign}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-paragraph-sm text-muted-foreground">{call.when}</span>
                <span className={cn("text-paragraph-sm", call.failed ? "text-error" : "text-foreground")}>{call.duration}</span>
              </div>
              <IconChevronRight size={20} className="text-muted-foreground" />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Production's filled stars. Drawn here — the icon set has no star. */
function Star({ filled }: { filled: boolean }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-7 fill-current", filled ? "text-warning" : "text-disabled-fg")}>
      <path d="M12 2.8l2.85 5.8 6.4.93-4.63 4.5 1.1 6.37L12 17.4l-5.72 3 1.1-6.37-4.63-4.5 6.4-.93z" />
    </svg>
  );
}

const DETAIL_LABEL = "text-paragraph-lg text-muted-foreground";
const DETAIL_VALUE = "text-paragraph-lg text-foreground";
const PENCIL =
  "flex size-10 shrink-0 items-center justify-center rounded-full text-foreground outline-none transition-colors hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-sales-dialer-bar/40 data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-transparent";

/**
 * A call, opened from All Calls. Every field reads for both licenses. The
 * three pencils — notes, disposition, rating — edit the record: Lite keeps
 * them, View-only doesn't.
 */
function CallDetails({ call, locks, onBack }: { call: SdCall; locks: SalesDialerAppLocks; onBack: () => void }) {
  const edit = locks.logDetails;
  const [editing, setEditing] = React.useState<"notes" | "disposition" | "rating" | null>(null);
  const [notes, setNotes] = React.useState(call.notes ?? "");
  const [disposition, setDisposition] = React.useState(call.disposition ?? "");
  const [rating, setRating] = React.useState(call.rating);

  // Switching to View-only mid-edit drops the edit rather than leaving an
  // open field the license can't save.
  React.useEffect(() => {
    if (edit) setEditing(null);
  }, [edit]);

  const pencil = (field: "notes" | "disposition" | "rating", label: string) => (
    <Gate lock={edit} placement="left">
      <button
        type="button"
        aria-label={`Edit ${label}`}
        aria-pressed={editing === field}
        onClick={() => setEditing((open) => (open === field ? null : field))}
        className={PENCIL}
      >
        <IconPencil size={20} />
      </button>
    </Gate>
  );

  const readOnly = (label: string, value: React.ReactNode) => (
    <div className="flex flex-col gap-2 border-b border-line py-4">
      <span className={DETAIL_LABEL}>{label}</span>
      <span className={DETAIL_VALUE}>{value}</span>
    </div>
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <PushedHeader title="Call Details" onBack={onBack} />
      <div className="min-h-0 flex-1 overflow-y-auto px-4">
        {readOnly("Date & time", call.when)}
        {readOnly("Duration", call.duration)}
        {readOnly("Called by", "Johnn Smith")}
        {readOnly("Status", call.status)}
        {readOnly("Caller number", call.callerNumber)}
        {readOnly("Client number", call.clientNumber)}

        <div className="flex flex-col gap-2 border-b border-line py-4">
          <span className={DETAIL_LABEL}>Notes</span>
          {editing === "notes" && !edit ? (
            <div className="flex flex-col gap-2">
              <textarea
                autoFocus
                rows={3}
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                aria-label="Notes"
                className="w-full resize-none rounded-md border border-control-border px-3 py-2 text-paragraph-md text-foreground outline-none focus:border-sales-dialer-bar"
              />
              <button type="button" onClick={() => setEditing(null)} className={cn(SLATE_BUTTON, "self-end")}>
                Save
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className={DETAIL_VALUE}>{notes || "-"}</span>
              {pencil("notes", "notes")}
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-b border-line py-4">
          <span className={DETAIL_LABEL}>Disposition</span>
          <div className="flex items-center justify-between">
            <span className={DETAIL_VALUE}>{disposition || "-"}</span>
            {pencil("disposition", "disposition")}
          </div>
          {editing === "disposition" && !edit ? (
            <ul role="listbox" aria-label="Disposition" className="overflow-hidden rounded-md border border-line">
              {SD_DISPOSITIONS.map((option) => (
                <li key={option}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={disposition === option}
                    onClick={() => {
                      setDisposition(option);
                      setEditing(null);
                    }}
                    className={cn(
                      "flex h-11 w-full items-center px-4 text-left text-paragraph-md outline-none hover:bg-secondary-bg focus-visible:bg-secondary-bg",
                      disposition === option ? "bg-secondary-bg text-foreground" : "text-foreground"
                    )}
                  >
                    {option}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 border-b border-line py-4">
          <span className={DETAIL_LABEL}>Rating</span>
          <div className="flex items-center justify-between">
            {/* The stars only take a tap while the pencil has them open. */}
            <div role="radiogroup" aria-label="Rating" className="flex gap-1">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  role="radio"
                  aria-checked={rating === value}
                  aria-label={`${value} star${value > 1 ? "s" : ""}`}
                  disabled={editing !== "rating" || Boolean(edit)}
                  onClick={() => {
                    setRating(value);
                    setEditing(null);
                  }}
                  className="outline-none disabled:pointer-events-none"
                >
                  <Star filled={value <= rating} />
                </button>
              ))}
            </div>
            {pencil("rating", "rating")}
          </div>
        </div>
        <div className="h-8" />
      </div>
    </div>
  );
}

/* ── Settings ───────────────────────────────────────────────────────────── */

function SettingsSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col">
      <h3 className="border-b border-line pt-6 pb-3 text-paragraph-lg text-muted-foreground">{title}</h3>
      {children}
    </section>
  );
}

/**
 * Dialer and forwarding settings. "Edit settings" is web app only on the
 * sheet even for Lite, and forwarding sends calls to a phone — calling — so
 * every control locks for both and shows its saved value. Logout is the
 * member's own account: open.
 */
function SettingsScreen({ locks }: { locks: SalesDialerAppLocks }) {
  const lock = locks.settings;
  const [coolOff, setCoolOff] = React.useState(true);
  const [seconds, setSeconds] = React.useState("20");
  const [forward, setForward] = React.useState("");
  const field =
    "h-12 rounded-md border border-control-border bg-white px-3 text-paragraph-lg text-foreground outline-none focus:border-sales-dialer-bar data-[locked=true]:bg-control-disabled-bg data-[locked=true]:text-disabled-fg";

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex h-14 shrink-0 items-center justify-center bg-sales-dialer-bar">
        <BarTitle>Settings</BarTitle>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5">
        <SettingsSection title="Dialer">
          <div className="flex h-16 items-center justify-between pl-3">
            <span className="text-paragraph-lg text-foreground">Cool-off</span>
            <Gate lock={lock} placement="left">
              <button
                type="button"
                role="switch"
                aria-checked={coolOff}
                aria-label="Cool-off"
                onClick={() => setCoolOff((on) => !on)}
                className={cn(
                  "relative h-8 w-14 rounded-full outline-none transition-colors duration-base focus-visible:ring-2 focus-visible:ring-sales-dialer-bar/40",
                  coolOff ? "bg-sales-dialer-bar" : "bg-line",
                  "data-[locked=true]:bg-disabled-bg"
                )}
              >
                <span
                  className={cn(
                    "absolute top-1 left-1 size-6 rounded-full bg-white shadow-100 transition-[translate] duration-base ease-standard motion-reduce:transition-none",
                    coolOff && "translate-x-6"
                  )}
                />
              </button>
            </Gate>
          </div>
          <div className="flex h-16 items-center gap-3 pl-3">
            <span className="flex-1 text-paragraph-lg text-foreground">Cool-off time</span>
            <Gate lock={lock} placement="top">
              <input
                inputMode="numeric"
                value={seconds}
                readOnly={Boolean(lock)}
                onChange={(event) => setSeconds(event.target.value.replace(/\D/g, ""))}
                aria-label="Cool-off time in seconds"
                className={cn(field, "w-28 text-right")}
              />
            </Gate>
            <span className="w-12 text-paragraph-lg text-foreground">secs</span>
          </div>
          <div className="flex h-16 items-center gap-3 pl-3">
            <span className="flex-1 text-paragraph-lg text-foreground">Calling Data Center</span>
            <Gate lock={lock} placement="top">
              <button type="button" aria-haspopup="listbox" className={cn(field, "flex w-44 items-center justify-between text-left")}>
                Set Automatically
                <IconChevronDown size={20} />
              </button>
            </Gate>
          </div>
        </SettingsSection>

        <SettingsSection title="Incoming Calls">
          <div className="flex flex-col gap-3 py-4 pl-3">
            <span className="text-paragraph-lg text-foreground">Forward Incoming Calls to</span>
            <Gate lock={lock} placement="top" triggerClassName="flex w-full">
              <label
                tabIndex={lock ? 0 : undefined}
                className="flex h-12 w-full overflow-hidden rounded-md border border-control-border bg-white outline-none data-[locked=true]:bg-control-disabled-bg"
              >
                <span className="flex items-center gap-2 border-r border-line px-3 text-paragraph-lg text-foreground">
                  <img src={usFlag} alt="" className="h-5 w-7 object-cover" />
                  (US) +1
                </span>
                <input
                  type="tel"
                  value={forward}
                  readOnly={Boolean(lock)}
                  tabIndex={lock ? -1 : undefined}
                  onChange={(event) => setForward(event.target.value)}
                  aria-label="Forwarding number"
                  className="min-w-0 flex-1 bg-transparent px-3 text-paragraph-lg text-foreground outline-none"
                />
              </label>
            </Gate>
          </div>
        </SettingsSection>

        <div className="flex flex-col items-center gap-6 pt-8 pb-8">
          <Gate lock={lock} placement="top" triggerClassName="flex w-full">
            <button type="button" className={cn(SLATE_BUTTON, "h-12 w-full")}>
              Update Settings
            </button>
          </Gate>
          <button type="button" className="text-paragraph-lg text-brand outline-none focus-visible:underline">
            Logout
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Shell ──────────────────────────────────────────────────────────────── */

/** iOS status bar on the slate band. Decorative. */
function StatusBar({ time }: { time: string }) {
  return (
    <div aria-hidden className="flex h-11 shrink-0 items-center justify-between bg-sales-dialer-bar px-8 text-label-lg text-white">
      <span className="text-heading-lg">{time}</span>
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 16 12" className="h-3 w-4 fill-current">
          <path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.3-1.4A10.3 10.3 0 0 0 8 .3 10.3 10.3 0 0 0 .7 3.2L2 4.6a8.4 8.4 0 0 1 6-2.4Zm0 3.7c1.3 0 2.5.5 3.4 1.3l1.3-1.4A6.8 6.8 0 0 0 8 4a6.8 6.8 0 0 0-4.7 1.8l1.3 1.4C5.5 6.4 6.7 5.9 8 5.9Zm0 3.6c.5 0 .9.2 1.2.5L8 11.6 6.8 10c.3-.3.7-.5 1.2-.5Z" />
        </svg>
        <svg viewBox="0 0 27 13" className="h-3 w-[27px]">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" className="fill-none stroke-current opacity-40" />
          <rect x="2" y="2" width="14" height="9" rx="2" className="fill-success" />
          <rect x="25" y="4.5" width="1.5" height="4" rx="0.75" className="fill-current opacity-40" />
        </svg>
      </span>
    </div>
  );
}

function CampaignsGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 fill-current">
      <path d="M3 5.5A1.5 1.5 0 0 1 4.5 4h5l2 2h8A1.5 1.5 0 0 1 21 7.5v11a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 18.5Z" />
      <circle cx="12" cy="11.5" r="2.2" className="fill-sales-dialer-bar" />
      <path d="M8 17c.6-2 2.2-3 4-3s3.4 1 4 3Z" className="fill-sales-dialer-bar" />
    </svg>
  );
}

function CallsGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 9h14l-3.5-3.5M20 15H6l3.5 3.5" />
    </svg>
  );
}

function GearGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-6 fill-current">
      <path d="M13.6 2l.5 2.6a7.6 7.6 0 0 1 1.9 1.1l2.5-.9 1.6 2.8-2 1.7a7.7 7.7 0 0 1 0 2.2l2 1.7-1.6 2.8-2.5-.9a7.6 7.6 0 0 1-1.9 1.1l-.5 2.6h-3.2l-.5-2.6a7.6 7.6 0 0 1-1.9-1.1l-2.5.9-1.6-2.8 2-1.7a7.7 7.7 0 0 1 0-2.2l-2-1.7 1.6-2.8 2.5.9a7.6 7.6 0 0 1 1.9-1.1l.5-2.6ZM12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" />
    </svg>
  );
}

const NAV: { id: SdTab; label: string; icon: React.ReactNode }[] = [
  { id: "dashboard", label: "Dashboard", icon: <TrendGlyph /> },
  { id: "campaigns", label: "Campaigns", icon: <CampaignsGlyph /> },
  { id: "calls", label: "All Calls", icon: <CallsGlyph /> },
  { id: "settings", label: "Settings", icon: <GearGlyph /> },
];

function TabBar({ tab, onTabChange }: { tab: SdTab; onTabChange: (tab: SdTab) => void }) {
  return (
    <nav aria-label="Sales Dialer" className="grid h-20 shrink-0 grid-cols-4 bg-sales-dialer-bar pb-3">
      {NAV.map((item) => {
        const active = item.id === tab;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "flex flex-col items-center justify-center gap-1 text-label-md outline-none transition-colors duration-base focus-visible:bg-white/12",
              active ? "text-white" : "text-white/50"
            )}
          >
            {item.icon}
            {item.label}
          </button>
        );
      })}
    </nav>
  );
}

/** A reload returns to the launcher; there is no window chrome to close. */
export function SalesDialerAppPrototype({ license }: { license: License }) {
  const [tab, setTab] = React.useState<SdTab>("campaigns");
  const [analyticsFor, setAnalyticsFor] = React.useState<SdCampaign | null>(null);
  const [openCall, setOpenCall] = React.useState<SdCall | null>(null);
  const locks = salesDialerAppLocks(license);

  // A pushed screen keeps the slate band but drops the tabs, as production's
  // Call Details does.
  const pushed = analyticsFor ?? openCall;

  let screen: React.ReactNode;
  if (analyticsFor) {
    screen = <CampaignAnalytics campaign={analyticsFor} onBack={() => setAnalyticsFor(null)} />;
  } else if (openCall) {
    screen = <CallDetails call={openCall} locks={locks} onBack={() => setOpenCall(null)} />;
  } else if (tab === "dashboard") {
    screen = <DashboardScreen />;
  } else if (tab === "campaigns") {
    screen = <CampaignsScreen locks={locks} onAnalytics={setAnalyticsFor} />;
  } else if (tab === "calls") {
    screen = <CallsScreen onOpen={setOpenCall} />;
  } else {
    screen = <SettingsScreen locks={locks} />;
  }

  return (
    // Bottom room for the license switch, which starts bottom-centre here.
    <div className="flex h-screen items-center justify-center overflow-hidden bg-secondary-bg px-6 pt-6 pb-16">
      <div className="relative flex h-[812px] max-h-full w-[375px] shrink-0 flex-col overflow-hidden rounded-[44px] border-[6px] border-foreground bg-white shadow-600">
        <StatusBar time="11:04" />
        <div className="flex min-h-0 flex-1 flex-col">{screen}</div>
        {pushed ? <div className="h-12 shrink-0 bg-sales-dialer-bar" /> : <TabBar tab={tab} onTabChange={setTab} />}
      </div>
    </div>
  );
}
