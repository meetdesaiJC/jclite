import type { DropdownListItem } from "@/components/Dropdown";

/**
 * Coaching — how the agent is talking, not what they are talking about.
 * The trigger is conversational behaviour, so it is configured apart from
 * Guidance and always arrives as a temporary banner rather than a card.
 */

export type CoachingTemplateId =
  | "overtalking"
  | "interruptions"
  | "frustration"
  | "pace"
  | "silence";

export type CoachingFrequency = "once" | "on-return" | "cooldown";

export interface CoachingTemplate {
  id: CoachingTemplateId;
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
  /** The line the agent reads mid-call. Short, non-judgemental. */
  message: string;
  suggestion: string;
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

export const COACHING_TEMPLATES: CoachingTemplate[] = [
  {
    id: "overtalking",
    name: "Agent overtalking",
    description: "Agent dominates the conversation.",
    metricLabel: "Agent talk ratio",
    comparator: "Greater than",
    thresholdOptions: ["60%", "65%", "70%", "75%", "80%", "85%"],
    defaultThreshold: "75%",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 2 minutes",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "3 minutes into call",
    message: "Give the customer more room to speak.",
    suggestion: "Ask an open-ended question before continuing.",
    defaultFrequency: "on-return",
  },
  {
    id: "interruptions",
    name: "Frequent interruptions",
    description: "Agent repeatedly interrupts the customer.",
    metricLabel: "Interruptions",
    comparator: "More than",
    thresholdOptions: ["2", "3", "4", "5"],
    defaultThreshold: "3",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 2 minutes",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "1 minute into call",
    message: "Let the customer finish their thought.",
    suggestion: "Wait for a full pause before you respond.",
    defaultFrequency: "on-return",
  },
  {
    id: "frustration",
    name: "Customer frustration",
    description: "Customer sentiment becomes negative.",
    metricLabel: "Customer sentiment",
    comparator: "Below",
    thresholdOptions: ["Slightly negative", "Negative", "Very negative"],
    defaultThreshold: "Negative",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 1 minute",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "Immediately",
    message: "Acknowledge how the customer is feeling.",
    suggestion: "Name the frustration before you troubleshoot further.",
    defaultFrequency: "cooldown",
  },
  {
    id: "pace",
    name: "Speaking too quickly",
    description: "Agent speech rate exceeds the recommended pace.",
    metricLabel: "Agent speech rate",
    comparator: "Greater than",
    thresholdOptions: ["150 wpm", "165 wpm", "180 wpm", "200 wpm"],
    defaultThreshold: "180 wpm",
    windowOptions: WINDOW_OPTIONS,
    defaultWindow: "Last 1 minute",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "1 minute into call",
    message: "Slow down a little.",
    suggestion: "Pause between points so the detail lands.",
    defaultFrequency: "on-return",
  },
  {
    id: "silence",
    name: "Long silence",
    description: "The conversation stays silent for an unusual duration.",
    metricLabel: "Silence",
    comparator: "Longer than",
    thresholdOptions: ["5 seconds", "8 seconds", "12 seconds", "20 seconds"],
    defaultThreshold: "12 seconds",
    windowOptions: ["At any point"],
    defaultWindow: "At any point",
    startAfterOptions: START_AFTER_OPTIONS,
    defaultStartAfter: "Immediately",
    message: "Fill the gap or tell the customer what you're doing.",
    suggestion: "Say you're checking the account so the line isn't dead.",
    defaultFrequency: "cooldown",
  },
];

export function coachingTemplate(id: CoachingTemplateId): CoachingTemplate {
  return COACHING_TEMPLATES.find((item) => item.id === id) ?? COACHING_TEMPLATES[0]!;
}

export interface CoachingRule {
  id: string;
  templateId: CoachingTemplateId;
  name: string;
  metricLabel: string;
  comparator: string;
  threshold: string;
  window: string;
  startAfter: string;
  message: string;
  suggestion: string;
  frequency: CoachingFrequency;
  /** Minutes — only meaningful when frequency is "cooldown". */
  cooldownMinutes: number;
  teamMembers: string[];
  userGroups: string[];
  status: "live" | "draft";
  updated: string;
}

export const COACHING_FREQUENCY_OPTIONS: DropdownListItem[] = [
  { value: "once", label: "Once per call" },
  { value: "on-return", label: "Show again if behaviour returns" },
  { value: "cooldown", label: "Custom cooldown" },
];

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
    suggestion: template.suggestion,
    frequency: template.defaultFrequency,
    cooldownMinutes: 5,
    teamMembers: [],
    userGroups: [],
    status: "draft",
    updated: "Just now",
  };
}

export function coachingDetectLabel(rule: CoachingRule): string {
  return `${rule.metricLabel} ${rule.comparator.toLowerCase()} ${rule.threshold}`;
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

/** What the test panel reports back — measured value against the rule. */
export interface CoachingTestResult {
  measuredLabel: string;
  measuredValue: string;
  triggered: boolean;
}

export function evaluateCoachingSample(
  rule: CoachingRule,
  sample: string
): CoachingTestResult {
  // The prototype reads a number out of whatever the admin typed and compares
  // it with the threshold; anything unparseable counts as a near miss.
  const measured = Number(sample.replace(/[^0-9.]/g, ""));
  const target = Number(rule.threshold.replace(/[^0-9.]/g, ""));
  const hasNumbers = Number.isFinite(measured) && Number.isFinite(target) && target > 0;
  const unit = rule.threshold.replace(/[0-9.\s]/g, "");
  const triggered = hasNumbers
    ? rule.comparator === "Below"
      ? measured < target
      : measured > target
    : false;

  return {
    measuredLabel: rule.metricLabel,
    measuredValue: hasNumbers ? `${measured}${unit}` : sample.trim() || "—",
    triggered,
  };
}
