import * as React from "react";
import { cn } from "@/lib/utils";
import {
  IconAaActions,
  IconAaKnowledge,
  IconAaPlaybooks,
} from "./icons/AgentAssistNavIcons";

/**
 * Agent Assist section nav, read top to bottom as one story: what AI may
 * know, how agents should respond, and what they can do about it.
 * Scripts, Response Cards, and Live Coaching stay as tabs inside Conversation
 * Guidance — they are all ways of saying something during the call.
 */

export type AgentAssistArea = "knowledge" | "playbooks" | "actions";

export interface AgentAssistNavItem {
  key: AgentAssistArea;
  label: string;
  icon: React.ReactNode;
}

export const AGENT_ASSIST_NAV_ITEMS: AgentAssistNavItem[] = [
  { key: "knowledge", label: "Knowledge", icon: <IconAaKnowledge /> },
  { key: "playbooks", label: "Conversation Guidance", icon: <IconAaPlaybooks /> },
  { key: "actions", label: "In-call Actions", icon: <IconAaActions /> },
];

export function AgentAssistNav({
  activeKey,
  onSelect,
  className,
}: {
  activeKey: AgentAssistArea;
  onSelect: (key: AgentAssistArea) => void;
  className?: string;
}) {
  return (
    <nav
      aria-label="Agent Assist"
      className={cn(
        "flex h-full w-[288px] shrink-0 flex-col gap-8 overflow-y-auto border-r border-line bg-white px-8 pb-8 pt-5",
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
    </nav>
  );
}
