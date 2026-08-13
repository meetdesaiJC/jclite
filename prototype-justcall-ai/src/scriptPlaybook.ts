export type ShowWhenType = "always" | "relevant" | "after" | "condition";

export interface ShowWhen {
  type: ShowWhenType;
  afterStepId?: string;
  condition?: string;
}

export interface PlaybookStep {
  id: string;
  title: string;
  suggestedWording: string;
  guidance: string;
  required: boolean;
  showWhen: ShowWhen;
}

export interface PlaybookStage {
  id: string;
  title: string;
  steps: PlaybookStep[];
}

export interface AssistBehavior {
  checklistProgress: boolean;
  suggestedResponses: boolean;
  relevantKnowledge: boolean;
  missedSteps: boolean;
}

export type ScriptCategory = "sales" | "support" | "custom";

export type ScriptTemplateId =
  | "sales-discovery"
  | "sales-qualification"
  | "sales-demo"
  | "support-login"
  | "support-billing"
  | "support-tech";

export type PlaybookSource = ScriptTemplateId | "custom" | "blank" | "upload";

export interface ScriptPlaybook {
  id: string;
  name: string;
  description: string;
  category: ScriptCategory;
  source: PlaybookSource;
  stages: PlaybookStage[];
  assist: AssistBehavior;
  assignedMembers: string[];
  assignedGroups: string[];
}

export const SCRIPT_TEAM_MEMBERS: { value: string; label: string }[] = [
  { value: "olivia", label: "Olivia Rhye" },
  { value: "phoenix", label: "Phoenix Baker" },
  { value: "lana", label: "Lana Steiner" },
  { value: "demi", label: "Demi Wilkinson" },
  { value: "candice", label: "Candice Wu" },
  { value: "natali", label: "Natali Craig" },
  { value: "drew", label: "Drew Cano" },
];

export const SCRIPT_USER_GROUPS: { value: string; label: string }[] = [
  { value: "support", label: "Support" },
  { value: "sales", label: "Sales" },
  { value: "success", label: "Customer Success" },
  { value: "billing", label: "Billing" },
  { value: "ops", label: "Operations" },
];

export const DEFAULT_ASSIST: AssistBehavior = {
  checklistProgress: true,
  suggestedResponses: true,
  relevantKnowledge: true,
  missedSteps: true,
};

export interface TemplateCatalogItem {
  id: ScriptTemplateId;
  name: string;
  description: string;
}

export const SALES_TEMPLATES: TemplateCatalogItem[] = [
  {
    id: "sales-discovery",
    name: "Discovery call",
    description: "Uncover need, pain, and stakeholders before pitching",
  },
  {
    id: "sales-qualification",
    name: "Qualification call",
    description: "Confirm fit, budget, timing, and next steps",
  },
  {
    id: "sales-demo",
    name: "Product demo",
    description: "Set an agenda, show the workflow, handle questions",
  },
];

export const SUPPORT_TEMPLATES: TemplateCatalogItem[] = [
  {
    id: "support-login",
    name: "Account / login issue",
    description: "Verify the customer, find the blocker, restore access",
  },
  {
    id: "support-billing",
    name: "Billing support",
    description: "Identify the charge, explain it, resolve or refund",
  },
  {
    id: "support-tech",
    name: "Technical troubleshooting",
    description: "Reproduce the issue, isolate the cause, fix or escalate",
  },
];

let idCounter = 0;

export function newId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}

const ALWAYS: ShowWhen = { type: "always" };

function step(
  title: string,
  opts: Partial<Omit<PlaybookStep, "id" | "title">> = {}
): PlaybookStep {
  return {
    id: newId("step"),
    title,
    suggestedWording: "",
    guidance: "",
    required: false,
    showWhen: ALWAYS,
    ...opts,
  };
}

function stage(title: string, steps: PlaybookStep[]): PlaybookStage {
  return { id: newId("stage"), title, steps };
}

