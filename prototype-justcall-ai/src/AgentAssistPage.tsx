import * as React from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Dropdown, type DropdownListItem } from "@/components/Dropdown";
import { Tabs, type TabItem } from "@/components/Tabs";
import { InputField } from "@/components/InputField";
import { Toggle } from "@/components/Toggle";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  Avatar,
  avatarVariants,
  type AvatarColor,
  type AvatarProps,
} from "@/components/Avatar";
import {
  IconSearch,
  IconFilter,
  IconCopy,
  IconDotsVertical,
  IconEye,
  IconPencil,
  IconTeamManagement,
} from "@/components/Icon";
import { cn } from "@/lib/utils";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCellText,
  TablePagination,
} from "@/components/Table";
import scriptsEmptyIllustration from "./assets/scripts-empty.png";
import faqsEmptyIllustration from "./assets/faqs-empty.png";
import {
  ScriptTemplatesModal,
  type ScriptStartChoice,
} from "./ScriptTemplatesModal";
import { ScriptBuilderPage, type BuilderLaunch } from "./ScriptBuilderPage";
import { ScriptPreviewModal } from "./ScriptTestPanel";
import {
  clonePlaybook,
  countSteps,
  playbookAssignees,
  playbookAssignmentLabel,
  SCRIPT_TEAM_MEMBERS,
  SCRIPT_USER_GROUPS,
  SEED_SCRIPTS,
  type AssignmentPerson,
  type ScriptPlaybook,
} from "./scriptPlaybook";
import { AssignTeamAndGroups } from "./AssignTeamAndGroups";
import { BattlecardVisual } from "./GuidanceCard";
import { LiveGuidanceCard } from "./LiveGuidance";
import { CreateGuidancePage } from "./CreateGuidancePage";
import {
  GuidanceTemplatesModal,
  type GuidanceStartChoice,
} from "./GuidanceTemplatesModal";
import {
  SEED_GUIDANCE,
  TEAM_MEMBERS,
  USER_GROUPS,
  createEmptyGuidance,
  createGuidanceFromTemplate,
  customerLineForGuidance,
  formatAssignment,
  guidanceAssignees,
  priorityForGuidance,
  stanceForGuidance,
  type GuidanceItem,
  type GuidanceResource,
  type GuidanceTemplateId,
} from "./guidanceData";

/**
 * Agent Assist admin — Scripts agents follow on calls, and Guidance
 * that surfaces contextual answers from live conversation.
 */

type PublishStatus = "live" | "draft";

interface ScriptRow {
  id: string;
  name: string;
  team: string;
  steps: number;
  status: PublishStatus;
  updated: string;
  playbook: ScriptPlaybook;
}

const TABS: TabItem[] = [
  { key: "scripts", label: "Scripts" },
  { key: "guidance", label: "Guidance" },
];

function toScriptRow(
  playbook: ScriptPlaybook,
  status: PublishStatus = "live",
  updated = "Just now"
): ScriptRow {
  return {
    id: playbook.id,
    name: playbook.name,
    team: playbookAssignmentLabel(playbook) || "Unassigned",
    steps: countSteps(playbook),
    status,
    updated,
    playbook,
  };
}

