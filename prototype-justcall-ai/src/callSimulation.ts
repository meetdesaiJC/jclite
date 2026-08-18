/**
 * Choreographed during-call demo: a customer with a real problem,
 * the agent following the script, and Guidance cards surfacing from
 * what was just said — matched against the live library. Cards stay
 * until the agent dismisses them.
 *
 * Discovery follows the script, beat by beat: Elena is on Aircall, misses
 * after-hours calls, names the cost, then Salesforce logging for her ops
 * lead, then price vs Aircall, then books a working session.
 */

import {
  liveGuidance,
  priorityForGuidance,
  rankGuidanceMatches,
  stanceForGuidance,
  type GuidanceItem,
  type GuidancePriority,
  type GuidanceStance,
} from "./guidanceData";
import {
  SEED_KNOWLEDGE_SOURCES,
  looksLikeQuestion,
  retrieveKnowledge,
  type KnowledgeConfidence,
  type KnowledgeEntry,
  type KnowledgeSourceRecord,
} from "./knowledgeData";
import {
  SEED_COACHING_RULES,
  liveCoachingRules,
  type CoachingRule,
} from "./coachingData";
import {
  SEED_INTEGRATIONS,
  actionFromGuidanceConfig,
  capabilityById,
  integrationById,
  type Integration,
  type SuggestedAction,
} from "./actionsData";

export interface ScriptStep {
  title: string;
  wording?: string;
  required?: boolean;
  /** Guidance that belongs under this step when the customer hits that topic. */
  relatedGuidanceIds?: string[];
}

export interface GuidanceSuggestion {
  id: string;
  atMs: number;
  quote: string;
  item: GuidanceItem;
  priority: GuidancePriority;
  stance: GuidanceStance;
}

/**
 * Knowledge surfaced from an approved source. No admin wrote a trigger for
 * this — it was retrieved because the customer asked something factual.
 */
export interface KnowledgeSurface {
  id: string;
  atMs: number;
  entry: KnowledgeEntry;
  sourceName: string;
  /** The admin can publish a source without exposing where it came from. */
  showSource: boolean;
  confidence: KnowledgeConfidence;
  /** Retrieval question — used to tell when the topic has moved on. */
  query: string;
}

/** A behaviour nudge. Temporary by design — never a card. */
export interface CoachingCue {
  id: string;
  atMs: number;
  rule: CoachingRule;
  /** The measured reading behind the nudge, e.g. "78% over the last 2 min". */
  detail: string;
}

export interface ActionSurface {
  id: string;
  atMs: number;
  action: SuggestedAction;
}

export type TranscriptSpeaker = "customer" | "agent";

export interface TranscriptTurn {
  atMs: number;
  speaker: TranscriptSpeaker;
  quote: string;
}

export interface SimulationEvent {
  atMs: number;
  /** Active script step after this beat. Equal to steps.length when the call is wrapped. */
  scriptIndex?: number;
  quote?: string;
  speaker?: TranscriptSpeaker;
  /** Force-match these library items (used for multi-trigger utterances). */
  guidanceIds?: string[];
  /** AI detected the agent already covered this guidance. */
  handledGuidanceId?: string;
  /**
   * Retrieve knowledge for this line even though no Guidance was configured.
   * Left unset, a customer question still retrieves on its own — this is only
   * for choreographing which line the demo answers.
   */
  knowledgeQuery?: string;
  /** Keep retrieval out of this beat, even if the line reads as a question. */
  skipKnowledge?: boolean;
  /** Fire a coaching banner from a live rule. */
  coachingRuleId?: string;
  /** Reading shown under the coaching message. */
  coachingDetail?: string;
  /** Surface one of the scenario's conversation-detected actions. */
  actionId?: string;
}

export interface CallMoment {
  id: string;
  label: string;
  atMs: number;
}

/**
 * The one thing an agent can do about an item without leaving the recap.
 * Only what the product actually has — anything else stays a plain item the
 * agent ticks off themselves.
 */
export type CallActionKind = "schedule" | "message";

export interface CallActionItem {
  id: string;
  title: string;
  action?: CallActionKind;
}

export interface CallWrapUp {
  summary: string;
  actionItems: CallActionItem[];
}

