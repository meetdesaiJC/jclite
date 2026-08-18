import type { DropdownListItem } from "@/components/Dropdown";

/**
 * Coaching — how the agent is talking, not what they are talking about.
 *
 * Admins still configure detection (signal, threshold, window). The in-call
 * card never shows that language. It always reads as:
 *   Title  — what the agent should do
 *   Message — what the system noticed
 *   Action — Got it
 */

export type CoachingTemplateId =
  | "overtalking"
  | "monologue"
  | "silence"
  | "interruptions"
  | "crosstalk"
  | "pace"
  | "pace-slow"
  | "frustration"
  | "negative-sentiment"
  | "confusion"
  | "repeated-question"
  | "low-engagement"
  | "filler-words"
  | "listening-ratio"
  | "no-questions"
  | "discovery"
  | "empathy"
  | "objection"
  | "escalation"
  | "compliance"
  | "required-question"
  | "required-step";

/**
 * What kind of signal this template is. Color + icon on the in-call card
 * follow the signal, not the individual template, so agents can categorise
 * at a glance: heart/orange, chat/purple, speak/blue, speedometer/teal,
 * timer/blue, shield/red.
 */
export type CoachingSignal =
  | "sentiment"
  | "interrupt"
  | "talk"
  | "pace"
  | "monologue"
  | "compliance";

/** The wash on the card. Talk and monologue share blue; the icon splits them. */
export type CoachingAccent = "orange" | "purple" | "blue" | "teal" | "red";

const SIGNAL_ACCENT: Record<CoachingSignal, CoachingAccent> = {
  sentiment: "orange",
  interrupt: "purple",
  talk: "blue",
  pace: "teal",
  monologue: "blue",
  compliance: "red",
};

const TEMPLATE_SIGNAL: Record<CoachingTemplateId, CoachingSignal> = {
  frustration: "sentiment",
  "negative-sentiment": "sentiment",
  empathy: "sentiment",
  objection: "sentiment",
  escalation: "sentiment",
  confusion: "sentiment",
  "repeated-question": "sentiment",
  interruptions: "interrupt",
  crosstalk: "interrupt",
  overtalking: "talk",
  "listening-ratio": "talk",
  "low-engagement": "talk",
  "no-questions": "talk",
  pace: "pace",
  "pace-slow": "pace",
  "filler-words": "pace",
  monologue: "monologue",
  silence: "monologue",
  compliance: "compliance",
  "required-question": "compliance",
  "required-step": "compliance",
  discovery: "compliance",
};

export function coachingSignal(id: CoachingTemplateId): CoachingSignal {
  return TEMPLATE_SIGNAL[id];
}

export function coachingAccent(id: CoachingTemplateId): CoachingAccent {
  return SIGNAL_ACCENT[coachingSignal(id)];
}

export type CoachingFrequency = "once" | "on-return" | "cooldown";

export type CoachingTemplateGroup =
  | "conversation-balance"
  | "communication"
  | "customer-experience"
  | "call-coverage";

export const COACHING_TEMPLATE_GROUPS: {
  id: CoachingTemplateGroup;
  label: string;
}[] = [
  { id: "conversation-balance", label: "Conversation balance" },
  { id: "communication", label: "Communication" },
  { id: "customer-experience", label: "Customer experience" },
  { id: "call-coverage", label: "Required coverage" },
];

export interface CoachingTemplate {
  id: CoachingTemplateId;
  group: CoachingTemplateGroup;
  name: string;
  /** What the admin is choosing to detect, in their words. */
  description: string;
  /** The measured signal, e.g. "Agent talk ratio". */
  metricLabel: string;
  /** Comparator wording — "Greater than", "Below", "Longer than". */
  comparator: string;
  thresholdOptions: string[];
  defaultThreshold: string;
  windowOptions: string[];
  defaultWindow: string;
  startAfterOptions: string[];
  defaultStartAfter: string;
  /** In-call title — a short coaching instruction. */
  message: string;
  defaultFrequency: CoachingFrequency;
}