function StatusToggle({
  name,
  checked,
  onCheckedChange,
  disabled,
  disabledReason,
}: {
  name: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const toggle = (
    <Toggle
      size="sm"
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      aria-label={`${name} ${checked ? "live" : "draft"}`}
    />
  );
  if (!disabled || !disabledReason) return toggle;
  return (
    <TooltipTrigger
      content={<Tooltip theme="dark" arrow="top-center" title={disabledReason} />}
    >
      <span className="inline-flex">{toggle}</span>
    </TooltipTrigger>
  );
}

const MEMBER_AVATAR_COLORS: AvatarColor[] = [
  "indigo",
  "purple",
  "pink",
  "orange",
  "bluegrey",
];

function initialsFromName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

function colorForId(id: string): AvatarColor {
  let hash = 0;
  for (let i = 0; i < id.length; i += 1) {
    hash = (hash + id.charCodeAt(i) * (i + 1)) % MEMBER_AVATAR_COLORS.length;
  }
  return MEMBER_AVATAR_COLORS[hash];
}

function UsersGlyph({ size }: { size: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M9.333 12.25v-.875A2.042 2.042 0 0 0 7.292 9.333H3.792A2.042 2.042 0 0 0 1.75 11.375V12.25M5.542 6.417A2.042 2.042 0 1 0 5.542 2.333a2.042 2.042 0 0 0 0 4.084ZM12.25 12.25v-.875a2.042 2.042 0 0 0-1.531-1.977M9.187 2.385a2.042 2.042 0 0 1 0 3.955"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function GroupAvatar({
  size = "md",
  outline = true,
  className,
  style,
  ...props
}: Pick<AvatarProps, "size" | "outline" | "className" | "style"> &
  Omit<React.HTMLAttributes<HTMLSpanElement>, "color">) {
  const resolved = size === "xxl" ? "lg" : (size ?? "md");
  const iconPx =
    resolved === "xs" ? 10 : resolved === "sm" ? 12 : resolved === "md" ? 14 : 16;

  return (
    <span
      className={cn(avatarVariants({ size: resolved }), className)}
      style={style}
      {...props}
    >
      <span
        className={cn(
          "relative flex size-full items-center justify-center overflow-hidden rounded-full",
          "bg-avatar-indigo-bg text-avatar-indigo-fg",
          outline && "border border-white"
        )}
      >
        <UsersGlyph size={iconPx} />
      </span>
    </span>
  );
}

function AssignmentFace({
  person,
  ...props
}: {
  person: AssignmentPerson;
} & Omit<React.HTMLAttributes<HTMLSpanElement>, "color">) {
  if (person.kind === "group") {
    return (
      <GroupAvatar
        size="md"
        outline
        tabIndex={0}
        aria-label={person.name}
        {...props}
      />
    );
  }

  return (
    <Avatar
      size="md"
      outline
      initials={initialsFromName(person.name)}
      color={colorForId(person.id)}
      tabIndex={0}
      aria-label={person.name}
      {...props}
    />
  );
}

function AssignmentAvatarStack({ people }: { people: AssignmentPerson[] }) {
  const [openId, setOpenId] = React.useState<string | null>(null);

  if (people.length === 0) {
    return <span className="text-paragraph-md text-muted-foreground">–</span>;
  }

  const max = 3;
  const visible = people.slice(0, max);
  const overflow = people.length - visible.length;

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((person, index) => (
        <span
          key={person.id}
          className="relative"
          style={{
            zIndex: openId === person.id ? 50 : visible.length - index,
          }}
        >
          <TooltipTrigger
            placement="top"
            onOpenChange={(open) => setOpenId(open ? person.id : null)}
            content={
              <Tooltip theme="dark" arrow="bottom-center" title={person.name} />
            }
          >
            <AssignmentFace person={person} />
          </TooltipTrigger>
        </span>
      ))}
      {overflow > 0 ? (
        <Avatar
          size="md"
          color="grey"
          initials={`+${overflow}`}
          outline
          className="relative"
          style={{ zIndex: 0 }}
          aria-hidden
        />
      ) : null}
    </div>
  );
}

