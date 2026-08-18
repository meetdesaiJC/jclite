/**
 * Choreographed during-call demo for stakeholders. One discovery call walks
 * the in-call surface through its full vocabulary, in this rhythm:
 *
 *   Script → Knowledge → Guidance → Coaching → Script → Guidance → Coaching
 *   → Action → Action → Combined suggestions → wrap → completed cards
 */

import {
  guidanceMatchesUtterance,
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
  coachingCardMessage,
  liveCoachingRules,
  type CoachingRule,
} from "./coachingData";
import {
  SEED_ACTIONS,
  SEED_INTEGRATIONS,
  actionMatchesUtterance,
  liveActions,
  patchSuggestedValue,
  suggestedActionFromLibrary,
  type ActionState,
  type AgentAction,
  type Integration,
  type SuggestedAction,
} from "./actionsData";

/** After the script wraps, keep default cards this long before resolved / sent. */
export const POST_WRAP_COMPLETED_DELAY_MS = 5000;

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
  /**
   * When the conversation last came back to this topic. The panel re-activates
   * the card that already covers it instead of stacking a duplicate (§9).
   */
  repeatAtMs?: number;
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
  /** Filename or hostname, shown under the source name when available. */
  sourceOrigin?: string;
  /** The admin can publish a source without exposing where it came from. */
  showSource: boolean;
  confidence: KnowledgeConfidence;
  /** Retrieval question — used to tell when the topic has moved on. */
  query: string;
}

  /** A behaviour nudge. Temporary — title, what happened, Got it. */
export interface CoachingCue {
  id: string;
  atMs: number;
  rule: CoachingRule;
  /** Natural observation under the title, e.g. "You've spoken for 75% of the last 2 minutes." */
  detail: string;
  /** The behaviour improved — the cue stays as history, not as an interrupt. */
  resolved?: boolean;
}

export interface ActionSurface {
  id: string;
  atMs: number;
  action: SuggestedAction;
  /** Demo-driven review / completion. Agents can still take over from here. */
  state?: ActionState;
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
  /**
   * Don't surface conversation-detected actions on this beat. Used so the
   * stakeholder demo can introduce Actions on their own, not the moment a
   * competitor is named.
   */
  skipActions?: boolean;
  /** Fire a coaching banner from a live rule. */
  coachingRuleId?: string;
  /** Natural observation under the title. Falls back to the rule's generated copy. */
  coachingDetail?: string;
  /** Mark these live cues as resolved — the behaviour has improved. */
  resolveCoachingIds?: string[];
  /** Surface one of the scenario's conversation-detected actions. */
  actionId?: string;
  /** Drive review / completion / collapse for the action on this beat. */
  actionState?: ActionState;
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
  /** Every cue fired so far — the panel keeps them stacked for the call. */
  coaching: CoachingCue[];
  actions: ActionSurface[];
}