const WINDOW_OPTIONS = ["Last 1 minute", "Last 2 minutes", "Last 5 minutes", "Whole call"];
const START_AFTER_OPTIONS = [
  "Immediately",
  "1 minute into call",
  "2 minutes into call",
  "3 minutes into call",
  "5 minutes into call",
];
const ANY_POINT = ["At any point"];
const DURATION_OPTIONS = ["8 seconds", "12 seconds", "20 seconds", "30 seconds", "60 seconds"];
const COUNT_OPTIONS = ["2", "3", "4", "5"];
const PRESENT_OPTIONS = ["Raised"];
const MISSING_OPTIONS = ["Not covered yet"];

export const COACHING_TEMPLATES: CoachingTemplate[] = [
  {
    id: "overtalking",
    group: "conversation-balance",
    name: "High talk ratio",
    description: "The agent has been holding most of the conversation.",
    metricLabel: "Agent talk ratio",
    comparator: "Greater than",
    thresholdOptions: ["60%", "65%", "70%", "75%", "80%", "85%"],
    defaultThreshold: "75%",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 2 minutes",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "3 minutes into call",
    message: "Give the customer more room to speak",
    defaultFrequency: "on-return",
  },
  {
    id: "monologue",
    group: "conversation-balance",
    name: "Long monologue",
    description: "The agent has been speaking without a break.",
    metricLabel: "Agent monologue",
    comparator: "Longer than",
    thresholdOptions: DURATION_OPTIONS,
    defaultThreshold: "60 seconds",
    windowOptions: ANY_POINT,
    defaultWindow: "At any point",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "1 minute into call",
    message: "Pause and bring the customer in",
    defaultFrequency: "on-return",
  },
  {
    id: "silence",
    group: "conversation-balance",
    name: "Long silence",
    description: "The conversation stays silent for an unusual duration.",
    metricLabel: "Silence",
    comparator: "Longer than",
    thresholdOptions: ["5 seconds", "8 seconds", "12 seconds", "20 seconds"],
    defaultThreshold: "12 seconds",
    windowOptions: ANY_POINT,
    defaultWindow: "At any point",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "Immediately",
    message: "Keep the conversation moving",
    defaultFrequency: "cooldown",
  },
  {
    id: "interruptions",
    group: "conversation-balance",
    name: "Interruptions",
    description: "The agent repeatedly cuts in while the customer is talking.",
    metricLabel: "Interruptions",
    comparator: "More than",
    thresholdOptions: COUNT_OPTIONS,
    defaultThreshold: "3",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 2 minutes",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "1 minute into call",
    message: "Let the customer finish",
    defaultFrequency: "on-return",
  },
  {
    id: "crosstalk",
    group: "conversation-balance",
    name: "Overtalking",
    description: "Agent and customer are speaking over each other.",
    metricLabel: "Overlapping speech",
    comparator: "More than",
    thresholdOptions: COUNT_OPTIONS,
    defaultThreshold: "3",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 2 minutes",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "1 minute into call",
    message: "Give the customer a moment to respond",
    defaultFrequency: "on-return",
  },
  {
    id: "listening-ratio",
    group: "conversation-balance",
    name: "Low listening ratio",
    description: "The customer has had little time to speak.",
    metricLabel: "Customer talk time",
    comparator: "Below",
    thresholdOptions: ["20%", "25%", "30%", "40%"],
    defaultThreshold: "30%",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 2 minutes",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "3 minutes into call",
    message: "Spend a little more time listening",
    defaultFrequency: "on-return",
  },
  {
    id: "low-engagement",
    group: "conversation-balance",
    name: "Low engagement",
    description: "The customer has gone quieter than earlier in the call.",
    metricLabel: "Customer responses",
    comparator: "Below",
    thresholdOptions: ["Earlier in the call"],
    defaultThreshold: "Earlier in the call",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 2 minutes",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "3 minutes into call",
    message: "Bring the customer back into the conversation",
    defaultFrequency: "on-return",
  },
  {
    id: "pace",
    group: "communication",
    name: "Speaking too fast",
    description: "The agent is talking faster than their usual pace.",
    metricLabel: "Agent speech rate",
    comparator: "Greater than",
    thresholdOptions: ["150 wpm", "165 wpm", "180 wpm", "200 wpm"],
    defaultThreshold: "180 wpm",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 1 minute",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "1 minute into call",
    message: "Slow down a little",
    defaultFrequency: "on-return",
  },
  {
    id: "pace-slow",
    group: "communication",
    name: "Speaking too slowly",
    description: "The agent is talking more slowly than their usual pace.",
    metricLabel: "Agent speech rate",
    comparator: "Below",
    thresholdOptions: ["110 wpm", "120 wpm", "130 wpm", "140 wpm"],
    defaultThreshold: "120 wpm",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 1 minute",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "1 minute into call",
    message: "Pick up the pace a little",
    defaultFrequency: "on-return",
  },
  {
    id: "filler-words",
    group: "communication",
    name: "Too many filler words",
    description: "The agent is using fillers more often than usual.",
    metricLabel: "Filler words",
    comparator: "Greater than",
    thresholdOptions: ["Usual pace"],
    defaultThreshold: "Usual pace",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 1 minute",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "1 minute into call",
    message: "Keep your delivery clear",
    defaultFrequency: "on-return",
  },
  {
    id: "no-questions",
    group: "communication",
    name: "No recent questions",
    description: "The agent hasn't asked the customer anything recently.",
    metricLabel: "Agent questions",
    comparator: "Below",
    thresholdOptions: ["1"],
    defaultThreshold: "1",
    windowOptions: ["Last 2 minutes", "Last 5 minutes"],
    defaultWindow: "Last 2 minutes",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "3 minutes into call",
    message: "Ask the customer a question",
    defaultFrequency: "on-return",
  },
  {
    id: "confusion",
    group: "communication",
    name: "Customer confusion",
    description: "The customer may be having trouble following.",
    metricLabel: "Customer confusion",
    comparator: "Is",
    thresholdOptions: PRESENT_OPTIONS,
    defaultThreshold: "Raised",
    windowOptions: ANY_POINT,
    defaultWindow: "At any point",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "Immediately",
    message: "Clarify before moving ahead",
    defaultFrequency: "on-return",
  },
  {
    id: "repeated-question",
    group: "communication",
    name: "Repeated question",
    description: "The customer has asked about the same thing more than once.",
    metricLabel: "Repeated questions",
    comparator: "More than",
    thresholdOptions: ["1", "2"],
    defaultThreshold: "1",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 5 minutes",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "1 minute into call",
    message: "Try explaining it differently",
    defaultFrequency: "on-return",
  },
  {
    id: "frustration",
    group: "customer-experience",
    name: "Customer frustration",
    description: "The customer is showing signs of frustration.",
    metricLabel: "Customer sentiment",
    comparator: "Below",
    thresholdOptions: ["Slightly negative", "Negative", "Very negative"],
    defaultThreshold: "Negative",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 1 minute",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "Immediately",
    message: "Acknowledge the customer's concern",
    defaultFrequency: "cooldown",
  },
  {
    id: "negative-sentiment",
    group: "customer-experience",
    name: "Negative sentiment",
    description: "The customer's tone has turned more negative.",
    metricLabel: "Customer sentiment",
    comparator: "Below",
    thresholdOptions: ["Slightly negative", "Negative", "Very negative"],
    defaultThreshold: "Slightly negative",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 1 minute",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "Immediately",
    message: "Take a moment to reconnect",
    defaultFrequency: "cooldown",
  },
  {
    id: "empathy",
    group: "customer-experience",
    name: "Empathy opportunity",
    description: "The customer just expressed a concern.",
    metricLabel: "Customer concern",
    comparator: "Is",
    thresholdOptions: ["Expressed"],
    defaultThreshold: "Expressed",
    windowOptions: ANY_POINT,
    defaultWindow: "At any point",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "Immediately",
    message: "Acknowledge what the customer shared",
    defaultFrequency: "on-return",
  },
  {
    id: "objection",
    group: "customer-experience",
    name: "Objection detected",
    description: "The customer has raised an objection.",
    metricLabel: "Customer objection",
    comparator: "Is",
    thresholdOptions: PRESENT_OPTIONS,
    defaultThreshold: "Raised",
    windowOptions: ANY_POINT,
    defaultWindow: "At any point",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "Immediately",
    message: "Address the customer's concern",
    defaultFrequency: "on-return",
  },
  {
    id: "escalation",
    group: "customer-experience",
    name: "Escalation risk",
    description: "The conversation is showing signs of escalating.",
    metricLabel: "Escalation signals",
    comparator: "Is",
    thresholdOptions: PRESENT_OPTIONS,
    defaultThreshold: "Raised",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 1 minute",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "Immediately",
    message: "Focus on resolving the concern",
    defaultFrequency: "cooldown",
  },
  {
    id: "discovery",
    group: "call-coverage",
    name: "Discovery missing",
    description: "The customer's needs haven't been explored yet.",
    metricLabel: "Discovery",
    comparator: "Is",
    thresholdOptions: MISSING_OPTIONS,
    defaultThreshold: "Not covered yet",
    windowOptions: ["Whole call"],
    defaultWindow: "Whole call",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "3 minutes into call",
    message: "Learn a little more before moving ahead",
    defaultFrequency: "once",
  },
  {
    id: "compliance",
    group: "call-coverage",
    name: "Compliance statement missing",
    description: "A required disclosure hasn't been mentioned yet.",
    metricLabel: "Required disclosure",
    comparator: "Is",
    thresholdOptions: MISSING_OPTIONS,
    defaultThreshold: "Not covered yet",
    windowOptions: ["Whole call"],
    defaultWindow: "Whole call",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "Immediately",
    message: "Remember the required disclosure",
    defaultFrequency: "once",
  },
  {
    id: "required-question",
    group: "call-coverage",
    name: "Required question missing",
    description: "A required question hasn't been asked yet.",
    metricLabel: "Required question",
    comparator: "Is",
    thresholdOptions: MISSING_OPTIONS,
    defaultThreshold: "Not covered yet",
    windowOptions: ["Whole call"],
    defaultWindow: "Whole call",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "1 minute into call",
    message: "Cover the required question",
    defaultFrequency: "once",
  },
  {
    id: "required-step",
    group: "call-coverage",
    name: "Required step missing",
    description: "A required step hasn't been covered yet.",
    metricLabel: "Required step",
    comparator: "Is",
    thresholdOptions: MISSING_OPTIONS,
    defaultThreshold: "Not covered yet",
    windowOptions: ["Whole call"],
    defaultWindow: "Whole call",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "1 minute into call",
    message: "Complete the required step",
    defaultFrequency: "once",
  },
];

