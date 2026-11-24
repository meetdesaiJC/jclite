import { useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarGroup, avatarColorFromId, initialsFromName } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { InputField } from "@/components/InputField";
import { Menu, type MenuItem } from "@/components/Menu";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import { LockedControl, NO_ACTIONS_LOCK, type Lock } from "@/components/LockedControl";
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
import {
  IconCopyPlus,
  IconDotsVertical,
  IconPencil,
  IconSearch,
  IconSelectAll,
  IconTrash,
  IconUserPlus,
} from "@/components/Icon";
import { CsmEmail } from "./CsmEmail";
import { LockedCheckbox } from "./LockedCheckbox";
import { ROLES, ROLE_AUTHOR, type Role } from "./rolesData";

/**
 * Teams › Roles & Permissions — the live page, with the two roles the
 * non-calling licenses carry. JC Lite and View-only sit with the built-ins:
 * their permissions are the license's, so there is nothing for an admin to
 * edit, and a member gets them by being invited on that license rather than
 * by being assigned here.
 */

/** Actions the signed-in license can't take here; omit for full access. */
export interface RolesLocks {
  create?: Lock;
  assign?: Lock;
  edit?: Lock;
  duplicate?: Lock;
  delete?: Lock;
}

const ACTION_BUTTON =
  "flex size-10 items-center justify-center bg-white text-foreground transition-colors hover:bg-secondary-bg focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/24 " +
  "aria-disabled:cursor-not-allowed aria-disabled:text-disabled-fg aria-disabled:hover:bg-white " +
  "data-[locked=true]:text-disabled-fg data-[locked=true]:hover:bg-white";

const CELL = "h-[72px] py-0";

/**
 * Why a built-in row's verb is off. Not a license lock — the admin has full
 * access — so it reads as a fact about the role, in a plain tooltip.
 */
function builtInReason(role: Role, verb: "assign" | "edit" | "delete"): ReactNode {
  if (!role.builtIn) return undefined;
  // One line for every built-in role's pencil, license roles included.
  if (verb === "edit") return "You can’t edit this role";
  if (role.license) {
    // Seats on a license role are sold, not assigned — the CSM is the way in.
    if (verb === "assign") {
      return (
        <>
          {/* Two fixed lines: the ask, then who to ask — so the address
              never wraps onto a line of its own. */}
          To assign more members to this role,
          <br />
          <span className="whitespace-nowrap">
            contact your CSM at <CsmEmail tone="dark" />.
          </span>
        </>
      );
    }
    return "License roles can’t be deleted";
  }
  if (verb === "assign") return undefined;
  return "Built-in roles can’t be deleted";
}

function RoleAction({
  label,
  icon,
  divider,
  disabledReason,
  silent,
  lock,
}: {
  label: string;
  icon: ReactNode;
  divider?: boolean;
  disabledReason?: ReactNode;
  /** Disabled with no tooltip at all — the Account Owner row. */
  silent?: boolean;
  lock?: Lock;
}) {
  const button = (
    <button
      type="button"
      aria-label={label}
      // aria-disabled, not disabled: a disabled button takes no pointer
      // events, and the tooltip saying why is the whole point.
      aria-disabled={disabledReason || silent ? true : undefined}
      className={cn(ACTION_BUTTON, divider && "border-l border-line")}
    >
      {icon}
    </button>
  );
  if (silent) return button;
  if (lock && !disabledReason) {
    return (
      <LockedControl reason={lock.reason} hint={lock.hint} triggerClassName="flex">
        {button}
      </LockedControl>
    );
  }
  return (
    <TooltipTrigger
      placement="bottom"
      className="flex"
      // Only a reason built as markup carries a link (the CSM address), so
      // only that bubble lets the pointer in. A plain-text bubble that stayed
      // open would sit over the next row's buttons.
      interactive={disabledReason != null && typeof disabledReason !== "string"}
      content={<Tooltip theme="dark" arrow="top-center" className="max-w-[400px]" title={disabledReason ?? label} />}
    >
      {button}
    </TooltipTrigger>
  );
}

