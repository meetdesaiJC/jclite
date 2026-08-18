import { useEffect, useState } from "react";
import { type SidenavItem } from "@/components/Sidenav";
import { GlobalHeader } from "@/components/GlobalHeader";
import { ProfileMenu } from "../../prototype-add-ons-flow/src/ProfileMenu";
import { AgentAssistAdmin } from "./AgentAssistAdmin";
import { DialerPanel } from "./DialerPanel";
import {
  IconJcaiHome,
  IconJcaiAnalytics,
  IconJcaiTopics,
  IconJcaiIntegrations,
  IconJcaiAgentAssist,
  IconJcaiScorecards,
  IconJcaiSettings,
} from "./icons/JustCallAiNavIcons";

/**
 * JustCall AI content column — Agent Assist landing plus JC AI page chrome.
 * Sidenav lives in App so the logo stays fixed across the nav swap animation.
 */

export type JustCallAiPageKey =
  | "dashboard"
  | "analytics"
  | "topics"
  | "integrations"
  | "agent-assist"
  | "scorecards"
  | "settings";

export const JUSTCALL_AI_ITEMS: SidenavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: <IconJcaiHome /> },
  { key: "analytics", label: "Analytics", icon: <IconJcaiAnalytics /> },
  { key: "topics", label: "Topics", icon: <IconJcaiTopics /> },
  { key: "integrations", label: "Integrations", icon: <IconJcaiIntegrations /> },
  { key: "agent-assist", label: "Agent Assist", icon: <IconJcaiAgentAssist /> },
  { key: "scorecards", label: "Scorecards", icon: <IconJcaiScorecards /> },
  { key: "settings", label: "Settings", icon: <IconJcaiSettings /> },
];

export const JUSTCALL_AI_PAGE_TITLES: Record<JustCallAiPageKey, string> = {
  dashboard: "Dashboard",
  analytics: "Analytics",
  topics: "Topics",
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
  profileName?: string;
}

export function JustCallAiShell({
  activeKey = "agent-assist",
  profileName = "Sarah Johnson",
}: JustCallAiShellProps) {
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [dialerOpen, setDialerOpen] = useState(false);

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
        <AgentAssistAdmin />
      ) : (
        <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white" />
      )}
    </div>
  );
}