export interface CallScenario {
  id: string;
  scriptName: string;
  contactName: string;
  contactMeta: string;
  /** The CRM record actions on this call write to. */
  crmRecordLabel?: string;
  steps: ScriptStep[];
  events: SimulationEvent[];
  moments: CallMoment[];
  /** Actions the conversation itself suggests, referenced by event actionId. */
  conversationActions?: SuggestedAction[];
  wrapUp: CallWrapUp;
}

export interface SimulationSnapshot {
  scriptIndex: number;
  suggestions: GuidanceSuggestion[];
  handledIds: string[];
  latestQuote: { atMs: number; quote: string } | null;
  transcript: TranscriptTurn[];
  wrapped: boolean;
  /** Auto-retrieved answers, newest last. */
  knowledge: KnowledgeSurface[];
  /** Every cue fired so far — the panel decides which is still on screen. */
  coaching: CoachingCue[];
  actions: ActionSurface[];
}

/** Live libraries the runtime reads. Defaults to the seeded admin setup. */
export interface SimulationLibraries {
  knowledge?: KnowledgeSourceRecord[];
  coaching?: CoachingRule[];
  integrations?: Integration[];
}

function step(
  title: string,
  wording?: string,
  required = true,
  relatedGuidanceIds?: string[]
): ScriptStep {
  return { title, wording, required, relatedGuidanceIds };
}

