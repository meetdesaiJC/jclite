import { useEffect, useState } from "react";
import { type SidenavItem } from "@/components/Sidenav";
import { type AgentAssistScope } from "./agentAssistScope";
import { GlobalHeader } from "@/components/GlobalHeader";
import { ProfileMenu } from "@/components/ProfileMenu";
import { AgentAssistAdmin } from "./AgentAssistAdmin";
import { DialerPanel } from "./DialerPanel";
import { KnowledgePage } from "./KnowledgePage";
import { IntegrationsPage } from "./IntegrationsPage";
import {
  SEED_CONNECTED_SOURCES,
  SEED_KNOWLEDGE_SOURCES,
  type KnowledgeIntegrationRef,
  type KnowledgeSourceRecord,
} from "./knowledgeData";
import {
  IconJcaiHome,
  IconJcaiAnalytics,
  IconJcaiTopics,
  IconJcaiIntegrations,
  IconJcaiAgentAssist,
  IconJcaiKnowledge,
  IconJcaiScorecards,
  IconJcaiSettings,
} from "./icons/JustCallAiNavIcons";

/**
 * JustCall AI content column — Agent Assist landing plus JC AI page chrome.
 * Sidenav lives in App so the logo stays fixed across the nav swap animation.
 *
 * Knowledge Base is a JustCall AI page rather than an Agent Assist one because
 * more than one product reads it: Voice Agent and Agent Assist answer from the
 * same knowledge bases. Its state lives here, one level above both consumers,
 * so there is a single source of truth for what knowledge exists and who has
 * access to it. Connected apps live beside it on Integrations — they can feed
 * knowledge, but they are not a setup step inside each knowledge base.
 */

export type JustCallAiPageKey =
  | "dashboard"
  | "analytics"
  | "topics"
  | "integrations"
  | "agent-assist"
  | "knowledge"
  | "scorecards"
  | "settings";

export const JUSTCALL_AI_ITEMS: SidenavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: <IconJcaiHome /> },
  { key: "analytics", label: "Analytics", icon: <IconJcaiAnalytics /> },
  { key: "topics", label: "Topics", icon: <IconJcaiTopics /> },
  // Shared corpus — grouped with Topics, not nested under Agent Assist.
  { key: "knowledge", label: "Knowledge Base", icon: <IconJcaiKnowledge /> },
  { key: "agent-assist", label: "Agent Assist", icon: <IconJcaiAgentAssist /> },
  { key: "scorecards", label: "Scorecards", icon: <IconJcaiScorecards /> },
  { key: "integrations", label: "Integrations", icon: <IconJcaiIntegrations /> },
  { key: "settings", label: "Settings", icon: <IconJcaiSettings /> },
];

export const JUSTCALL_AI_PAGE_TITLES: Record<JustCallAiPageKey, string> = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  topics: "Topics",
  knowledge: "Knowledge Base",
  integrations: "Integrations",
  "agent-assist": "Agent Assist",
  scorecards: "Scorecards",
  settings: "Settings",
};

export function isJustCallAiPageKey(key: string): key is JustCallAiPageKey {
  return key in JUSTCALL_AI_PAGE_TITLES;
}

export interface JustCallAiShellProps {
  /** Which JC AI page is active. Defaults to Agent Assist. */
  activeKey?: JustCallAiPageKey;
  /** Lets a page hand off to another one — Agent Assist → Knowledge. */
  onNavigate?: (key: JustCallAiPageKey) => void;
  /**
   * Whether the account already has content in it. Off is the day-one
   * account: no knowledge bases, no connected apps, and nothing authored in
   * Agent Assist, so every page opens on its empty state.
   */
  seeded?: boolean;
  /** V1 hides Behavioral Coaching and In-call Actions — see `agentAssistScope`. */
  scope?: AgentAssistScope;
  profileName?: string;
}

export function JustCallAiShell({
  activeKey = "agent-assist",
  onNavigate,
  seeded = true,
  scope = "v2",
  profileName = "Sarah Johnson",
}: JustCallAiShellProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [dialerOpen, setDialerOpen] = useState(false);
  const [knowledgeSources, setKnowledgeSources] = useState<
    KnowledgeSourceRecord[]
  >(seeded ? SEED_KNOWLEDGE_SOURCES : []);
  const [connectedSources, setConnectedSources] = useState<
    KnowledgeIntegrationRef[]
  >(seeded ? SEED_CONNECTED_SOURCES : []);
  useEffect(() => {
    setDialerOpen(false);
  }, [activeKey]);

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
      {profileMenuOpen && (
        <div
          className="fixed inset-x-0 top-[60px] bottom-0 z-40"
          onClick={() => setProfileMenuOpen(false)}
        />
      )}
      <GlobalHeader
        title={dialerOpen ? "Dialer" : JUSTCALL_AI_PAGE_TITLES[activeKey]}
        dialerOpen={dialerOpen}
        onDialerClick={() => {
          setProfileMenuOpen(false);
          setDialerOpen((open) => !open);
        }}
        profileMenuOpen={profileMenuOpen}
        onProfileClick={() => {
          setDialerOpen(false);
          setProfileMenuOpen((open) => !open);
        }}
        profileMenuPanel={<ProfileMenu userName={profileName} />}
      />

      {dialerOpen ? (
        <DialerPanel onClose={() => setDialerOpen(false)} />
      ) : activeKey === "agent-assist" ? (
        <AgentAssistAdmin
          seeded={seeded}
          scope={scope}
          knowledgeSources={knowledgeSources}
          onOpenKnowledge={() => onNavigate?.("knowledge")}
        />
      ) : activeKey === "knowledge" ? (
        <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-white">
          <KnowledgePage
            sources={knowledgeSources}
            onSourcesChange={setKnowledgeSources}
          />
        </div>
      ) : activeKey === "integrations" ? (
        <div className="flex h-full min-h-0 flex-1 overflow-hidden bg-white">
          <IntegrationsPage
            connections={connectedSources}
            onConnectionsChange={setConnectedSources}
          />
        </div>
      ) : (
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white" />
      )}
    </div>
  );
}
