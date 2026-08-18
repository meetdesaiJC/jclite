import type { DropdownListItem } from "@/components/Dropdown";

/**
 * Knowledge — what AI is allowed to read. There is one JustCall knowledge
 * base, shared: each KB says which products may use it (Voice Agent, Agent
 * Assist, or both). Turning a KB on for Agent Assist flips availability on the
 * same record — it never copies the KB — so admins keep one place to maintain
 * answers. Billing stays product-specific: Voice Agent KB limits follow the
 * Voice Agent add-on tier, and Agent Assist access rides on the Pro+ plan.
 *
 * Nobody writes a trigger. Retrieval happens against whatever is published and
 * available to Agent Assist, so a routine question like "does this work with
 * Salesforce?" never needs a Guidance rule behind it.
 */

export type KnowledgeSourceKind =
  | "justcall-kb"
  | "pdf"
  | "doc"
  | "csv"
  | "faq"
  | "help-center"
  | "website"
  | "internal";

export type KnowledgeAudience = "everyone" | "teams" | "users";

/** Which products may read this knowledge base. One KB, shared availability. */
export type KnowledgeUsedBy = "voice-agent" | "agent-assist" | "both";

export const KNOWLEDGE_USED_BY_OPTIONS: {
  value: KnowledgeUsedBy;
  label: string;
  hint: string;
}[] = [
  {
    value: "voice-agent",
    label: "Voice Agent",
    hint: "The AI voice agent answers from this knowledge base.",
  },
  {
    value: "agent-assist",
    label: "Agent Assist",
    hint: "Human agents get answers from it on live calls.",
  },
  {
    value: "both",
    label: "Both",
    hint: "One knowledge base, used by Voice Agent and Agent Assist.",
  },
];

export function usedByVoiceAgent(source: KnowledgeSourceRecord): boolean {
  return source.usedBy === "voice-agent" || source.usedBy === "both";
}

export function usedByAgentAssist(source: KnowledgeSourceRecord): boolean {
  return source.usedBy === "agent-assist" || source.usedBy === "both";
}

export function knowledgeUsedByLabel(usedBy: KnowledgeUsedBy): string {
  return (
    KNOWLEDGE_USED_BY_OPTIONS.find((option) => option.value === usedBy)?.label ??
    "Both"
  );
}

// ---------------------------------------------------------------------------
// Entitlements
// ---------------------------------------------------------------------------

/**
 * Sharing the knowledge base does not share the bill. Voice Agent KB capacity
 * comes from its add-on tier; Agent Assist is bundled with eligible Pro+
 * plans, so switching a KB on for Agent Assist consumes no Voice Agent quota.
 */
export interface KnowledgeEntitlements {
  /** Add-on tier the Voice Agent KB limit comes from. */
  voiceAgentTier: string;
  voiceAgentKbLimit: number;
  /** Plan Agent Assist is included with. */
  agentAssistPlan: string;
  agentAssistIncluded: boolean;
}

export const KNOWLEDGE_ENTITLEMENTS: KnowledgeEntitlements = {
  voiceAgentTier: "Voice Agent Growth add-on",
  voiceAgentKbLimit: 5,
  agentAssistPlan: "Pro+",
  agentAssistIncluded: true,
};

export function voiceAgentKbCount(sources: KnowledgeSourceRecord[]): number {
  return sources.filter(usedByVoiceAgent).length;
}

export function agentAssistKbCount(sources: KnowledgeSourceRecord[]): number {
  return sources.filter(usedByAgentAssist).length;
}

/** True once the Voice Agent add-on tier has no KB slots left. */
export function voiceAgentKbLimitReached(
  sources: KnowledgeSourceRecord[],
  entitlements: KnowledgeEntitlements = KNOWLEDGE_ENTITLEMENTS
): boolean {
  return voiceAgentKbCount(sources) >= entitlements.voiceAgentKbLimit;
}

