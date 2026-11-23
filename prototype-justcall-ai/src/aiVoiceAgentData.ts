/**
 * Fixtures for the AI Voice Agent pages, following the production
 * screenshots the user shared (Agents list, Knowledge Base list).
 */

/** The capabilities an agent is set up with, shown as small icon chips. */
export type AgentCapability = "transfer" | "knowledge" | "handoff" | "sms" | "notes";

export type VoiceAgent = {
  id: string;
  name: string;
  handle: string;
  /** Setup isn't finished — production flags it with a warning triangle. */
  incomplete?: boolean;
  capabilities: AgentCapability[];
  /** Agents with a handoff set up draw their chips in the warm tone. */
  warm?: boolean;
  moreCapabilities?: number;
  number?: { value: string; country: "us" | "uk" };
  active: boolean;
};

export const VOICE_AGENTS: VoiceAgent[] = [
  { id: "a1", name: "New Voice Agentdsc", handle: "#agent_b5f952c32...", capabilities: ["transfer", "knowledge"], number: { value: "(812) 994-4916", country: "us" }, active: true },
  { id: "a2", name: "vs", handle: "#agent_91d3c9d2a...", incomplete: true, capabilities: ["handoff", "knowledge"], active: false },
  { id: "a3", name: "New Voice Agentjk", handle: "#agent_6dc229c6...", incomplete: true, capabilities: ["knowledge"], active: false },
  { id: "a4", name: "nmm", handle: "#agent_71f02da28...", incomplete: true, capabilities: ["knowledge"], active: false },
  { id: "a5", name: "Mehul Jatiya", handle: "#agent_d1edcbd71...", capabilities: ["handoff", "sms", "notes"], warm: true, moreCapabilities: 1, number: { value: "+441564334735", country: "uk" }, active: false },
  { id: "a6", name: "New Voice Agent 1", handle: "#agent_f62ed2cb2...", capabilities: ["knowledge"], number: { value: "(361) 264-9761", country: "us" }, active: true },
  { id: "a7", name: "New Voice Agent...", handle: "#agent_d57b973c...", incomplete: true, capabilities: ["knowledge"], active: false },
  { id: "a8", name: "dfvdfv", handle: "#agent_e2adb921e...", incomplete: true, capabilities: ["knowledge"], active: false },
  { id: "a9", name: "ii", handle: "#agent_cc45d4f66...", incomplete: true, capabilities: ["knowledge"], active: false },
];

export const VOICE_AGENTS_TOTAL = 315;

export const AIVA_MINUTES_REMAINING = 293;

export type KnowledgeBase = {
  id: string;
  name: string;
  status: "Success" | "Syncing" | "Failed";
  agents: string[];
  updated: string;
};

export const KNOWLEDGE_BASES: KnowledgeBase[] = [
  { id: "k1", name: "Knowledge Basethtf", status: "Success", agents: ["nmm", "vs", "ii", "dfvdfv"], updated: "Nov 10, 2026 11:22 PM" },
  { id: "k2", name: "Knowledge Base", status: "Success", agents: [], updated: "Oct 22, 2026 2:34 AM" },
];
