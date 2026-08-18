import * as React from "react";
import { createPortal } from "react-dom";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Checkbox } from "@/components/Checkbox";
import { Dropdown } from "@/components/Dropdown";
import { InputField } from "@/components/InputField";
import { Modal } from "@/components/Modal";
import { Radio } from "@/components/Radio";
import { Tag } from "@/components/Tag";
import { Toggle } from "@/components/Toggle";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  IconClose,
  IconCopy,
  IconDotsVertical,
  IconFile,
  IconFilter,
  IconPencil,
  IconSearch,
} from "@/components/Icon";
import {
  Table,
  TableBody,
  TableBulkBar,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/Table";
import { cn } from "@/lib/utils";
import faqsEmptyIllustration from "./assets/faqs-empty.png";
import { AdminPageHeader } from "./AgentAssistAdmin";
import { useAgentAssistTakeover } from "./agentAssistTakeover";
import { AssignmentAvatarStack } from "./AssignmentAvatarStack";
import { AssignTeamAndGroups } from "./AssignTeamAndGroups";
import {
  KNOWLEDGE_ENTITLEMENTS,
  KNOWLEDGE_TEAMS,
  KNOWLEDGE_USED_BY_OPTIONS,
  KNOWLEDGE_USERS,
  knowledgeAssignees,
  knowledgeAudienceLabel,
  knowledgeKindMeta,
  knowledgeUsedByLabel,
  newKnowledgeSourceId,
  sampleEntriesForSource,
  usedByAgentAssist,
  usedByVoiceAgent,
  voiceAgentKbLimitReached,
  type KnowledgeAudience,
  type KnowledgeSourceRecord,
} from "./knowledgeData";

/**
 * Knowledge admin — one JustCall knowledge base, shared. Each KB says which
 * products may read it, so switching Agent Assist on is an availability change
 * on the existing record rather than a second copy to maintain. There is no
 * trigger to write and no question to enumerate: retrieval finds the answer
 * when a customer asks for it.
 */

export interface KnowledgePageProps {
  sources: KnowledgeSourceRecord[];
  onSourcesChange: (next: KnowledgeSourceRecord[]) => void;
}

export function KnowledgePage({
  sources,
  onSourcesChange,
}: KnowledgePageProps) {
  const [search, setSearch] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [agentFilter, setAgentFilter] = React.useState<string[]>([]);
  const [groupFilter, setGroupFilter] = React.useState<string[]>([]);
  const [selected, setSelected] = React.useState<string[]>([]);
  /** Percent complete per knowledge base while ingestion re-runs. */
  const [training, setTraining] = React.useState<Record<string, number>>({});
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [assigning, setAssigning] = React.useState<KnowledgeSourceRecord | null>(
    null
  );
  const [deleting, setDeleting] = React.useState<KnowledgeSourceRecord[] | null>(
    null
  );
  const [editing, setEditing] = React.useState<{
    source: KnowledgeSourceRecord;
    mode: "create" | "edit";
  } | null>(null);

  const query = search.trim().toLowerCase();
  const matchesAssignment = (members: string[], groups: string[]) =>
    (agentFilter.length === 0 ||
      agentFilter.some((value) => members.includes(value))) &&
    (groupFilter.length === 0 ||
      groupFilter.some((value) => groups.includes(value)));
  const filtered = sources.filter((source) => {
    const matchesQuery =
      !query ||
      source.name.toLowerCase().includes(query) ||
      source.origin.toLowerCase().includes(query);
    const matchesStatus =
      statusFilter.length === 0 ||
      (statusFilter.includes("success") && source.status === "live") ||
      (statusFilter.includes("failed") && source.status === "failed") ||
      (statusFilter.includes("draft") && source.status === "draft");
    const matchesAudience =
      source.audience === "everyone" ||
      matchesAssignment(source.audienceUsers, source.audienceTeams);
    return matchesQuery && matchesStatus && matchesAudience;
  });
  const isEmpty = sources.length === 0;
  const activeFilterCount =
    statusFilter.length + agentFilter.length + groupFilter.length;
  const hasFilters = activeFilterCount > 0;
  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  // Selection and the header checkbox act on the page in front of the admin.
  const visibleIds = visible.map((source) => source.id);
  const selectedVisible = selected.filter((id) => visibleIds.includes(id));
  const allSelected =
    visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
  const someSelected = selectedVisible.length > 0 && !allSelected;

  const saveSource = (next: KnowledgeSourceRecord) => {
    const exists = sources.some((source) => source.id === next.id);
    onSourcesChange(
      exists
        ? sources.map((source) => (source.id === next.id ? next : source))
        : [next, ...sources]
    );
    setEditing(null);
  };

  const patchSource = (id: string, patch: Partial<KnowledgeSourceRecord>) => {
    onSourcesChange(
      sources.map((source) =>
        source.id === id ? { ...source, ...patch, updated: "Just now" } : source
      )
    );
  };

  const toggleAll = () => {
    setSelected(allSelected ? [] : visibleIds);
  };

  const toggleRow = (id: string) => {
    setSelected((current) =>
      current.includes(id) ? current.filter((value) => value !== id) : [...current, id]
    );
  };

  const duplicateSource = (source: KnowledgeSourceRecord) => {
    onSourcesChange([
      {
        ...source,
        id: newKnowledgeSourceId(),
        name: `${source.name} (copy)`,
        status: "draft",
        updated: "Just now",
      },
      ...sources,
    ]);
  };

  /**
   * Ingestion stands in for the real crawl: the pie fills, then the knowledge
   * base lands published — which is also how a failed source gets retried.
   */
  const retrainSource = (id: string) => {
    if (training[id] != null) return;
    const steps = [12, 34, 58, 79, 100];
    setTraining((current) => ({ ...current, [id]: steps[0]! }));
    steps.slice(1).forEach((value, index) => {
      window.setTimeout(
        () =>
          setTraining((current) =>
            current[id] == null ? current : { ...current, [id]: value }
          ),
        (index + 1) * 280
      );
    });
    window.setTimeout(() => {
      setTraining((current) => {
        const { [id]: _done, ...rest } = current;
        return rest;
      });
      patchSource(id, { status: "live" });
    }, steps.length * 280);
  };

  const removeSources = (ids: string[]) => {
    onSourcesChange(sources.filter((source) => !ids.includes(source.id)));
    setSelected((current) => current.filter((id) => !ids.includes(id)));
    setDeleting(null);
  };

  if (editing) {
    return (
      <KnowledgeSourcePage
        source={editing.source}
        sources={sources}
        mode={editing.mode}
        onCancel={() => setEditing(null)}
        onSave={saveSource}
      />
    );
  }

  return (
    <main className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <AdminPageHeader
        title="Knowledge"
        description="Add knowledge that Voice Agents can use to answer customers and Agent Assist can surface to agents during calls."
        actions={
          isEmpty ? null : (
            <Button size="sm">Create Knowledge Base</Button>
          )
        }
      />

      {isEmpty ? (
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-6 pb-14">
          <div className="flex max-w-[460px] flex-col items-center gap-6 text-center">
            <img
              src={faqsEmptyIllustration}
              alt=""
              width={418}
              height={281}
              className="h-[281px] w-[418px] max-w-full object-contain"
            />
            <div className="flex flex-col gap-2">
              <p className="text-[16px] leading-6 font-semibold text-foreground">
                No knowledge bases yet
              </p>
              <p className="text-[14px] leading-5 text-muted-foreground">
                Connect a help center, upload a document, or start from what
                JustCall already publishes. AI reads it and answers the routine
                questions on its own — for Voice Agent, Agent Assist, or both.
              </p>
            </div>
            <Button size="md">Create Knowledge Base</Button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center px-6 py-3">
            <div className="flex h-9 items-center gap-3">
              <InputField
                placeholder="Search Knowledge Base"
                leadingIcon={<IconSearch size={16} />}
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
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
                aria-controls="knowledge-filters"
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
          </div>

          <div
            id="knowledge-filters"
            className={cn("aa-filter-row", filtersOpen && "is-open")}
            aria-hidden={!filtersOpen}
            inert={!filtersOpen ? true : undefined}
          >
            <div className="aa-filter-row-clip">
              <div className="aa-filter-row-inner flex flex-wrap items-center gap-3 border-t border-line px-6 py-3">
                <Dropdown
                  placeholder="Status"
                  appliedField="Status"
                  options={STATUS_FILTER_OPTIONS}
                  multiple
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(Array.isArray(value) ? value : [value]);
                    setPage(1);
                  }}
                  className="w-[180px] shrink-0"
                  triggerClassName="h-9"
                />
                <Dropdown
                  placeholder="Agents"
                  searchPlaceholder="Search agents"
                  appliedField="Agents"
                  options={KNOWLEDGE_USERS}
                  multiple
                  searchable
                  value={agentFilter}
                  onValueChange={(value) => {
                    setAgentFilter(Array.isArray(value) ? value : [value]);
                    setPage(1);
                  }}
                  className="w-[220px] shrink-0"
                  triggerClassName="h-9"
                />
                <Dropdown
                  placeholder="User Groups"
                  searchPlaceholder="Search user groups"
                  appliedField="User Groups"
                  options={KNOWLEDGE_TEAMS}
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
                    variant="grey-outline"
                    size="sm"
                    onClick={() => {
                      setStatusFilter([]);
                      setAgentFilter([]);
                      setGroupFilter([]);
                      setPage(1);
                    }}
                  >
                    Clear
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col px-6 pb-6">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
              <div className="min-h-0 flex-1 overflow-auto">
                <Table className="table-fixed">
                  <TableHeader className="[&_tr]:border-b-0">
                    <TableRow>
                      <TableHead className="sticky top-0 z-10 w-11">
                        <Checkbox
                          size="sm"
                          checked={allSelected}
                          indeterminate={someSelected}
                          onCheckedChange={toggleAll}
                          aria-label="Select all knowledge bases"
                        />
                      </TableHead>
                      <TableHead className="sticky top-0 z-10">Knowledge Base</TableHead>
                      <TableHead className="sticky top-0 z-10 w-[132px]">Status</TableHead>
                      <TableHead className="sticky top-0 z-10 w-[160px]">
                        Assigned Agents
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 w-[150px]">
                        Last Updated
                      </TableHead>
                      <TableHead className="sticky top-0 z-10 w-[142px] text-center">
                        Actions
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visible.length === 0 ? (
                      <TableRow className="border-b-0 hover:bg-transparent">
                        <TableCell
                          colSpan={6}
                          className="text-paragraph-md text-muted-foreground"
                        >
                          No matching knowledge bases
                        </TableCell>
                      </TableRow>
                    ) : (
                      visible.map((source) => {
                        const isSelected = selected.includes(source.id);
                        const progress = training[source.id] ?? null;
                        return (
                          <TableRow
                            key={source.id}
                            state={isSelected ? "selected" : "default"}
                            className="border-b-0"
                          >
                            <TableCell className="w-11">
                              <Checkbox
                                size="sm"
                                checked={isSelected}
                                onCheckedChange={() => toggleRow(source.id)}
                                aria-label={`Select ${source.name}`}
                              />
                            </TableCell>
                            <TableCell>
                              <span className="block max-w-full min-w-0 truncate text-label-md font-medium">
                                {source.name}
                              </span>
                            </TableCell>
                            <TableCell>
                              <KnowledgeStatusCell
                                status={source.status}
                                progress={progress}
                              />
                            </TableCell>
                            <TableCell>
                              <AssignmentAvatarStack
                                people={knowledgeAssignees(source)}
                              />
                            </TableCell>
                            <TableCell className="text-paragraph-md text-muted-foreground">
                              {source.updated}
                            </TableCell>
                            <TableCell className="text-center">
                              <RowActions
                                source={source}
                                retraining={progress != null}
                                onAssign={() => setAssigning(source)}
                                onRetrain={() => retrainSource(source.id)}
                                onDuplicate={() => duplicateSource(source)}
                                onEdit={() => setEditing({ source, mode: "edit" })}
                                onDelete={() => setDeleting([source])}
                              />
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
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
                  rangeLabel={`${filtered.length === 0 ? 0 : start + 1}-${Math.min(
                    start + pageSize,
                    filtered.length
                  )} of ${filtered.length} items`}
                />
              </div>
            </div>
            <TableBulkBar
              count={selectedVisible.length}
              label="selected"
              actions={
                <Button
                  variant="grey-outline"
                  size="sm"
                  className="bg-white"
                  onClick={() =>
                    setDeleting(
                      sources.filter((source) => selectedVisible.includes(source.id))
                    )
                  }
                >
                  Delete
                </Button>
              }
            />
          </div>
        </>
      )}

      {assigning ? (
        <AssignAgentsModal
          source={assigning}
          onClose={() => setAssigning(null)}
          onSave={(next) => {
            patchSource(assigning.id, next);
            setAssigning(null);
          }}
        />
      ) : null}

      {deleting && deleting.length > 0 ? (
        <Modal
          open
          onClose={() => setDeleting(null)}
          size="sm"
          title={deleting.length === 1 ? "Delete knowledge base" : "Delete knowledge bases"}
          description={
            deleting.length === 1
              ? `“${deleting[0]!.name}” will be removed from Voice Agent and Agent Assist.`
              : `${deleting.length} knowledge bases will be removed from Voice Agent and Agent Assist.`
          }
          footer={
            <>
              <Button variant="grey-outline" size="sm" onClick={() => setDeleting(null)}>
                Cancel
              </Button>
              <Button
                variant="error"
                size="sm"
                onClick={() => removeSources(deleting.map((source) => source.id))}
              >
                Delete
              </Button>
            </>
          }
        />
      ) : null}
    </main>
  );
}

const STATUS_FILTER_OPTIONS = [
  { value: "success", label: "Success" },
  { value: "failed", label: "Failed" },
  { value: "draft", label: "Draft" },
];

function KnowledgeStatusCell({
  status,
  progress,
}: {
  status: KnowledgeSourceRecord["status"];
  /** Percent complete while ingestion runs; `null` when it isn't running. */
  progress: number | null;
}) {
  if (progress != null) {
    return (
      <span className="flex items-center gap-2">
        <TrainingPie value={progress} />
        <span className="text-paragraph-md text-muted-foreground">Training</span>
      </span>
    );
  }
  if (status === "live") {
    return (
      <Tag size="sm" color="green">
        Success
      </Tag>
    );
  }
  if (status === "failed") {
    return (
      <Tag size="sm" color="red">
        Failed
      </Tag>
    );
  }
  return (
    <Tag size="sm" color="blue-grey">
      Draft
    </Tag>
  );
}

/** How far through ingestion a knowledge base is, as a 24px dial. */
function TrainingPie({ value }: { value: number }) {
  const radius = 9;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      role="img"
      aria-label={`Training ${Math.round(clamped)}% complete`}
      className="shrink-0"
    >
      <circle
        cx="12"
        cy="12"
        r={radius}
        stroke="currentColor"
        strokeWidth="3"
        className="text-line"
      />
      <circle
        cx="12"
        cy="12"
        r={radius}
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        className="text-brand"
        strokeDasharray={circumference}
        strokeDashoffset={circumference * (1 - clamped / 100)}
        transform="rotate(-90 12 12)"
        style={{ transition: "stroke-dashoffset 260ms linear" }}
      />
    </svg>
  );
}

function RowActions({
  source,
  retraining,
  onAssign,
  onRetrain,
  onDuplicate,
  onEdit,
  onDelete,
}: {
  source: KnowledgeSourceRecord;
  retraining: boolean;
  onAssign: () => void;
  onRetrain: () => void;
  onDuplicate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="inline-flex items-center"
      role="group"
      aria-label={`Actions for ${source.name}`}
    >
      <TooltipTrigger
        placement="bottom"
        className="-mr-px"
        content={<Tooltip theme="dark" arrow="top-center" title="Assign Agents" />}
      >
        <button
          type="button"
          aria-label={`Assign agents to ${source.name}`}
          onClick={onAssign}
          className="flex size-9 items-center justify-center rounded-l-[4px] border border-line bg-white text-foreground hover:bg-secondary-bg focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconUserPlus />
        </button>
      </TooltipTrigger>
      <TooltipTrigger
        placement="bottom"
        className="-mr-px"
        content={<Tooltip theme="dark" arrow="top-center" title="Retrain" />}
      >
        <button
          type="button"
          aria-label={`Retrain ${source.name}`}
          disabled={retraining}
          onClick={onRetrain}
          className="flex size-9 items-center justify-center border border-line bg-white text-foreground hover:bg-secondary-bg focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24 disabled:cursor-not-allowed disabled:text-disabled-fg"
        >
          <IconRefresh className={retraining ? "animate-spin" : undefined} />
        </button>
      </TooltipTrigger>
      <ActionMenu
        label={`More actions for ${source.name}`}
        items={[
          {
            key: "duplicate",
            label: "Duplicate",
            icon: <IconCopy size={16} />,
            onSelect: onDuplicate,
          },
          {
            key: "edit",
            label: "Edit",
            icon: <IconPencil size={16} />,
            onSelect: onEdit,
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

function AssignAgentsModal({
  source,
  onClose,
  onSave,
}: {
  source: KnowledgeSourceRecord;
  onClose: () => void;
  onSave: (patch: Partial<KnowledgeSourceRecord>) => void;
}) {
  const [members, setMembers] = React.useState(source.audienceUsers);
  const [groups, setGroups] = React.useState(source.audienceTeams);

  const save = () => {
    if (members.length === 0 && groups.length === 0) {
      onSave({ audience: "everyone", audienceTeams: [], audienceUsers: [] });
      return;
    }
    if (members.length > 0) {
      onSave({ audience: "users", audienceUsers: members, audienceTeams: groups });
      return;
    }
    onSave({ audience: "teams", audienceTeams: groups, audienceUsers: [] });
  };

  return (
    <Modal
      open
      onClose={onClose}
      size="sm"
      className="overflow-visible"
      bodyClassName="overflow-visible"
      title="Assign Agents"
      description="Only assigned agents can be helped by this knowledge base on a call."
      footer={
        <>
          <Button variant="grey-outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" onClick={save}>
            Save
          </Button>
        </>
      }
    >
      <dl className="flex flex-col gap-3">
        <div>
          <dt className="text-label-sm text-muted-foreground">Knowledge Base</dt>
          <dd className="text-paragraph-md text-foreground">{source.name}</dd>
        </div>
        <AssignTeamAndGroups
          variant="summary"
          members={KNOWLEDGE_USERS}
          groups={KNOWLEDGE_TEAMS}
          selectedMembers={members}
          selectedGroups={groups}
          onMembersChange={setMembers}
          onGroupsChange={setGroups}
        />
      </dl>
    </Modal>
  );
}

interface ActionMenuItem {
  key: string;
  label: string;
  icon: React.ReactNode;
  onSelect?: () => void;
  destructive?: boolean;
}

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
      const left = Math.max(
        8,
        Math.min(rect.right - width, window.innerWidth - width - 8)
      );
      const below = rect.bottom + 4;
      const top =
        below + height > window.innerHeight - 8 ? rect.top - height - 4 : below;
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
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) {
        return;
      }
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
            "flex size-9 items-center justify-center rounded-r-[4px] border border-line bg-white text-foreground hover:bg-secondary-bg focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
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

function IconUserPlus() {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6.667 5.833a3.333 3.333 0 1 0 6.666 0 3.333 3.333 0 0 0-6.666 0"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M13.333 15.833h5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15.833 13.333v5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 17.5v-1.667a3.333 3.333 0 0 1 3.333-3.333h3.334"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconRefresh({ className }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M16.667 9.167a6.75 6.75 0 0 0-12.917-1.667m-.417-3.333v3.333h3.333"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M3.333 10.833a6.75 6.75 0 0 0 12.917 1.667m.417 3.333v-3.333h-3.333"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTrash({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
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

const AUDIENCE_OPTIONS: { value: KnowledgeAudience; label: string; hint: string }[] = [
  { value: "everyone", label: "Everyone", hint: "Every agent on the account." },
  { value: "teams", label: "Specific teams", hint: "Pick the teams that need it." },
  { value: "users", label: "Specific users", hint: "Pick individual agents." },
];

/**
 * Knowledge base setup — name it, say which products use it, say who it serves,
 * and decide whether the agent gets to see where an answer came from.
 */
function KnowledgeSourcePage({
  source,
  sources,
  mode,
  onCancel,
  onSave,
}: {
  source: KnowledgeSourceRecord;
  /** Needed to price the Voice Agent slot before it is claimed. */
  sources: KnowledgeSourceRecord[];
  mode: "create" | "edit";
  onCancel: () => void;
  onSave: (next: KnowledgeSourceRecord) => void;
}) {
  useAgentAssistTakeover();
  const [draft, setDraft] = React.useState<KnowledgeSourceRecord>(source);
  const [publishOpen, setPublishOpen] = React.useState(false);
  const meta = knowledgeKindMeta(draft.kind);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const patch = (partial: Partial<KnowledgeSourceRecord>) =>
    setDraft((current) => ({ ...current, ...partial }));

  const needsOrigin = meta.input !== "none";
  const audienceChosen =
    draft.audience === "everyone" ||
    (draft.audience === "teams" && draft.audienceTeams.length > 0) ||
    (draft.audience === "users" && draft.audienceUsers.length > 0);
  const canPublish =
    draft.name.trim().length > 0 && (!needsOrigin || draft.origin.trim().length > 0) &&
    audienceChosen;

  const publish = () => {
    // Ingestion stands in for parsing: a published source arrives with the
    // answers AI can retrieve from it.
    const entries =
      draft.entries.length > 0
        ? draft.entries
        : sampleEntriesForSource(`${draft.name} ${draft.origin}`, draft.kind);
    onSave({
      ...draft,
      name: draft.name.trim(),
      origin: draft.origin.trim(),
      entries,
      status: "live",
      updated: "Just now",
    });
  };

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between gap-3 border-b border-line bg-white px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Close"
            onClick={onCancel}
            className="flex size-8 shrink-0 items-center justify-center rounded-[4px] text-foreground hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconClose size={20} />
          </button>
          <h1 className="truncate text-heading-lg text-foreground">
            {mode === "edit" ? draft.name || "Knowledge base" : `Add ${meta.label}`}
          </h1>
        </div>
        <Button size="sm" disabled={!canPublish} onClick={() => setPublishOpen(true)}>
          {mode === "edit" ? "Save" : "Publish"}
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 justify-center overflow-auto px-6 py-8">
        <div className="flex w-full max-w-[680px] flex-col gap-4">
          <SectionCard title="Knowledge base">
            <InputField
              label="Name"
              placeholder="e.g. Sales competitive knowledge"
              value={draft.name}
              onChange={(event) => patch({ name: event.target.value })}
              helpText="An internal name so your team can tell knowledge bases apart."
              helpIcon
              clearable={false}
            />

            {meta.input === "url" ? (
              <InputField
                label="Link"
                placeholder={meta.originPlaceholder}
                value={draft.origin}
                onChange={(event) => patch({ origin: event.target.value })}
                clearable={false}
              />
            ) : null}

            {meta.input === "file" ? (
              <div className="flex flex-col gap-2">
                <span className="text-label-md text-foreground">File</span>
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                      patch({
                        origin: file.name,
                        name: draft.name.trim() ? draft.name : stemOf(file.name),
                      });
                    }
                    event.target.value = "";
                  }}
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={(event) => {
                    event.preventDefault();
                    const file = event.dataTransfer.files[0];
                    if (file) {
                      patch({
                        origin: file.name,
                        name: draft.name.trim() ? draft.name : stemOf(file.name),
                      });
                    }
                  }}
                  className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-brand/40 bg-brand-subtle/20 px-6 py-8 text-center transition-colors hover:border-brand hover:bg-brand-subtle/40"
                >
                  <span className="flex size-10 items-center justify-center rounded-[8px] bg-white text-brand shadow-[0_0_0_1px_rgba(0,76,230,0.12)]">
                    <IconFile size={20} />
                  </span>
                  <span className="text-label-md-semi text-foreground">
                    {draft.origin || `Upload ${meta.label}`}
                  </span>
                  <span className="text-paragraph-sm text-muted-foreground">
                    Drop a file or click to browse.
                  </span>
                </button>
              </div>
            ) : null}

            {meta.input === "none" ? (
              <p className="text-pretty text-paragraph-sm text-muted-foreground">
                {draft.kind === "justcall-kb"
                  ? "Everything already published in your JustCall knowledge base is included — no upload needed."
                  : "You'll add question and answer pairs after this knowledge base is created."}
              </p>
            ) : null}
          </SectionCard>

          <SectionCard
            title="Used by"
            description="The same knowledge base can serve both products. Switching one on never creates a duplicate."
          >
            <div className="flex flex-col gap-2">
              {KNOWLEDGE_USED_BY_OPTIONS.map((option) => {
                const claimsVoiceSlot =
                  option.value !== "agent-assist" && !usedByVoiceAgent(source);
                const blocked = claimsVoiceSlot && voiceAgentKbLimitReached(sources);
                return (
                  <Radio
                    key={option.value}
                    name="knowledge-used-by"
                    label={option.label}
                    description={
                      blocked
                        ? `${KNOWLEDGE_ENTITLEMENTS.voiceAgentTier} includes ${KNOWLEDGE_ENTITLEMENTS.voiceAgentKbLimit} knowledge bases — upgrade the add-on to add another.`
                        : option.hint
                    }
                    disabled={blocked}
                    checked={draft.usedBy === option.value}
                    onCheckedChange={() => patch({ usedBy: option.value })}
                  />
                );
              })}
            </div>
            <p className="text-pretty text-paragraph-sm text-muted-foreground">
              Voice Agent knowledge base limits follow your{" "}
              {KNOWLEDGE_ENTITLEMENTS.voiceAgentTier}. Agent Assist is included
              with {KNOWLEDGE_ENTITLEMENTS.agentAssistPlan} and doesn't consume a
              Voice Agent slot.
            </p>
          </SectionCard>

          <SectionCard
            title="Available to"
            description="Only assigned agents can be helped by this knowledge base on a call."
          >
            <div className="flex flex-col gap-2">
              {AUDIENCE_OPTIONS.map((option) => (
                <Radio
                  key={option.value}
                  name="knowledge-audience"
                  label={option.label}
                  description={option.hint}
                  checked={draft.audience === option.value}
                  onCheckedChange={() => patch({ audience: option.value })}
                />
              ))}
            </div>

            {draft.audience === "teams" ? (
              <Dropdown
                label="Teams"
                placeholder="Select teams"
                searchPlaceholder="Search teams"
                appliedField="Teams"
                options={KNOWLEDGE_TEAMS}
                multiple
                searchable
                value={draft.audienceTeams}
                onValueChange={(value) =>
                  patch({ audienceTeams: Array.isArray(value) ? value : [value] })
                }
              />
            ) : null}

            {draft.audience === "users" ? (
              <Dropdown
                label="Users"
                placeholder="Select users"
                searchPlaceholder="Search users"
                appliedField="Users"
                options={KNOWLEDGE_USERS}
                multiple
                searchable
                value={draft.audienceUsers}
                onValueChange={(value) =>
                  patch({ audienceUsers: Array.isArray(value) ? value : [value] })
                }
              />
            ) : null}
          </SectionCard>

          <SectionCard
            title="How Agent Assist uses this"
            description={
              usedByAgentAssist(draft)
                ? "AI searches this knowledge base while the agent is on a call and surfaces the answer."
                : "Add Agent Assist under Used by to surface these answers on live agent calls."
            }
          >
            <Toggle
              controlPosition="end"
              label="Show source to agents"
              description="Agents see which knowledge base an answer came from and can open the original."
              checked={draft.showSourceToAgents}
              disabled={!usedByAgentAssist(draft)}
              onCheckedChange={(showSourceToAgents) => patch({ showSourceToAgents })}
              wrapperClassName="justify-between"
            />
          </SectionCard>

          {draft.entries.length > 0 ? (
            <SectionCard
              title="What AI found here"
              description={`${draft.entries.length} answers are retrievable from this knowledge base.`}
            >
              <ul className="flex flex-col gap-2">
                {draft.entries.map((entry) => (
                  <li
                    key={entry.id}
                    className="flex flex-col gap-1 rounded-lg border border-line px-3 py-2.5"
                  >
                    <p className="text-label-md-semi text-foreground">{entry.title}</p>
                    <p className="text-pretty text-paragraph-sm text-muted-foreground">
                      {entry.answer}
                    </p>
                  </li>
                ))}
              </ul>
            </SectionCard>
          ) : null}
        </div>
      </div>

      <Modal
        open={publishOpen}
        onClose={() => setPublishOpen(false)}
        size="sm"
        title={mode === "edit" ? "Save changes" : "Ready to publish"}
        description="Agents start getting answers from this knowledge base on matching questions."
        footer={
          <>
            <Button variant="grey-outline" size="sm" onClick={() => setPublishOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={publish}>
              {mode === "edit" ? "Save" : "Publish"}
            </Button>
          </>
        }
      >
        <dl className="flex flex-col gap-3">
          <SummaryRow label="Knowledge base" value={draft.name || "Untitled knowledge base"} />
          <SummaryRow label="Type" value={meta.label} />
          <SummaryRow
            label="Used by"
            value={
              draft.usedBy === "both"
                ? "Voice Agent and Agent Assist"
                : knowledgeUsedByLabel(draft.usedBy)
            }
          />
          <SummaryRow label="Available to" value={knowledgeAudienceLabel(draft)} />
        </dl>
      </Modal>
    </main>
  );
}

function SectionCard({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "flex flex-col gap-4 rounded-lg border border-line bg-white p-4",
        className
      )}
    >
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-label-sm text-muted-foreground">{label}</dt>
      <dd className="text-paragraph-md text-foreground">{value}</dd>
    </div>
  );
}

function stemOf(fileName: string): string {
  const stem = fileName.replace(/\.[a-z0-9]+$/i, "").replace(/[-_]+/g, " ").trim();
  if (!stem) return "";
  return stem.replace(/\b\w/g, (char) => char.toUpperCase());
}

export { SectionCard as KnowledgeSectionCard };