export interface KnowledgeSourceKindMeta {
  id: KnowledgeSourceKind;
  label: string;
  description: string;
  /** What the admin supplies — a file, a URL, or nothing at all. */
  input: "file" | "url" | "none";
  originPlaceholder?: string;
}

export const KNOWLEDGE_SOURCE_KINDS: KnowledgeSourceKindMeta[] = [
  {
    id: "justcall-kb",
    label: "JustCall FAQs",
    description: "Start from the FAQs your team already publishes in JustCall.",
    input: "none",
  },
  {
    id: "help-center",
    label: "Help center URL",
    description: "Crawl a public help center and keep it in sync.",
    input: "url",
    originPlaceholder: "https://help.yourcompany.com",
  },
  {
    id: "website",
    label: "Website",
    description: "Pull product, pricing, and policy pages from your site.",
    input: "url",
    originPlaceholder: "https://yourcompany.com/pricing",
  },
  {
    id: "pdf",
    label: "PDF",
    description: "Battlecards, policy documents, one-pagers.",
    input: "file",
    originPlaceholder: "Competitive Battlecards.pdf",
  },
  {
    id: "doc",
    label: "DOC / DOCX",
    description: "Word documents your team already maintains.",
    input: "file",
    originPlaceholder: "Onboarding runbook.docx",
  },
  {
    id: "csv",
    label: "CSV",
    description: "A spreadsheet of questions and approved answers.",
    input: "file",
    originPlaceholder: "support-faqs.csv",
  },
  {
    id: "faq",
    label: "Manual Q&A",
    description: "Type or paste question and answer pairs.",
    input: "none",
  },
  {
    id: "internal",
    label: "Internal documentation",
    description: "Notion, Confluence, or a shared drive folder.",
    input: "url",
    originPlaceholder: "https://notion.so/team/support-wiki",
  },
];

export function knowledgeKindMeta(kind: KnowledgeSourceKind): KnowledgeSourceKindMeta {
  return (
    KNOWLEDGE_SOURCE_KINDS.find((item) => item.id === kind) ??
    KNOWLEDGE_SOURCE_KINDS[0]!
  );
}

/** Glyph on a scannable fact — mapped in the in-call card. */
export type KnowledgePointKind =
  | "calendar"
  | "clock"
  | "link"
  | "trash"
  | "check"
  | "phone"
  | "message"
  | "file"
  | "integrations"
  | "hours"
  | "logs";

/** One fact the agent can scan as a single line during a call. */
export interface KnowledgePoint {
  heading: string;
  kind?: KnowledgePointKind;
}

/** One retrievable answer inside a source. */
export interface KnowledgeEntry {
  id: string;
  title: string;
  /** Two sentences at most — this is what lands in the in-call card. */
  answer: string;
  /** Phrases a customer might actually say. Feeds retrieval, not triggers. */
  cues: string[];
  /** Deep link the agent can open when they want the original. */
  sourceUrl?: string;
  /** Lead line above the facts. Optional — the title already orients. */
  summary?: string;
  /** Scannable facts. When omitted, the card shows `answer` as a paragraph. */
  points?: KnowledgePoint[];
}

/** Facts the in-call card should render — authored points win. */
export function knowledgeFacts(entry: KnowledgeEntry): {
  summary: string | null;
  points: KnowledgePoint[];
} {
  const summary = entry.summary?.trim() || null;
  if (entry.points && entry.points.length > 0) {
    return { summary, points: entry.points };
  }
  return { summary, points: [] };
}

export interface KnowledgeSourceRecord {
  id: string;
  name: string;
  kind: KnowledgeSourceKind;
  /** Filename or URL, depending on the kind. */
  origin: string;
  audience: KnowledgeAudience;
  audienceTeams: string[];
  audienceUsers: string[];
  /**
   * Products allowed to read this KB. Anything without Agent Assist here stays
   * out of live agent calls — the KB itself is untouched and still serves
   * Voice Agent.
   */
  usedBy: KnowledgeUsedBy;
  /** Off means the answer surfaces without naming where it came from. */
  showSourceToAgents: boolean;
  /** `failed` means ingestion could not read the source — retrain to retry. */
  status: "live" | "draft" | "failed";
  updated: string;
  entries: KnowledgeEntry[];
}