export const CALL_SCENARIOS: CallScenario[] = [
  {
    id: "discovery",
    scriptName: "Discovery call",
    contactName: "Elena Vasquez",
    contactMeta: "Outbound · Sales",
    // Story follows the script: Aircall → after-hours pain → cost of
    // missed leads → Salesforce for the ops lead → price → book session.
    steps: [
      step(
        "Set the purpose of the call",
        "I'd love to spend this time understanding how you're handling calls today, then see if it's worth a closer look."
      ),
      step(
        "Confirm time and attendees",
        "We've got about 30 minutes. Is anyone else joining, or is it just us?",
        false
      ),
      step(
        "Ask how they handle this today",
        "Walk me through how this works on your team today.",
        true,
        ["g-aircall"]
      ),
      step(
        "Uncover the pain behind the process",
        "Where does that break down — missed calls, slow follow-up, or the team using different tools for the same job?",
        true,
        ["g-after-hours"]
      ),
      step(
        "Quantify the cost of the status quo",
        "What does that cost you in time, missed revenue, or customer experience?"
      ),
      step(
        "Identify who else cares about this",
        "Who else feels this day to day — ops, support leads, or whoever owns the number?",
        false,
        ["g-salesforce"]
      ),
      step(
        "Propose a concrete follow-up",
        "If this still looks relevant, the useful next step is a 30-minute working session with your ops lead.",
        true,
        ["g-pricing"]
      ),
      step(
        "Confirm date, attendees, and success criteria",
        "Let's lock a time this week. If we can show the missed-call workflow in their language, we'll know whether a trial is worth it."
      ),
    ],
    crmRecordLabel: "Elena Vasquez",
    moments: [
      { id: "default", label: "Script only", atMs: 800 },
      { id: "competitor", label: "Current tool — Aircall", atMs: 13500 },
      { id: "pain", label: "Missed after-hours calls", atMs: 25000 },
      { id: "crm", label: "Salesforce logging", atMs: 44500 },
      { id: "knowledge", label: "Recording retention question", atMs: 50500 },
      { id: "coaching", label: "Talk ratio nudge", atMs: 59000 },
      { id: "objection", label: "Pricing vs Aircall", atMs: 61000 },
      { id: "end", label: "End of call", atMs: 74000 },
    ],
    conversationActions: [
      {
        id: "act-followup-task",
        integrationId: "hubspot",
        capabilityId: "hs-task",
        title: "Create HubSpot follow-up task",
        summary: "Working session · due Thursday",
        recordLabel: "Contact",
        recordValue: "Elena Vasquez",
        fields: [
          { label: "Task", value: "Working session with Elena and her ops lead" },
          { label: "Due", value: "Thursday" },
          { label: "Owner", value: "Sarah Johnson" },
        ],
        origin: "conversation",
        requiresConfirmation: true,
      },
    ],
    events: [
      { atMs: 0, scriptIndex: 0 },
      {
        atMs: 2500,
        speaker: "agent",
        quote:
          "I'd love to spend this time understanding how you're handling calls today, then see if it's worth a closer look.",
      },
      { atMs: 4500, scriptIndex: 1 },
      {
        atMs: 5500,
        speaker: "agent",
        quote: "We've got about 30 minutes. Is anyone else joining, or is it just us?",
      },
      {
        atMs: 7500,
        speaker: "customer",
        quote: "Just me — our ops lead couldn't make this one.",
      },
      { atMs: 9000, scriptIndex: 2 },
      {
        atMs: 10500,
        speaker: "agent",
        quote: "Walk me through how this works on your team today.",
      },
      {
        atMs: 13500,
        speaker: "customer",
        quote: "We're on Aircall. SMS lives in a separate tool.",
        guidanceIds: ["g-aircall"],
      },
      {
        atMs: 16500,
        speaker: "agent",
        quote:
          "JustCall puts calling, messaging, and CRM in one place — that's usually why teams look. I want the workflow first though.",
      },
      { atMs: 18500, handledGuidanceId: "g-aircall" },
      { atMs: 20000, scriptIndex: 3 },
      {
        atMs: 21500,
        speaker: "agent",
        quote:
          "Where does that break down — missed calls, slow follow-up, or the team using different tools for the same job?",
      },
      {
        atMs: 25000,
        speaker: "customer",
        quote:
          "After-hours calls go to voicemail. Follow-up is whoever happens to pick it up.",
        guidanceIds: ["g-after-hours"],
      },
      {
        atMs: 28000,
        speaker: "agent",
        quote:
          "After-hours coverage is usually the first workflow we show — missed-call SMS so the lead isn't sitting until morning.",
      },
      { atMs: 30000, handledGuidanceId: "g-after-hours" },
      { atMs: 31500, scriptIndex: 4 },
      {
        atMs: 33000,
        speaker: "agent",
        quote: "What does that cost you in time, missed revenue, or customer experience?",
      },
      {
        atMs: 36000,
        speaker: "customer",
        quote:
          "Maybe twenty missed leads a week. That's revenue sitting until morning, and the team feels it.",
      },
      { atMs: 38500, scriptIndex: 5 },
      {
        atMs: 40000,
        speaker: "agent",
        quote:
          "Who else feels this day to day — ops, support leads, or whoever owns the number?",
      },
      {
        atMs: 44500,
        speaker: "customer",
        quote:
          "Our ops lead. She lives in Salesforce — and none of this logs unless someone remembers.",
        guidanceIds: ["g-salesforce"],
      },
      {
        atMs: 47500,
        speaker: "agent",
        quote:
          "Yes — native Salesforce integration. Calls and SMS log to the contact automatically.",
      },
      { atMs: 49500, handledGuidanceId: "g-salesforce" },
      // Nobody configured guidance for recording retention — and nobody should
      // have to. This is retrieved straight from the published knowledge base.
      {
        atMs: 50500,
        speaker: "customer",
        quote: "Before I forget — how long do you keep call recordings?",
      },
      {
        atMs: 53000,
        speaker: "agent",
        quote:
          "Twelve months on standard plans, and we can extend that to twenty-four if your policy needs it.",
      },
      { atMs: 54500, scriptIndex: 6 },
      {
        atMs: 56000,
        speaker: "agent",
        quote:
          "If this still looks relevant, the useful next step is a 30-minute working session with your ops lead.",
      },
      // The agent has carried the last stretch on their own.
      {
        atMs: 59000,
        coachingRuleId: "cr-overtalking",
        coachingDetail: "You've held 78% of the last 2 minutes.",
      },
      {
        atMs: 61000,
        speaker: "customer",
        quote:
          "A working session could work, but Aircall is cheaper. Not sure I can sell a more expensive tool internally.",
        guidanceIds: ["g-pricing"],
      },
      {
        atMs: 64000,
        speaker: "agent",
        quote:
          "Pricing includes calling, messaging, and CRM in one place — so you're not stacking extra tools. We can size the plan to the seats you'd actually use.",
      },
      { atMs: 66000, handledGuidanceId: "g-pricing" },
      { atMs: 67500, scriptIndex: 7 },
      {
        atMs: 69000,
        speaker: "agent",
        quote:
          "Let's lock a time this week. If we can show the missed-call workflow in their language, we'll know whether a trial is worth it.",
      },
      {
        atMs: 71500,
        speaker: "customer",
        quote: "Thursday afternoon is open. I'll bring the ops lead.",
        skipKnowledge: true,
        actionId: "act-followup-task",
      },
      { atMs: 74000, scriptIndex: 8 },
    ],
    wrapUp: {
      summary:
        "Elena is on Aircall today and evaluating JustCall so calling, SMS, and CRM live in one place. After-hours calls go to voicemail with no owner, and nothing logs to Salesforce unless someone remembers — about twenty missed leads a week. She wants a Thursday afternoon working session with her ops lead, but needs help selling a higher price internally versus Aircall.",
      actionItems: [
        {
          id: "session",
          title: "Book Thursday afternoon with Elena and her ops lead",
          action: "schedule",
        },
        {
          id: "recap",
          title: "Send a recap of Salesforce logging and after-hours coverage",
          action: "message",
        },
        {
          id: "pricing",
          title: "Prepare a seat-based price comparison versus Aircall",
        },
      ],
    },
  },
  {
    id: "account-issue",
    scriptName: "Account access support",
    contactName: "Priya Sharma",
    contactMeta: "Inbound · Support",
    steps: [
      step(
        "Greet the customer",
        "Hi, thanks for calling JustCall support. How can I help you today?"
      ),
      step(
        "Confirm which account they're accessing",
        "Which email or phone number is on the account you're trying to open?"
      ),
      step(
        "Diagnose account access issue",
        "What happens when you try to log in?",
        true,
        ["g-refund"]
      ),
      step(
        "Check account lock status",
        "It looks like the account may be locked after a few failed sign-in attempts. I can unlock it from here."
      ),
      step(
        "Restore access",
        "I'll unlock the account and resend the reset link. Can you check that inbox?"
      ),
      step(
        "Confirm they can sign in",
        "Were you able to sign in with the new password?"
      ),
    ],
    crmRecordLabel: "Priya Sharma",
    moments: [
      { id: "default", label: "Script only", atMs: 800 },
      { id: "refund", label: "Refund guidance", atMs: 5600 },
      { id: "pci", label: "Card details warning", atMs: 17200 },
      { id: "frustration", label: "Sentiment nudge", atMs: 20000 },
      { id: "handled", label: "Compliance covered", atMs: 30000 },
      { id: "porting", label: "Number porting question", atMs: 39000 },
      { id: "end", label: "End of call", atMs: 49200 },
    ],
    conversationActions: [
      {
        id: "act-billing-ticket",
        integrationId: "hubspot",
        capabilityId: "hs-ticket",
        title: "Create HubSpot ticket",
        summary: "Duplicate charge review",
        recordLabel: "Contact",
        recordValue: "Priya Sharma",
        fields: [
          { label: "Subject", value: "Review duplicate charge" },
          { label: "Priority", value: "Medium" },
          // Nothing in the conversation says which company this contact
          // belongs to, and HubSpot needs it — so the agent fills it in.
          { label: "Company", value: "", missing: true },
        ],
        origin: "conversation",
        requiresConfirmation: true,
      },
    ],
    events: [
      { atMs: 0, scriptIndex: 0 },
      {
        atMs: 2400,
        speaker: "agent",
        quote: "Hi, thanks for calling JustCall support. How can I help you today?",
      },
      {
        atMs: 5600,
        speaker: "customer",
        quote: "I can't log in, and I also think I was charged twice.",
        guidanceIds: ["g-refund"],
      },
      { atMs: 8200, scriptIndex: 1 },
      {
        atMs: 10000,
        speaker: "agent",
        quote: "Which email or phone number is on the account you're trying to open?",
      },
      { atMs: 11800, speaker: "customer", quote: "It's priya.sharma@email.com." },
      { atMs: 12800, scriptIndex: 2 },
      {
        atMs: 14800,
        speaker: "customer",
        quote: "It says invalid password. I tried resetting but I never got the email.",
      },
      {
        atMs: 17200,
        speaker: "customer",
        quote: "I'll read you my card number so you can refund it.",
        guidanceIds: ["g-pci"],
      },
      {
        atMs: 22600,
        speaker: "agent",
        quote:
          "Please don't share card details on this call. I'll send a secure payment link instead.",
      },
      // Two failed resets and a blocked refund — the customer is losing patience.
      {
        atMs: 20000,
        coachingRuleId: "cr-frustration",
        coachingDetail: "Sentiment turned negative over the last minute.",
      },
      {
        atMs: 30000,
        handledGuidanceId: "g-pci",
      },
      { atMs: 32800, scriptIndex: 3 },
      { atMs: 35600, speaker: "customer", quote: "Okay — I won't read the card." },
      // Guidance exists for lockouts, so it answers this rather than Knowledge.
      {
        atMs: 37000,
        speaker: "customer",
        quote: "Is the account locked, then?",
      },
      // Nothing was ever configured for porting — retrieved from the KB.
      {
        atMs: 39000,
        speaker: "customer",
        quote: "One more thing — do you support number porting?",
      },
      { atMs: 41500, scriptIndex: 4 },
      { atMs: 43500, speaker: "customer", quote: "I see the reset email now." },
      { atMs: 45500, scriptIndex: 5 },
      {
        atMs: 47000,
        speaker: "customer",
        quote: "I'm in. Thank you.",
        skipKnowledge: true,
        actionId: "act-billing-ticket",
      },
      { atMs: 49200, scriptIndex: 6 },
    ],
    wrapUp: {
      summary:
        "Priya couldn't sign in after several failed attempts and also thought she was charged twice. The account was unlocked and a reset email was sent; she confirmed she was back in. Card details were not collected on the call — a secure payment link is the path if a refund is still needed.",
      actionItems: [
        {
          id: "access",
          title: "Confirm the reset email resolved access",
          action: "message",
        },
        {
          id: "billing",
          title: "Review priya.sharma@email.com for a duplicate charge",
        },
        {
          id: "follow-up",
          title: "Follow up in 24 hours if she reports another lockout",
          action: "schedule",
        },
      ],
    },
  },
  {
    id: "billing",
    scriptName: "Billing support",
    contactName: "Marcus Chen",
    contactMeta: "Inbound · Billing",
    steps: [
      step(
        "Greet the customer",
        "Hi, thanks for calling JustCall billing. How can I help you today?"
      ),
      step(
        "Confirm the account on the invoice",
        "I can look that up — can I confirm the email on the billing account?"
      ),
      step(
        "Identify the charge in question",
        "What amount and date are you seeing on the statement?"
      ),
      step(
        "Explain the charge",
        "The first $49 is your monthly plan on the 12th. The second is still pending — it often drops off in a few days."
      ),
      step(
        "Offer a resolution",
        "If that pending charge posts, I can reverse it from here. I can also send a confirmation once it's cleared."
      ),
      step(
        "Confirm next steps",
        "I'll watch that pending charge and email you when it's gone. Is there anything else on billing?"
      ),
    ],
    crmRecordLabel: "Marcus Chen",
    moments: [
      { id: "default", label: "Script only", atMs: 800 },
      { id: "question", label: "Billing question", atMs: 6500 },
      { id: "uncertain", label: "Low-confidence answer", atMs: 18600 },
      { id: "end", label: "End of call", atMs: 30000 },
    ],
    conversationActions: [
      {
        id: "act-billing-note",
        integrationId: "hubspot",
        capabilityId: "hs-contact-note",
        title: "Add HubSpot note",
        summary: "Pending $49 charge to watch",
        recordLabel: "Contact",
        recordValue: "Marcus Chen",
        fields: [
          {
            label: "Note",
            value:
              "Second $49 charge still pending. Reverse it if it posts, then email confirmation.",
          },
        ],
        origin: "conversation",
        requiresConfirmation: true,
        // Shows the agent what happens when the CRM is unreachable mid-call.
        simulateFailure: true,
      },
    ],
    events: [
      { atMs: 0, scriptIndex: 0 },
      {
        atMs: 2400,
        speaker: "agent",
        quote: "Hi, thanks for calling JustCall billing. How can I help you today?",
      },
      {
        atMs: 5600,
        speaker: "customer",
        quote: "Hi — I was charged twice this month. Can I get a refund?",
        guidanceIds: ["g-refund"],
      },
      { atMs: 8200, scriptIndex: 1 },
      { atMs: 10800, speaker: "customer", quote: "It's marcus.chen@email.com." },
      { atMs: 12800, scriptIndex: 2 },
      {
        atMs: 15400,
        speaker: "customer",
        quote: "It's $49 on the 12th, and another $49 yesterday.",
      },
      { atMs: 17600, scriptIndex: 3 },
      // Close enough to the refund policy to be worth showing, not close
      // enough to state as the answer — the card says so instead of guessing.
      {
        atMs: 18600,
        speaker: "customer",
        quote: "Can you walk me through the refund process?",
      },
      {
        atMs: 20400,
        speaker: "customer",
        quote: "Oh — so I might not actually be billed twice?",
        skipKnowledge: true,
      },
      { atMs: 22600, scriptIndex: 4 },
      { atMs: 24000, actionId: "act-billing-note" },
      {
        atMs: 25400,
        handledGuidanceId: "g-refund",
      },
      {
        atMs: 27200,
        speaker: "customer",
        quote: "That's all, thank you.",
        skipKnowledge: true,
      },
      { atMs: 29400, scriptIndex: 6 },
    ],
    wrapUp: {
      summary:
        "Marcus saw two $49 charges — one posted on the 12th for the monthly plan, and a second still pending from yesterday. Pending charges often drop off in a few days. He was offered a reversal if the second charge posts, plus an email once it clears.",
      actionItems: [
        {
          id: "watch",
          title: "Watch the pending $49 charge and reverse it if it posts",
        },
        {
          id: "email",
          title: "Email Marcus when the pending charge clears",
          action: "message",
        },
      ],
    },
  },
];