function IconTrash({ size = 20 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3.333 5.833h13.334M8.333 9.167v5M11.667 9.167v5M4.167 5.833l.833 10a1.667 1.667 0 0 0 1.667 1.667h6.666a1.667 1.667 0 0 0 1.667-1.667l.833-10M7.5 5.833V3.333A.833.833 0 0 1 8.333 2.5h3.334a.833.833 0 0 1 .833.833v2.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

interface ActionMenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
}

/**
 * Kebab menu for the secondary row actions. The list body scrolls and clips,
 * so the popover renders in a portal and tracks the trigger — same approach
 * the tooltips use.
 */
function ActionMenu({ label, items }: { label: string; items: ActionMenuItem[] }) {
  const [open, setOpen] = React.useState(false);
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const trigger = triggerRef.current;
      const menu = menuRef.current;
      if (!trigger || !menu) return;
      const rect = trigger.getBoundingClientRect();
      const { offsetWidth: width, offsetHeight: height } = menu;
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
      const below = rect.bottom + 4;
      const top = below + height > window.innerHeight - 8 ? rect.top - height - 4 : below;
      menu.style.top = `${top}px`;
      menu.style.left = `${left}px`;
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <TooltipTrigger
        placement="bottom"
        disabled={open}
        content={<Tooltip theme="dark" arrow="top-center" title="More actions" />}
      >
        <button
          ref={triggerRef}
          type="button"
          aria-label={label}
          aria-haspopup="menu"
          aria-expanded={open}
          onClick={() => setOpen((current) => !current)}
          className={cn(
            "flex size-9 items-center justify-center rounded-r-[4px] border border-line bg-white text-foreground hover:bg-secondary-bg",
            open && "bg-secondary-bg"
          )}
        >
          <IconDotsVertical size={20} />
        </button>
      </TooltipTrigger>
      {open && typeof document !== "undefined"
        ? createPortal(
            <div
              ref={menuRef}
              role="menu"
              aria-label={label}
              className="fixed z-[100] min-w-[180px] rounded-[6px] border border-line bg-white py-1 shadow-400"
              style={{ top: 0, left: 0 }}
            >
              {items.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setOpen(false);
                    item.onSelect?.();
                  }}
                  className={cn(
                    "flex w-full items-center gap-2 px-3 py-2 text-left text-paragraph-md",
                    item.destructive
                      ? "text-error hover:bg-error-subtle"
                      : "text-foreground hover:bg-secondary-bg"
                  )}
                >
                  <span className="flex size-4 shrink-0 items-center justify-center">
                    {item.icon}
                  </span>
                  {item.label}
                </button>
              ))}
            </div>,
            document.body
          )
        : null}
    </>
  );
}

function ActionButtonGroup({
  entity,
  onEdit,
  onPreview,
  onDuplicate,
  onAssign,
  onDelete,
}: {
  entity: "script" | "guidance";
  onEdit?: () => void;
  onPreview?: () => void;
  onDuplicate?: () => void;
  onAssign?: () => void;
  onDelete?: () => void;
}) {
  return (
    <div className="inline-flex items-center">
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" title="Edit" />}
      >
        <button
          type="button"
          aria-label={`Edit ${entity}`}
          onClick={onEdit}
          className="-mr-px flex size-9 items-center justify-center rounded-l-[4px] border border-line bg-white text-foreground hover:bg-secondary-bg"
        >
          <IconPencil size={20} />
        </button>
      </TooltipTrigger>
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" title="Preview" />}
      >
        <button
          type="button"
          aria-label={`Preview ${entity}`}
          onClick={onPreview}
          className="-mr-px flex size-9 items-center justify-center border border-line bg-white text-foreground hover:bg-secondary-bg"
        >
          <IconEye size={20} />
        </button>
      </TooltipTrigger>
      <ActionMenu
        label={`More ${entity} actions`}
        items={[
          {
            key: "duplicate",
            label: "Duplicate",
            icon: <IconCopy size={16} />,
            onSelect: onDuplicate,
          },
          {
            key: "assign",
            label: "Assign",
            icon: <IconTeamManagement size={16} />,
            onSelect: onAssign,
          },
          {
            key: "delete",
            label: "Delete",
            icon: <IconTrash size={16} />,
            onSelect: onDelete,
            destructive: true,
          },
        ]}
      />
    </div>
  );
}

