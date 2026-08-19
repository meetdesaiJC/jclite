import * as React from "react";
import { IconChevronLeft } from "@/components/Icon";
import { Toggle } from "@/components/Toggle";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import { cn } from "@/lib/utils";
import { AgentAssistPlaybooksPage } from "./AgentAssistPage";
import { ActionsPage } from "./ActionsPage";
import { KnowledgePage } from "./KnowledgePage";
import { AgentAssistNav, type AgentAssistArea } from "./AgentAssistNav";
import {
  AgentAssistTakeoverContext,
  useAgentAssistTakeoverHost,
} from "./agentAssistTakeover";
import {
  SEED_KNOWLEDGE_SOURCES,
  type KnowledgeSourceRecord,
} from "./knowledgeData";
import { SEED_INTEGRATIONS, SEED_ACTIONS, type AgentAction, type Integration } from "./actionsData";
import { SEED_GUIDANCE, type GuidanceItem } from "./guidanceData";
import { SEED_COACHING_RULES, type CoachingRule } from "./coachingData";

/**
 * Agent Assist admin — three things to set up, in the order they matter
 * during a call: know, respond, act.
 *
 *   Knowledge              what AI may read
 *   Conversation Guidance  how agents should handle the conversation
 *                          (scripts, response cards, live coaching)
 *   In-call Actions        what agents can do in a connected app
 *
 * Actions were a fourth tab inside Conversation Guidance. They earn their own
 * destination: they surface on their own during a call, they are configured
 * against integrations rather than talk tracks, and Response Cards no longer
 * attach or configure them.
 *
 * Full-page editors are the one exception to the nav: they take over the whole
 * content area, nav included (see agentAssistTakeover).
 */

export function AgentAssistAdmin() {
  const [area, setArea] = React.useState<AgentAssistArea>("knowledge");
  const { active: takeover, register: registerTakeover } =
    useAgentAssistTakeoverHost();

  // One source of truth for the whole product: what the admin publishes here
  // is what a live call reads.
  const [knowledgeSources, setKnowledgeSources] = React.useState<
    KnowledgeSourceRecord[]
  >(SEED_KNOWLEDGE_SOURCES);
  const [integrations, setIntegrations] = React.useState<Integration[]>(
    SEED_INTEGRATIONS
  );
  const [actions, setActions] = React.useState<AgentAction[]>(SEED_ACTIONS);
  const [guidanceItems, setGuidanceItems] =
    React.useState<GuidanceItem[]>(SEED_GUIDANCE);
  const [coachingRules, setCoachingRules] =
    React.useState<CoachingRule[]>(SEED_COACHING_RULES);

  return (
    <AgentAssistTakeoverContext.Provider value={registerTakeover}>
      <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-white">
        {takeover ? null : <AgentAssistNav activeKey={area} onSelect={setArea} />}

        {area === "knowledge" ? (
          <KnowledgePage
            sources={knowledgeSources}
            onSourcesChange={setKnowledgeSources}
          />
        ) : area === "actions" ? (
          <ActionsPage
            actions={actions}
            onActionsChange={setActions}
            integrations={integrations}
            onIntegrationsChange={setIntegrations}
          />
        ) : (
          <AgentAssistPlaybooksPage
            guidanceItems={guidanceItems}
            onGuidanceItemsChange={setGuidanceItems}
            coachingRules={coachingRules}
            onCoachingRulesChange={setCoachingRules}
            knowledgeSources={knowledgeSources}
            onOpenKnowledge={() => setArea("knowledge")}
          />
        )}
      </div>
    </AgentAssistTakeoverContext.Provider>
  );
}

/**
 * Live/draft switch used by every Agent Assist list. Disabled rows explain why
 * in a tooltip rather than failing silently on click. When the block has a
 * recovery action (connect an app), that CTA lives in the tooltip.
 */
export function StatusToggle({
  name,
  checked,
  onCheckedChange,
  disabled,
  disabledReason,
  disabledAction,
}: {
  name: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  disabledReason?: string;
  disabledAction?: React.ReactNode;
}) {
  const toggle = (
    <Toggle
      size="sm"
      checked={checked}
      disabled={disabled}
      onCheckedChange={onCheckedChange}
      aria-label={
        disabled && disabledReason
          ? `${name} off. ${disabledReason}`
          : `${name} ${checked ? "live" : "draft"}`
      }
    />
  );
  if (!disabled || !disabledReason) return toggle;
  return (
    <TooltipTrigger
      interactive={Boolean(disabledAction)}
      placement="top"
      content={
        <Tooltip
          theme="dark"
          arrow="bottom-center"
          title={disabledReason}
          action={disabledAction}
        />
      }
    >
      <span className="inline-flex" tabIndex={0}>
        {toggle}
      </span>
    </TooltipTrigger>
  );
}

export function IconTrash({ size = 20 }: { size?: number }) {
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

/**
 * Shared chrome for every Agent Assist section: one title, an optional
 * description, and the page's own primary action on the right. Navigation
 * belongs to the side nav, so there is no back link unless a caller opts into
 * one (`onBack`) — sub-pages that take over the column still need a way out.
 *
 * Typography follows the account-settings section header in Figma
 * (JC — Account Settings Revamp, node 3312:107030): Headline xxl 20/28 semi
 * on text/primary, Paragraph 16/24 on text/secondary, 4px apart. A section
 * header carries no rule under it — the type hierarchy does that work — so
 * this header never draws a bottom border.
 */
export function AdminPageHeader({
  title,
  description,
  onBack,
  backLabel = "Agent Assist",
  actions,
  className,
}: {
  title: string;
  description?: string;
  /** Renders a back link above the title. Omit inside the side-nav layout. */
  onBack?: () => void;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-start justify-between gap-4 px-6 pb-4 pt-5",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="-ml-1 inline-flex h-6 w-fit cursor-pointer items-center gap-0.5 rounded-[4px] pr-1.5 pl-0.5 text-label-sm text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconChevronLeft size={16} className="size-4 shrink-0" />
            {backLabel}
          </button>
        ) : null}
        <h1 className="truncate text-heading-xxl text-foreground">{title}</h1>
        {description ? (
          <p className="max-w-[720px] text-pretty text-paragraph-lg text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div
          className={cn(
            "flex shrink-0 items-center gap-2",
            onBack ? "pt-6" : "pt-0"
          )}
        >
          {actions}
        </div>
      ) : null}
    </header>
  );
}
