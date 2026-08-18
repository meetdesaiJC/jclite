import * as React from "react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Modal } from "@/components/Modal";
import { Dropdown } from "@/components/Dropdown";
import { InputField } from "@/components/InputField";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import { IconCopy, IconFilter, IconPencil, IconSearch } from "@/components/Icon";
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
  TableBulkBar,
} from "@/components/Table";
import {
  AdminPageHeader,
  IconTrash,
  StatusToggle,
  TableSelectCell,
  TableSelectHead,
} from "./AgentAssistAdmin";
import { AssignmentAvatarStack } from "./AssignmentAvatarStack";
import { CreateActionPage } from "./CreateActionPage";
import { IconAaActions } from "./icons/AgentAssistNavIcons";
import { IntegrationLogo, IntegrationName } from "./icons/IntegrationLogos";
import { TEAM_MEMBERS, USER_GROUPS } from "./guidanceData";
import {
  actionAssignees,
  actionLibraryStatus,
  cloneAction,
  createEmptyAction,
  integrationById,
  type AgentAction,
  type Integration,
  type IntegrationId,
} from "./actionsData";

/**
 * Actions — what an agent can do in a connected app while the call is running.
 *
 * This is its own primary destination rather than a tab inside Conversation
 * Guidance: the three sections read as one story — Knowledge is what AI may
 * know, Conversation Guidance is how to respond, Actions is what to do. An
 * Action can surface on its own during a call; Response Cards no longer
 * attach or configure Actions.
 */

export interface ActionsPageProps {
  actions: AgentAction[];
  onActionsChange: (next: AgentAction[]) => void;
  integrations: Integration[];
  onIntegrationsChange: (next: Integration[]) => void;
}

