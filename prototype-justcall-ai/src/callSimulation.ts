/**
 * Choreographed during-call demo: a customer with a real problem,
 * the agent following the script, and Guidance cards surfacing from
 * what was said — matched against the live Guidance library.
 *
 * Discovery follows one story: Elena is on Aircall, misses after-hours
 * calls, nothing logs to Salesforce, then hesitates on price before
 * booking a working session with her ops lead.
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

export interface ScriptStep {
  title: string;
  wording?: string;
  required?: boolean;
  /** Guidance that appears under this step once the line has been told. */
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
}

export interface CallMoment {
  id: string;
  label: string;
  atMs: number;
}

export interface CallActionItem {
  id: string;
  title: string;
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
  steps: ScriptStep[];
  events: SimulationEvent[];
  moments: CallMoment[];
  wrapUp: CallWrapUp;
}

export interface SimulationSnapshot {
  scriptIndex: number;
  suggestions: GuidanceSuggestion[];
  handledIds: string[];
  latestQuote: { atMs: number; quote: string } | null;
  transcript: TranscriptTurn[];
  wrapped: boolean;
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
    // Story: current tool (Aircall) → missed after-hours → Salesforce
    // logging gap → pricing vs Aircall → book the ops-lead session.
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
        "Explore current workflow",
        "What are you currently using to manage customer calls?",
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
        "What does that cost you in time, missed revenue, or customer experience?",
        false,
        ["g-salesforce"]
      ),
      step(
        "Identify who else cares about this",
        "Who else feels this day to day — ops, support leads, or whoever owns the number?",
        false
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
    moments: [
      { id: "default", label: "Script only", atMs: 800 },
      { id: "competitor", label: "Current tool — Aircall", atMs: 11200 },
      { id: "pain", label: "Missed after-hours calls", atMs: 24000 },
      { id: "crm", label: "Salesforce logging", atMs: 34500 },
      { id: "objection", label: "Pricing vs Aircall", atMs: 49500 },
      { id: "end", label: "End of call", atMs: 61000 },
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
        quote: "What are you currently using to manage customer calls?",
      },
      // Step is told — check it off so the Aircall battlecard can sit under it.
      { atMs: 11200, scriptIndex: 3 },
      {
        atMs: 13500,
        speaker: "customer",
        quote: "We're on Aircall for the phone. SMS is in a separate tool.",
      },
      {
        atMs: 16500,
        speaker: "agent",
        quote:
          "JustCall puts calling, messaging, and CRM in one place — that's usually why teams look. I want the workflow first though.",
      },
      { atMs: 18500, handledGuidanceId: "g-aircall" },
      {
        atMs: 21000,
        speaker: "agent",
        quote:
          "Where does that break down — missed calls, slow follow-up, or the team using different tools for the same job?",
      },
      {
        atMs: 24000,
        speaker: "customer",
        quote:
          "After-hours calls go to voicemail. Follow-up is whoever happens to pick it up.",
        guidanceIds: ["g-after-hours"],
      },
      {
        atMs: 27000,
        speaker: "agent",
        quote:
          "After-hours coverage is usually the first workflow we show — missed-call SMS so the lead isn't sitting until morning.",
      },
      { atMs: 29000, handledGuidanceId: "g-after-hours" },
      { atMs: 30000, scriptIndex: 4 },
      {
        atMs: 31500,
        speaker: "agent",
        quote: "What does that cost you in time, missed revenue, or customer experience?",
      },
      {
        atMs: 34500,
        speaker: "customer",
        quote:
          "Maybe twenty after-hours leads a week. And nothing logs to Salesforce unless someone remembers.",
        guidanceIds: ["g-salesforce"],
      },
      {
        atMs: 37500,
        speaker: "agent",
        quote:
          "Yes — native Salesforce integration. Calls and SMS log to the contact automatically.",
      },
      { atMs: 39500, handledGuidanceId: "g-salesforce" },
      { atMs: 40500, scriptIndex: 5 },
      {
        atMs: 42000,
        speaker: "agent",
        quote:
          "Who else feels this day to day — ops, support leads, or whoever owns the number?",
      },
      {
        atMs: 44000,
        speaker: "customer",
        quote:
          "Our ops lead sees the missed-call list every morning. She'd need to be in a next conversation.",
      },
      { atMs: 45500, scriptIndex: 6 },
      {
        atMs: 47000,
        speaker: "agent",
        quote:
          "If this still looks relevant, the useful next step is a 30-minute working session with your ops lead.",
      },
      {
        atMs: 49500,
        speaker: "customer",
        quote:
          "A working session could work, but Aircall is cheaper. Not sure I can sell a more expensive tool internally.",
        guidanceIds: ["g-pricing"],
      },
      {
        atMs: 52500,
        speaker: "agent",
        quote:
          "Pricing includes calling, messaging, and CRM in one place — so you're not stacking extra tools. We can size the plan to the seats you'd actually use.",
      },
      { atMs: 54500, handledGuidanceId: "g-pricing" },
      { atMs: 55500, scriptIndex: 7 },
      {
        atMs: 57000,
        speaker: "agent",
        quote:
          "Let's lock a time this week. If we can show the missed-call workflow in their language, we'll know whether a trial is worth it.",
      },
      {
        atMs: 59000,
        speaker: "customer",
        quote: "Thursday afternoon is open. I'll bring the ops lead.",
      },
      { atMs: 61000, scriptIndex: 8 },
    ],
    wrapUp: {
      summary:
        "Elena is on Aircall today and evaluating JustCall so calling, SMS, and CRM live in one place. After-hours calls go to voicemail with no owner, and nothing logs to Salesforce unless someone remembers — about twenty missed leads a week. She wants a Thursday afternoon working session with her ops lead, but needs help selling a higher price internally versus Aircall.",
      actionItems: [
        {
          id: "session",
          title: "Book Thursday afternoon with Elena and her ops lead",
        },
        {
          id: "recap",
          title: "Send a recap of Salesforce logging and after-hours coverage",
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
    moments: [
      { id: "default", label: "Script only", atMs: 800 },
      { id: "refund", label: "Refund guidance", atMs: 5600 },
      { id: "stacked", label: "Three cues", atMs: 18600 },
      { id: "handled", label: "Compliance covered", atMs: 30000 },
      { id: "end", label: "End of call", atMs: 42000 },
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
        atMs: 18200,
        speaker: "customer",
        quote: "And this plan is more expensive than I expected for what I'm getting.",
        guidanceIds: ["g-pricing"],
      },
      {
        atMs: 22600,
        speaker: "agent",
        quote:
          "Please don't share card details on this call. I'll send a secure payment link instead.",
      },
      {
        atMs: 30000,
        handledGuidanceId: "g-pci",
      },
      { atMs: 32800, scriptIndex: 3 },
      { atMs: 35600, speaker: "customer", quote: "Okay — I won't read the card." },
      { atMs: 38000, scriptIndex: 4 },
      { atMs: 40400, speaker: "customer", quote: "I see the reset email now." },
      { atMs: 42800, scriptIndex: 5 },
      { atMs: 44800, speaker: "customer", quote: "I'm in. Thank you." },
      { atMs: 47200, scriptIndex: 6 },
    ],
    wrapUp: {
      summary:
        "Priya couldn't sign in after several failed attempts and also thought she was charged twice. The account was unlocked and a reset email was sent; she confirmed she was back in. Card details were not collected on the call — a secure payment link is the path if a refund is still needed.",
      actionItems: [
        {
          id: "access",
          title: "Confirm the reset email resolved access",
        },
        {
          id: "billing",
          title: "Review priya.sharma@email.com for a duplicate charge",
        },
        {
          id: "follow-up",
          title: "Follow up in 24 hours if she reports another lockout",
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
    moments: [
      { id: "default", label: "Script only", atMs: 800 },
      { id: "question", label: "Billing question", atMs: 6500 },
      { id: "end", label: "End of call", atMs: 30000 },
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
      {
        atMs: 20400,
        speaker: "customer",
        quote: "Oh — so I might not actually be billed twice?",
      },
      { atMs: 22600, scriptIndex: 4 },
      {
        atMs: 25400,
        handledGuidanceId: "g-refund",
      },
      { atMs: 27200, speaker: "customer", quote: "That's all, thank you." },
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
  library: GuidanceItem[] = []
): SimulationSnapshot {
  let scriptIndex = 0;
  const suggestions: GuidanceSuggestion[] = [];
  const handledIds: string[] = [];
  const transcript: TranscriptTurn[] = [];
  let latestQuote: SimulationSnapshot["latestQuote"] = null;
  const shown = new Set<string>();
  const live = liveGuidance(library);

  const surfaceGuidance = (ids: string[], atMs: number, quote: string) => {
    for (const id of ids) {
      if (shown.has(id)) continue;
      const match = live.find((item) => item.id === id);
      if (!match) continue;
      shown.add(id);
      suggestions.push(toSuggestion(match, atMs, quote));
    }
  };

  for (const event of scenario.events) {
    if (elapsedMs < event.atMs) break;
    if (event.scriptIndex !== undefined) {
      const previousIndex = scriptIndex;
      scriptIndex = event.scriptIndex;
      // A completed step has been told — surface the cards that belong to it.
      if (scriptIndex > previousIndex) {
        for (let index = previousIndex; index < scriptIndex; index += 1) {
          const completed = scenario.steps[index];
          const related = completed?.relatedGuidanceIds;
          if (!related?.length) continue;
          surfaceGuidance(
            related,
            event.atMs,
            event.quote ?? completed.wording ?? latestQuote?.quote ?? ""
          );
        }
      }
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
    if (event.guidanceIds?.length) {
      surfaceGuidance(event.guidanceIds, event.atMs, quote);
    } else if (event.quote && (event.speaker ?? "customer") === "customer") {
      const unused = live.filter((item) => !shown.has(item.id));
      const matches = rankGuidanceMatches(unused, event.quote).slice(0, 3);
      for (const match of matches) {
        shown.add(match.id);
        suggestions.push(toSuggestion(match, event.atMs, event.quote));
      }
    }
  }

  return {
    scriptIndex,
    suggestions: sortSuggestions(suggestions),
    handledIds,
    latestQuote,
    transcript,
    wrapped: scriptIndex >= scenario.steps.length,
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