function playbook(
  partial: Omit<ScriptPlaybook, "id" | "assist" | "assignedMembers" | "assignedGroups"> & {
    assist?: AssistBehavior;
    assignedMembers?: string[];
    assignedGroups?: string[];
  }
): ScriptPlaybook {
  return {
    id: newId("script"),
    assist: DEFAULT_ASSIST,
    assignedMembers: [],
    assignedGroups: [],
    ...partial,
  };
}

const TEMPLATES: Record<ScriptTemplateId, () => ScriptPlaybook> = {
  "support-login": () =>
    playbook({
      name: "Account access support",
      description: "Help agents resolve login and account lock issues",
      category: "support",
      source: "support-login",
      stages: [
        stage("Understand the issue", [
          step("Confirm which account they're trying to access", {
            required: true,
            suggestedWording: "Which email or phone number is on the account you're trying to open?",
            guidance: "Match the identifier to the CRM record before troubleshooting.",
          }),
          step("Ask what happens when they attempt to log in", {
            required: true,
            suggestedWording:
              "Could you walk me through what happens when you try to log in?",
            guidance: "Listen for password, MFA, locked account, or incorrect email issues.",
          }),
          step("Check whether they see an error message", {
            suggestedWording: "Do you see an error message — and if so, what does it say?",
          }),
        ]),
        stage("Verify customer", [
          step("Confirm email address", {
            required: true,
            suggestedWording:
              "Before I access the account, I'll quickly verify a couple of details with you. Can I confirm the email address on file?",
            guidance: "Verify email address and the last four digits of the registered phone number.",
          }),
          step("Complete identity verification", {
            required: true,
            suggestedWording:
              "And the last four digits of the phone number we have on the account — does that still look right?",
            guidance: "Do not open the account until identity checks pass.",
          }),
        ]),
        stage("Troubleshoot", [
          step("Check password reset status", {
            suggestedWording: "I'm going to check whether a password reset is already in progress.",
          }),
          step("Check account lock status", {
            required: true,
            suggestedWording:
              "It looks like the account may be locked after a few failed sign-in attempts. I can unlock it from here if that matches what you're seeing.",
            guidance: "Locked accounts often follow repeated failed attempts or suspected compromise.",
          }),
          step("Confirm authentication method", {
            suggestedWording: "Are you signing in with a password, a one-time code, or single sign-on?",
          }),
        ]),
        stage("Resolve or escalate", [
          step("Confirm customer can log in", {
            required: true,
            suggestedWording: "Could you try signing in now while I stay on the line?",
          }),
          step("Escalate unresolved account issues", {
            showWhen: {
              type: "condition",
              condition: "Customer still cannot log in after troubleshooting",
            },
            suggestedWording:
              "I want to get this to our identity team so they can restore access securely. I'll stay with you until they're briefed.",
            guidance: "Escalate to identity / security if compromise is suspected.",
          }),
        ]),
        stage("Close", [
          step("Summarize resolution", {
            required: true,
            suggestedWording:
              "I've unlocked the account and sent a reset link. You should be able to sign in with the new password.",
          }),
          step("Ask whether they need anything else", {
            suggestedWording: "Is there anything else I can help with before we wrap up?",
          }),
        ]),
      ],
    }),

  "support-billing": () =>
    playbook({
      name: "Billing support",
      description: "Help agents explain charges and resolve billing issues",
      category: "support",
      source: "support-billing",
      stages: [
        stage("Identify the charge", [
          step("Confirm the amount and date", {
            required: true,
            suggestedWording: "I can look that up — what amount and date are you seeing?",
          }),
          step("Locate the invoice or receipt", {
            suggestedWording:
              "I'll pull up the invoice now. Can I confirm the email on the billing account, or the last four digits of the card?",
            guidance: "Search by email, last four of the card, and billing period.",
          }),
        ]),
        stage("Explain the charge", [
          step("Walk through what the charge is for", {
            required: true,
            suggestedWording:
              "This charge is for your current plan from {start} to {end}. I'll walk you through the line items so nothing feels unexpected.",
          }),
          step("Check for discounts, credits, or failed payments", {
            suggestedWording:
              "Let me also check whether a discount, credit, or failed payment is sitting on the account that would change this total.",
          }),
        ]),
        stage("Resolve", [
          step("Offer the appropriate fix", {
            suggestedWording:
              "I can reverse the extra amount, apply a credit, or move you to the plan that matches how you're using the product. Which would you prefer?",
            guidance: "Refund, correction, or plan change — follow billing policy.",
          }),
          step("Confirm the customer is satisfied", {
            required: true,
            suggestedWording: "I've applied that. You should see it reflected within two business days.",
          }),
        ]),
        stage("Close", [
          step("Summarize what changed", {
            suggestedWording:
              "To recap: I explained the charge and applied the correction. You'll get a confirmation email shortly.",
          }),
          step("Ask if anything else is needed", {
            suggestedWording: "Is there anything else I can help with on billing before we wrap up?",
          }),
        ]),
      ],
    }),

  "support-tech": () =>
    playbook({
      name: "Technical troubleshooting",
      description: "Help agents reproduce, isolate, and resolve product issues",
      category: "support",
      source: "support-tech",
      stages: [
        stage("Reproduce the issue", [
          step("Get the exact error or behavior", {
            required: true,
            suggestedWording: "What exactly happens, and when did it start?",
          }),
          step("Confirm environment and recent changes", {
            suggestedWording:
              "What browser or app version are you on, and did anything change right before this started — an update, a new integration, a settings change?",
            guidance: "Browser, app version, network, and anything that changed recently.",
          }),
        ]),
        stage("Isolate the cause", [
          step("Walk through the first diagnostic", {
            required: true,
            suggestedWording:
              "Let's try one check together so I can see whether this is on our side or in the setup. Can you try that now while I stay on the line?",
          }),
          step("Rule out known incidents or outages", {
            suggestedWording:
              "I'm checking whether this matches a known incident. Give me a moment — I don't want you troubleshooting something that's already on us.",
          }),
        ]),
        stage("Fix or escalate", [
          step("Apply the recommended fix", {
            required: true,
            suggestedWording:
              "I have a fix that should restore this. I'll apply it from here, then we'll test it together.",
          }),
          step("Escalate if the issue persists", {
            showWhen: { type: "relevant" },
            suggestedWording:
              "This needs a specialist. I'll send them the exact steps, timestamps, and impact so you don't have to repeat any of this.",
            guidance: "Include repro steps, timestamps, and customer impact.",
          }),
        ]),
        stage("Close", [
          step("Confirm the issue is resolved", {
            suggestedWording: "Can you try that one more time so we both see it's working?",
          }),
          step("Offer a follow-up if needed", {
            suggestedWording:
              "If it comes back, reply to the ticket and I'll pick it up. Is there anything else you want me to check while we're here?",
          }),
        ]),
      ],
    }),

  "sales-discovery": () =>
    playbook({
      name: "Discovery call",
      description: "Help agents uncover need, pain, and the path to a next meeting",
      category: "sales",
      source: "sales-discovery",
      stages: [
        stage("Open", [
          step("Set the purpose of the call", {
            required: true,
            suggestedWording:
              "I'd love to spend this time understanding how you're handling calls today, then see if it's worth a closer look.",
          }),
          step("Confirm time and attendees", {
            suggestedWording:
              "We've got about 30 minutes. Is anyone else joining, or is it just us?",
          }),
        ]),
        stage("Current state", [
          step("Ask how they handle this today", {
            required: true,
            suggestedWording: "Walk me through how this works on your team today.",
          }),
          step("Uncover the pain behind the process", {
            required: true,
            suggestedWording:
              "Where does that break down — missed calls, slow follow-up, or the team using different tools for the same job?",
            guidance: "Listen for volume, missed calls, inconsistent follow-up, or tool sprawl.",
          }),
        ]),
        stage("Impact", [
          step("Quantify the cost of the status quo", {
            suggestedWording: "What does that cost you in time, missed revenue, or customer experience?",
          }),
          step("Identify who else cares about this", {
            suggestedWording:
              "Who else feels this day to day — ops, support leads, or whoever owns the number?",
          }),
        ]),
        stage("Next steps", [
          step("Propose a concrete follow-up", {
            required: true,
            suggestedWording: "If this still looks relevant, the useful next step is a 30-minute working session with your ops lead.",
          }),
          step("Confirm date, attendees, and success criteria", {
            suggestedWording:
              "Let's lock a time this week. If we can show the missed-call workflow in their language, we'll know whether a trial is worth it.",
          }),
        ]),
      ],
    }),

  "sales-qualification": () =>
    playbook({
      name: "Qualification call",
      description: "Help agents confirm fit before investing in a full evaluation",
      category: "sales",
      source: "sales-qualification",
      stages: [
        stage("Fit", [
          step("Confirm the use case", {
            required: true,
            suggestedWording:
              "Just so I don't pitch the wrong thing — is the main job here covering inbound calls, following up faster, or giving managers visibility?",
          }),
          step("Check volume, team size, and channels", {
            suggestedWording:
              "Roughly how many calls a day, how many people would use this, and is it phone only or chat and SMS too?",
          }),
        ]),
        stage("Buying conditions", [
          step("Understand budget range", {
            suggestedWording: "Do you already have budget allocated for this, or would this need a new case?",
          }),
          step("Confirm timeline and decision process", {
            required: true,
            suggestedWording:
              "If this looks like a fit, who else needs to be involved, and is there a date you're trying to have this live by?",
          }),
        ]),
        stage("Next step", [
          step("Recommend demo, trial, or disqualify", {
            required: true,
            suggestedWording:
              "Based on what you've described, a focused demo on that workflow is the right next step — unless this isn't a priority this quarter.",
          }),
          step("Book the next conversation", {
            suggestedWording:
              "I can hold 30 minutes later this week with you and whoever owns the queue. What day works?",
          }),
        ]),
      ],
    }),

  "sales-demo": () =>
    playbook({
      name: "Product demo",
      description: "Help agents run a focused demo around the customer's workflow",
      category: "sales",
      source: "sales-demo",
      stages: [
        stage("Set the agenda", [
          step("Recap what you heard last time", {
            required: true,
            suggestedWording:
              "Last time you mentioned missed after-hours calls and follow-up that depends on whoever happened to pick it up. I want to make sure that's still the main thing we should focus on today.",
          }),
          step("Agree on the 2–3 workflows to show", {
            required: true,
            suggestedWording:
              "If it works for you, I'll show how after-hours calls get answered, how the follow-up lands in your CRM, and how a supervisor would coach from the recording. Anything you'd swap out?",
          }),
        ]),
        stage("Show the workflow", [
          step("Demo the primary use case in their language", {
            required: true,
            suggestedWording:
              "Let me walk through what this looks like for a missed after-hours call on your team — from the moment it comes in to the follow-up the next morning.",
          }),
          step("Pause for questions after each workflow", {
            suggestedWording:
              "That's the first workflow. What questions do you have before I show the next one?",
          }),
        ]),
        stage("Close the demo", [
          step("Map what they saw to their original pain", {
            required: true,
            suggestedWording:
              "Going back to those missed after-hours calls — what you just saw is how those get covered without someone staying late, and how the next-day follow-up is already drafted.",
          }),
          step("Agree on evaluation next steps", {
            suggestedWording:
              "If this still looks useful, the clean next step is a two-week evaluation with your ops lead on a live queue. Does Thursday work to kick that off?",
          }),
        ]),
      ],
    }),
};