export function ActionsPage({
  actions,
  onActionsChange,
  integrations,
  onIntegrationsChange,
}: ActionsPageProps) {
  const [search, setSearch] = React.useState("");
  const [filtersOpen, setFiltersOpen] = React.useState(false);
  const [memberFilter, setMemberFilter] = React.useState<string[]>([]);
  const [groupFilter, setGroupFilter] = React.useState<string[]>([]);
  const [integrationFilter, setIntegrationFilter] = React.useState<string[]>([]);
  const [statusFilter, setStatusFilter] = React.useState<string[]>([]);
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [launch, setLaunch] = React.useState<{
    mode: "create" | "edit";
    item: AgentAction;
  } | null>(null);
  const [deleteTarget, setDeleteTarget] = React.useState<AgentAction | null>(null);
  const [selected, setSelected] = React.useState<string[]>([]);
  const [bulkDeleting, setBulkDeleting] = React.useState(false);
  const [toast, setToast] = React.useState<string | null>(null);

  const query = search.trim().toLowerCase();
  const activeFilterCount =
    memberFilter.length +
    groupFilter.length +
    integrationFilter.length +
    statusFilter.length;
  const hasFilters = activeFilterCount > 0;

  const filtered = actions.filter((row) => {
    // "Everyone" ignores the assignment filters — it already covers whoever
    // was picked.
    if (row.assignmentScope !== "everyone") {
      if (
        memberFilter.length > 0 &&
        !memberFilter.some((value) => row.teamMembers.includes(value))
      ) {
        return false;
      }
      if (
        groupFilter.length > 0 &&
        !groupFilter.some((value) => row.userGroups.includes(value))
      ) {
        return false;
      }
    }
    if (
      integrationFilter.length > 0 &&
      !integrationFilter.includes(row.integrationId)
    ) {
      return false;
    }
    if (
      statusFilter.length > 0 &&
      !statusFilter.includes(actionLibraryStatus(row, integrations))
    ) {
      return false;
    }
    if (!query) return true;
    return (
      row.name.toLowerCase().includes(query) ||
      row.agentLabel.toLowerCase().includes(query)
    );
  });
  const isEmpty = filtered.length === 0 && !query && !hasFilters;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);
  // Header checkbox and bulk bar act on the page in front of the admin.
  const visibleIds = visible.map((row) => row.id);
  const selectedVisible = selected.filter((id) => visibleIds.includes(id));
  const allSelected =
    visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
  const selection: ActionSelection = {
    selectedIds: selected,
    allSelected,
    someSelected: selectedVisible.length > 0 && !allSelected,
    onToggleAll: () => setSelected(allSelected ? [] : visibleIds),
    onToggleRow: (id) =>
      setSelected((current) =>
        current.includes(id)
          ? current.filter((value) => value !== id)
          : [...current, id]
      ),
  };

  const createAction = () =>
    setLaunch({ mode: "create", item: createEmptyAction() });

  const saveAction = (item: AgentAction) => {
    const exists = actions.some((row) => row.id === item.id);
    onActionsChange(
      exists
        ? actions.map((row) => (row.id === item.id ? item : row))
        : [item, ...actions]
    );
    setLaunch(null);
    setToast(exists ? "Action saved" : "Action created");
  };

  const deleteActions = (ids: string[]) => {
    onActionsChange(actions.filter((row) => !ids.includes(row.id)));
    setSelected((current) => current.filter((id) => !ids.includes(id)));
  };

  const connectIntegration = (id: IntegrationId) => {
    const integration = integrationById(integrations, id);
    onIntegrationsChange(
      integrations.map((item) =>
        item.id === id ? { ...item, connected: true } : item
      )
    );
    if (integration) setToast(`${integration.name} connected`);
  };

  const confirmDelete = (item: AgentAction) => {
    deleteActions([item.id]);
    setDeleteTarget(null);
  };

  const confirmBulkDelete = () => {
    deleteActions(selectedVisible);
    setBulkDeleting(false);
  };

  React.useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(timer);
  }, [toast]);

  if (launch) {
    return (
      <CreateActionPage
        initial={launch.item}
        mode={launch.mode}
        integrations={integrations}
        onIntegrationsChange={onIntegrationsChange}
        onClose={() => setLaunch(null)}
        onSave={saveAction}
      />
    );
  }

  return (
    <main className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <AdminPageHeader
        title="In-call Actions"
        description="Let agents take relevant actions during a conversation when specific conditions are met."
        actions={
          isEmpty ? null : (
            <Button size="sm" onClick={createAction}>
              Create action
            </Button>
          )
        }
      />

      {isEmpty ? (
        <ActionsEmptyState onAction={createAction} />
      ) : (
        <>
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex h-9 items-center gap-3">
              <InputField
                placeholder="Search actions"
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
                aria-controls="agent-assist-action-filters"
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
            id="agent-assist-action-filters"
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
                  options={TEAM_MEMBERS}
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
                  options={USER_GROUPS}
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
                <Dropdown
                  placeholder="Integration"
                  appliedField="Integration"
                  options={integrations.map((item) => ({
                    value: item.id,
                    label: item.name,
                    icon: <IntegrationLogo id={item.id} size={14} />,
                  }))}
                  multiple
                  value={integrationFilter}
                  onValueChange={(value) => {
                    setIntegrationFilter(Array.isArray(value) ? value : [value]);
                    setPage(1);
                  }}
                  className="w-[180px] shrink-0"
                  triggerClassName="h-9"
                />
                <Dropdown
                  placeholder="Status"
                  appliedField="Status"
                  options={[
                    { value: "active", label: "Active" },
                    { value: "inactive", label: "Inactive" },
                    { value: "needs_attention", label: "Needs attention" },
                  ]}
                  multiple
                  value={statusFilter}
                  onValueChange={(value) => {
                    setStatusFilter(Array.isArray(value) ? value : [value]);
                    setPage(1);
                  }}
                  className="w-[180px] shrink-0"
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
                      setIntegrationFilter([]);
                      setStatusFilter([]);
                      setPage(1);
                    }}
                  >
                    Clear all
                  </Button>
                ) : null}
              </div>
            </div>
          </div>

          <div className="relative flex min-h-0 flex-1 flex-col px-6 pb-6">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
              <div className="min-h-0 flex-1 overflow-auto">
                <ActionsTable
                  rows={visible}
                  selection={selection}
                  integrations={integrations}
                  onEdit={(row) => setLaunch({ mode: "edit", item: row })}
                  onDuplicate={(row) =>
                    onActionsChange([cloneAction(row), ...actions])
                  }
                  onToggleStatus={(row) =>
                    onActionsChange(
                      actions.map((item) =>
                        item.id === row.id
                          ? {
                              ...item,
                              status:
                                item.status === "active" ? "inactive" : "active",
                              updated: "Just now",
                            }
                          : item
                      )
                    )
                  }
                  onConnectIntegration={connectIntegration}
                  onDelete={setDeleteTarget}
                />
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
            <TableBulkBar
              count={selectedVisible.length}
              label="selected"
              actions={
                <Button
                  variant="grey-outline"
                  size="sm"
                  className="bg-white"
                  onClick={() => setBulkDeleting(true)}
                >
                  Delete
                </Button>
              }
            />
          </div>
        </>
      )}

      {deleteTarget ? (
        <Modal
          open
          onClose={() => setDeleteTarget(null)}
          size="sm"
          title={`Delete “${deleteTarget.name}”?`}
          description="This Action will no longer be available to agents."
          footer={
            <>
              <Button
                variant="grey-outline"
                size="sm"
                onClick={() => setDeleteTarget(null)}
              >
                Cancel
              </Button>
              <Button
                variant="error"
                size="sm"
                onClick={() => confirmDelete(deleteTarget)}
              >
                Delete Action
              </Button>
            </>
          }
        />
      ) : null}

      {bulkDeleting && selectedVisible.length > 0 ? (
        <Modal
          open
          onClose={() => setBulkDeleting(false)}
          size="sm"
          title={
            selectedVisible.length === 1 ? "Delete action" : "Delete actions"
          }
          description={
            selectedVisible.length === 1
              ? "This action will be removed from Agent Assist."
              : `${selectedVisible.length} actions will be removed from Agent Assist.`
          }
          footer={
            <>
              <Button
                variant="grey-outline"
                size="sm"
                onClick={() => setBulkDeleting(false)}
              >
                Cancel
              </Button>
              <Button variant="error" size="sm" onClick={confirmBulkDelete}>
                Delete
              </Button>
            </>
          }
        />
      ) : null}

      {toast ? (
        <div
          role="status"
          className="pointer-events-none absolute right-6 bottom-6 z-30 rounded-[6px] border border-line bg-white px-3 py-2 text-label-md text-foreground shadow-400"
        >
          {toast}
        </div>
      ) : null}
    </main>
  );
}