export const KNOWLEDGE_TEAMS: DropdownListItem[] = [
  { value: "sales", label: "Sales" },
  { value: "support", label: "Support" },
  { value: "success", label: "Customer Success" },
  { value: "billing", label: "Billing" },
  { value: "ops", label: "Operations" },
];

export const KNOWLEDGE_USERS: DropdownListItem[] = [
  { value: "olivia", label: "Olivia Rhye" },
  { value: "phoenix", label: "Phoenix Baker" },
  { value: "lana", label: "Lana Steiner" },
  { value: "demi", label: "Demi Wilkinson" },
  { value: "candice", label: "Candice Wu" },
  { value: "natali", label: "Natali Craig" },
  { value: "drew", label: "Drew Cano" },
];

export const SEED_KNOWLEDGE_SOURCES: KnowledgeSourceRecord[] = [
  {
    id: "ks-product-kb",
    name: "JustCall product knowledge base",
    kind: "justcall-kb",
    origin: "help.justcall.io",
    audience: "everyone",
    audienceTeams: [],
    audienceUsers: [],
    usedBy: "both",
    showSourceToAgents: true,
    status: "live",
    updated: "Yesterday",
    entries: [
      {
        id: "ke-salesforce",
        title: "Salesforce integration",
        answer:
          "JustCall supports Salesforce for call logging, activity syncing, and click-to-call from the record. Calls, SMS, and voicemails attach to the contact automatically.",
        summary:
          "JustCall supports Salesforce for call logging, activity syncing, and click-to-call from the record.",
        points: [
          {
            kind: "integrations",
            heading: "Call, SMS, and voicemail logging",
          },
          {
            kind: "phone",
            heading: "Click-to-call from the record",
          },
        ],
        cues: [
          "does justcall integrate with salesforce",
          "will calls log in salesforce",
          "do you have a salesforce app",
          "salesforce sync",
        ],
        sourceUrl: "https://help.justcall.io/salesforce",
      },
      {
        id: "ke-recording-retention",
        title: "Call recording retention",
        answer:
          "Recordings are retained for 12 months on standard plans and can be extended to 24 months on request. Individual recordings can be deleted at any time from the call log.",
        summary:
          "Recordings are retained to help your team stay compliant, review conversations, and improve customer outcomes.",
        points: [
          {
            kind: "calendar",
            heading: "12 months on standard plans",
          },
          {
            kind: "link",
            heading: "Extend to 24 months on request",
          },
          {
            kind: "trash",
            heading: "Delete individual recordings anytime",
          },
        ],
        cues: [
          "how long are recordings retained",
          "how long do you keep recordings",
          "recording retention",
          "storage of call recordings",
        ],
        sourceUrl: "https://help.justcall.io/recording-retention",
      },
      {
        id: "ke-porting",
        title: "Number porting",
        answer:
          "JustCall supports porting existing numbers in most regions. Local numbers usually take 5–10 business days and toll-free numbers 10–15, with no downtime during the switch.",
        summary: "JustCall supports porting existing numbers in most regions.",
        points: [
          {
            kind: "phone",
            heading: "Local numbers: 5–10 business days",
          },
          {
            kind: "clock",
            heading: "Toll-free: 10–15 business days",
          },
        ],
        cues: [
          "does justcall support number porting",
          "can we keep our numbers",
          "port our existing numbers",
          "how long does porting take",
        ],
        sourceUrl: "https://help.justcall.io/porting",
      },
      {
        id: "ke-zoho-recruit",
        title: "Zoho Recruit support",
        answer:
          "Zoho Recruit is supported through the JustCall Zoho integration for click-to-call and activity logging against candidate records.",
        summary:
          "Zoho Recruit is supported through the JustCall Zoho integration.",
        points: [
          {
            kind: "phone",
            heading: "Click-to-call from candidate records",
          },
          {
            kind: "check",
            heading: "Activity logging",
          },
        ],
        cues: [
          "is zoho recruit supported",
          "does it work with zoho",
          "zoho recruit integration",
        ],
        sourceUrl: "https://help.justcall.io/zoho",
      },
      {
        id: "ke-after-hours-routing",
        title: "After-hours call routing",
        answer:
          "Incoming calls outside business hours can route to an on-call user, a shared queue, or trigger a missed-call SMS so the lead hears back the same night.",
        summary:
          "Incoming calls outside business hours can still reach someone — or trigger a follow-up.",
        points: [
          {
            kind: "hours",
            heading: "Route to on-call or a shared queue",
          },
          {
            kind: "message",
            heading: "Missed-call SMS the same night",
          },
        ],
        cues: [
          "after hours calls go to voicemail",
          "what happens outside business hours",
          "missed call text",
          "on call routing",
        ],
        sourceUrl: "https://help.justcall.io/after-hours",
      },
      {
        id: "ke-sms-compliance",
        title: "SMS consent and opt-out",
        answer:
          "Outbound SMS campaigns require prior consent, and opt-out keywords are honoured automatically across every number on the account.",
        summary:
          "Outbound SMS campaigns require prior consent. Opt-outs are honoured automatically.",
        points: [
          {
            kind: "check",
            heading: "Prior consent is required",
          },
          {
            kind: "message",
            heading: "Opt-out keywords are automatic",
          },
        ],
        cues: [
          "sms compliance",
          "do we need consent for texts",
          "opt out handling",
          "10dlc registration",
        ],
        sourceUrl: "https://help.justcall.io/sms-compliance",
      },
    ],
  },
  {
    id: "ks-battlecards",
    name: "Sales competitive knowledge",
    kind: "pdf",
    origin: "Competitive Battlecards.pdf",
    audience: "teams",
    audienceTeams: ["sales"],
    audienceUsers: [],
    usedBy: "agent-assist",
    showSourceToAgents: true,
    status: "live",
    updated: "3 days ago",
    entries: [
      {
        id: "ke-aircall-overview",
        title: "JustCall vs Aircall",
        answer:
          "Aircall covers voice well but charges separately for SMS and has no in-call AI assistance. JustCall bundles calling, messaging, CRM sync, and agent assist on one plan.",
        summary:
          "Aircall covers voice well; JustCall bundles calling, messaging, CRM sync, and agent assist.",
        points: [
          {
            kind: "message",
            heading: "SMS is included, not an add-on",
          },
          {
            kind: "check",
            heading: "In-call AI assistance",
          },
        ],
        cues: [
          "how are you different from aircall",
          "we currently use aircall",
          "aircall comparison",
          "why switch from aircall",
        ],
      },
      {
        id: "ke-dialpad-overview",
        title: "JustCall vs Dialpad",
        answer:
          "Dialpad leads with meetings; JustCall leads with outbound and support workflows — dialer, SMS campaigns, and CRM-native logging.",
        summary:
          "Dialpad leads with meetings; JustCall leads with outbound and support workflows.",
        points: [
          {
            kind: "phone",
            heading: "Dialer and SMS campaigns",
          },
          {
            kind: "integrations",
            heading: "CRM-native logging",
          },
        ],
        cues: ["how do you compare to dialpad", "we looked at dialpad", "dialpad"],
      },
      {
        id: "ke-seat-pricing",
        title: "Seat-based pricing model",
        answer:
          "Plans are priced per seat with calling and messaging included. Annual billing carries a discount, and usage-based numbers are billed separately.",
        summary: "Plans are priced per seat with calling and messaging included.",
        points: [
          {
            kind: "check",
            heading: "Calling and messaging included",
          },
          {
            kind: "calendar",
            heading: "Annual billing discount",
          },
        ],
        cues: [
          "how does pricing work",
          "what does a seat cost",
          "annual discount",
          "is there a setup fee",
        ],
      },
    ],
  },
  {
    id: "ks-support-macros",
    name: "Support macros and policies",
    kind: "csv",
    origin: "support-macros.csv",
    audience: "teams",
    audienceTeams: ["support", "billing"],
    audienceUsers: [],
    usedBy: "both",
    showSourceToAgents: true,
    status: "live",
    updated: "1 week ago",
    entries: [
      {
        id: "ke-refund-window",
        title: "Refund window",
        answer:
          "Refunds are available within 14 days of the charge for unused subscription time, and process back to the original payment method in 5–7 business days.",
        summary:
          "Refunds are available within 14 days of the charge for unused subscription time.",
        points: [
          {
            kind: "calendar",
            heading: "14-day window",
          },
          {
            kind: "clock",
            heading: "5–7 business days to process",
          },
        ],
        cues: [
          "can i get a refund",
          "i was charged twice",
          "how do refunds work",
          "duplicate charge",
        ],
      },
      {
        id: "ke-account-lockout",
        title: "Account lockout",
        answer:
          "Accounts lock after five failed sign-in attempts and unlock automatically after 15 minutes. An agent can also unlock after verifying the email on file.",
        summary:
          "Accounts lock after five failed sign-in attempts and unlock automatically after 15 minutes.",
        points: [
          {
            kind: "clock",
            heading: "Unlocks after 15 minutes",
          },
          {
            kind: "check",
            heading: "Agent can unlock sooner",
          },
        ],
        cues: [
          "my account is locked",
          "i cant log in",
          "too many attempts",
          "reset my password",
        ],
      },
    ],
  },
  {
    id: "ks-security-review",
    name: "Security and compliance pack",
    kind: "doc",
    origin: "Security overview.docx",
    audience: "teams",
    audienceTeams: ["sales", "success"],
    audienceUsers: [],
    usedBy: "voice-agent",
    showSourceToAgents: true,
    status: "draft",
    updated: "Just now",
    entries: [
      {
        id: "ke-soc2",
        title: "SOC 2 and data residency",
        answer:
          "JustCall is SOC 2 Type II audited annually, with EU data residency available on enterprise plans.",
        summary:
          "JustCall is SOC 2 Type II audited annually, with EU data residency on enterprise plans.",
        points: [
          {
            kind: "check",
            heading: "SOC 2 Type II, audited annually",
          },
          {
            kind: "file",
            heading: "EU data residency on enterprise",
          },
        ],
        cues: ["are you soc 2", "where is our data stored", "data residency"],
      },
    ],
  },
  {
    id: "ks-partner-portal",
    name: "Partner portal help center",
    kind: "help-center",
    origin: "https://partners.justcall.io/help",
    audience: "teams",
    audienceTeams: ["success"],
    audienceUsers: [],
    usedBy: "agent-assist",
    showSourceToAgents: true,
    // Ingestion could not reach the pages behind the partner login.
    status: "failed",
    updated: "2 days ago",
    entries: [],
  },
];