export function createPlaybookFromTemplate(templateId: ScriptTemplateId): ScriptPlaybook {
  return TEMPLATES[templateId]();
}

function seedPlaybook(
  templateId: ScriptTemplateId,
  extras: {
    id: string;
    assignedGroups?: string[];
    assignedMembers?: string[];
  }
): ScriptPlaybook {
  const playbook = createPlaybookFromTemplate(templateId);
  playbook.id = extras.id;
  playbook.assignedGroups = extras.assignedGroups ?? [];
  playbook.assignedMembers = extras.assignedMembers ?? [];
  return playbook;
}

export interface SeedScript {
  playbook: ScriptPlaybook;
  status: "live" | "draft";
  updated: string;
}

/** Default library shown on the Scripts tab — sales and support playbooks. */
export const SEED_SCRIPTS: SeedScript[] = [
  {
    playbook: seedPlaybook("sales-discovery", {
      id: "script-discovery",
      assignedGroups: ["sales"],
    }),
    status: "live",
    updated: "2 days ago",
  },
  {
    playbook: seedPlaybook("sales-qualification", {
      id: "script-qualification",
      assignedGroups: ["sales"],
      assignedMembers: ["phoenix"],
    }),
    status: "live",
    updated: "1 week ago",
  },
  {
    playbook: seedPlaybook("sales-demo", {
      id: "script-demo",
      assignedGroups: ["sales", "success"],
    }),
    status: "live",
    updated: "3 days ago",
  },
  {
    playbook: seedPlaybook("support-login", {
      id: "script-account-access",
      assignedGroups: ["support"],
      assignedMembers: ["olivia", "lana"],
    }),
    status: "live",
    updated: "Yesterday",
  },
  {
    playbook: seedPlaybook("support-billing", {
      id: "script-billing",
      assignedGroups: ["billing", "support"],
    }),
    status: "live",
    updated: "5 days ago",
  },
  {
    playbook: seedPlaybook("support-tech", {
      id: "script-tech",
      assignedGroups: ["support"],
    }),
    status: "draft",
    updated: "4 days ago",
  },
];

