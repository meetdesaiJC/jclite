/**
 * Choreographed during-call demo: a customer with a real problem,
 * the agent following the script, and FAQs surfacing from what was said.
 */

export interface ScriptStep {
  title: string;
  wording?: string;
}

export interface FaqSuggestion {
  id: string;
  atMs: number;
  quote: string;
  question: string;
  answer: string;
}

export interface SimulationEvent {
  atMs: number;
  /** Active script step after this beat. Equal to steps.length when the call is wrapped. */
  scriptIndex?: number;
  quote?: string;
  faq?: Omit<FaqSuggestion, "atMs" | "quote">;
}

export interface CallScenario {
  id: string;
  scriptName: string;
  contactName: string;
  contactMeta: string;
  steps: ScriptStep[];
  events: SimulationEvent[];
}

export interface SimulationSnapshot {
  scriptIndex: number;
  suggestions: FaqSuggestion[];
  latestQuote: { atMs: number; quote: string } | null;
}

export const CALL_SCENARIOS: CallScenario[] = [
  {
    id: "account-issue",
    scriptName: "Customer Support – Account Issue",
    contactName: "Priya Sharma",
    contactMeta: "Inbound · Support",
    steps: [
      {
        title: "Greet the customer",
        wording: "Hi, thanks for calling JustCall support. How can I help you today?",
      },
      {
        title: "Confirm customer name",
        wording: "I'm sorry you're locked out. Before we continue, could you please confirm your full name?",
      },
      {
        title: "Verify account details",
        wording: "And the email address on the account you're trying to open?",
      },
      {
        title: "Ask reason for calling",
        wording: "Thanks Priya. When you try to sign in, what happens?",
      },
      {
        title: "Confirm the reported issue",
        wording:
          "So you're getting an invalid password error, and the reset email never arrived — is that right?",
      },
      {
        title: "Check recent account activity",
        wording: "I'm looking at the account now. There were several failed sign-in attempts this morning.",
      },
      {
        title: "Identify possible cause",
        wording:
          "The account locked after those attempts, and the reset went to an inbox you may not be checking.",
      },
      {
        title: "Guide customer through resolution",
        wording:
          "I'll unlock the account and resend the reset link to priya.sharma@email.com. Can you check that inbox?",
      },
      {
        title: "Confirm issue is resolved",
        wording: "Were you able to sign in with the new password?",
      },
    ],
    events: [
      { atMs: 0, scriptIndex: 0 },
      {
        atMs: 3800,
        quote: "Hi — I can't log in to my account.",
        faq: {
          id: "account-access",
          question: "Account access troubleshooting",
          answer:
            "Ask what happens at sign-in. After you verify the account, send a password reset to the email on file.",
        },
      },
      { atMs: 6200, scriptIndex: 1 },
      { atMs: 9800, quote: "It's Priya Sharma." },
      { atMs: 11800, scriptIndex: 2 },
      { atMs: 15800, quote: "priya.sharma@email.com" },
      { atMs: 17600, scriptIndex: 3 },
      {
        atMs: 21800,
        quote: "It says invalid password. I tried resetting but I never got the email.",
        faq: {
          id: "reset-email",
          question: "Password reset email not received",
          answer:
            "Confirm the email on file, have them check spam, and resend the reset link while you're on the call.",
        },
      },
      { atMs: 24200, scriptIndex: 4 },
      { atMs: 27800, quote: "Yes — that's exactly it." },
      { atMs: 29800, scriptIndex: 5 },
      { atMs: 33800, scriptIndex: 6 },
      { atMs: 37800, scriptIndex: 7 },
      { atMs: 42800, quote: "Okay, I see the email now." },
      { atMs: 44800, scriptIndex: 8 },
      { atMs: 49200, quote: "I'm in. Thank you." },
      { atMs: 51200, scriptIndex: 9 },
    ],
  },
  {
    id: "billing",
    scriptName: "Billing support",
    contactName: "Marcus Chen",
    contactMeta: "Inbound · Billing",
    steps: [
      {
        title: "Greet the customer",
        wording: "Hi, thanks for calling JustCall billing. How can I help you today?",
      },
      {
        title: "Confirm the account on the invoice",
        wording: "I can look that up — can I confirm the email on the billing account?",
      },
      {
        title: "Identify the charge in question",
        wording: "What amount and date are you seeing on the statement?",
      },
      {
        title: "Explain the charge",
        wording:
          "The first $49 is your monthly plan on the 12th. The second is still pending — it often drops off in a few days.",
      },
      {
        title: "Offer a resolution",
        wording:
          "If that pending charge posts, I can reverse it from here. I can also send a confirmation once it's cleared.",
      },
      {
        title: "Confirm next steps",
        wording: "I'll watch that pending charge and email you when it's gone. Is there anything else on billing?",
      },
    ],
    events: [
      { atMs: 0, scriptIndex: 0 },
      {
        atMs: 3600,
        quote: "Hi — I was charged twice this month.",
        faq: {
          id: "duplicate-charge",
          question: "Why was the customer charged twice?",
          answer:
            "Check whether both transactions have completed. Pending authorizations often drop off within 3–5 business days.",
        },
      },
      { atMs: 6000, scriptIndex: 1 },
      { atMs: 9800, quote: "It's marcus.chen@email.com." },
      { atMs: 11600, scriptIndex: 2 },
      {
        atMs: 15800,
        quote: "It's $49 on the 12th, and another $49 yesterday.",
        faq: {
          id: "refund-policy",
          question: "Refund a duplicate billing charge",
          answer:
            "If the second charge posts, refund it to the original payment method. Do not refund a pending authorization.",
        },
      },
      { atMs: 18000, scriptIndex: 3 },
      { atMs: 22800, quote: "Oh — so I might not actually be billed twice?" },
      { atMs: 24800, scriptIndex: 4 },
      { atMs: 29200, quote: "If it posts, a refund would be great." },
      { atMs: 31200, scriptIndex: 5 },
      { atMs: 35200, quote: "That's all, thank you." },
      { atMs: 36800, scriptIndex: 6 },
    ],
  },
];

export function scenarioById(id: string): CallScenario {
  return CALL_SCENARIOS.find((item) => item.id === id) ?? CALL_SCENARIOS[0];
}

export function simulationAt(scenario: CallScenario, elapsedMs: number): SimulationSnapshot {
  let scriptIndex = 0;
  const suggestions: FaqSuggestion[] = [];
  let latestQuote: SimulationSnapshot["latestQuote"] = null;

  for (const event of scenario.events) {
    if (elapsedMs < event.atMs) break;
    if (event.scriptIndex !== undefined) scriptIndex = event.scriptIndex;
    if (event.quote) latestQuote = { atMs: event.atMs, quote: event.quote };
    if (event.faq && event.quote) {
      suggestions.push({
        ...event.faq,
        atMs: event.atMs,
        quote: event.quote,
      });
    }
  }

  return { scriptIndex, suggestions, latestQuote };
}