export function coachingTemplate(id: CoachingTemplateId): CoachingTemplate {
  return COACHING_TEMPLATES.find((item) => item.id === id) ?? COACHING_TEMPLATES[0]!;
}

export function coachingTemplatesInGroup(
  group: CoachingTemplateGroup
): CoachingTemplate[] {
  return COACHING_TEMPLATES.filter((template) => template.group === group);
}

/** The thresholds a template arrives with, in one readable line. */
export function coachingRecommendedLabel(template: CoachingTemplate): string {
  return `${template.metricLabel} ${template.comparator.toLowerCase()} ${template.defaultThreshold} · ${template.defaultWindow.toLowerCase()}`;
}

export interface CoachingRule {
  id: string;
  /** Which template's detection logic this rule measures with. */
  templateId: CoachingTemplateId;
  name: string;
  metricLabel: string;
  comparator: string;
  threshold: string;
  window: string;
  startAfter: string;
  /** In-call title — a short coaching instruction. */
  message: string;
  frequency: CoachingFrequency;
  /** Minutes — only meaningful when frequency is "cooldown". */
  cooldownMinutes: number;
  teamMembers: string[];
  userGroups: string[];
  status: "live" | "draft";
  updated: string;
}

/** Phrased as an answer to "Repeat coaching…", so the row reads as a sentence. */
export const COACHING_REPEAT_OPTIONS: DropdownListItem[] = [
  { value: "on-return", label: "If the behaviour happens again" },
  { value: "once", label: "Never — only once per call" },
  { value: "cooldown", label: "After a cooldown" },
];

