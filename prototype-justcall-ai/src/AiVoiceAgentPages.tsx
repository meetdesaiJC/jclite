import { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/Button";
import {
  IconAlertTriangleFilled,
  IconArrowForwardUp,
  IconBolt,
  IconChartBar,
  IconChevronDown,
  IconCopy,
  IconCopyPlus,
  IconDotsVertical,
  IconFile,
  IconFilter,
  IconInfoCircle,
  IconMessage2,
  IconNote,
  IconPencil,
  IconSearch,
  IconTrash,
  IconUser,
} from "@/components/Icon";
import { LockedControl, type Lock } from "@/components/LockedControl";
import { Menu, type MenuItem } from "@/components/Menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/Table";
import { Tag } from "@/components/Tag";
import { Toggle } from "@/components/Toggle";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import { LockedCheckbox } from "./LockedCheckbox";
import type { AiVoiceAgentLocks } from "./licenseLocks";
import {
  AIVA_MINUTES_REMAINING,
  KNOWLEDGE_BASES,
  VOICE_AGENTS,
  VOICE_AGENTS_TOTAL,
  type AgentCapability,
  type VoiceAgent,
} from "./aiVoiceAgentData";
import flagUs from "./assets/flag-us.svg";
import flagUk from "./assets/flag-uk.svg";

/**
 * AI Voice Agent › Agents and › Knowledge Base, as the production web app
 * draws them. Both are full-access for Lite and read-only for View-only
 * (aiVoiceAgentLocks): every list, number, status and analytics link stays
 * open; every verb that creates, changes, tests or buys carries the lock.
 */

/** Locks one control when `lock` is set; renders it untouched otherwise. */
function Gate({
  lock,
  className,
  children,
}: {
  lock?: Lock;
  className?: string;
  children: React.ReactElement<Record<string, unknown>>;
}) {
  return (
    <LockedControl locked={Boolean(lock)} reason={lock?.reason} hint={lock?.hint} triggerClassName={className}>
      {children}
    </LockedControl>
  );
}

/** A plain dark tooltip naming an icon-only action. */
function Named({ title, children }: { title: string; children: React.ReactElement<Record<string, unknown>> }) {
  return (
    <TooltipTrigger placement="bottom" content={<Tooltip theme="dark" arrow="top-center" title={title} />}>
      {children}
    </TooltipTrigger>
  );
}

/** An icon action that names itself when open and explains itself when locked. */
function IconAction({
  title,
  lock,
  className,
  children,
}: {
  title: string;
  lock?: Lock;
  className?: string;
  children: React.ReactNode;
}) {
  const button = (
    <button type="button" aria-label={title} className={cn(ACTION_BUTTON, className)}>
      {children}
    </button>
  );
  return lock ? <Gate lock={lock} className="flex">{button}</Gate> : <Named title={title}>{button}</Named>;
}

const ACTION_BUTTON =
  "flex size-10 items-center justify-center bg-white text-foreground transition-colors hover:bg-secondary-bg focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/24 " +
  "data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-white";

const CELL = "h-[66px] py-0";

/** Search · Filters on the left, minutes and the create button on the right. */
function Toolbar({
  placeholder,
  search,
  onSearch,
  locks,
  create,
}: {
  placeholder: string;
  search: string;
  onSearch: (value: string) => void;
  locks: AiVoiceAgentLocks;
  create: React.ReactNode;
}) {
  return (
    <div className="mb-px flex h-[60px] shrink-0 items-center justify-between gap-4 px-6">
      <div className="flex items-center gap-3">
        <label className="flex h-9 w-[230px] items-center rounded-[4px] border border-line bg-white pl-3 focus-within:border-brand">
          <IconSearch size={20} className="shrink-0 text-foreground" />
          <input
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder={placeholder}
            aria-label={placeholder}
            className="h-full min-w-0 flex-1 bg-transparent pr-3 pl-2 text-paragraph-md text-foreground outline-none placeholder:text-disabled-fg"
          />
        </label>
        <span className="h-9 w-px bg-line" aria-hidden="true" />
        <Button variant="grey-outline" size="sm" leftIcon={<IconFilter size={20} />} className="gap-2 pr-3 pl-2.5 [&_svg]:size-5">
          Filters
        </Button>
      </div>
      <div className="flex items-center gap-4">
        {/* The balance is reading; topping it up is a purchase, which
            View-only can't make. */}
        <div className="flex h-10 items-center gap-2 rounded-md bg-avatar-indigo-bg py-1 pr-1 pl-4">
          <span className="text-label-md text-foreground">{AIVA_MINUTES_REMAINING} mins remaining</span>
          <Named title="AI Voice Agent minutes left this cycle">
            <span className="flex text-muted-foreground">
              <IconInfoCircle size={16} />
            </span>
          </Named>
          <Gate lock={locks.buyMinutes}>
            <button
              type="button"
              className="flex h-8 items-center gap-1 rounded-[4px] bg-white px-3 text-label-sm text-brand outline-none transition-colors hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24 data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-white"
            >
              <IconBolt size={16} />
              Upgrade add-on
            </button>
          </Gate>
        </div>
        {create}
      </div>
    </div>
  );
}

/* ── Agents ─────────────────────────────────────────────────────────────── */

const CAPABILITY: Record<AgentCapability, { label: string; icon: React.ReactNode }> = {
  transfer: { label: "Call transfer", icon: <IconArrowForwardUp size={16} /> },
  knowledge: { label: "Knowledge base", icon: <IconFile size={16} /> },
  handoff: { label: "Human handoff", icon: <IconUser size={16} /> },
  sms: { label: "Send SMS", icon: <IconMessage2 size={20} className="size-4" /> },
  notes: { label: "Call notes", icon: <IconNote size={16} /> },
};

function Capabilities({ agent }: { agent: VoiceAgent }) {
  return (
    <span className="flex items-center gap-1">
      {agent.capabilities.map((key) => (
        <Named key={key} title={CAPABILITY[key].label}>
          <span
            className={cn(
              "flex size-8 items-center justify-center rounded-full",
              agent.warm ? "bg-tag-orange-bg text-tag-orange-fg" : "bg-secondary-bg text-muted-foreground"
            )}
          >
            {CAPABILITY[key].icon}
          </span>
        </Named>
      ))}
      {agent.moreCapabilities ? (
        <span className="flex size-8 items-center justify-center rounded-full border border-line text-label-sm text-muted-foreground">
          +{agent.moreCapabilities}
        </span>
      ) : null}
    </span>
  );
}

const AGENT_COLUMNS = [36, 210, 200, 260, 110, 170, 160];
const AGENT_TABLE_WIDTH = AGENT_COLUMNS.reduce((sum, w) => sum + w, 0);

/**
 * Production's "assign number" glyph — a handset with a plus. The icon set
 * has no such drawing, so it is drawn here at the 20px weight.
 */
function PhonePlusGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4.17 3.33h3.33l1.67 4.17-2.09 1.25a9.17 9.17 0 0 0 4.17 4.17l1.25-2.09 4.17 1.67v3.33a1.67 1.67 0 0 1-1.67 1.67A13.33 13.33 0 0 1 2.5 5a1.67 1.67 0 0 1 1.67-1.67Z" />
      <path d="M14.17 2.5v5M11.67 5h5" />
    </svg>
  );
}