function ActionsEmptyState({ onAction }: { onAction: () => void }) {
  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-auto px-6 pb-14">
      <div className="flex max-w-[440px] flex-col items-center gap-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-secondary-bg text-foreground">
          <IconAaActions className="size-6" />
        </span>
        <div className="flex flex-col items-center gap-2">
          <p className="text-[16px] leading-6 font-semibold text-foreground">
            No actions yet
          </p>
          <p className="text-[14px] leading-5 text-muted-foreground">
            Create reusable actions agents can take in connected apps while they’re on a call.
          </p>
          <p className="text-[13px] leading-5 text-muted-foreground">
            Update CRM fields, create tasks, add notes, and more.
          </p>
        </div>
        <Button size="md" onClick={onAction}>
          Create action
        </Button>
      </div>
    </div>
  );
}

/**
 * Actions rows only carry three commands, so they all sit upfront as a
 * segmented group instead of hiding behind a kebab.
 */
function ActionRowButtons({
  name,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  name: string;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  return (
    <div className="inline-flex items-center">
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" title="Edit" />}
      >
        <button
          type="button"
          aria-label={`Edit ${name}`}
          onClick={onEdit}
          className="-mr-px flex size-9 items-center justify-center rounded-l-[4px] border border-line bg-white text-foreground hover:bg-secondary-bg"
        >
          <IconPencil size={20} />
        </button>
      </TooltipTrigger>
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" title="Duplicate" />}
      >
        <button
          type="button"
          aria-label={`Duplicate ${name}`}
          onClick={onDuplicate}
          className="-mr-px flex size-9 items-center justify-center border border-line bg-white text-foreground hover:bg-secondary-bg"
        >
          <IconCopy size={20} />
        </button>
      </TooltipTrigger>
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" title="Delete" />}
      >
        <button
          type="button"
          aria-label={`Delete ${name}`}
          onClick={onDelete}
          className="flex size-9 items-center justify-center rounded-r-[4px] border border-line bg-white text-foreground hover:bg-error-subtle hover:text-error"
        >
          <IconTrash size={20} />
        </button>
      </TooltipTrigger>
    </div>
  );
}

/** Multi-select state for the list, owned by the page. */
interface ActionSelection {
  selectedIds: string[];
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  onToggleRow: (id: string) => void;
}

function ActionStatusToggle({
  row,
  status,
  integrations,
  onToggle,
  onConnect,
}: {
  row: AgentAction;
  status: ReturnType<typeof actionLibraryStatus>;
  integrations: Integration[];
  onToggle: () => void;
  onConnect: (id: IntegrationId) => void;
}) {
  const integration = integrationById(integrations, row.integrationId);
  const blocked = status === "needs_attention";
  const disconnected = Boolean(blocked && integration && !integration.connected);

  return (
    <StatusToggle
      name={row.name}
      checked={status === "active"}
      disabled={blocked}
      disabledReason={
        disconnected
          ? (integration?.connectHint ?? `Connect ${integration?.name ?? "this app"} to enable this action`)
          : blocked
            ? `This operation isn’t available in ${integration?.name ?? "the connected app"} yet.`
            : undefined
      }
      disabledAction={
        disconnected && integration ? (
          <button
            type="button"
            className="cursor-pointer bg-transparent p-0 font-medium hover:underline"
            onClick={() => onConnect(integration.id)}
          >
            Connect {integration.name}
          </button>
        ) : undefined
      }
      onCheckedChange={onToggle}
    />
  );
}

function ActionsTable({
  rows,
  selection,
  integrations,
  onEdit,
  onDuplicate,
  onToggleStatus,
  onConnectIntegration,
  onDelete,
}: {
  rows: AgentAction[];
  selection: ActionSelection;
  integrations: Integration[];
  onEdit: (row: AgentAction) => void;
  onDuplicate: (row: AgentAction) => void;
  onToggleStatus: (row: AgentAction) => void;
  onConnectIntegration: (id: IntegrationId) => void;
  onDelete: (row: AgentAction) => void;
}) {
  return (
    <Table className="table-fixed">
      <TableHeader className="[&_tr]:border-b-0">
        <TableRow>
          <TableSelectHead
            allSelected={selection.allSelected}
            someSelected={selection.someSelected}
            onToggleAll={selection.onToggleAll}
            label="Select all actions"
          />
          <TableHead className="sticky top-0 z-10 w-[220px]">Action</TableHead>
          <TableHead className="sticky top-0 z-10 w-[160px]">Integration</TableHead>
          <TableHead className="sticky top-0 z-10 w-[150px]">Assigned to</TableHead>
          <TableHead className="sticky top-0 z-10 w-[140px]">Status</TableHead>
          <TableHead className="sticky top-0 z-10 w-[120px]">Last updated</TableHead>
          <TableHead className="sticky top-0 z-10 w-[148px] text-center"> </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => {
          const status = actionLibraryStatus(row, integrations);
          const people = actionAssignees(row);
          const isSelected = selection.selectedIds.includes(row.id);
          return (
            <TableRow
              key={row.id}
              state={isSelected ? "selected" : "default"}
              className="border-b-0"
            >
              <TableSelectCell
                checked={isSelected}
                onToggle={() => selection.onToggleRow(row.id)}
                label={`Select ${row.name}`}
              />
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
                <IntegrationName
                  id={row.integrationId}
                  name={
                    integrationById(integrations, row.integrationId)?.name ??
                    row.integrationId
                  }
                />
              </TableCell>
              <TableCell>
                {row.assignmentScope === "everyone" ? (
                  <span className="text-paragraph-md text-foreground">Everyone</span>
                ) : (
                  <AssignmentAvatarStack people={people} />
                )}
              </TableCell>
              <TableCell>
                <ActionStatusToggle
                  row={row}
                  status={status}
                  integrations={integrations}
                  onToggle={() => onToggleStatus(row)}
                  onConnect={onConnectIntegration}
                />
              </TableCell>
              <TableCell className="text-paragraph-md">{row.updated}</TableCell>
              <TableCell className="text-center">
                <ActionRowButtons
                  name={row.name}
                  onEdit={() => onEdit(row)}
                  onDuplicate={() => onDuplicate(row)}
                  onDelete={() => onDelete(row)}
                />
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