/** How often a rule may interrupt, in the one line the list column shows. */
export function coachingFrequencyLabel(rule: CoachingRule): string {
  if (rule.frequency === "once") return "Once per call";
  if (rule.frequency === "on-return") return "Again if it returns";
  return `Every ${rule.cooldownMinutes} min at most`;
}

let coachingIdCounter = 0;

export function newCoachingRuleId(): string {
  coachingIdCounter += 1;
  return `cr-${Date.now().toString(36)}-${coachingIdCounter.toString(36)}`;
}

export function createCoachingRuleFromTemplate(
  templateId: CoachingTemplateId
): CoachingRule {
  const template = coachingTemplate(templateId);
  return {
    id: newCoachingRuleId(),
    templateId,
    name: template.name,
    metricLabel: template.metricLabel,
    comparator: template.comparator,
    threshold: template.defaultThreshold,
    window: template.defaultWindow,
    startAfter: template.defaultStartAfter,
    message: template.message,
    frequency: template.defaultFrequency,
    cooldownMinutes: 5,
    teamMembers: [],
    userGroups: [],
    status: "draft",
    updated: "Just now",
  };
}

/**
 * Put a rule back on its template's recommended thresholds. Scoped to
 * detection only — how often the nudge repeats is edited elsewhere, so
 * restoring detection must not quietly reset it.
 */
