import * as React from "react";
import { Button } from "@/components/Button";
import { Tabs, type TabItem } from "@/components/Tabs";
import { InputField } from "@/components/InputField";
import { Tag } from "@/components/Tag";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  IconSearch,
  IconFilter,
  IconCopy,
  IconPencil,
  IconChartBar,
} from "@/components/Icon";
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
  type ScriptTemplateId,
} from "./ScriptTemplatesModal";
import { CreateScriptPage } from "./CreateScriptPage";

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
}

interface FaqRow {
  id: string;
  question: string;
  team: string;
  topics: number;
  status: PublishStatus;
  updated: string;
}

const TABS: TabItem[] = [
  { key: "scripts", label: "Scripts" },
  { key: "faqs", label: "FAQs" },
];

/** Empty by default — populated lists are kept for the filled-table path. */
const SCRIPTS: ScriptRow[] = [];
const FAQS: FaqRow[] = [];

function StatusTag({ status }: { status: PublishStatus }) {
  if (status === "live") {
    return (
      <Tag color="green" size="md">
        Live
      </Tag>
    );
  }
  return (
    <Tag color="grey" size="md">
      Draft
    </Tag>
  );
}

function ActionButtonGroup({ entity }: { entity: "script" | "faq" }) {
  return (
    <div className="inline-flex items-center">
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" title="Duplicate" />}
      >
        <button
          type="button"
          aria-label={`Duplicate ${entity}`}
          className="-mr-px flex size-9 items-center justify-center rounded-l-[4px] border border-line bg-white text-foreground hover:bg-secondary-bg"
        >
          <IconCopy size={20} />
        </button>
      </TooltipTrigger>
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" title="Edit" />}
      >
        <button
          type="button"
          aria-label={`Edit ${entity}`}
          className="-mr-px flex size-9 items-center justify-center border border-line bg-white text-foreground hover:bg-secondary-bg"
        >
          <IconPencil size={20} />
        </button>
      </TooltipTrigger>
      <TooltipTrigger
        placement="bottom"
        content={<Tooltip theme="dark" arrow="top-center" title="View analytics" />}
      >
        <button
          type="button"
          aria-label={`View ${entity} analytics`}
          className="flex size-9 items-center justify-center rounded-r-[4px] border border-line bg-white text-foreground hover:bg-secondary-bg"
        >
          <IconChartBar size={20} />
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
  const [creatingScript, setCreatingScript] = React.useState(false);
  const isScripts = tab === "scripts";

  const query = search.trim().toLowerCase();
  const filteredScripts = SCRIPTS.filter(
    (row) =>
      !query ||
      row.name.toLowerCase().includes(query) ||
      row.team.toLowerCase().includes(query)
  );
  const filteredFaqs = FAQS.filter(
    (row) =>
      !query ||
      row.question.toLowerCase().includes(query) ||
      row.team.toLowerCase().includes(query)
  );
  const filtered = isScripts ? filteredScripts : filteredFaqs;
  const isEmpty = filtered.length === 0 && !query;

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const start = (currentPage - 1) * pageSize;
  const visibleScripts = filteredScripts.slice(start, start + pageSize);
  const visibleFaqs = filteredFaqs.slice(start, start + pageSize);

  const openScriptTemplates = () => setTemplatesOpen(true);

  const handleTemplateSelect = (templateId: ScriptTemplateId) => {
    setTemplatesOpen(false);
    if (templateId === "scratch") {
      setCreatingScript(true);
      return;
    }
    // Prototype: template selection closes the modal; editor flow comes next.
  };

  if (creatingScript) {
    return (
      <CreateScriptPage
        onClose={() => setCreatingScript(false)}
        onCreate={() => setCreatingScript(false)}
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
            description="Create scripts to guide agents through key talking points during live calls."
            actionLabel="Create script"
            onAction={openScriptTemplates}
          />
        ) : (
          <AgentAssistEmptyState
            illustrationSrc={faqsEmptyIllustration}
            illustrationAlt=""
            title="No FAQ repositories yet"
            description="Add FAQs to surface relevant answers to agents during live calls."
            actionLabel="Create FAQ repository"
          />
        )
      ) : (
        <>
          <div className="flex items-center justify-between px-6 py-3">
            <div className="flex h-9 items-center gap-3">
              <InputField
                placeholder={isScripts ? "Search scripts" : "Search FAQs"}
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
                onClick={isScripts ? openScriptTemplates : undefined}
              >
                {isScripts ? "New script" : "New FAQ"}
              </Button>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col px-6 pb-6">
            <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white">
              <div className="min-h-0 flex-1 overflow-auto">
                {isScripts ? (
                  <ScriptsTable rows={visibleScripts} />
                ) : (
                  <FaqsTable rows={visibleFaqs} />
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
    </main>
  );
}

function ScriptsTable({ rows }: { rows: ScriptRow[] }) {
  return (
    <Table className="table-fixed">
      <TableHeader className="[&_tr]:border-b-0">
        <TableRow>
          <TableHead className="sticky top-0 z-10 w-[360px]">Name</TableHead>
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
              <TableCellText primary={row.name} supporting={row.team} />
            </TableCell>
            <TableCell className="text-paragraph-md">{row.steps}</TableCell>
            <TableCell>
              <StatusTag status={row.status} />
            </TableCell>
            <TableCell className="text-paragraph-md">{row.updated}</TableCell>
            <TableCell className="text-center">
              <ActionButtonGroup entity="script" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function FaqsTable({ rows }: { rows: FaqRow[] }) {
  return (
    <Table className="table-fixed">
      <TableHeader className="[&_tr]:border-b-0">
        <TableRow>
          <TableHead className="sticky top-0 z-10 w-[360px]">Question</TableHead>
          <TableHead className="sticky top-0 z-10 w-[100px]">Topics</TableHead>
          <TableHead className="sticky top-0 z-10 w-[120px]">Status</TableHead>
          <TableHead className="sticky top-0 z-10 w-[120px]">Updated</TableHead>
          <TableHead className="sticky top-0 z-10 w-[148px] text-center">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id} className="border-b-0">
            <TableCell>
              <TableCellText primary={row.question} supporting={row.team} />
            </TableCell>
            <TableCell className="text-paragraph-md">{row.topics}</TableCell>
            <TableCell>
              <StatusTag status={row.status} />
            </TableCell>
            <TableCell className="text-paragraph-md">{row.updated}</TableCell>
            <TableCell className="text-center">
              <ActionButtonGroup entity="faq" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