function RoleRowActions({ role, locks }: { role: Role; locks?: RolesLocks }) {
  // The owner row's muted actions explain themselves well enough; a tooltip
  // on the very first row of the table read as noise.
  const silent = role.id === "owner";
  const deleteReason = builtInReason(role, "delete");
  const menuItems: MenuItem[] = [
    { key: "duplicate", label: "Duplicate", icon: <IconCopyPlus size={16} />, locked: locks?.duplicate },
    {
      key: "delete",
      label: "Delete",
      icon: <IconTrash size={16} />,
      destructive: true,
      separatorBefore: true,
      // A built-in role's Delete stays in the list, muted, saying why —
      // the same rule a license lock follows, with the role's own reason.
      locked: deleteReason ? { reason: deleteReason, hint: "Duplicate it to start a custom role." } : locks?.delete,
    },
  ];

  return (
    <div
      role="group"
      aria-label={`Actions for ${role.name}`}
      className="inline-flex overflow-hidden rounded-[4px] border border-line"
    >
      <RoleAction
        label="Assign members"
        icon={<IconUserPlus size={20} />}
        disabledReason={builtInReason(role, "assign")}
        silent={silent}
        lock={locks?.assign}
      />
      <RoleAction
        label="Edit role"
        icon={<IconPencil size={20} />}
        divider
        disabledReason={builtInReason(role, "edit")}
        silent={silent}
        lock={locks?.edit}
      />
      {/* Every owner action is off — the ⋮ too, so it opens nothing. */}
      {silent ? (
        <RoleAction label="More actions" icon={<IconDotsVertical size={20} />} divider silent />
      ) : role.license ? (
        // A license role's permissions are the license, so there is nothing
        // to duplicate from it, and it can't be deleted — the ⋮ has no verbs.
        <RoleAction
          label="More actions"
          icon={<IconDotsVertical size={20} />}
          divider
          disabledReason={NO_ACTIONS_LOCK.reason}
        />
      ) : (
        <Menu
          label={`More actions for ${role.name}`}
          items={menuItems}
          trigger={
            <button type="button" aria-label="More actions" className={cn(ACTION_BUTTON, "border-l border-line")}>
              <IconDotsVertical size={20} />
            </button>
          }
        />
      )}
    </div>
  );
}

function MembersCell({ members }: { members: string[] }) {
  if (members.length === 0) return <span className="text-paragraph-md text-foreground">-</span>;
  return (
    <AvatarGroup size="lg" max={3}>
      {members.map((name, i) => (
        <Avatar key={`${name}-${i}`} color={avatarColorFromId(name)} initials={initialsFromName(name)} />
      ))}
    </AvatarGroup>
  );
}