export function restoreCoachingDetection(rule: CoachingRule): CoachingRule {
  const template = coachingTemplate(rule.templateId);
  return {
    ...rule,
    threshold: template.defaultThreshold,
    window: template.defaultWindow,
    startAfter: template.defaultStartAfter,
  };
}

export function coachingOnRecommendedDetection(rule: CoachingRule): boolean {
  const template = coachingTemplate(rule.templateId);
  return (
    rule.threshold === template.defaultThreshold &&
    rule.window === template.defaultWindow &&
    rule.startAfter === template.defaultStartAfter
  );
}

export function coachingDetectLabel(rule: CoachingRule): string {
  return `${rule.metricLabel} ${rule.comparator.toLowerCase()} ${rule.threshold}`;
}

/**
 * Detection, read back as a sentence rather than a set of fields. Segments so
 * the page can weight the values the admin actually chose against the
 * connective words around them.
 */
export interface CoachingSentenceSegment {
  text: string;
  strong?: boolean;
}

/** Comparators are stored as field labels; sentences need the verb form. */
const COMPARATOR_PHRASES: Record<string, string> = {
  "Greater than": "is above",
  "More than": "goes over",
  Below: "drops below",
  "Longer than": "runs longer than",
  Is: "is",
};

function thresholdText(threshold: string): string {
  // "75%" and "180 wpm" stay as typed; "Negative" reads better mid-sentence.
  return /\d/.test(threshold) ? threshold : threshold.toLowerCase();
}

function windowSegments(window: string): CoachingSentenceSegment[] {
  const lower = window.toLowerCase();
  if (lower.startsWith("last ")) {
    return [{ text: " for the " }, { text: lower, strong: true }];
  }
  if (lower === "whole call") {
    return [{ text: " across the " }, { text: lower, strong: true }];
  }
  if (lower === "at any point") return [{ text: " at any point in the call" }];
  return [{ text: " over " }, { text: lower, strong: true }];
}

export function coachingTriggerSentence(rule: CoachingRule): CoachingSentenceSegment[] {
  const comparator =
    COMPARATOR_PHRASES[rule.comparator] ?? rule.comparator.toLowerCase();
  return [
    { text: "Trigger when " },
    { text: rule.metricLabel.toLowerCase(), strong: true },
    { text: ` ${comparator} ` },
    { text: thresholdText(rule.threshold), strong: true },
    ...windowSegments(rule.window),
    { text: "." },
  ];
}

