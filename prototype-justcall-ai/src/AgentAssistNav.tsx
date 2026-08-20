import * as React from "react";
import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { cn } from "@/lib/utils";
import {
  IconAaActions,
  IconAaCoaching,
  IconAaKnowledge,
  IconAaResponseCards,
  IconAaScripts,
} from "./icons/AgentAssistNavIcons";

/**
 * Agent Assist section nav — the four things an admin authors here, each a
 * different way of helping during the same call: a Script says what to follow,
 * a Response Card says what to say, Behavioral Coaching says how to adjust, and
 * an In-call Action says what to do in a connected app.
 *
 * These were two levels deep before (Scripts / Response Cards / Live Coaching
 * were tabs under a "Conversation Guidance" parent). The parent named a category
 * rather than a destination, so it cost a click and taught nothing; the tabs are
 * now the nav.
 *
 * Knowledge Base is deliberately *not* one of them. It is a shared JustCall AI
 * capability — Voice Agent reads the same knowledge bases — so it lives in the
 * JustCall AI nav, and Agent Assist keeps only the one decision that is its own:
 * whether agents may receive knowledge answers on a live call. That switch is
 * the card pinned below the nav, separated from the primary items because it
 * configures a capability instead of navigating to a section.
 */

export type AgentAssistArea =
  | "scripts"
  | "response-cards"
  | "coaching"
  | "actions";

export interface AgentAssistNavItem {
  key: AgentAssistArea;
  label: string;
  icon: React.ReactNode;
}

export const AGENT_ASSIST_NAV_ITEMS: AgentAssistNavItem[] = [
  { key: "scripts", label: "Scripts", icon: <IconAaScripts /> },
  { key: "response-cards", label: "Response Cards", icon: <IconAaResponseCards /> },
  { key: "coaching", label: "Behavioral Coaching", icon: <IconAaCoaching /> },
  { key: "actions", label: "In-call Actions", icon: <IconAaActions /> },
];

export function AgentAssistNav({
  activeKey,
  onSelect,
  knowledgeSuggestionsEnabled,
  onEnableKnowledgeSuggestions,
  onLearnAboutKnowledgeSuggestions,
  onManageKnowledge,
  className,
}: {
  activeKey: AgentAssistArea;
  onSelect: (key: AgentAssistArea) => void;
  knowledgeSuggestionsEnabled: boolean;
  onEnableKnowledgeSuggestions: () => void;
  onLearnAboutKnowledgeSuggestions: () => void;
  onManageKnowledge: () => void;
  className?: string;
}) {
  return (
    <nav
      aria-label="Agent Assist"
      className={cn(
        "flex h-full w-[288px] shrink-0 flex-col gap-8 overflow-y-auto border-r border-line bg-white px-6 pb-6 pt-5",
        className
      )}
    >
      <ul className="flex w-full flex-col">
        {AGENT_ASSIST_NAV_ITEMS.map((item) => {
          const active = item.key === activeKey;
          return (
            <li key={item.key}>
              <button
                type="button"
                aria-current={active ? "page" : undefined}
                onClick={() => onSelect(item.key)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-[4px] px-4 py-2.5 text-left text-label-md transition-colors",
                  "outline-none focus-visible:ring-2 focus-visible:ring-brand/24",
                  active
                    ? "bg-brand-subtle text-brand"
                    : "text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                )}
              >
                <span className="flex size-4 shrink-0 items-center justify-center">
                  {item.icon}
                </span>
                <span className="truncate">{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      <KnowledgeSuggestionsCard
        enabled={knowledgeSuggestionsEnabled}
        onEnable={onEnableKnowledgeSuggestions}
        onLearnMore={onLearnAboutKnowledgeSuggestions}
        onManage={onManageKnowledge}
      />
    </nav>
  );
}

/**
 * The one Knowledge control Agent Assist owns: may agents receive knowledge
 * answers during a call. Enabling asks nothing else — no knowledge bases to
 * pick, no assignments to confirm, and no list of what is currently assigned.
 * All of that is the global Knowledge experience's job, so the enabled state
 * hands off there rather than restating it.
 *
 * Presented as a feature-promo card rather than the grey panel it used to be:
 * this is the one thing in the column an admin has to *decide*, and while it is
 * off there is nothing on screen telling them the capability exists. The
 * brand-tinted wash and the icon tile give it enough weight to read as an offer;
 * `mt-auto` and the absence of a nav-style row keep it from reading as a fifth
 * destination.
 */
function KnowledgeSuggestionsCard({
  enabled,
  onEnable,
  onLearnMore,
  onManage,
}: {
  enabled: boolean;
  onEnable: () => void;
  onLearnMore: () => void;
  onManage: () => void;
}) {
  return (
    <div
      className={cn(
        "mt-auto rounded-[10px] border p-6",
        "border-brand/15 bg-[linear-gradient(205deg,var(--color-brand-subtle)_0%,#f6f9fd_58%,#ffffff_100%)]"
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-[8px] bg-brand/10 ring-1 ring-inset ring-brand/10">
            <IconAaKnowledge className="size-4 shrink-0 text-brand" />
          </span>
          {enabled ? (
            <Badge variant="blue-grey" className="mt-0.5">
              Enabled
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-col gap-1">
          <h2 className="text-label-md-semi text-foreground">
            Knowledge Base suggestions
          </h2>
          <p className="text-pretty text-paragraph-sm text-muted-foreground">
            {enabled
              ? "Agents receive relevant answers from your Knowledge Base during calls."
              : "Surface relevant answers from your Knowledge Base during calls."}
          </p>
        </div>

        {enabled ? (
          <Button
            variant="grey-outline"
            size="xs"
            className="w-fit"
            onClick={onManage}
          >
            Manage Knowledge Base
          </Button>
        ) : (
          <div className="flex items-center gap-1">
            <Button size="xs" onClick={onEnable}>
              Enable
            </Button>
            {/* One line cannot show what an answer arriving mid-call looks
                like, so "Learn more" opens the picture of it rather than
                sending the admin off to the Knowledge Base page to guess. */}
            <Button
              variant="link"
              size="xs"
              className="px-2"
              onClick={onLearnMore}
            >
              Learn more
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