export function scenarioById(id: string): CallScenario {
  return CALL_SCENARIOS.find((item) => item.id === id) ?? CALL_SCENARIOS[0]!;
}

function toSuggestion(
  item: GuidanceItem,
  atMs: number,
  quote: string
): GuidanceSuggestion {
  return {
    id: item.id,
    atMs,
    quote,
    item,
    priority: priorityForGuidance(item),
    stance: stanceForGuidance(item),
  };
}

const PRIORITY_RANK: Record<GuidancePriority, number> = {
  critical: 0,
  high: 1,
  normal: 2,
};

export function sortSuggestions(items: GuidanceSuggestion[]): GuidanceSuggestion[] {
  return [...items].sort((a, b) => {
    const rank = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (rank !== 0) return rank;
    return a.atMs - b.atMs;
  });
}

export function simulationAt(
  scenario: CallScenario,
  elapsedMs: number,
  library: GuidanceItem[] = [],
  libraries: SimulationLibraries = {}
): SimulationSnapshot {
  let scriptIndex = 0;
  const suggestions: GuidanceSuggestion[] = [];
  const handledIds: string[] = [];
  const transcript: TranscriptTurn[] = [];
  const knowledge: KnowledgeSurface[] = [];
  const coaching: CoachingCue[] = [];
  const actions: ActionSurface[] = [];
  let latestQuote: SimulationSnapshot["latestQuote"] = null;
  const shown = new Set<string>();
  const knownEntryIds = new Set<string>();
  const firedActionIds = new Set<string>();
  const live = liveGuidance(library);

  const knowledgeSources = libraries.knowledge ?? SEED_KNOWLEDGE_SOURCES;
  const coachingRules = liveCoachingRules(libraries.coaching ?? SEED_COACHING_RULES);
  const integrations = libraries.integrations ?? SEED_INTEGRATIONS;
  const recordLabel = "Contact";
  const recordValue = scenario.crmRecordLabel ?? scenario.contactName;

  /** Guidance that carries an action proposes it as soon as the card lands. */
  const surfaceGuidanceAction = (item: GuidanceItem, atMs: number) => {
    if (!item.recommendedAction) return;
    const action = actionFromGuidanceConfig(item.recommendedAction, integrations, {
      guidanceId: item.id,
      recordLabel,
      recordValue,
    });
    if (!action || firedActionIds.has(action.id)) return;
    firedActionIds.add(action.id);
    actions.push({ id: action.id, atMs, action });
  };

  const surfaceGuidance = (ids: string[], atMs: number, quote: string) => {
    for (const id of ids) {
      if (shown.has(id)) continue;
      const match = live.find((item) => item.id === id);
      if (!match) continue;
      shown.add(id);
      suggestions.push(toSuggestion(match, atMs, quote));
      surfaceGuidanceAction(match, atMs);
    }
  };

  /**
   * Knowledge only answers what Guidance didn't. Strategic wording wins when
   * the two would speak to the same moment (§36).
   */
  const surfaceKnowledge = (query: string, atMs: number) => {
    for (const hit of retrieveKnowledge(query, knowledgeSources)) {
      if (knownEntryIds.has(hit.entry.id)) continue;
      knownEntryIds.add(hit.entry.id);
      knowledge.push({
        id: hit.entry.id,
        atMs,
        entry: hit.entry,
        sourceName: hit.source.name,
        showSource: hit.source.showSourceToAgents,
        confidence: hit.confidence,
        query,
      });
    }
  };

  for (const event of scenario.events) {
    if (elapsedMs < event.atMs) break;
    if (event.scriptIndex !== undefined) {
      scriptIndex = event.scriptIndex;
    }
    if (event.handledGuidanceId && !handledIds.includes(event.handledGuidanceId)) {
      handledIds.push(event.handledGuidanceId);
    }
    if (event.quote) {
      const speaker = event.speaker ?? "customer";
      transcript.push({ atMs: event.atMs, speaker, quote: event.quote });
      if (speaker === "customer") {
        latestQuote = { atMs: event.atMs, quote: event.quote };
      }
    }

    const quote = event.quote ?? latestQuote?.quote ?? "";
    let matchedGuidance = false;
    if (event.guidanceIds?.length) {
      const before = suggestions.length;
      surfaceGuidance(event.guidanceIds.slice(0, 1), event.atMs, quote);
      matchedGuidance = suggestions.length > before;
    } else if (event.quote && (event.speaker ?? "customer") === "customer") {
      const unused = live.filter((item) => !shown.has(item.id));
      const match = rankGuidanceMatches(unused, event.quote)[0];
      if (match) {
        shown.add(match.id);
        suggestions.push(toSuggestion(match, event.atMs, event.quote));
        surfaceGuidanceAction(match, event.atMs);
        matchedGuidance = true;
      }
    }

    if (event.knowledgeQuery) {
      surfaceKnowledge(event.knowledgeQuery, event.atMs);
    } else if (
      !event.skipKnowledge &&
      !matchedGuidance &&
      event.quote &&
      (event.speaker ?? "customer") === "customer" &&
      looksLikeQuestion(event.quote)
    ) {
      surfaceKnowledge(event.quote, event.atMs);
    }

    if (event.coachingRuleId) {
      const rule = coachingRules.find((item) => item.id === event.coachingRuleId);
      if (rule) {
        coaching.push({
          id: `${rule.id}-${event.atMs}`,
          atMs: event.atMs,
          rule,
          detail: event.coachingDetail ?? coachingReading(rule),
        });
      }
    }

    if (event.actionId) {
      const candidate = scenario.conversationActions?.find(
        (item) => item.id === event.actionId
      );
      if (candidate && !firedActionIds.has(candidate.id)) {
        const capability = capabilityById(
          integrations,
          candidate.integrationId,
          candidate.capabilityId
        );
        const integration = integrationById(integrations, candidate.integrationId);
        // Actions only appear when the admin left that capability switched on.
        if (capability?.enabled && integration?.connected) {
          firedActionIds.add(candidate.id);
          actions.push({
            id: candidate.id,
            atMs: event.atMs,
            action: { ...candidate, recordLabel, recordValue },
          });
        }
      }
    }
  }

  return {
    scriptIndex,
    suggestions,
    handledIds,
    latestQuote,
    transcript,
    wrapped: scriptIndex >= scenario.steps.length,
    knowledge,
    coaching,
    actions,
  };
}

function coachingReading(rule: CoachingRule): string {
  return `${rule.metricLabel} ${rule.threshold} · ${rule.window.toLowerCase()}`;
}

export function nearestMoment(scenario: CallScenario, elapsedMs: number): CallMoment {
  const moments = scenario.moments;
  let current = moments[0] ?? { id: "default", label: "Script only", atMs: 0 };
  for (const moment of moments) {
    if (elapsedMs >= moment.atMs) current = moment;
  }
  return current;
}