export function coachingStartSentence(rule: CoachingRule): CoachingSentenceSegment[] {
  if (rule.startAfter === "Immediately") {
    return [
      { text: "Start checking " },
      { text: "as soon as the call connects", strong: true },
      { text: "." },
    ];
  }
  return [
    { text: "Start checking " },
    { text: rule.startAfter.replace(/ into call$/, ""), strong: true },
    { text: " into the call." },
  ];
}

function windowAsSpoken(window: string): string {
  const lower = window.toLowerCase();
  if (lower === "last 1 minute") return "the last minute";
  if (lower.startsWith("last ")) return `the ${lower}`;
  if (lower === "whole call") return "the whole call";
  return lower;
}

function countFromThreshold(threshold: string): string {
  return threshold.match(/\d+/)?.[0] ?? threshold;
}

/**
 * The one-sentence observation on the in-call card. Built from the live
 * threshold and window so the agent sees what happened — never the operator,
 * metric label, or trigger phrasing the admin configured.
 */
export function coachingCardMessage(
  rule: Pick<CoachingRule, "templateId" | "threshold" | "window">
): string {
  const { templateId, threshold, window } = rule;
  const spokenWindow = windowAsSpoken(window);
  const count = countFromThreshold(threshold);

  switch (templateId) {
    case "overtalking":
      return `You've spoken for ${threshold} of ${spokenWindow}.`;
    case "monologue":
      return `You've been speaking continuously for over ${threshold}.`;
    case "silence":
      return `It's been quiet for ${threshold}.`;
    case "interruptions":
      return `You've interrupted the customer ${count} times recently.`;
    case "crosstalk":
      return "You've both been speaking at the same time frequently.";
    case "pace":
      return "You're speaking faster than your usual pace.";
    case "pace-slow":
      return "Your speaking pace has been slower than usual.";
    case "frustration":
      return "The customer is showing signs of frustration.";
    case "negative-sentiment":
      return "The customer's sentiment has become more negative.";
    case "confusion":
      return "The customer may be having trouble following the explanation.";
    case "repeated-question":
      return "The customer has asked about this more than once.";
    case "low-engagement":
      return "The customer has been responding less than earlier.";
    case "filler-words":
      return "You've been using filler words more frequently.";
    case "listening-ratio":
      return "The customer has had limited time to speak recently.";
    case "no-questions":
      return "You haven't asked a question in the last few minutes.";
    case "discovery":
      return "The customer's needs haven't been explored yet.";
    case "empathy":
      return "The customer just expressed a concern.";
    case "objection":
      return "The customer has raised an objection.";
    case "escalation":
      return "The conversation is showing signs of escalating.";
    case "compliance":
      return "The required disclosure hasn't been mentioned yet.";
    case "required-question":
      return "This required question hasn't been asked yet.";
    case "required-step":
      return "This step hasn't been covered yet.";
  }
}

export const SEED_COACHING_RULES: CoachingRule[] = [
  {
    ...createCoachingRuleFromTemplate("overtalking"),
    id: "cr-overtalking",
    userGroups: ["sales"],
    status: "live",
    updated: "2 days ago",
  },
  {
    ...createCoachingRuleFromTemplate("frustration"),
    id: "cr-frustration",
    userGroups: ["support", "billing"],
    status: "live",
    updated: "Yesterday",
  },
  {
    ...createCoachingRuleFromTemplate("interruptions"),
    id: "cr-interruptions",
    userGroups: ["sales", "support"],
    status: "live",
    updated: "1 week ago",
  },
  {
    ...createCoachingRuleFromTemplate("pace"),
    id: "cr-pace",
    userGroups: [],
    teamMembers: ["phoenix"],
    status: "draft",
    updated: "4 days ago",
  },
  {
    ...createCoachingRuleFromTemplate("silence"),
    id: "cr-silence",
    userGroups: ["support"],
    status: "draft",
    updated: "5 days ago",
  },
];

export function liveCoachingRules(rules: CoachingRule[]): CoachingRule[] {
  return rules.filter((rule) => rule.status === "live");
}
