import { Badge } from "@/components/Badge";
import { Button } from "@/components/Button";
import { Toggle } from "@/components/Toggle";
import { IconCircleCheckFilled, IconInfoCircle } from "@/components/Icon";
import { cn } from "@/lib/utils";
import { AdminPageHeader } from "./AgentAssistAdmin";
import {
  enabledCapabilityCount,
  type CapabilityGroup,
  type Integration,
  type IntegrationCapability,
} from "./actionsData";

/**
 * Integrations & actions — the permission layer. Actions are not a content
 * type an admin authors; they are capabilities an admin allows. Guidance and
 * live conversation can only ever propose something switched on here, and the
 * agent still confirms before anything is written.
 */

export interface IntegrationsActionsPageProps {
  integrations: Integration[];
  onIntegrationsChange: (next: Integration[]) => void;
  onBack: () => void;
}

const GROUP_ORDER: CapabilityGroup[] = [
  "Contacts",
  "Deals",
  "Tasks",
  "Tickets",
  "Calendar",
];

export function IntegrationsActionsPage({
  integrations,
  onIntegrationsChange,
  onBack,
}: IntegrationsActionsPageProps) {
  const setCapability = (
    integrationId: string,
    capabilityId: string,
    enabled: boolean
  ) => {
    onIntegrationsChange(
      integrations.map((integration) =>
        integration.id !== integrationId
          ? integration
          : {
              ...integration,
              capabilities: integration.capabilities.map((capability) =>
                capability.id === capabilityId ? { ...capability, enabled } : capability
              ),
            }
      )
    );
  };

  const setConnected = (integrationId: string, connected: boolean) => {
    onIntegrationsChange(
      integrations.map((integration) =>
        integration.id !== integrationId
          ? integration
          : {
              ...integration,
              connected,
              // Disconnecting revokes everything rather than leaving switches
              // on for a system Agent Assist can no longer reach.
              capabilities: connected
                ? integration.capabilities
                : integration.capabilities.map((capability) => ({
                    ...capability,
                    enabled: false,
                  })),
            }
      )
    );
  };

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <AdminPageHeader
        title="Integrations & actions"
        description="Control what Agent Assist is allowed to do in connected systems. Every action an agent sees during a call comes from something enabled here."
        onBack={onBack}
      />

      <div className="flex min-h-0 flex-1 justify-center overflow-auto px-6 py-8">
        <div className="flex w-full max-w-[760px] flex-col gap-4">
          <p className="flex items-start gap-1.5 rounded-lg border border-info-border bg-info-secondary px-3 py-2.5 text-paragraph-sm text-foreground">
            <IconInfoCircle size={16} className="mt-px size-4 shrink-0 text-info" />
            <span className="text-pretty">
              Agents review every suggested action before it runs. Nothing is
              written automatically, and a failed write never interrupts the call.
            </span>
          </p>

          {integrations.map((integration) => (
            <IntegrationCard
              key={integration.id}
              integration={integration}
              onCapabilityChange={(capabilityId, enabled) =>
                setCapability(integration.id, capabilityId, enabled)
              }
              onConnectedChange={(connected) => setConnected(integration.id, connected)}
            />
          ))}
        </div>
      </div>
    </main>
  );
}

function IntegrationCard({
  integration,
  onCapabilityChange,
  onConnectedChange,
}: {
  integration: Integration;
  onCapabilityChange: (capabilityId: string, enabled: boolean) => void;
  onConnectedChange: (connected: boolean) => void;
}) {
  const groups = GROUP_ORDER.map((group) => ({
    group,
    capabilities: integration.capabilities.filter(
      (capability) => capability.group === group
    ),
  })).filter((entry) => entry.capabilities.length > 0);

  const enabled = enabledCapabilityCount(integration);

  return (
    <section className="flex flex-col rounded-lg border border-line bg-white">
      <header className="flex items-start justify-between gap-4 border-b border-line px-4 py-3.5">
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-label-md-semi text-foreground">{integration.name}</h2>
            {integration.connected ? (
              <span className="inline-flex items-center gap-1 text-label-sm text-success-text">
                <IconCircleCheckFilled size={16} className="size-3.5 shrink-0 text-success" />
                Connected
              </span>
            ) : (
              <Badge variant="blue-grey">Not connected</Badge>
            )}
          </div>
          <p className="text-pretty text-paragraph-sm text-muted-foreground">
            {integration.connected
              ? `Agent Assist can ${enabled === 0 ? "do nothing here yet" : `use ${enabled} action${enabled === 1 ? "" : "s"}`}.`
              : integration.connectHint}
          </p>
        </div>
        <Button
          size="sm"
          variant={integration.connected ? "grey-outline" : "primary"}
          className="mt-0.5 shrink-0"
          onClick={() => onConnectedChange(!integration.connected)}
        >
          {integration.connected ? "Disconnect" : "Connect"}
        </Button>
      </header>

      <div
        className={cn(
          "flex flex-col gap-4 px-4 py-4",
          !integration.connected && "opacity-55"
        )}
        aria-disabled={!integration.connected}
      >
        <p className="text-label-sm font-medium tracking-[0.04em] text-disabled-fg uppercase">
          Agent Assist can
        </p>
        {groups.map((entry) => (
          <div key={entry.group} className="flex flex-col gap-2">
            <p className="text-label-md-semi text-foreground">{entry.group}</p>
            <ul className="flex flex-col divide-y divide-line overflow-hidden rounded-lg border border-line">
              {entry.capabilities.map((capability) => (
                <CapabilityRow
                  key={capability.id}
                  capability={capability}
                  disabled={!integration.connected}
                  onChange={(next) => onCapabilityChange(capability.id, next)}
                />
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}

function CapabilityRow({
  capability,
  disabled,
  onChange,
}: {
  capability: IntegrationCapability;
  disabled: boolean;
  onChange: (enabled: boolean) => void;
}) {
  return (
    <li className="flex items-center justify-between gap-3 px-3 py-2.5">
      <div className="min-w-0">
        <p className="text-label-md text-foreground">{capability.label}</p>
        <p className="truncate text-paragraph-sm text-muted-foreground">
          Agents see this as “{capability.actionVerb}”.
        </p>
      </div>
      <Toggle
        size="sm"
        checked={capability.enabled}
        disabled={disabled}
        onCheckedChange={onChange}
        aria-label={`${capability.label} ${capability.enabled ? "enabled" : "disabled"}`}
      />
    </li>
  );
}
