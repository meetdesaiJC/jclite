import type { DropdownListItem } from "@/components/Dropdown";

/**
 * Knowledge — what AI is allowed to read. Admins connect sources; nobody
 * writes a trigger. Retrieval happens against whatever is published and
 * marked usable during live calls, so a routine question like "does this
 * work with Salesforce?" never needs a Guidance rule behind it.
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
    label: "Knowledge base",
    description: "Everything already published in your JustCall knowledge base.",
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
    label: "FAQs",
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
  /** Off means AI keeps it out of live calls entirely. */
  useDuringCalls: boolean;
  /** Off means the answer surfaces without naming where it came from. */
  showSourceToAgents: boolean;
  status: "live" | "draft";
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
    useDuringCalls: true,
    showSourceToAgents: true,
    status: "live",
    updated: "Yesterday",
    entries: [
      {
        id: "ke-salesforce",
        title: "Salesforce integration",
        answer:
          "JustCall supports Salesforce for call logging, activity syncing, and click-to-call from the record. Calls, SMS, and voicemails attach to the contact automatically.",
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
    useDuringCalls: true,
    showSourceToAgents: true,
    status: "live",
    updated: "3 days ago",
    entries: [
      {
        id: "ke-aircall-overview",
        title: "JustCall vs Aircall",
        answer:
          "Aircall covers voice well but charges separately for SMS and has no in-call AI assistance. JustCall bundles calling, messaging, CRM sync, and agent assist on one plan.",
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
        cues: ["how do you compare to dialpad", "we looked at dialpad", "dialpad"],
      },
      {
        id: "ke-seat-pricing",
        title: "Seat-based pricing model",
        answer:
          "Plans are priced per seat with calling and messaging included. Annual billing carries a discount, and usage-based numbers are billed separately.",
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
    useDuringCalls: true,
    showSourceToAgents: true,
    status: "live",
    updated: "1 week ago",
    entries: [
      {
        id: "ke-refund-window",
        title: "Refund window",
        answer:
          "Refunds are available within 14 days of the charge for unused subscription time, and process back to the original payment method in 5–7 business days.",
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
    useDuringCalls: false,
    showSourceToAgents: true,
    status: "draft",
    updated: "Just now",
    entries: [
      {
        id: "ke-soc2",
        title: "SOC 2 and data residency",
        answer:
          "JustCall is SOC 2 Type II audited annually, with EU data residency available on enterprise plans.",
        cues: ["are you soc 2", "where is our data stored", "data residency"],
      },
    ],
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

/** Only published sources the admin cleared for live calls are searchable. */
export function liveKnowledgeSources(
  sources: KnowledgeSourceRecord[]
): KnowledgeSourceRecord[] {
  return sources.filter((source) => source.status === "live" && source.useDuringCalls);
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

export function knowledgeAudienceLabel(source: KnowledgeSourceRecord): string {
  if (source.audience === "everyone") return "Everyone";
  const options = source.audience === "teams" ? KNOWLEDGE_TEAMS : KNOWLEDGE_USERS;
  const picked = source.audience === "teams" ? source.audienceTeams : source.audienceUsers;
  const labels = options
    .filter(
      (option) =>
        (!option.type || option.type === "option") && picked.includes(option.value)
    )
    .map((option) => (!option.type || option.type === "option" ? option.label : ""))
    .filter(Boolean);
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
    useDuringCalls: true,
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
