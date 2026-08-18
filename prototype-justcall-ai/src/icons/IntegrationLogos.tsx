import type { IntegrationId } from "../actionsData";

import hubspotLogo from "./crm/hubspot.svg";
import pipedriveLogo from "./crm/pipedrive.svg";
import salesforceLogo from "./crm/salesforce.svg";
import zendeskLogo from "./crm/zendesk.svg";

type LogoProps = {
  size?: number;
  className?: string;
};

/**
 * Brand marks for connected CRMs, taken from the design system's CRM Logos
 * set. Drawn at 16px, so tables and pickers get the real mark rather than a
 * redrawn approximation.
 */
const CRM_LOGOS: Record<IntegrationId, string> = {
  hubspot: hubspotLogo,
  salesforce: salesforceLogo,
  zendesk: zendeskLogo,
  pipedrive: pipedriveLogo,
};

export function IntegrationLogo({
  id,
  size = 16,
  className,
}: LogoProps & { id: IntegrationId }) {
  return (
    <img
      src={CRM_LOGOS[id]}
      alt=""
      aria-hidden="true"
      width={size}
      height={size}
      className={["shrink-0", className].filter(Boolean).join(" ")}
      style={{ width: size, height: size }}
    />
  );
}

export function IntegrationName({
  id,
  name,
  size = 16,
  className,
}: {
  id: IntegrationId;
  name: string;
  size?: number;
  className?: string;
}) {
  return (
    <span className={["inline-flex min-w-0 items-center gap-2", className].filter(Boolean).join(" ")}>
      <IntegrationLogo id={id} size={size} />
      <span className="truncate text-paragraph-md text-foreground">{name}</span>
    </span>
  );
}