// ---------------------------------------------------------------------------
// Retrieval
// ---------------------------------------------------------------------------

const STOP_WORDS = new Set([
  "the",
  "and",
  "for",
  "are",
  "you",
  "your",
  "our",
  "this",
  "that",
  "with",
  "from",
  "have",
  "has",
  "can",
  "could",
  "would",
  "should",
  "will",
  "just",
  "about",
  "into",
  "them",
  "they",
  "what",
  "when",
  "where",
  "why",
  "how",
  "does",
  "did",
  "get",
  "got",
  "was",
  "were",
  "not",
  "but",
  "any",
  "there",
  "here",
  "its",
  "his",
  "her",
]);

function tokenize(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token))
    .map((token) => token.replace(/ies$/, "y").replace(/s$/, ""));
}

function overlap(query: string, candidate: string): number {
  const left = tokenize(query);
  const right = new Set(tokenize(candidate));
  if (!left.length || !right.size) return 0;
  const hits = left.filter((token) => right.has(token)).length;
  return hits / left.length;
}

export type KnowledgeConfidence = "high" | "low";

export interface KnowledgeHit {
  entry: KnowledgeEntry;
  source: KnowledgeSourceRecord;
  score: number;
  confidence: KnowledgeConfidence;
}

/** Only published KBs the admin made available to Agent Assist are searchable. */
export function liveKnowledgeSources(
  sources: KnowledgeSourceRecord[]
): KnowledgeSourceRecord[] {
  return sources.filter(
    (source) => source.status === "live" && usedByAgentAssist(source)
  );
}