function AgentAssistEmptyState({
  illustrationSrc,
  illustrationAlt,
  title,
  description,
  actionLabel,
  onAction,
}: {
  illustrationSrc: string;
  illustrationAlt: string;
  title: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-6 pb-14">
      <div className="flex flex-col items-center gap-6">
        <div className="relative h-[281px] w-[418px] shrink-0 overflow-hidden rounded-[6px]">
          <img
            src={illustrationSrc}
            alt={illustrationAlt}
            className="size-full object-contain"
            width={418}
            height={281}
          />
        </div>
        <div className="flex flex-col items-center gap-6">
          <div className="flex max-w-[444px] flex-col items-center gap-2 text-center">
            <p className="text-[16px] leading-6 font-semibold text-foreground">{title}</p>
            <p className="text-[14px] leading-5 text-muted-foreground">{description}</p>
          </div>
          <Button size="md" onClick={onAction}>
            {actionLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AgentAssistPage() {
  const [tab, setTab] = React.useState("scripts");
  const [search, setSearch] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [memberFilter, setMemberFilter] = React.useState<string[]>([]);
  const [groupFilter, setGroupFilter] = React.useState<string[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [guidanceTemplatesOpen, setGuidanceTemplatesOpen] = React.useState(false);
  const [builder, setBuilder] = React.useState<BuilderLaunch | null>(null);
  const [scripts, setScripts] = React.useState<ScriptRow[]>(() =>
    SEED_SCRIPTS.map((item) => toScriptRow(item.playbook, item.status, item.updated))
  );
  const [guidanceItems, setGuidanceItems] = React.useState<GuidanceItem[]>(SEED_GUIDANCE);
  const [guidanceLaunch, setGuidanceLaunch] = React.useState<{
    mode: "create" | "edit";
    item: GuidanceItem;
    templateId?: GuidanceTemplateId | null;
  } | null>(null);
  const [previewScript, setPreviewScript] = React.useState<ScriptPlaybook | null>(null);
  const [previewGuidance, setPreviewGuidance] = React.useState<GuidanceItem | null>(null);
  const [viewingResource, setViewingResource] = React.useState<GuidanceResource | null>(null);
  const [assignTarget, setAssignTarget] = React.useState<
    { type: "script"; row: ScriptRow } | { type: "guidance"; row: GuidanceItem } | null
  >(null);
  const isScripts = tab === "scripts";

  const query = search.trim().toLowerCase();
  const activeFilterCount = memberFilter.length + groupFilter.length;
  const hasFilters = activeFilterCount > 0;
  // A row survives the filter row when it is assigned to at least one of the
  // picked members and at least one of the picked groups (each filter is
  // ignored while empty).
  const matchesAssignment = (members: string[], groups: string[]) =>
    (memberFilter.length === 0 || memberFilter.some((value) => members.includes(value))) &&
    (groupFilter.length === 0 || groupFilter.some((value) => groups.includes(value)));

  const filteredScripts = scripts.filter((row) => {
    if (
      !matchesAssignment(row.playbook.assignedMembers, row.playbook.assignedGroups)
    ) {
      return false;
    }
    return (
      !query ||
      row.name.toLowerCase().includes(query) ||
      row.team.toLowerCase().includes(query)
    );
  });
  const filteredGuidance = guidanceItems.filter((row) => {
    if (!matchesAssignment(row.teamMembers, row.userGroups)) return false;
    if (!query) return true;
    return (
      row.name.toLowerCase().includes(query) ||
      row.trigger.toLowerCase().includes(query) ||
      formatAssignment(row).toLowerCase().includes(query)
    );
  });
  const filtered = isScripts ? filteredScripts : filteredGuidance;
  const isEmpty = filtered.length === 0 && !query && !hasFilters;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visibleScripts = filteredScripts.slice(start, start + pageSize);
  const visibleGuidance = filteredGuidance.slice(start, start + pageSize);

  const openScriptTemplates = () => setTemplatesOpen(true);

  const handleTemplateSelect = (choice: ScriptStartChoice) => {
    setTemplatesOpen(false);
    if (choice.type === "scratch") {
      setBuilder({ type: "blank" });
      return;
    }
    setBuilder({ type: "template", templateId: choice.templateId });
  };

  const publishPlaybook = (playbook: ScriptPlaybook) => {
    const row = toScriptRow(playbook, "live");
    setScripts((current) => {
      const index = current.findIndex((item) => item.id === playbook.id);
      if (index === -1) return [row, ...current];
      const next = [...current];
      next[index] = row;
      return next;
    });
    setBuilder(null);
  };

  const openGuidanceTemplates = () => setGuidanceTemplatesOpen(true);

  const handleGuidanceTemplateSelect = (choice: GuidanceStartChoice) => {
    setGuidanceTemplatesOpen(false);
    if (choice.type === "scratch") {
      setGuidanceLaunch({ mode: "create", item: createEmptyGuidance() });
      return;
    }
    setGuidanceLaunch({
      mode: "create",
      item: createGuidanceFromTemplate(choice.templateId),
      templateId: choice.templateId,
    });
  };

  const saveGuidance = (item: GuidanceItem) => {
    setGuidanceItems((current) => {
      const exists = current.some((row) => row.id === item.id);
      if (exists) return current.map((row) => (row.id === item.id ? item : row));
      return [item, ...current];
    });
    setGuidanceLaunch(null);
  };

  const assignScript = (row: ScriptRow, members: string[], groups: string[]) => {
    const playbook = { ...row.playbook, assignedMembers: members, assignedGroups: groups };
    setScripts((current) =>
      current.map((item) =>
        item.id === row.id ? toScriptRow(playbook, item.status, "Just now") : item
      )
    );
  };

  const assignGuidance = (row: GuidanceItem, members: string[], groups: string[]) => {
    setGuidanceItems((current) =>
      current.map((item) => {
        if (item.id !== row.id) return item;
        const next = { ...item, teamMembers: members, userGroups: groups, updated: "Just now" };
        // Live guidance needs at least one assignee — drop to draft if it loses them.
        return guidanceAssignees(next).length === 0 ? { ...next, status: "draft" as const } : next;
      })
    );
  };

  const duplicateGuidance = (item: GuidanceItem) => {
    setGuidanceItems((current) => [
      {
        ...item,
        id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: `${item.name} (copy)`,
        status: "draft",
        updated: "Just now",
      },
      ...current,
    ]);
  };

  if (guidanceLaunch) {
    return (
      <CreateGuidancePage
        initial={guidanceLaunch.item}
        mode={guidanceLaunch.mode}
        templateId={guidanceLaunch.templateId}
        onClose={() => setGuidanceLaunch(null)}
        onSave={saveGuidance}
      />
    );
  }

  if (builder) {
    return (
      <ScriptBuilderPage
        launch={builder}
        onClose={() => setBuilder(null)}
        onPublish={publishPlaybook}
      />
    );
  }

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="border-b border-line px-6">
        <Tabs
          items={TABS}
          value={tab}
          onValueChange={(key) => {
            setTab(key);
            setSearch("");
            setMemberFilter([]);
            setGroupFilter([]);
            setPage(1);
          }}
        />
      </div>

      {isEmpty ? (
        isScripts ? (
          <AgentAssistEmptyState
            illustrationSrc={scriptsEmptyIllustration}
            illustrationAlt=""
            title="No scripts yet"
            description="Create a playbook for the conversations you want agents to run — then Agent Assist guides them live."
            actionLabel="Create script"
            onAction={openScriptTemplates}
          />
        ) : (
          <AgentAssistEmptyState
            illustrationSrc={faqsEmptyIllustration}
            illustrationAlt=""
            title="No guidance yet"
            description="Surface relevant answers, talking points, and resources to agents based on what's being discussed during calls."
            actionLabel="Create guidance"
            onAction={openGuidanceTemplates}
          />
        )
      ) : (
        <>
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex h-9 items-center gap-3">
              <InputField
                placeholder={isScripts ? "Search scripts" : "Search guidance"}
                leadingIcon={<IconSearch size={16} />}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                clearable={false}
                wrapperClassName="w-[280px]"
              />
              <span className="h-full w-px shrink-0 bg-line" aria-hidden="true" />
              <Button
                variant="grey-outline"
                size="sm"
                leftIcon={
                  <IconFilter
                    size={16}
                    className={cn(
                      "origin-center motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-[cubic-bezier(0.23,1,0.32,1)]",
                      filtersOpen && "rotate-180"
                    )}
                  />
                }
                aria-expanded={filtersOpen}
                aria-controls="agent-assist-filters"
                aria-label={
                  hasFilters
                    ? `${filtersOpen ? "Hide filters" : "Filters"}, ${activeFilterCount} active`
                    : undefined
                }
                className={cn((filtersOpen || hasFilters) && "bg-surface-hover")}
                onClick={() => setFiltersOpen((open) => !open)}
              >
                {filtersOpen ? "Hide filters" : "Filters"}
                {hasFilters ? (
                  <Badge variant="blue-grey" className="tabular-nums">
                    {activeFilterCount}
                  </Badge>
                ) : null}
              </Button>
            </div>

            <div className="flex items-center gap-3">
              {isScripts ? (
                <Button size="sm" onClick={openScriptTemplates}>
                  New script
                </Button>
              ) : (
                <Button size="sm" onClick={openGuidanceTemplates}>
                  Create guidance
                </Button>
              )}
            </div>
          </div>

          <div
            id="agent-assist-filters"
            className={cn("aa-filter-row", filtersOpen && "is-open")}
            aria-hidden={!filtersOpen}
            inert={!filtersOpen ? true : undefined}
          >
            <div className="aa-filter-row-clip">
              <div className="aa-filter-row-inner flex flex-wrap items-center gap-3 border-t border-line px-6 py-3">
                <Dropdown
                  placeholder="Team members"
                  searchPlaceholder="Search team members"
                  appliedField="Members"
                  options={isScripts ? SCRIPT_TEAM_MEMBERS : TEAM_MEMBERS}
                  multiple
                  searchable
                  value={memberFilter}
                  onValueChange={(value) => {
                    setMemberFilter(Array.isArray(value) ? value : [value]);
                    setPage(1);
                  }}
                  className="w-[220px] shrink-0"
                  triggerClassName="h-9"
                />
                <Dropdown
                  placeholder="User groups"
                  searchPlaceholder="Search user groups"
                  appliedField="User groups"
                  options={isScripts ? SCRIPT_USER_GROUPS : USER_GROUPS}
                  multiple
                  searchable
                  value={groupFilter}
                  onValueChange={(value) => {
                    setGroupFilter(Array.isArray(value) ? value : [value]);
                    setPage(1);
                  }}
                  className="w-[220px] shrink-0"
                  triggerClassName="h-9"
                />
                {hasFilters ? (
                  <Button
                    variant="link"
                    size="sm"
                    className="text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setMemberFilter([]);
                      setGroupFilter([]);
                      setPage(1);
                    }}
                  >
                    Clear all
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-6 pb-6">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
              <div className="min-h-0 flex-1 overflow-auto">
                {isScripts ? (
                  <ScriptsTable
                    rows={visibleScripts}
                    onEdit={(row) => setBuilder({ type: "edit", playbook: row.playbook })}
                    onPreview={(row) => setPreviewScript(row.playbook)}
                    onAssign={(row) => setAssignTarget({ type: "script", row })}
                    onDuplicate={(row) => {
                      const copy = clonePlaybook(row.playbook);
                      copy.name = `Copy of ${row.playbook.name}`;
                      setScripts((current) => [toScriptRow(copy, "draft"), ...current]);
                    }}
                    onDelete={(row) =>
                      setScripts((current) => current.filter((item) => item.id !== row.id))
                    }
                    onStatusChange={(row, live) =>
                      setScripts((current) =>
                        current.map((item) =>
                          item.id === row.id
                            ? { ...item, status: live ? "live" : "draft", updated: "Just now" }
                            : item
                        )
                      )
                    }
                  />
                ) : (
                  <GuidanceTable
                    rows={visibleGuidance}
                    onEdit={(row) =>
                      setGuidanceLaunch({ mode: "edit", item: row })
                    }
                    onPreview={setPreviewGuidance}
                    onAssign={(row) => setAssignTarget({ type: "guidance", row })}
                    onDuplicate={duplicateGuidance}
                    onDelete={(row) =>
                      setGuidanceItems((current) => current.filter((item) => item.id !== row.id))
                    }
                    onStatusChange={(row, live) => {
                      if (live && guidanceAssignees(row).length === 0) return;
                      setGuidanceItems((current) =>
                        current.map((item) =>
                          item.id === row.id
                            ? { ...item, status: live ? "live" : "draft", updated: "Just now" }
                            : item
                        )
                      );
                    }}
                  />
                )}
              </div>
              <div className="shrink-0 border-t border-line">
                <TablePagination
                  page={currentPage}
                  pageCount={pageCount}
                  onPageChange={setPage}
                  pageSize={pageSize}
                  onPageSizeChange={(size) => {
                    setPageSize(size);
                    setPage(1);
                  }}
                  rangeLabel={`${filtered.length === 0 ? 0 : start + 1}-${Math.min(start + pageSize, filtered.length)} of ${filtered.length} items`}
                />
              </div>
            </div>
          </div>
        </>
      )}

      <ScriptTemplatesModal
        open={templatesOpen}
        onClose={() => setTemplatesOpen(false)}
        onSelect={handleTemplateSelect}
      />
      <GuidanceTemplatesModal
        open={guidanceTemplatesOpen}
        onClose={() => setGuidanceTemplatesOpen(false)}
        onSelect={handleGuidanceTemplateSelect}
      />

      {previewScript ? (
        <ScriptPreviewModal
          open
          playbook={previewScript}
          onClose={() => setPreviewScript(null)}
        />
      ) : null}

      <Modal
        open={Boolean(previewGuidance)}
        onClose={() => setPreviewGuidance(null)}
        size="md"
        title="Preview"
        description="What the agent would see during a call"
      >
        {previewGuidance ? (
          <LiveGuidanceCard
            item={{
              id: previewGuidance.id,
              atMs: 0,
              quote: customerLineForGuidance(previewGuidance),
              item: previewGuidance,
              priority: priorityForGuidance(previewGuidance),
              stance: stanceForGuidance(previewGuidance),
            }}
            reduced
            onDismiss={() => setPreviewGuidance(null)}
            onViewResource={setViewingResource}
          />
        ) : null}
      </Modal>

      <Modal
        open={Boolean(viewingResource)}
        onClose={() => setViewingResource(null)}
        size="lg"
        title={viewingResource?.name}
      >
        {viewingResource?.type === "image" ? (
          viewingResource.battlecard ? (
            <BattlecardVisual data={viewingResource.battlecard} className="w-full" />
          ) : (
            <div className="overflow-hidden rounded-md border border-line bg-secondary-bg">
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
          )
        ) : null}
      </Modal>

      {assignTarget ? (
        <AssignModal
          key={assignTarget.row.id}
          name={assignTarget.row.name}
          entity={assignTarget.type}
          members={assignTarget.type === "script" ? SCRIPT_TEAM_MEMBERS : TEAM_MEMBERS}
          groups={assignTarget.type === "script" ? SCRIPT_USER_GROUPS : USER_GROUPS}
          initialMembers={
            assignTarget.type === "script"
              ? assignTarget.row.playbook.assignedMembers
              : assignTarget.row.teamMembers
          }
          initialGroups={
            assignTarget.type === "script"
              ? assignTarget.row.playbook.assignedGroups
              : assignTarget.row.userGroups
          }
          onClose={() => setAssignTarget(null)}
          onSave={(nextMembers, nextGroups) => {
            if (assignTarget.type === "script") {
              assignScript(assignTarget.row, nextMembers, nextGroups);
            } else {
              assignGuidance(assignTarget.row, nextMembers, nextGroups);
            }
            setAssignTarget(null);
          }}
        />
      ) : null}
    </main>
  );
}

/** Assign a script or guidance to users and groups without opening the editor. */
function AssignModal({
  name,
  entity,
  members,
  groups,
  initialMembers,
  initialGroups,
  onClose,
  onSave,
}: {
  name: string;
  entity: "script" | "guidance";
  members: DropdownListItem[];
  groups: DropdownListItem[];
  initialMembers: string[];
  initialGroups: string[];
  onClose: () => void;
  onSave: (members: string[], groups: string[]) => void;
}) {
  const [selectedMembers, setSelectedMembers] = React.useState(initialMembers);
  const [selectedGroups, setSelectedGroups] = React.useState(initialGroups);

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      className="overflow-visible"
      bodyClassName="overflow-visible"
      title="Assign"
      description={`Choose who sees this ${entity} on their calls.`}
      footer={
        <>
          <Button variant="grey-outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={() => onSave(selectedMembers, selectedGroups)}>
            Save
          </Button>
        </>
      }
    >
      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-label-sm text-muted-foreground">
            {entity === "script" ? "Script" : "Guidance"}
          </dt>
          <dd className="text-paragraph-md text-foreground">{name}</dd>
        </div>
        <AssignTeamAndGroups
          variant="summary"
          members={members}
          groups={groups}
          selectedMembers={selectedMembers}
          selectedGroups={selectedGroups}
          onMembersChange={setSelectedMembers}
          onGroupsChange={setSelectedGroups}
        />
      </dl>
    </Modal>
  );
}

function ScriptsTable({
  rows,
  onEdit,
  onPreview,
  onDuplicate,
  onAssign,
  onDelete,
  onStatusChange,
}: {
  rows: ScriptRow[];
  onEdit: (row: ScriptRow) => void;
  onPreview: (row: ScriptRow) => void;
  onDuplicate: (row: ScriptRow) => void;
  onAssign: (row: ScriptRow) => void;
  onDelete: (row: ScriptRow) => void;
  onStatusChange: (row: ScriptRow, live: boolean) => void;
}) {
  return (
    <Table className="table-fixed">
      <TableHeader className="[&_tr]:border-b-0">
        <TableRow>
          <TableHead className="sticky top-0 z-10 w-[280px]">Name</TableHead>
          <TableHead className="sticky top-0 z-10 w-[160px]">Assigned</TableHead>
          <TableHead className="sticky top-0 z-10 w-[100px]">Steps</TableHead>
          <TableHead className="sticky top-0 z-10 w-[120px]">Status</TableHead>
          <TableHead className="sticky top-0 z-10 w-[120px]">Updated</TableHead>
          <TableHead className="sticky top-0 z-10 w-[148px] text-center">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="border-b-0">
            <TableCell>
              <TableCellText primary={row.name} />
            </TableCell>
            <TableCell>
              <AssignmentAvatarStack people={playbookAssignees(row.playbook)} />
            </TableCell>
            <TableCell className="text-paragraph-md">{row.steps}</TableCell>
            <TableCell>
              <StatusToggle
                name={row.name}
                checked={row.status === "live"}
                onCheckedChange={(live) => onStatusChange(row, live)}
              />
            </TableCell>
            <TableCell className="text-paragraph-md">{row.updated}</TableCell>
            <TableCell className="text-center">
              <ActionButtonGroup
                entity="script"
                onEdit={() => onEdit(row)}
                onPreview={() => onPreview(row)}
                onDuplicate={() => onDuplicate(row)}
                onAssign={() => onAssign(row)}
                onDelete={() => onDelete(row)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function GuidanceTable({
  rows,
  onEdit,
  onPreview,
  onDuplicate,
  onAssign,
  onDelete,
  onStatusChange,
}: {
  rows: GuidanceItem[];
  onEdit: (row: GuidanceItem) => void;
  onPreview: (row: GuidanceItem) => void;
  onDuplicate: (row: GuidanceItem) => void;
  onAssign: (row: GuidanceItem) => void;
  onDelete: (row: GuidanceItem) => void;
  onStatusChange: (row: GuidanceItem, live: boolean) => void;
}) {
  return (
    <Table className="table-fixed">
      <TableHeader className="[&_tr]:border-b-0">
        <TableRow>
          <TableHead className="sticky top-0 z-10 w-[220px]">Guidance name</TableHead>
          <TableHead className="sticky top-0 z-10">Trigger</TableHead>
          <TableHead className="sticky top-0 z-10 w-[160px]">Assigned to</TableHead>
          <TableHead className="sticky top-0 z-10 w-[120px]">Status</TableHead>
          <TableHead className="sticky top-0 z-10 w-[120px]">Last updated</TableHead>
          <TableHead className="sticky top-0 z-10 w-[148px] text-center">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="border-b-0">
            <TableCell>
              <button
                type="button"
                onClick={() => onEdit(row)}
                className="max-w-full min-w-0 bg-transparent p-0 text-left font-medium hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
              >
                <TableCellText primary={row.name} />
              </button>
            </TableCell>
            <TableCell>
              <TooltipTrigger
                className="w-full min-w-0 max-w-full"
                placement="top-left"
                content={
                  <Tooltip theme="dark" arrow="bottom-left" title={row.trigger} />
                }
              >
                <span className="block min-w-0 w-full truncate text-paragraph-md text-muted-foreground">
                  {row.trigger}
                </span>
              </TooltipTrigger>
            </TableCell>
            <TableCell>
              <AssignmentAvatarStack people={guidanceAssignees(row)} />
            </TableCell>
            <TableCell>
              <StatusToggle
                name={row.name}
                checked={row.status === "live"}
                disabled={row.status !== "live" && guidanceAssignees(row).length === 0}
                disabledReason="Assign users or groups before publishing"
                onCheckedChange={(live) => onStatusChange(row, live)}
              />
            </TableCell>
            <TableCell className="text-paragraph-md">{row.updated}</TableCell>
            <TableCell className="text-center">
              <ActionButtonGroup
                entity="guidance"
                onEdit={() => onEdit(row)}
                onPreview={() => onPreview(row)}
                onDuplicate={() => onDuplicate(row)}
                onAssign={() => onAssign(row)}
                onDelete={() => onDelete(row)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
