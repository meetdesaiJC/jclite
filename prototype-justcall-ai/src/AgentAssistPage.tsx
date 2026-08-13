import * as React from "react";
import { Button } from "@/components/Button";
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
  IconPencil,
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
import {
  clonePlaybook,
  countSteps,
  playbookAssignees,
  playbookAssignmentLabel,
  type AssignmentPerson,
  type ScriptPlaybook,
} from "./scriptPlaybook";
import { KnowledgeCreateModal } from "./KnowledgeCreateModal";
import {
  KnowledgeBuilderPage,
  type KnowledgeLaunch,
} from "./KnowledgeBuilderPage";
import {
  cloneRepository,
  type KnowledgeCreateMethod,
  type KnowledgeRepository,
} from "./knowledgeRepository";

/**
 * Agent Assist admin — Scripts agents follow on calls, and the FAQ
 * repository that surfaces suggestions from live conversation.
 * Defaults to Figma empty states (Scripts 30:8261, FAQs 30:8574).
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
  { key: "faqs", label: "FAQs" },
];

function toScriptRow(playbook: ScriptPlaybook, status: PublishStatus = "live"): ScriptRow {
  return {
    id: playbook.id,
    name: playbook.name,
    team: playbookAssignmentLabel(playbook) || "Unassigned",
    steps: countSteps(playbook),
    status,
    updated: "Just now",
    playbook,
  };
}

function StatusToggle({
  name,
  checked,
  onCheckedChange,
}: {
  name: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <Toggle
      size="sm"
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={`${name} ${checked ? "live" : "draft"}`}
    />
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
          style={{ zIndex: visible.length - index }}
        >
          <TooltipTrigger
            placement="bottom"
            content={
              <Tooltip theme="dark" arrow="top-center" title={person.name} />
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

function repositoryAssignees(repo: KnowledgeRepository): AssignmentPerson[] {
  return repo.assignedTeams.map((team) => ({
    id: team,
    name: team,
    kind: "group" as const,
  }));
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

function ActionButtonGroup({
  entity,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  entity: "script" | "faq";
  onEdit?: () => void;
  onDuplicate?: () => void;
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
        content={<Tooltip theme="dark" arrow="top-center" title="Duplicate" />}
      >
        <button
          type="button"
          aria-label={`Duplicate ${entity}`}
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
          aria-label={`Delete ${entity}`}
          onClick={onDelete}
          className="flex size-9 items-center justify-center rounded-r-[4px] border border-line bg-white text-error hover:bg-error-subtle"
        >
          <IconTrash />
        </button>
      </TooltipTrigger>
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
  const [page, setPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(25);
  const [templatesOpen, setTemplatesOpen] = React.useState(false);
  const [knowledgeCreateOpen, setKnowledgeCreateOpen] = React.useState(false);
  const [builder, setBuilder] = React.useState<BuilderLaunch | null>(null);
  const [knowledgeBuilder, setKnowledgeBuilder] = React.useState<KnowledgeLaunch | null>(null);
  const [scripts, setScripts] = React.useState<ScriptRow[]>([]);
  const [repositories, setRepositories] = React.useState<KnowledgeRepository[]>([]);
  const isScripts = tab === "scripts";

  const query = search.trim().toLowerCase();
  const filteredScripts = scripts.filter(
    (row) =>
      !query ||
      row.name.toLowerCase().includes(query) ||
      row.team.toLowerCase().includes(query)
  );
  const filteredFaqs = repositories.filter(
    (row) =>
      !query ||
      row.name.toLowerCase().includes(query) ||
      row.assignedTeams.join(" ").toLowerCase().includes(query)
  );
  const filtered = isScripts ? filteredScripts : filteredFaqs;
  const isEmpty = filtered.length === 0 && !query;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visibleScripts = filteredScripts.slice(start, start + pageSize);
  const visibleFaqs = filteredFaqs.slice(start, start + pageSize);

  const openScriptTemplates = () => setTemplatesOpen(true);

  const handleTemplateSelect = (choice: ScriptStartChoice) => {
    setTemplatesOpen(false);
    if (choice.type === "scratch") {
      setBuilder({ type: choice.method === "manual" ? "blank" : "upload" });
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

  const upsertRepository = (repository: KnowledgeRepository) => {
    setRepositories((current) => {
      const index = current.findIndex((item) => item.id === repository.id);
      if (index === -1) return [repository, ...current];
      const next = [...current];
      next[index] = repository;
      return next;
    });
  };

  const openKnowledgeMethod = (method: KnowledgeCreateMethod) => {
    setKnowledgeCreateOpen(false);
    setKnowledgeBuilder({ type: method });
  };

  if (knowledgeBuilder) {
    return (
      <KnowledgeBuilderPage
        launch={knowledgeBuilder}
        onClose={() => setKnowledgeBuilder(null)}
        onPublish={(repository) => {
          upsertRepository(repository);
          setKnowledgeBuilder(null);
          setTab("faqs");
        }}
        onDelete={(id) =>
          setRepositories((current) => current.filter((item) => item.id !== id))
        }
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
            title="Give agents answers exactly when they need them"
            description="Add the questions and information your agents commonly need during customer conversations. Agent Assist will automatically surface relevant answers during calls."
            actionLabel="Add FAQ repository"
            onAction={() => setKnowledgeCreateOpen(true)}
          />
        )
      ) : (
        <>
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex h-9 items-center gap-3">
              <InputField
                placeholder={isScripts ? "Search scripts" : "Search repositories"}
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
              <Button variant="grey-outline" size="sm" leftIcon={<IconFilter size={16} />}>
                Filters
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <Button
                size="sm"
                onClick={isScripts ? openScriptTemplates : () => setKnowledgeCreateOpen(true)}
              >
                {isScripts ? "New script" : "New repository"}
              </Button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-6 pb-6">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
              <div className="min-h-0 flex-1 overflow-auto">
                {isScripts ? (
                  <ScriptsTable
                    rows={visibleScripts}
                    onEdit={(row) => setBuilder({ type: "edit", playbook: row.playbook })}
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
                  <RepositoriesTable
                    rows={visibleFaqs}
                    onEdit={(row) => setKnowledgeBuilder({ type: "edit", repository: row })}
                    onDuplicate={(row) => {
                      setRepositories((current) => [cloneRepository(row), ...current]);
                    }}
                    onDelete={(row) =>
                      setRepositories((current) => current.filter((item) => item.id !== row.id))
                    }
                    onStatusChange={(row, live) =>
                      setRepositories((current) =>
                        current.map((item) =>
                          item.id === row.id
                            ? { ...item, status: live ? "live" : "draft", updated: "Just now" }
                            : item
                        )
                      )
                    }
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
      <KnowledgeCreateModal
        open={knowledgeCreateOpen}
        onClose={() => setKnowledgeCreateOpen(false)}
        onSelect={openKnowledgeMethod}
      />
    </main>
  );
}

function ScriptsTable({
  rows,
  onEdit,
  onDuplicate,
  onDelete,
  onStatusChange,
}: {
  rows: ScriptRow[];
  onEdit: (row: ScriptRow) => void;
  onDuplicate: (row: ScriptRow) => void;
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
                onDuplicate={() => onDuplicate(row)}
                onDelete={() => onDelete(row)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function RepositoriesTable({
  rows,
  onEdit,
  onDuplicate,
  onDelete,
  onStatusChange,
}: {
  rows: KnowledgeRepository[];
  onEdit: (row: KnowledgeRepository) => void;
  onDuplicate: (row: KnowledgeRepository) => void;
  onDelete: (row: KnowledgeRepository) => void;
  onStatusChange: (row: KnowledgeRepository, live: boolean) => void;
}) {
  return (
    <Table className="table-fixed">
      <TableHeader className="[&_tr]:border-b-0">
        <TableRow>
          <TableHead className="sticky top-0 z-10 w-[280px]">Name</TableHead>
          <TableHead className="sticky top-0 z-10 w-[160px]">Assigned</TableHead>
          <TableHead className="sticky top-0 z-10 w-[100px]">FAQs</TableHead>
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
              <AssignmentAvatarStack people={repositoryAssignees(row)} />
            </TableCell>
            <TableCell className="text-paragraph-md">{row.faqs.length}</TableCell>
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
                entity="faq"
                onEdit={() => onEdit(row)}
                onDuplicate={() => onDuplicate(row)}
                onDelete={() => onDelete(row)}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