/**
 * Assign number · analytics · ⋮. Assigning a number changes which line the
 * agent answers, so it follows the edit lock; analytics is reading and stays
 * open. The ⋮ menu is production's three rows, all changes — locked in place
 * for View-only.
 */
function AgentRowActions({ agent, locks }: { agent: VoiceAgent; locks: AiVoiceAgentLocks }) {
  const menuItems: MenuItem[] = [
    { key: "duplicate", label: "Duplicate", icon: <IconCopyPlus size={16} />, locked: locks.create },
    { key: "edit", label: "Edit", icon: <IconPencil size={16} />, locked: locks.edit },
    { key: "delete", label: "Delete", icon: <IconTrash size={16} />, destructive: true, locked: locks.edit },
  ];
  return (
    <div role="group" aria-label={`Actions for ${agent.name}`} className="inline-flex overflow-hidden rounded-[4px] border border-line">
      <IconAction title="Assign phone number" lock={locks.edit}>
        <PhonePlusGlyph />
      </IconAction>
      <IconAction title="Analytics" className="border-l border-line">
        <IconChartBar size={20} />
      </IconAction>
      <Menu
        label={`More actions for ${agent.name}`}
        items={menuItems}
        trigger={
          <button type="button" aria-label="More actions" className={cn(ACTION_BUTTON, "border-l border-line")}>
            <IconDotsVertical size={20} />
          </button>
        }
      />
    </div>
  );
}