export function createBlankPlaybook(): ScriptPlaybook {
  return playbook({
    name: "Untitled script",
    description: "",
    category: "custom",
    source: "blank",
    stages: [stage("Script", [])],
  });
}

export const SAMPLE_SCRIPT_DOCUMENT = `Account access recovery

Greet the customer
Say: Thanks for calling — I can help you get back into your account.

Confirm the account
Say: Which email or phone number is on the account you're trying to open?

Ask what happens at login
Say: What do you see when you try to sign in?

Reset or restore access
Say: I can send a reset link to the email on file. Does that work?

Confirm they're in
Say: Were you able to get in?

Close the call
Say: You're all set. Is there anything else I can help with today?
`;

const STEP_MARKER =
  /^(?:#{1,6}\s+|[-*•]\s+|(?:\d+|[A-Za-z])[.)]\s+)/;
const SAY_PREFIX =
  /^(?:say|agent(?: says)?|script|wording|suggested wording)\s*[:\-–]\s*/i;
const QUOTED = /^[“"'](.+?)[”"']$/;

export function titleFromFileName(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim();
  if (!base) return "Untitled script";
  return base.replace(/\b\w/g, (char) => char.toUpperCase());
}

function looksLikeHeading(line: string): boolean {
  return line.length <= 64 && !/[.!?]$/.test(line) && !SAY_PREFIX.test(line);
}

export function parseScriptDocument(text: string): {
  name: string;
  steps: Array<{ title: string; suggestedWording: string }>;
} {
  const lines = text.replace(/\r\n/g, "\n").split("\n").map((line) => line.trim());
  const steps: Array<{ title: string; suggestedWording: string }> = [];
  let name = "";
  let pending: { title: string; suggestedWording: string } | null = null;

  const commit = () => {
    if (!pending) return;
    const title = pending.title.trim();
    const wording = pending.suggestedWording.trim();
    if (title || wording) {
      steps.push({
        title: title || wording.slice(0, 48),
        suggestedWording: wording,
      });
    }
    pending = null;
  };

  for (const raw of lines) {
    if (!raw) {
      commit();
      continue;
    }

    const stripped = raw.replace(STEP_MARKER, "").trim();
    const marked = stripped !== raw;
    const sayMatch = SAY_PREFIX.exec(raw);
    const quoted = QUOTED.exec(raw);

    if (sayMatch) {
      const wording = raw.slice(sayMatch[0].length).trim();
      if (pending) pending.suggestedWording = [pending.suggestedWording, wording].filter(Boolean).join(" ");
      else pending = { title: "", suggestedWording: wording };
      continue;
    }

    if (quoted) {
      const wording = quoted[1]?.trim() ?? "";
      if (pending) pending.suggestedWording = [pending.suggestedWording, wording].filter(Boolean).join(" ");
      else pending = { title: "", suggestedWording: wording };
      continue;
    }

    if (!name && steps.length === 0 && !pending && !marked && looksLikeHeading(raw)) {
      name = raw;
      continue;
    }

    if (marked) {
      commit();
      pending = { title: stripped || raw, suggestedWording: "" };
      continue;
    }

    if (pending) {
      pending.suggestedWording = [pending.suggestedWording, raw].filter(Boolean).join(" ");
      continue;
    }

    pending = { title: raw, suggestedWording: "" };
  }

  commit();
  return { name, steps };
}

function parseCsvScript(text: string): Array<{ title: string; suggestedWording: string }> {
  const rows = text.replace(/\r\n/g, "\n").split("\n").filter((line) => line.trim());
  if (rows.length === 0) return [];

  const split = (line: string) => {
    const cells: string[] = [];
    let current = "";
    let quoted = false;
    for (let i = 0; i < line.length; i += 1) {
      const char = line[i];
      if (char === '"') {
        if (quoted && line[i + 1] === '"') {
          current += '"';
          i += 1;
        } else {
          quoted = !quoted;
        }
      } else if (char === "," && !quoted) {
        cells.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    return cells;
  };

  const header = split(rows[0] ?? "").map((cell) => cell.toLowerCase());
  const hasHeader =
    header.some((cell) => /title|step|name/.test(cell)) ||
    header.some((cell) => /wording|say|script|answer/.test(cell));
  const titleIndex = hasHeader
    ? Math.max(0, header.findIndex((cell) => /title|step|name/.test(cell)))
    : 0;
  const wordingIndex = hasHeader
    ? header.findIndex((cell) => /wording|say|script|answer/.test(cell))
    : 1;
  const start = hasHeader ? 1 : 0;

  return rows.slice(start).flatMap((row) => {
    const cells = split(row);
    const title = cells[titleIndex]?.trim() ?? "";
    const wording = (wordingIndex >= 0 ? cells[wordingIndex] : cells[1])?.trim() ?? "";
    if (!title && !wording) return [];
    return [{ title: title || wording.slice(0, 48), suggestedWording: wording }];
  });
}

export function createPlaybookFromDocument(text: string, fileName: string): ScriptPlaybook {
  const isCsv = fileName.toLowerCase().endsWith(".csv");
  const parsed = isCsv
    ? { name: titleFromFileName(fileName), steps: parseCsvScript(text) }
    : parseScriptDocument(text);
  const steps = parsed.steps.map((item) =>
    step(item.title, { suggestedWording: item.suggestedWording })
  );

  return playbook({
    name: parsed.name || titleFromFileName(fileName),
    description: `Imported from ${fileName}`,
    category: "custom",
    source: "upload",
    stages: [stage("Script", steps.length > 0 ? steps : [step("")])],
  });
}

export function flattenSteps(playbook: ScriptPlaybook): PlaybookStep[] {
  return playbook.stages.flatMap((stageItem) => stageItem.steps);
}

export function countSteps(playbook: ScriptPlaybook): number {
  return flattenSteps(playbook).length;
}

export function clonePlaybook(source: ScriptPlaybook): ScriptPlaybook {
  return {
    ...source,
    id: newId("script"),
    assist: { ...source.assist },
    assignedMembers: [...source.assignedMembers],
    assignedGroups: [...source.assignedGroups],
    stages: source.stages.map((stageItem) => ({
      ...stageItem,
      id: newId("stage"),
      steps: stageItem.steps.map((stepItem) => ({
        ...stepItem,
        showWhen: { ...stepItem.showWhen },
        id: newId("step"),
      })),
    })),
  };
}

export type AssignmentKind = "member" | "group";

export interface AssignmentPerson {
  id: string;
  name: string;
  kind: AssignmentKind;
}

export function playbookAssignees(playbook: ScriptPlaybook): AssignmentPerson[] {
  const groups = SCRIPT_USER_GROUPS.filter((item) =>
    playbook.assignedGroups.includes(item.value)
  ).map((item) => ({ id: item.value, name: item.label, kind: "group" as const }));
  const members = SCRIPT_TEAM_MEMBERS.filter((item) =>
    playbook.assignedMembers.includes(item.value)
  ).map((item) => ({ id: item.value, name: item.label, kind: "member" as const }));
  return [...groups, ...members];
}

export function playbookAssignmentLabel(playbook: ScriptPlaybook): string {
  return playbookAssignees(playbook)
    .map((item) => item.name)
    .join(", ");
}

export type WordingTone =
  | "empathetic"
  | "confident"
  | "professional"
  | "urgent"
  | "engaging";

export const WORDING_TONES: { value: WordingTone; label: string }[] = [
  { value: "empathetic", label: "Empathetic" },
  { value: "confident", label: "Confident" },
  { value: "professional", label: "Professional" },
  { value: "urgent", label: "Urgent" },
  { value: "engaging", label: "Engaging" },
];

export interface WordingRewriteResult {
  wording: string;
  summary: string;
}

function lowerFirst(value: string): string {
  if (!value) return value;
  return value.charAt(0).toLowerCase() + value.slice(1);
}

function spokenFromTitle(title: string): string {
  const text = title.trim().replace(/[.]+$/, "");
  if (!text) return "I can help with that — tell me a bit more about what's going on.";

  const lower = text.toLowerCase();
  if (/greet|welcome|open the call/.test(lower)) {
    return "Thanks for calling — you've reached the right team. How can I help today?";
  }
  if (/email/.test(lower)) return "Can I confirm the email address on the account?";
  if (/phone/.test(lower)) return "And the phone number we have on file — does that still look right?";
  if (/verif|identity|authenticate/.test(lower)) {
    return "Before I go further, I'll quickly verify a couple of details with you.";
  }
  if (/error|message/.test(lower)) return "Do you see an error message — and if so, what does it say?";
  if (/next step|wrap|close|anything else/.test(lower)) {
    return "Is there anything else I can help with before we wrap up?";
  }
  if (/why|reason|prompting/.test(lower)) {
    return "I want to make sure I understand — what's prompting that?";
  }
  if (/budget/.test(lower)) {
    return "Do you already have budget allocated for this, or would this need a new case?";
  }
  if (/^(confirm|check|ask|verify|capture|review)\b/i.test(text)) {
    return `${text}?`.replace(/^Confirm /i, "Can I confirm ");
  }
  return `Let me ${lowerFirst(text)}.`;
}

function shortenSpoken(text: string): string {
  const cleaned = text
    .replace(/\b(just|really|quickly|I just wanted to say that|I wanted to)\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const first = cleaned.match(/^[\s\S]+?[.!?]/)?.[0] ?? cleaned;
  if (first.length <= 90) return first;
  const cut = first.slice(0, 86);
  const atWord = cut.lastIndexOf(" ");
  return `${(atWord > 40 ? cut.slice(0, atWord) : cut).trim().replace(/[,;:]$/, "")}.`;
}

function pickVariant(variants: string[], seed: number): string {
  const unique = [...new Set(variants.map((item) => item.trim()).filter(Boolean))];
  if (unique.length === 0) return "";
  return unique[Math.abs(seed) % unique.length] ?? unique[0] ?? "";
}

function asSpokenLine(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return trimmed;
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function stripToneLeadIn(text: string): string {
  return text
    .replace(
      /^(I can help with that\. |I know this is frustrating\. |I'm sorry you've had to deal with this\. |I'm sorry this has been a hassle\. |I'll take care of that\. |Here's what we'll do\. |Let's get this sorted right now\. |I can fix this on this call\. |Thank you for waiting\. |Quick question — )/i,
      ""
    )
    .replace(/ (How does that sound\?|Does that work for you\?)$/i, "")
    .trim();
}

function warmerSpoken(text: string): string {
  if (/thanks|i can help|happy to|i'd be|that's completely|no rush/i.test(text)) return text;
  return `I can help with that. ${text}`;
}

function formalSpoken(text: string): string {
  return text
    .replace(/\bHey\b/g, "Hello")
    .replace(/\bThanks\b/g, "Thank you")
    .replace(/\byou're\b/g, "you are")
    .replace(/\bI'm\b/g, "I am")
    .replace(/\bI'll\b/g, "I will")
    .replace(/\blet's\b/gi, "let us")
    .replace(/\bcan't\b/g, "cannot")
    .replace(/\bwon't\b/g, "will not")
    .replace(/\bdon't\b/g, "do not");
}

function confidentSpoken(text: string): string {
  return text
    .replace(/\b(just |maybe |perhaps |I think |I believe )/gi, "")
    .replace(/\bmight\b/gi, "will")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function applyTone(source: string, tone: WordingTone, seed: number): string {
  const base = asSpokenLine(stripToneLeadIn(source) || source);

  if (tone === "empathetic") {
    return pickVariant(
      [
        warmerSpoken(base),
        `I know this is frustrating. ${base}`,
        `I'm sorry you've had to deal with this. ${base}`,
      ],
      seed
    );
  }

  if (tone === "confident") {
    const direct = confidentSpoken(base);
    return pickVariant(
      [`I'll take care of that. ${direct}`, `Here's what we'll do. ${direct}`, direct],
      seed
    );
  }

  if (tone === "professional") {
    const formal = formalSpoken(base);
    return pickVariant([formal, `Thank you for waiting. ${formal}`], seed);
  }

  if (tone === "urgent") {
    const short = shortenSpoken(base);
    return pickVariant(
      [`Let's get this sorted right now. ${short}`, `I can fix this on this call. ${short}`, short],
      seed
    );
  }

  const engagingBase = base.replace(/[.]+$/, "");
  return pickVariant(
    [
      `${engagingBase} — how does that sound?`,
      `Quick question — ${engagingBase.toLowerCase()}?`,
      `${engagingBase}. Does that work for you?`,
    ],
    seed
  );
}

export function rewriteSuggestedWording(input: {
  title: string;
  wording: string;
  tone: WordingTone;
  seed?: number;
}): WordingRewriteResult {
  const source = input.wording.trim() || spokenFromTitle(input.title);
  const wording = applyTone(source, input.tone, input.seed ?? 0);
  const toneLabel = WORDING_TONES.find((item) => item.value === input.tone)?.label ?? "Empathetic";

  return {
    wording,
    summary: input.wording.trim()
      ? `Rephrased in a ${toneLabel.toLowerCase()} tone.`
      : `Drafted suggested wording in a ${toneLabel.toLowerCase()} tone.`,
  };
}

export function spokenLineFor(step: PlaybookStep): string {
  return step.suggestedWording.trim() || spokenFromTitle(step.title);
}

export function formatShowWhen(stepItem: PlaybookStep, playbook: ScriptPlaybook): string | null {
  if (stepItem.showWhen.type === "always") return null;
  if (stepItem.showWhen.type === "relevant") return "When relevant";
  if (stepItem.showWhen.type === "after") {
    const target = flattenSteps(playbook).find((item) => item.id === stepItem.showWhen.afterStepId);
    return target ? `After “${target.title}”` : "After another step";
  }
  if (stepItem.showWhen.condition) return `If ${stepItem.showWhen.condition}`;
  return "Based on a condition";
}
