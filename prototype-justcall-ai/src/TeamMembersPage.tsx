import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, initialsFromName } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { InputField } from "@/components/InputField";
import { Tabs } from "@/components/Tabs";
import { Tag } from "@/components/Tag";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TablePagination,
  TableRow,
} from "@/components/Table";
import {
  IconChartBar,
  IconCopy,
  IconDotsVertical,
  IconDownload,
  IconFilter,
  IconPencil,
  IconSearch,
} from "@/components/Icon";
import { TEAM_MEMBERS, type TeamMember } from "./teamMembersData";

/**
 * Teams › Team Members — the admin's list of everyone on the account. This is
 * the surface the license management flow builds on: today it mirrors the live
 * JustCall page as-is.
 */
type MembersTab = "all" | "pending";

const TABS = [
  { key: "all", label: "All Members" },
  { key: "pending", label: "Pending Requests" },
];

const ACTION_BUTTON =
  "flex size-9 items-center justify-center border border-line bg-white text-foreground hover:bg-secondary-bg focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24";

function RowAction({
  label,
  icon,
  position,
}: {
  label: string;
  icon: React.ReactNode;
  position: "first" | "middle" | "last";
}) {
  return (
    <TooltipTrigger
      placement="bottom"
      className={position !== "last" ? "-mr-px" : undefined}
      content={<Tooltip theme="dark" arrow="top-center" title={label} />}
    >
      <button
        type="button"
        aria-label={label}
        className={cn(
          ACTION_BUTTON,
          position === "first" && "rounded-l-[4px]",
          position === "last" && "rounded-r-[4px]"
        )}
      >
        {icon}
      </button>
    </TooltipTrigger>
  );
}

function MemberRowActions({ member }: { member: TeamMember }) {
  // An invited member has no activity yet, so the analytics shortcut gives
  // way to a menu (resend / revoke invite), as on the live page.
  const invited = member.state === "invited";
  return (
    <div
      className="inline-flex items-center"
      role="group"
      aria-label={`Actions for ${member.name}`}
    >
      <RowAction label="Duplicate" icon={<IconCopy size={20} />} position="first" />
      <RowAction label="Edit" icon={<IconPencil size={20} />} position="middle" />
      {invited ? (
        <RowAction label="More actions" icon={<IconDotsVertical size={20} />} position="last" />
      ) : (
        <RowAction label="View analytics" icon={<IconChartBar size={20} />} position="last" />
      )}
    </div>
  );
}

function MemberNameCell({ member }: { member: TeamMember }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar
        size="lg"
        color="indigo"
        initials={initialsFromName(member.name)}
        status={member.status}
      />
      <div className="flex min-w-0 flex-col">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate text-label-md text-foreground">{member.name}</span>
          {member.state === "invited" ? (
            <Tag size="sm" color="indigo">
              Invited
            </Tag>
          ) : null}
          {member.state === "locked" ? (
            <Tag size="sm" color="grey">
              Locked
            </Tag>
          ) : null}
        </div>
        <span className="truncate text-paragraph-sm text-muted-foreground">
          {member.email}
        </span>
      </div>
    </div>
  );
}

export function TeamMembersPage({ onAddMember }: { onAddMember?: () => void }) {
  const [tab, setTab] = useState<MembersTab>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = useMemo(() => {
    const members =
      tab === "pending" ? TEAM_MEMBERS.filter((m) => m.state === "invited") : TEAM_MEMBERS;
    const q = search.trim().toLowerCase();
    if (!q) return members;
    return members.filter(
      (m) => m.name.toLowerCase().includes(q) || m.email.toLowerCase().includes(q)
    );
  }, [tab, search]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visible = filtered.slice(start, start + pageSize);

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <div className="border-b border-line px-6">
        <Tabs
          items={TABS}
          value={tab}
          onValueChange={(key) => {
            setTab(key as MembersTab);
            setPage(1);
          }}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-6">
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="flex h-9 items-center gap-3">
            <InputField
              placeholder="Search members"
              leadingIcon={<IconSearch size={16} />}
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                setPage(1);
              }}
              clearable={false}
              wrapperClassName="w-[266px]"
            />
            <span className="h-full w-px shrink-0 bg-line" aria-hidden="true" />
            <Button variant="grey-outline" size="sm" leftIcon={<IconFilter size={16} />}>
              Filters
            </Button>
          </div>
          <div className="flex items-center gap-3">
            <TooltipTrigger
              placement="bottom"
              content={<Tooltip theme="dark" arrow="top-center" title="Export members" />}
            >
              <button
                type="button"
                aria-label="Export members"
                className="flex size-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
              >
                <IconDownload size={20} />
              </button>
            </TooltipTrigger>
            <Button size="md" onClick={onAddMember}>Add Member</Button>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <div className="min-h-0 flex-1 overflow-auto">
            <Table className="table-fixed">
              <TableHeader className="[&_tr]:border-b-0">
                <TableRow>
                  <TableHead className="sticky top-0 z-10">Name</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[24%]">Role</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[19%]">Time Zone</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[12%]">Extension</TableHead>
                  <TableHead className="sticky top-0 z-10 w-[150px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody className="[&_tr]:border-b-0">
                {visible.length === 0 ? (
                  <TableRow className="hover:bg-transparent">
                    <TableCell colSpan={5} className="text-paragraph-md text-muted-foreground">
                      {tab === "pending" ? "No pending requests" : "No matching members"}
                    </TableCell>
                  </TableRow>
                ) : (
                  visible.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="py-4">
                        <MemberNameCell member={member} />
                      </TableCell>
                      <TableCell className="text-paragraph-md text-foreground">
                        {member.role}
                      </TableCell>
                      <TableCell className="text-paragraph-md text-foreground">
                        {member.timeZone}
                      </TableCell>
                      <TableCell>
                        <Tag size="md" color="orange">
                          {member.extension}
                        </Tag>
                      </TableCell>
                      <TableCell>
                        <MemberRowActions member={member} />
                      </TableCell>
                    </TableRow>
                  ))
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
      </div>
    </main>
  );
}