export function RolesPage({ locks }: { locks?: RolesLocks }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return q ? ROLES.filter((r) => r.name.toLowerCase().includes(q)) : ROLES;
  }, [search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  // Delete is the one bulk verb, and built-in roles can't be deleted, so
  // only custom roles are selectable.
  const selectable = visible.filter((r) => !r.builtIn);
  const allSelected = selectable.length > 0 && selectable.every((r) => selected.has(r.id));
  const someSelected = selectable.some((r) => selected.has(r.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      selectable.forEach((r) => (allSelected ? next.delete(r.id) : next.add(r.id)));
      return next;
    });

  return (
    <main className="relative flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="flex items-center justify-between gap-4 px-6 py-4">
        <InputField
          placeholder="Search Roles"
          leadingIcon={<IconSearch size={16} />}
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
            // A selection the search hides would still count in the bulk
            // bar, and Delete would act on rows no longer shown.
            setSelected(new Set());
          }}
          clearable={false}
          wrapperClassName="w-[300px]"
        />
        <LockedControl locked={Boolean(locks?.create)} reason={locks?.create?.reason} hint={locks?.create?.hint}>
          <Button size="md">Create Role</Button>
        </LockedControl>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-6">
        <Table className="table-fixed">
          <colgroup>
            <col className="w-12" />
            <col className="w-[22%]" />
            <col className="w-[17%]" />
            <col className="w-[21%]" />
            <col className="w-[20%]" />
            <col className="w-[150px]" />
          </colgroup>
          <TableHeader className="[&_tr]:border-0">
            <TableRow className="hover:bg-transparent">
              <TableHead className="sticky top-0 z-10 h-12">
                <span className="flex">
                  <LockedCheckbox
                    lock={locks?.delete}
                    size="sm"
                    aria-label="Select all roles"
                    checked={allSelected}
                    indeterminate={someSelected && !allSelected}
                    disabled={selectable.length === 0}
                    onChange={toggleAll}
                  />
                </span>
              </TableHead>
              {["Roles", "Members", "Last updated", "Created by", "Actions"].map((label) => (
                <TableHead key={label} className="sticky top-0 z-10 h-12 text-label-sm">
                  {label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={6} className="text-paragraph-md text-muted-foreground">
                  No matching roles
                </TableCell>
              </TableRow>
            ) : (
              visible.map((role) => (
                <TableRow
                  key={role.id}
                  state={selected.has(role.id) ? "selected" : "default"}
                  className="border-0"
                >
                  <TableCell className={CELL}>
                    {role.builtIn && role.id !== "owner" ? (
                      // A disabled input takes no pointer events, so the span
                      // carries the hover. Owner stays silent, like its actions.
                      <TooltipTrigger
                        placement="bottom"
                        content={<Tooltip theme="dark" arrow="none" title="This role cannot be modified" />}
                      >
                        <span className="flex" tabIndex={0} aria-label={`${role.name} cannot be modified`}>
                          <LockedCheckbox size="sm" aria-label={`Select ${role.name}`} disabled tabIndex={-1} />
                        </span>
                      </TooltipTrigger>
                    ) : (
                      <span className="flex">
                        <LockedCheckbox
                          lock={role.builtIn ? undefined : locks?.delete}
                          size="sm"
                          aria-label={`Select ${role.name}`}
                          disabled={role.builtIn}
                          checked={selected.has(role.id)}
                          onChange={() => toggle(role.id)}
                        />
                      </span>
                    )}
                  </TableCell>
                  <TableCell className={CELL}>
                    <span title={role.name} className="block truncate text-label-md text-foreground">
                      {role.name}
                    </span>
                  </TableCell>
                  <TableCell className={CELL}>
                    <MembersCell members={role.members} />
                  </TableCell>
                  <TableCell className={cn(CELL, "text-paragraph-md text-foreground")}>
                    <span className="block truncate">
                      {role.updated} by {ROLE_AUTHOR}
                    </span>
                  </TableCell>
                  <TableCell className={cn(CELL, "text-paragraph-md text-foreground")}>
                    <span className="flex min-w-0 items-center gap-2">
                      <Avatar size="lg" color="indigo" initials={initialsFromName(ROLE_AUTHOR)} />
                      <span className="truncate">{ROLE_AUTHOR}</span>
                    </span>
                  </TableCell>
                  <TableCell className={CELL}>
                    <RoleRowActions role={role} locks={locks} />
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="mx-6 shrink-0 border-t border-line">
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

      <TableBulkBar
        count={selected.size}
        label={selected.size === 1 ? "Item Selected" : "Items Selected"}
        actions={
          <>
            {allSelected ? null : (
              <Button
                variant="grey-outline"
                size="sm"
                className="bg-white"
                leftIcon={<IconSelectAll size={16} />}
                onClick={() => setSelected((prev) => new Set([...prev, ...selectable.map((r) => r.id)]))}
              >
                Select All
              </Button>
            )}
            <Button
              variant="error"
              size="sm"
              leftIcon={<IconTrash size={16} />}
              onClick={() => setSelected(new Set())}
            >
              Delete
            </Button>
          </>
        }
      />
    </main>
  );
}
