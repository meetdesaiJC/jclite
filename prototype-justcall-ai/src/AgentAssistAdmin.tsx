import * as React from "react";
import { Button } from "@/components/Button";
import { IconChevronLeft, IconChevronRight } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { IconJcaiAgentAssist } from "./icons/JustCallAiNavIcons";
import { AgentAssistPlaybooksPage } from "./AgentAssistPage";
import { KnowledgePage } from "./KnowledgePage";
import { IntegrationsActionsPage } from "./IntegrationsActionsPage";
import { IconKnowledge } from "./LiveAgentAssistPanel";
import {
  SEED_KNOWLEDGE_SOURCES,
  liveKnowledgeSources,
  type KnowledgeSourceRecord,
} from "./knowledgeData";
import {
  SEED_INTEGRATIONS,
  enabledCapabilityCount,
  type Integration,
} from "./actionsData";
import { SEED_GUIDANCE, type GuidanceItem } from "./guidanceData";
import { SEED_COACHING_RULES, type CoachingRule } from "./coachingData";
import { SEED_SCRIPTS } from "./scriptPlaybook";

/**
 * Agent Assist admin — three things to set up, not five features to learn.
 *
 *   Knowledge   what AI may read
 *   Playbooks   how agents should handle conversations (scripts, guidance, coaching)
 *   Actions     what Agent Assist may do in connected systems
 *
 * Everything the runtime panel shows during a call traces back to one of
 * these three, and the libraries live here so the in-call demo reads the same
 * setup the admin just published.
 */

type AdminArea = "home" | "knowledge" | "playbooks" | "integrations";

function IconPlaybooks({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M4.167 3.333h7.5l3.333 3.333v10H4.167v-13.333ZM11.667 3.333v3.333h3.333M6.667 10h6.666M6.667 13.333h4.166"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconActions({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 20 20" fill="none" aria-hidden="true">
      <path
        d="M11.25 2.5 4.167 11.667h4.166L8.75 17.5l7.083-9.167h-4.166L11.25 2.5Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function AgentAssistAdmin() {
  const [area, setArea] = React.useState<AdminArea>("home");

  // One source of truth for the whole product: what the admin publishes here
  // is what a live call reads.
  const [knowledgeSources, setKnowledgeSources] = React.useState<
    KnowledgeSourceRecord[]
  >(SEED_KNOWLEDGE_SOURCES);
  const [integrations, setIntegrations] = React.useState<Integration[]>(
    SEED_INTEGRATIONS
  );
  const [guidanceItems, setGuidanceItems] =
    React.useState<GuidanceItem[]>(SEED_GUIDANCE);
  const [coachingRules, setCoachingRules] =
    React.useState<CoachingRule[]>(SEED_COACHING_RULES);

  if (area === "knowledge") {
    return (
      <KnowledgePage
        sources={knowledgeSources}
        onSourcesChange={setKnowledgeSources}
        onBack={() => setArea("home")}
      />
    );
  }

  if (area === "playbooks") {
    return (
      <AgentAssistPlaybooksPage
        guidanceItems={guidanceItems}
        onGuidanceItemsChange={setGuidanceItems}
        coachingRules={coachingRules}
        onCoachingRulesChange={setCoachingRules}
        knowledgeSources={knowledgeSources}
        integrations={integrations}
        onBack={() => setArea("home")}
      />
    );
  }

  if (area === "integrations") {
    return (
      <IntegrationsActionsPage
        integrations={integrations}
        onIntegrationsChange={setIntegrations}
        onBack={() => setArea("home")}
      />
    );
  }

  const liveKnowledge = liveKnowledgeSources(knowledgeSources);
  const knowledgeAnswers = liveKnowledge.reduce(
    (total, source) => total + source.entries.length,
    0
  );
  const livePlaybooks =
    SEED_SCRIPTS.filter((item) => item.status === "live").length +
    guidanceItems.filter((item) => item.status === "live").length +
    coachingRules.filter((rule) => rule.status === "live").length;
  const connectedActions = integrations
    .filter((integration) => integration.connected)
    .reduce((total, integration) => total + enabledCapabilityCount(integration), 0);

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-y-auto bg-white">
      <div className="mx-auto flex w-full max-w-[900px] flex-col gap-8 px-6 py-10">
        <header className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <IconJcaiAgentAssist className="size-5 shrink-0 text-brand" aria-hidden="true" />
            <h1 className="text-heading-xxl text-foreground">Agent Assist</h1>
          </div>
          <p className="max-w-[620px] text-pretty text-paragraph-md text-muted-foreground">
            Give AI the information it needs, define how agents should handle
            conversations, and decide what Agent Assist is allowed to do. Agents
            see all of it in one panel during the call.
          </p>
        </header>

        <div className="flex flex-col gap-3">
          <ConceptCard
            icon={<IconKnowledge className="size-5" />}
            title="Knowledge"
            description="Give AI the information it needs to answer customer questions. Routine questions get answered from your sources — no trigger to configure."
            meta={
              liveKnowledge.length === 0
                ? "No live sources yet"
                : `${liveKnowledge.length} live source${liveKnowledge.length === 1 ? "" : "s"} · ${knowledgeAnswers} answers`
            }
            cta="Manage knowledge"
            onOpen={() => setArea("knowledge")}
          />
          <ConceptCard
            icon={<IconPlaybooks />}
            title="Playbooks"
            description="Define scripts, situational guidance, and real-time coaching for the moments where you want control over how agents respond."
            meta={
              livePlaybooks === 0
                ? "Nothing published yet"
                : `${livePlaybooks} live across scripts, guidance, and coaching`
            }
            cta="Manage playbooks"
            onOpen={() => setArea("playbooks")}
          />
          <ConceptCard
            icon={<IconActions />}
            title="Integrations & actions"
            description="Control what Agent Assist can do in connected systems — update a property, add a note, create a task or ticket. Agents confirm before anything is written."
            meta={
              connectedActions === 0
                ? "No actions enabled yet"
                : `${connectedActions} action${connectedActions === 1 ? "" : "s"} enabled`
            }
            cta="Manage integrations"
            onOpen={() => setArea("integrations")}
          />
        </div>
      </div>
    </main>
  );
}

