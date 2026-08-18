/**
 * Integrations & Actions — the permission layer, not a content type. Admins
 * say what Agent Assist is allowed to do in a connected system; Guidance and
 * live conversation only ever propose actions from what is enabled here.
 */

export type IntegrationId = "hubspot" | "salesforce" | "zendesk";

export type CapabilityGroup = "Contacts" | "Deals" | "Tasks" | "Tickets" | "Calendar";

export interface IntegrationCapability {
  id: string;
  group: CapabilityGroup;
  label: string;
  /** What the agent sees on the action card, e.g. "Update HubSpot". */
  actionVerb: string;
  enabled: boolean;
}

export interface Integration {
  id: IntegrationId;
  name: string;
  connected: boolean;
  /** Shown when the integration is not connected. */
  connectHint: string;
  capabilities: IntegrationCapability[];
}

export const SEED_INTEGRATIONS: Integration[] = [
  {
    id: "hubspot",
    name: "HubSpot",
    connected: true,
    connectHint: "Connect HubSpot to log calls and update records from a call.",
    capabilities: [
      {
        id: "hs-contact-property",
        group: "Contacts",
        label: "Update property",
        actionVerb: "Update HubSpot",
        enabled: true,
      },
      {
        id: "hs-contact-note",
        group: "Contacts",
        label: "Add note",
        actionVerb: "Add HubSpot note",
        enabled: true,
      },
      {
        id: "hs-deal-stage",
        group: "Deals",
        label: "Update stage",
        actionVerb: "Move HubSpot deal",
        enabled: true,
      },
      {
        id: "hs-deal-property",
        group: "Deals",
        label: "Update property",
        actionVerb: "Update HubSpot deal",
        enabled: false,
      },
      {
        id: "hs-task",
        group: "Tasks",
        label: "Create task",
        actionVerb: "Create HubSpot task",
        enabled: true,
      },
      {
        id: "hs-ticket",
        group: "Tickets",
        label: "Create ticket",
        actionVerb: "Create HubSpot ticket",
        enabled: true,
      },
    ],
  },
  {
    id: "salesforce",
    name: "Salesforce",
    connected: false,
    connectHint: "Connect Salesforce to update opportunities without leaving the call.",
    capabilities: [
      {
        id: "sf-contact-property",
        group: "Contacts",
        label: "Update field",
        actionVerb: "Update Salesforce",
        enabled: false,
      },
      {
        id: "sf-task",
        group: "Tasks",
        label: "Create task",
        actionVerb: "Create Salesforce task",
        enabled: false,
      },
    ],
  },
  {
    id: "zendesk",
    name: "Zendesk",
    connected: false,
    connectHint: "Connect Zendesk to raise tickets from support calls.",
    capabilities: [
      {
        id: "zd-ticket",
        group: "Tickets",
        label: "Create ticket",
        actionVerb: "Create Zendesk ticket",
        enabled: false,
      },
    ],
  },
];

export function integrationById(
  integrations: Integration[],
  id: IntegrationId
): Integration | undefined {
  return integrations.find((item) => item.id === id);
}

export function capabilityById(
  integrations: Integration[],
  integrationId: IntegrationId,
  capabilityId: string
): IntegrationCapability | undefined {
  return integrationById(integrations, integrationId)?.capabilities.find(
    (item) => item.id === capabilityId
  );
}

export function enabledCapabilityCount(integration: Integration): number {
  return integration.capabilities.filter((item) => item.enabled).length;
}

/** Every capability an admin could attach to Guidance right now. */
export function availableCapabilities(integrations: Integration[]): {
  integration: Integration;
  capability: IntegrationCapability;
}[] {
  return integrations
    .filter((integration) => integration.connected)
    .flatMap((integration) =>
      integration.capabilities
        .filter((capability) => capability.enabled)
        .map((capability) => ({ integration, capability }))
    );
}

// ---------------------------------------------------------------------------
// Suggested actions
// ---------------------------------------------------------------------------

/** One row in the review sheet — label plus the value being written. */
export interface ActionField {
  label: string;
  value: string;
  /** No value was found in the conversation; the agent must fill it in. */
  missing?: boolean;
}

export type ActionOrigin = "guidance" | "conversation";

export interface SuggestedAction {
  id: string;
  integrationId: IntegrationId;
  capabilityId: string;
  /** Button-level title, e.g. "Update HubSpot". */
  title: string;
  /** One line under the title, e.g. "Competitor → Aircall". */
  summary: string;
  /** Record the write lands on. */
  recordLabel: string;
  recordValue: string;
  fields: ActionField[];
  origin: ActionOrigin;
  /** Which guidance card this hangs off, when it came from one. */
  guidanceId?: string;
  requiresConfirmation: boolean;
  /** Set to make the integration fail on execute, so retry can be shown. */
  simulateFailure?: boolean;
}

/** Admin-side config that lives on a Guidance item. */
export interface GuidanceActionConfig {
  integrationId: IntegrationId;
  capabilityId: string;
  /** Property or field name being written. */
  property: string;
  value: string;
  requiresConfirmation: boolean;
}

export function actionFromGuidanceConfig(
  config: GuidanceActionConfig,
  integrations: Integration[],
  context: { guidanceId: string; recordLabel: string; recordValue: string }
): SuggestedAction | null {
  const capability = capabilityById(
    integrations,
    config.integrationId,
    config.capabilityId
  );
  const integration = integrationById(integrations, config.integrationId);
  if (!capability || !integration?.connected || !capability.enabled) return null;

  return {
    id: `act-${context.guidanceId}-${config.capabilityId}`,
    integrationId: config.integrationId,
    capabilityId: config.capabilityId,
    title: capability.actionVerb,
    summary: `${config.property} → ${config.value}`,
    recordLabel: context.recordLabel,
    recordValue: context.recordValue,
    fields: [
      { label: "Property", value: config.property },
      { label: "Suggested value", value: config.value },
    ],
    origin: "guidance",
    guidanceId: context.guidanceId,
    requiresConfirmation: config.requiresConfirmation,
  };
}

export type ActionState =
  | "suggested"
  | "reviewing"
  | "executing"
  | "done"
  | "failed"
  | "dismissed";

export function actionHasMissingFields(action: SuggestedAction): boolean {
  return action.fields.some((field) => field.missing);
}

export function actionOriginLabel(action: SuggestedAction): string {
  return action.origin === "guidance"
    ? "Recommended by guidance"
    : "Detected from live conversation";
}