/**
 * Question detection. Knowledge answers factual asks; it should stay quiet
 * when the customer is describing a situation rather than asking something.
 */
export function looksLikeQuestion(utterance: string): boolean {
  const text = utterance.trim().toLowerCase();
  if (!text) return false;
  if (text.includes("?")) return true;
  return /^(do|does|did|is|are|can|could|will|would|how|what|when|where|why|who|any)\b/.test(
    text
  );
}

export function retrieveKnowledge(
  utterance: string,
  sources: KnowledgeSourceRecord[],
  limit = 2
): KnowledgeHit[] {
  const searchable = liveKnowledgeSources(sources);
  const scored: KnowledgeHit[] = [];

  for (const source of searchable) {
    for (const entry of source.entries) {
      const cueScore = entry.cues.reduce(
        (best, cue) => Math.max(best, overlap(utterance, cue) * 1.15),
        0
      );
      const bodyScore = Math.max(
        overlap(utterance, entry.title) * 1.05,
        overlap(utterance, `${entry.title} ${entry.answer}`)
      );
      const score = Math.max(cueScore, bodyScore);
      if (score < 0.3) continue;
      scored.push({
        entry,
        source,
        score,
        confidence: score >= 0.55 ? "high" : "low",
      });
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit);
}

export function knowledgeEntryCount(source: KnowledgeSourceRecord): number {
  return source.entries.length;
}

// ---------------------------------------------------------------------------
// Overlap with Guidance
// ---------------------------------------------------------------------------

/** Trigger phrasing that reads like a request for a fact. */
const INFORMATIONAL_MARKERS =
  /\b(asks?|asking|wants? to know|question about|enquir|inquir|checks?|confirm(s|ing)?)\b.*\b(about|whether|if|how|what|when|where|why|which|works? with|support)/i;

/**
 * Phrasing that says the business wants control over the wording, even when a
 * fact is involved — those stay Guidance without a nudge.
 */
const STRATEGIC_MARKERS =
  /\b(objection|competitor|compare[sd]?|comparison|discount|negotiat|cancel|churn|retention|upsell|cross-sell|escalat|complain|compliance|pci|card number|legal|angry|frustrat|threaten)\b/i;

export function looksInformational(trigger: string): boolean {
  const text = trigger.trim();
  if (text.length < 12) return false;
  if (STRATEGIC_MARKERS.test(text)) return false;
  return INFORMATIONAL_MARKERS.test(text) || looksLikeQuestion(text);
}

/**
 * Coverage runs the overlap the other way round from retrieval: retrieval asks
 * "how much of what the customer said do I recognise", but a trigger is a
 * paragraph, so here we ask "is this answer's subject fully present in the
 * trigger". Otherwise long, well-written triggers would always score low.
 */
function coverageScore(trigger: string, entry: KnowledgeEntry): number {
  const triggerTokens = new Set(tokenize(trigger));
  if (triggerTokens.size === 0) return 0;
  const contained = (candidate: string) => {
    const tokens = tokenize(candidate);
    // One-word subjects match too easily to be evidence of coverage.
    if (tokens.length < 2) return 0;
    return tokens.filter((token) => triggerTokens.has(token)).length / tokens.length;
  };
  return entry.cues.reduce(
    (best, cue) => Math.max(best, contained(cue)),
    contained(entry.title)
  );
}

/**
 * The recommendation behind "this may already be handled by Knowledge" (§2).
 * Admins can still build whatever Guidance they want — this only fires when the
 * trigger reads informational *and* a published KB already answers that exact
 * subject, so the nudge is a shortcut rather than a restriction.
 */
export function knowledgeCoverageForTrigger(
  trigger: string,
  sources: KnowledgeSourceRecord[]
): KnowledgeHit | null {
  if (!looksInformational(trigger)) return null;

  let best: KnowledgeHit | null = null;
  for (const source of liveKnowledgeSources(sources)) {
    for (const entry of source.entries) {
      const score = coverageScore(trigger, entry);
      if (score < 0.7 || (best && score <= best.score)) continue;
      best = { entry, source, score, confidence: "high" };
    }
  }
  return best;
}

/**
 * Assignees for the Knowledge table avatar stack. "Everyone" is a single
 * group face because that is the whole audience, not a list of people.
 */
export function knowledgeAssignees(source: KnowledgeSourceRecord): {
  id: string;
  name: string;
  kind: "member" | "group";
}[] {
  if (source.audience === "everyone") {
    return [{ id: "everyone", name: "Everyone", kind: "group" }];
  }
  const options = source.audience === "teams" ? KNOWLEDGE_TEAMS : KNOWLEDGE_USERS;
  const picked = source.audience === "teams" ? source.audienceTeams : source.audienceUsers;
  const kind = source.audience === "teams" ? "group" : "member";
  return options
    .filter(
      (option) =>
        (!option.type || option.type === "option") && picked.includes(option.value)
    )
    .map((option) => ({
      id: option.value,
      name: option.label,
      kind,
    }));
}

export function knowledgeAssigneeLabels(source: KnowledgeSourceRecord): string[] {
  return knowledgeAssignees(source).map((person) => person.name);
}

export function knowledgeAudienceLabel(source: KnowledgeSourceRecord): string {
  if (source.audience === "everyone") return "Everyone";
  const labels = knowledgeAssigneeLabels(source);
  if (labels.length === 0) return "Nobody yet";
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
}

let knowledgeIdCounter = 0;

export function newKnowledgeSourceId(): string {
  knowledgeIdCounter += 1;
  return `ks-${Date.now().toString(36)}-${knowledgeIdCounter.toString(36)}`;
}

export function createEmptyKnowledgeSource(
  kind: KnowledgeSourceKind
): KnowledgeSourceRecord {
  return {
    id: newKnowledgeSourceId(),
    name: "",
    kind,
    origin: "",
    audience: "everyone",
    audienceTeams: [],
    audienceUsers: [],
    // A new KB starts shared — that is the point of one knowledge base.
    usedBy: "both",
    showSourceToAgents: true,
    status: "draft",
    updated: "Just now",
    entries: [],
  };
}

/**
 * Standing in for ingestion. A real source is parsed and chunked; here the
 * kind and name decide which sample answers the admin sees after publishing,
 * so the retrieval demo has something to find.
 */
export function sampleEntriesForSource(
  name: string,
  kind: KnowledgeSourceKind
): KnowledgeEntry[] {
  const hay = `${name} ${kind}`.toLowerCase();
  if (/competit|battlecard|aircall|dialpad|vs\b/.test(hay)) {
    return SEED_KNOWLEDGE_SOURCES[1]!.entries;
  }
  if (/support|macro|refund|billing|policy/.test(hay)) {
    return SEED_KNOWLEDGE_SOURCES[2]!.entries;
  }
  return SEED_KNOWLEDGE_SOURCES[0]!.entries.slice(0, 4);
}