export function AgentsPage({ locks }: { locks: AiVoiceAgentLocks }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [active, setActive] = useState(() => new Map(VOICE_AGENTS.map((a) => [a.id, a.active])));
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const q = search.trim().toLowerCase();
  const rows = q ? VOICE_AGENTS.filter((a) => a.name.toLowerCase().includes(q)) : VOICE_AGENTS;
  const allSelected = rows.length > 0 && rows.every((a) => selected.has(a.id));
  const someSelected = rows.some((a) => selected.has(a.id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const total = q ? rows.length : VOICE_AGENTS_TOTAL;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const first = total ? (page - 1) * pageSize + 1 : 0;
  const last = Math.min(page * pageSize, total);

  return (
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <Toolbar
        placeholder="Search Voice Agent"
        search={search}
        onSearch={(value) => {
          setSearch(value);
          setPage(1);
        }}
        locks={locks}
        create={
          locks.create ? (
            <Gate lock={locks.create}>
              <Button variant="primary" size="md" rightIcon={<IconChevronDown size={16} />} className="px-5">
                Create Agent
              </Button>
            </Gate>
          ) : (
            <Menu
              label="Create agent"
              items={[
                { key: "scratch", label: "Start from scratch" },
                { key: "template", label: "Use a template" },
              ]}
              trigger={
                <Button variant="primary" size="md" rightIcon={<IconChevronDown size={16} />} className="px-5">
                  Create Agent
                </Button>
              }
            />
          )
        }
      />

      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        <Table className="table-fixed">
          <colgroup>
            {AGENT_COLUMNS.map((width, i) => (
              <col key={i} style={{ width: `${(width / AGENT_TABLE_WIDTH) * 100}%` }} />
            ))}
          </colgroup>
          <TableHeader className="[&_tr]:border-0">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-12">
                {/* Every bulk verb edits agents, so selection follows the
                    edit lock — disabled for View-only, never hidden. */}
                <span className="flex">
                  <LockedCheckbox
                    lock={locks.edit}
                    size="sm"
                    aria-label="Select all agents"
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((a) => a.id)))}
                  />
                </span>
              </TableHead>
              {["Voice Agent Name", "Agent Actions", "Assigned Number", "Status", "", "Actions"].map((label, i) => (
                <TableHead key={i} className="h-12 text-label-sm">
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((agent) => (
              <TableRow key={agent.id} state={selected.has(agent.id) ? "selected" : "default"} className="border-0">
                <TableCell className={CELL}>
                  <span className="flex">
                    <LockedCheckbox
                      lock={locks.edit}
                      size="sm"
                      aria-label={`Select ${agent.name}`}
                      checked={selected.has(agent.id)}
                      onChange={() => toggle(agent.id)}
                    />
                  </span>
                </TableCell>
                <TableCell className={CELL}>
                  <span className="flex flex-col">
                    <span className="flex items-center gap-1.5">
                      <span title={agent.name} className="truncate text-label-md text-foreground">
                        {agent.name}
                      </span>
                      {agent.incomplete ? (
                        <Named title="Setup incomplete">
                          <span className="flex shrink-0 text-warning">
                            <IconAlertTriangleFilled size={16} />
                          </span>
                        </Named>
                      ) : null}
                    </span>
                    <span className="truncate text-paragraph-sm text-muted-foreground">{agent.handle}</span>
                  </span>
                </TableCell>
                <TableCell className={CELL}>
                  <Capabilities agent={agent} />
                </TableCell>
                <TableCell className={CELL}>
                  {agent.number ? (
                    <Tag
                      size="md"
                      color="grey"
                      className="gap-2 py-0 text-avatar-bluegrey-fg"
                      icon={<img src={agent.number.country === "uk" ? flagUk : flagUs} alt="" width={16} height={16} className="size-4" />}
                    >
                      {agent.number.value}
                    </Tag>
                  ) : (
                    <span className="text-paragraph-md text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className={CELL}>
                  {/* Turning an agent on or off changes what callers reach. */}
                  {/* Locked, the switch still has to say whether the agent is
                      on — reading status is the point of View-only — so it is
                      dimmed rather than disabled (the Toggle's disabled look
                      draws on and off the same). The wrapper takes the taps
                      and explains; the switch itself can't be reached. */}
                  {locks.toggleStatus ? (
                    <Gate lock={locks.toggleStatus} className="flex w-fit">
                      <span
                        tabIndex={0}
                        aria-label={`${agent.name} is ${active.get(agent.id) ? "on" : "off"}`}
                        className="flex cursor-not-allowed rounded-full opacity-50 outline-none focus-visible:ring-2 focus-visible:ring-brand/24 [&_*]:pointer-events-none"
                      >
                        <Toggle size="md" tabIndex={-1} aria-hidden checked={active.get(agent.id) ?? false} readOnly />
                      </span>
                    </Gate>
                  ) : (
                    <Toggle
                      size="md"
                      aria-label={`${agent.name} status`}
                      checked={active.get(agent.id) ?? false}
                      onCheckedChange={(checked) => setActive((prev) => new Map(prev).set(agent.id, checked))}
                    />
                  )}
                </TableCell>
                <TableCell className={CELL}>
                  <Gate lock={locks.test}>
                    <Button variant="primary-outline" size="sm" className="whitespace-nowrap">
                      Test Voice Agent
                    </Button>
                  </Gate>
                </TableCell>
                <TableCell className={CELL}>
                  <AgentRowActions agent={agent} locks={locks} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="mx-6 shrink-0 border-t border-line">
        <TablePagination
          page={page}
          pageCount={pageCount}
          onPageChange={setPage}
          pageSize={pageSize}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          rangeLabel={`${first}-${last} of ${total} items`}
        />
      </div>
    </main>
  );
}

/* ── Knowledge Base ─────────────────────────────────────────────────────── */

/** A person with a plus — production's "Assign agents". Not in the icon set. */
function UserPlusGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8.33" cy="5.83" r="3.33" />
      <path d="M3.33 17.5v-1.67a3.33 3.33 0 0 1 3.34-3.33h3.33" />
      <path d="M15 12.5v5M12.5 15h5" />
    </svg>
  );
}

/** Two chasing arrows — production's "Retrain". Not in the icon set. */
function RetrainGlyph() {
  return (
    <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16.25 9.17A6.25 6.25 0 0 0 5.04 5.83L3.75 7.5" />
      <path d="M3.75 3.75V7.5H7.5" />
      <path d="M3.75 10.83a6.25 6.25 0 0 0 11.21 3.34l1.29-1.67" />
      <path d="M16.25 16.25V12.5H12.5" />
    </svg>
  );
}

const KB_COLUMNS = [36, 300, 300, 300, 300, 200];
const KB_TABLE_WIDTH = KB_COLUMNS.reduce((sum, w) => sum + w, 0);

export function KnowledgeBasePage({ locks }: { locks: AiVoiceAgentLocks }) {
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const q = search.trim().toLowerCase();
  const rows = q ? KNOWLEDGE_BASES.filter((k) => k.name.toLowerCase().includes(q)) : KNOWLEDGE_BASES;
  const allSelected = rows.length > 0 && rows.every((k) => selected.has(k.id));
  const someSelected = rows.some((k) => selected.has(k.id));
  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-white">
      <Toolbar
        placeholder="Search Knowledge Base"
        search={search}
        onSearch={setSearch}
        locks={locks}
        create={
          <Gate lock={locks.create}>
            <Button variant="primary" size="md" className="px-5">
              Create Knowledge Base
            </Button>
          </Gate>
        }
      />
      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        <Table className="table-fixed">
          <colgroup>
            {KB_COLUMNS.map((width, i) => (
              <col key={i} style={{ width: `${(width / KB_TABLE_WIDTH) * 100}%` }} />
            ))}
          </colgroup>
          <TableHeader className="[&_tr]:border-0">
            <TableRow className="hover:bg-transparent">
              <TableHead className="h-12">
                <span className="flex">
                  <LockedCheckbox
                    lock={locks.edit}
                    size="sm"
                    aria-label="Select all knowledge bases"
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    onChange={() => setSelected(allSelected ? new Set() : new Set(rows.map((k) => k.id)))}
                  />
                </span>
              </TableHead>
              {["Knowledge Base", "Status", "Assigned Agents", "Updated At", "Actions"].map((label) => (
                <TableHead key={label} className="h-12 text-label-sm">
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((kb) => (
              <TableRow key={kb.id} state={selected.has(kb.id) ? "selected" : "default"} className="border-0">
                <TableCell className={CELL}>
                  <span className="flex">
                    <LockedCheckbox
                      lock={locks.edit}
                      size="sm"
                      aria-label={`Select ${kb.name}`}
                      checked={selected.has(kb.id)}
                      onChange={() => toggle(kb.id)}
                    />
                  </span>
                </TableCell>
                <TableCell className={cn(CELL, "text-label-md text-foreground")}>{kb.name}</TableCell>
                <TableCell className={CELL}>
                  <Tag size="md" color={kb.status === "Failed" ? "red" : "green"} className="py-0">
                    {kb.status}
                  </Tag>
                </TableCell>
                <TableCell className={CELL}>
                  {kb.agents.length ? (
                    <span className="flex items-center gap-1">
                      <Tag size="md" color="grey" className="py-0">
                        {kb.agents[0]}
                      </Tag>
                      {kb.agents.length > 1 ? (
                        <Tag size="md" color="grey" className="py-0">
                          +{kb.agents.length - 1}
                        </Tag>
                      ) : null}
                    </span>
                  ) : (
                    <span className="text-paragraph-md text-muted-foreground">-</span>
                  )}
                </TableCell>
                <TableCell className={cn(CELL, "text-paragraph-md text-muted-foreground")}>{kb.updated}</TableCell>
                <TableCell className={CELL}>
                  <div role="group" aria-label={`Actions for ${kb.name}`} className="inline-flex overflow-hidden rounded-[4px] border border-line">
                    <IconAction title="Assign agents" lock={locks.edit}>
                      <UserPlusGlyph />
                    </IconAction>
                    <IconAction title="Retrain" lock={locks.edit} className="border-l border-line">
                      <RetrainGlyph />
                    </IconAction>
                    <Menu
                      label={`More actions for ${kb.name}`}
                      // Production's three rows. All change the knowledge base, so
                      // View-only sees them locked in place.
                      items={[
                        { key: "duplicate", label: "Duplicate", icon: <IconCopy size={16} />, locked: locks.create },
                        { key: "edit", label: "Edit", icon: <IconPencil size={16} />, locked: locks.edit },
                        { key: "delete", label: "Delete", icon: <IconTrash size={16} />, destructive: true, locked: locks.edit },
                      ]}
                      trigger={
                        <button type="button" aria-label="More actions" className={cn(ACTION_BUTTON, "border-l border-line")}>
                          <IconDotsVertical size={20} />
                        </button>
                      }
                    />
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </main>
  );
}