function ConceptCard({
  icon,
  title,
  description,
  meta,
  cta,
  onOpen,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  meta: string;
  cta: string;
  onOpen: () => void;
}) {
  return (
    <section className="flex items-start gap-4 rounded-lg border border-line bg-white p-5">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[8px] bg-brand-subtle text-brand">
        {icon}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <h2 className="text-label-lg-semi text-foreground">{title}</h2>
        <p className="text-pretty text-paragraph-md text-muted-foreground">
          {description}
        </p>
        <p className="text-label-sm text-muted-foreground tabular-nums">{meta}</p>
      </div>
      <Button
        size="sm"
        variant="grey-outline"
        className="mt-0.5 shrink-0"
        rightIcon={<IconChevronRight size={16} />}
        onClick={onOpen}
      >
        {cta}
      </Button>
    </section>
  );
}

/**
 * Shared chrome for every Agent Assist sub-page: one way back, one title, and
 * the page's own primary action on the right.
 */
export function AdminPageHeader({
  title,
  description,
  onBack,
  actions,
  className,
}: {
  title: string;
  description?: string;
  onBack: () => void;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "flex shrink-0 items-start justify-between gap-4 border-b border-line px-6 py-4",
        className
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        <button
          type="button"
          onClick={onBack}
          className="-ml-1 inline-flex h-6 w-fit cursor-pointer items-center gap-0.5 rounded-[4px] pr-1.5 pl-0.5 text-label-sm text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconChevronLeft size={16} className="size-4 shrink-0" />
          Agent Assist
        </button>
        <h1 className="truncate text-heading-lg text-foreground">{title}</h1>
        {description ? (
          <p className="max-w-[640px] text-pretty text-paragraph-sm text-muted-foreground">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div className="flex shrink-0 items-center gap-2 pt-6">{actions}</div>
      ) : null}
    </header>
  );
}