/** Live libraries the runtime reads. Defaults to the seeded admin setup. */
export interface SimulationLibraries {
  knowledge?: KnowledgeSourceRecord[];
  coaching?: CoachingRule[];
  integrations?: Integration[];
  actions?: AgentAction[];
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
        ["g-status-quo", "g-aircall"]
      ),
      step(
        "Uncover the pain behind the process",
        "Where does that break down — missed calls, slow follow-up, or the team using different tools for the same job?",
        true,
        ["g-discovery"]
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
    crmRecordLabel: "Acme Corp",
    moments: [
      { id: "connect", label: "Call connects", atMs: 800 },
      { id: "script", label: "Script progression", atMs: 5500 },
      { id: "product-knowledge", label: "Product knowledge", atMs: 15000 },
      { id: "policy-knowledge", label: "Policy knowledge", atMs: 22000 },
      { id: "objection", label: "Objection guidance", atMs: 32500 },
      { id: "talk-ratio", label: "Talk-ratio coaching", atMs: 39500 },
      { id: "discovery", label: "Discovery guidance", atMs: 46500 },
      { id: "interrupt", label: "Interruption coaching", atMs: 51000 },
      { id: "sentiment", label: "Sentiment coaching", atMs: 53500 },
      { id: "pricing", label: "Pricing guidance", atMs: 61000 },
      { id: "send", label: "Send action", atMs: 66500 },
      { id: "crm", label: "CRM update", atMs: 73500 },
      { id: "task", label: "Follow-up task", atMs: 80500 },
      { id: "schedule", label: "Schedule meeting", atMs: 87500 },
      { id: "combined", label: "Knowledge + guidance", atMs: 95500 },
      { id: "priority", label: "Guidance + coaching", atMs: 99000 },
      { id: "queue", label: "New while reading", atMs: 102000 },
      { id: "end", label: "End of call", atMs: 122000 },
      {
        id: "resolved",
        label: "Resolved suggestions",
        atMs: 122000 + POST_WRAP_COMPLETED_DELAY_MS,
      },
    ],
    conversationActions: [
      {
        id: "act-send-comparison",
        actionId: "act-send-comparison",
        integrationId: "hubspot",
        capabilityId: "hs-send-email",
        title: "Send Aircall comparison",
        summary: "One-pager · email",
        recordLabel: "Contact",
        recordValue: "Elena Vasquez",
        fields: [
          { label: "To", value: "Elena Vasquez" },
          { label: "Channel", value: "Email" },
          { label: "Asset", value: "Aircall comparison one-pager" },
        ],
        origin: "conversation",
        requiresConfirmation: true,
        viewUrl: "https://app.hubspot.com",
      },
      {
        id: "act-update-competitor",
        actionId: "act-update-competitor",
        integrationId: "hubspot",
        capabilityId: "hs-update-property",
        title: "Update competitor",
        summary: "Competitor · Aircall",
        recordLabel: "Deal",
        recordValue: "Acme Corp",
        fields: [
          { label: "Property", value: "Competitor" },
          { label: "New value", value: "Aircall" },
        ],
        origin: "conversation",
        requiresConfirmation: true,
        viewUrl: "https://app.hubspot.com",
      },
      {
        id: "act-followup-task",
        actionId: "act-followup-task",
        integrationId: "salesforce",
        capabilityId: "sf-task",
        title: "Create follow-up task",
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
        viewUrl: "https://login.salesforce.com",
      },
      {
        id: "act-schedule-meeting",
        actionId: "act-schedule-meeting",
        integrationId: "salesforce",
        capabilityId: "sf-event",
        title: "Schedule working session",
        summary: "Thursday afternoon · 30 min",
        recordLabel: "Contact",
        recordValue: "Elena Vasquez",
        fields: [
          { label: "When", value: "Thursday afternoon" },
          { label: "Attendees", value: "Elena Vasquez + ops lead" },
          { label: "Duration", value: "30 minutes" },
        ],
        origin: "conversation",
        requiresConfirmation: true,
        viewUrl: "https://login.salesforce.com",
      },
    ],
    events: [
      // 1. Call connects — bar, script, live transcript
      { atMs: 0, scriptIndex: 0 },
      {
        atMs: 1800,
        speaker: "agent",
        quote:
          "I'd love to spend this time understanding how you're handling calls today, then see if it's worth a closer look.",
      },
      {
        atMs: 4200,
        speaker: "customer",
        quote: "Sure — I've got about 30 minutes.",
        skipKnowledge: true,
        skipActions: true,
      },
      // 2. First script item completes, next step becomes active
      { atMs: 5500, scriptIndex: 1 },
      {
        atMs: 6800,
        speaker: "agent",
        quote: "We've got about 30 minutes. Is anyone else joining, or is it just us?",
      },
      {
        atMs: 9200,
        speaker: "customer",
        quote: "Just me — our ops lead couldn't make this one.",
        skipKnowledge: true,
        skipActions: true,
      },
      { atMs: 10200, scriptIndex: 2 },
      {
        atMs: 11800,
        speaker: "agent",
        quote: "Walk me through how this works on your team today.",
      },
      // 3. Product knowledge
      {
        atMs: 15000,
        speaker: "customer",
        quote: "If we switch, can we keep our existing numbers?",
        knowledgeQuery: "can we keep our numbers",
        skipActions: true,
      },
      {
        atMs: 18500,
        speaker: "agent",
        quote:
          "Yes — local numbers typically take 5–10 business days, with no downtime during the switch.",
      },
      // 4. Policy/process knowledge — previous knowledge stays accessible
      {
        atMs: 22000,
        speaker: "customer",
        quote: "And how long do you keep call recordings? Compliance will ask.",
        knowledgeQuery: "how long do you keep recordings",
        skipActions: true,
      },
      {
        atMs: 25500,
        speaker: "agent",
        quote:
          "Twelve months on standard plans, and we can extend that to twenty-four if your policy needs it.",
      },
      {
        atMs: 29000,
        speaker: "agent",
        quote: "Got it. What's the tool stack on the team today?",
      },
      // 5. Objection-handling guidance
      {
        atMs: 32500,
        speaker: "customer",
        quote: "We're pretty happy with Aircall actually. Not sure why we'd switch.",
        guidanceIds: ["g-status-quo"],
        skipActions: true,
      },
      {
        atMs: 36500,
        speaker: "agent",
        quote:
          "Totally fair if calling is working. The teams who look at us usually have a gap — after-hours coverage, SMS sitting in another tool, or nothing logging to the CRM. I'd rather find out whether that's you than pitch you on a switch you don't need. JustCall puts calling, messaging, and CRM in one place, which is usually the reason, but I want the workflow first so we're not comparing feature lists.",
      },
      // 6. Talk-ratio coaching
      {
        atMs: 39500,
        coachingRuleId: "cr-overtalking",
        coachingDetail: "You've spoken for 75% of the last 2 minutes.",
      },
      // 7. Script progresses from the conversation
      { atMs: 41500, scriptIndex: 3 },
      {
        atMs: 43000,
        speaker: "agent",
        quote:
          "Where does that break down — missed calls, slow follow-up, or the team using different tools for the same job?",
      },
      // 8. Discovery guidance
      {
        atMs: 46500,
        speaker: "customer",
        quote:
          "After-hours calls go to voicemail. Follow-up is whoever happens to pick it up.",
        guidanceIds: ["g-discovery"],
        skipActions: true,
      },
      {
        atMs: 49500,
        speaker: "agent",
        quote: "Right, so the—",
      },
      // 9. Interruption / overtalk coaching
      {
        atMs: 51000,
        coachingRuleId: "cr-interruptions",
        coachingDetail: "You've interrupted the customer 3 times recently.",
      },
      // 10. Sentiment / empathy coaching
      {
        atMs: 53500,
        speaker: "customer",
        quote:
          "That's twenty missed leads a week. The team is exhausted chasing them the next morning.",
        skipKnowledge: true,
        skipActions: true,
        coachingRuleId: "cr-frustration",
        coachingDetail: "The customer is showing signs of frustration.",
      },
      { atMs: 56000, scriptIndex: 4 },
      {
        atMs: 57500,
        speaker: "agent",
        quote:
          "That's a real cost. If this still looks relevant, the useful next step is a 30-minute working session with your ops lead.",
      },
      // 11. Pricing / competitor / positioning guidance
      {
        atMs: 61000,
        speaker: "customer",
        quote:
          "A working session could work, but Aircall is cheaper. Not sure I can sell a more expensive tool internally.",
        guidanceIds: ["g-pricing"],
        skipActions: true,
      },
      {
        atMs: 64500,
        speaker: "agent",
        quote:
          "I'll send you a one-page comparison you can forward internally — calling, messaging, and CRM on one plan versus stacking add-ons.",
      },
      // 12. Send/share action — review, then rest on the default card until wrap.
      { atMs: 66500, actionId: "act-send-comparison" },
      { atMs: 68500, actionId: "act-send-comparison", actionState: "reviewing" },
      { atMs: 71000, actionId: "act-send-comparison", actionState: "suggested" },
      // 13. CRM update — same: review, then default until wrap.
      { atMs: 73500, actionId: "act-update-competitor" },
      { atMs: 75500, actionId: "act-update-competitor", actionState: "reviewing" },
      { atMs: 78000, actionId: "act-update-competitor", actionState: "suggested" },
      {
        atMs: 79500,
        speaker: "customer",
        quote: "Thursday afternoon could work if we bring ops.",
        skipKnowledge: true,
        skipActions: true,
      },
      // 14. Create task — review, then default until wrap.
      { atMs: 80500, actionId: "act-followup-task" },
      { atMs: 82500, actionId: "act-followup-task", actionState: "reviewing" },
      { atMs: 85000, actionId: "act-followup-task", actionState: "suggested" },
      // 15. Schedule meeting — reviewed, then left open so wrap-up still has work.
      { atMs: 87500, actionId: "act-schedule-meeting" },
      { atMs: 89500, actionId: "act-schedule-meeting", actionState: "reviewing" },
      { atMs: 92000, actionId: "act-schedule-meeting", actionState: "suggested" },
      { atMs: 94000, scriptIndex: 5 },
      // 16. Knowledge + guidance together
      {
        atMs: 95500,
        speaker: "customer",
        quote: "Our ops lead lives in Salesforce. Will calls actually log there?",
        guidanceIds: ["g-salesforce"],
        knowledgeQuery: "does justcall integrate with salesforce",
        skipActions: true,
      },
      // 17. Guidance + coaching together — coaching is the interrupt, guidance stays
      {
        atMs: 99000,
        coachingRuleId: "cr-overtalking",
        coachingDetail: "You've spoken for 75% of the last 2 minutes.",
      },
      // 18. New suggestion while the agent is still on an open card
      {
        atMs: 102000,
        speaker: "customer",
        quote: "And how are you different from Aircall on the SMS side?",
        guidanceIds: ["g-aircall"],
        skipActions: true,
      },
      // 19. Multiple suggestions sit together — New / current / Earlier
      { atMs: 105000, handledGuidanceId: "g-status-quo" },
      { atMs: 106000, handledGuidanceId: "g-discovery" },
      // 20. Guidance covered — coaching and actions stay in their default cards.
      { atMs: 108000, handledGuidanceId: "g-pricing" },
      // 21. Remaining script steps complete
      { atMs: 112000, scriptIndex: 6 },
      {
        atMs: 114000,
        speaker: "agent",
        quote:
          "Let's lock a time this week. If we can show the missed-call workflow in their language, we'll know whether a trial is worth it.",
      },
      {
        atMs: 117000,
        speaker: "customer",
        quote: "Thursday afternoon is open. I'll bring the ops lead.",
        skipKnowledge: true,
        skipActions: true,
      },
      { atMs: 118500, scriptIndex: 7 },
      {
        atMs: 120000,
        speaker: "agent",
        quote:
          "Perfect. Success looks like after-hours coverage and Salesforce logging in a workflow your ops lead recognizes.",
      },
      { atMs: 122000, scriptIndex: 8 },
      // 22. Five seconds after wrap: resolved coaching and sent/done actions.
      {
        atMs: 122000 + POST_WRAP_COMPLETED_DELAY_MS,
        resolveCoachingIds: ["cr-overtalking", "cr-interruptions"],
      },
      {
        atMs: 122000 + POST_WRAP_COMPLETED_DELAY_MS + 200,
        actionId: "act-send-comparison",
        actionState: "done",
      },
      {
        atMs: 122000 + POST_WRAP_COMPLETED_DELAY_MS + 400,
        actionId: "act-update-competitor",
        actionState: "done",
      },
      {
        atMs: 122000 + POST_WRAP_COMPLETED_DELAY_MS + 600,
        actionId: "act-followup-task",
        actionState: "done",
      },
    ],
    wrapUp: {
      summary:
        "Elena is on Aircall today and evaluating JustCall so calling, SMS, and CRM live in one place. After-hours calls go to voicemail with no owner — about twenty missed leads a week — and nothing logs to Salesforce unless someone remembers. She wants a Thursday afternoon working session with her ops lead, and needs a one-pager to sell a higher price internally versus Aircall.",
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
        actionId: "act-billing-ticket",
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
        coachingDetail: "The customer is showing signs of frustration.",
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
        actionId: "act-billing-note",
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
  const actionLibrary = liveActions(libraries.actions ?? SEED_ACTIONS);
  const recordValue = scenario.crmRecordLabel ?? scenario.contactName;

  const recordFor = (action: AgentAction) => ({
    recordLabel: action.object || "Record",
    recordValue,
    customerName: scenario.contactName,
    company: scenario.crmRecordLabel,
  });

  const upsertAction = (
    libraryAction: AgentAction,
    atMs: number,
    quote: string,
    origin: SuggestedAction["origin"]
  ) => {
    const next = suggestedActionFromLibrary(libraryAction, integrations, {
      ...recordFor(libraryAction),
      utterance: quote,
      origin,
    });
    if (!next) return;

    const existingIndex = actions.findIndex((item) => item.action.actionId === libraryAction.id);
    if (existingIndex >= 0) {
      const existing = actions[existingIndex]!;
      actions[existingIndex] = {
        ...existing,
        action: patchSuggestedValue(existing.action, next),
      };
      return;
    }
    firedActionIds.add(libraryAction.id);
    actions.push({ id: libraryAction.id, atMs, action: next });
  };

  const surfaceAiActions = (quote: string, atMs: number) => {
    for (const libraryAction of actionLibrary) {
      if (libraryAction.trigger !== "ai_recommended") continue;
      if (!actionMatchesUtterance(libraryAction, quote)) continue;
      upsertAction(libraryAction, atMs, quote, "ai");
    }
  };

  const surfaceGuidance = (ids: string[], atMs: number, quote: string) => {
    for (const id of ids) {
      if (shown.has(id)) continue;
      const match = live.find((item) => item.id === id);
      if (!match) continue;
      shown.add(id);
      suggestions.push(toSuggestion(match, atMs, quote));
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
        sourceOrigin: hit.source.origin,
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
    const withActions = !event.skipActions;
    let matchedGuidance = false;
    if (event.guidanceIds?.length) {
      const before = suggestions.length;
      surfaceGuidance(event.guidanceIds, event.atMs, quote);
      matchedGuidance = suggestions.length > before;
    } else if (event.quote && (event.speaker ?? "customer") === "customer") {
      const unused = live.filter((item) => !shown.has(item.id));
      const match = rankGuidanceMatches(unused, event.quote)[0];
      if (match) {
        shown.add(match.id);
        suggestions.push(toSuggestion(match, event.atMs, event.quote));
        matchedGuidance = true;
      }
    }

    if (event.quote && (event.speaker ?? "customer") === "customer") {
      if (withActions) surfaceAiActions(event.quote, event.atMs);
      /**
       * A topic can come back — "Aircall is cheaper" is the customer returning
       * to the competitor they already named. That re-activates the card that
       * already covers it rather than adding a second one (§9).
       */
      for (const existing of suggestions) {
        if (existing.atMs === event.atMs) continue;
        const again =
          event.guidanceIds?.includes(existing.id) === true ||
          guidanceMatchesUtterance(existing.item, event.quote);
        if (!again) continue;
        existing.repeatAtMs = event.atMs;
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
          detail: event.coachingDetail ?? coachingCardMessage(rule),
        });
      }
    }

    if (event.resolveCoachingIds?.length) {
      for (const cue of coaching) {
        if (event.resolveCoachingIds.includes(cue.rule.id)) {
          cue.resolved = true;
        }
      }
    }

    if (event.actionId) {
      const already = actions.find(
        (item) => item.id === event.actionId || item.action.actionId === event.actionId
      );
      if (!already) {
        const candidate = scenario.conversationActions?.find(
          (item) => item.id === event.actionId
        );
        if (candidate && !firedActionIds.has(candidate.id)) {
          firedActionIds.add(candidate.id);
          actions.push({
            id: candidate.id,
            atMs: event.atMs,
            action: {
              ...candidate,
              actionId: candidate.actionId || candidate.id,
              recordValue,
            },
          });
        } else {
          const libraryAction = actionLibrary.find((item) => item.id === event.actionId);
          if (libraryAction) {
            upsertAction(libraryAction, event.atMs, quote, "conversation");
          }
        }
      }
    }

    if (event.actionState) {
      const targetId = event.actionId;
      const existing = targetId
        ? actions.find(
            (item) => item.id === targetId || item.action.actionId === targetId
          )
        : actions[actions.length - 1];
      if (existing) existing.state = event.actionState;
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

export function nearestMoment(scenario: CallScenario, elapsedMs: number): CallMoment {
  const moments = scenario.moments;
  let current = moments[0] ?? { id: "default", label: "Script only", atMs: 0 };
  for (const moment of moments) {
    if (elapsedMs >= moment.atMs) current = moment;
  }
  return current;
}
