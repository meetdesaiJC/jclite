import * as React from "react";
import { cn } from "@/lib/utils";
import {
  JustCallLogo,
  IconDashboard,
  IconLiveMonitoring,
  IconAnalytics,
  IconAIVoiceAgent,
  IconPhoneNumbers,
  IconWorkflows,
  IconSalesDialer,
  IconJustCallAI,
  IconEmailInbox,
  IconTeams,
  IconContacts,
  IconCallLogs,
  IconAgentAvailability,
  IconMessaging,
  IconIntegrations,
  IconScheduler,
  IconFax,
  IconChevronDown,
  IconArrowRight,
  IconArrowLeft,
} from "./icons";

/**
 * Sidenav — synced from Figma "User-level pricing for Add-ons" (Sidenav).
 *
 * A dark, fixed-width app shell nav: logo header, scrollable nav list
 * (active item gets a 4px accent border flush with the left edge), a
 * credits summary card, and a "View Usage Balance" bar pinned to the bottom.
 *
 * Colours here are the product's dark-chrome palette (distinct from the
 * light-theme design tokens in globals.css) — hardcoded and commented with
 * their Figma source rather than added as global tokens, since they're
 * scoped to this one dark surface. `gray-700`, `gray-900` and `success`
 * do double duty (they match this palette too), so those reuse the tokens.
 */

const SIDENAV_ACCENT = "#196aff"; // active item border / usage-balance top border
const SIDENAV_BG = "linear-gradient(176deg, #101828 0%, #111b2e 100%)";

export interface SidenavItem {
  /** Stable identifier, passed to `onItemSelect`. */
  key: string;
  label: string;
  icon: React.ReactNode;
  /** Optional pill badge, e.g. "NEW". */
  badge?: string;
  /** Shows a trailing disclosure chevron, for items that expand a submenu. */
  expandable?: boolean;
  href?: string;
  /** Renders an uppercase group header (e.g. "YOUR PLAN") directly above this item. */
  sectionLabel?: string;
  /** Sub-items revealed when this item is expanded (implies `expandable`). */
  subItems?: SidenavSubItem[];
}

export interface SidenavSubItem {
  key: string;
  label: string;
  href?: string;
}

export interface SidenavBackLink {
  label: string;
  /** Defaults to a left-arrow glyph. */
  icon?: React.ReactNode;
  href?: string;
  onClick?: () => void;
}

const DEFAULT_ITEMS: SidenavItem[] = [
  { key: "dashboard", label: "Dashboard", icon: <IconDashboard /> },
  { key: "live-monitoring", label: "Live Monitoring", icon: <IconLiveMonitoring />, badge: "NEW" },
  { key: "analytics", label: "Analytics", icon: <IconAnalytics /> },
  { key: "ai-voice-agent", label: "AI Voice Agent", icon: <IconAIVoiceAgent />, expandable: true },
  { key: "phone-numbers", label: "Phone Numbers", icon: <IconPhoneNumbers /> },
  { key: "workflows", label: "Workflows", icon: <IconWorkflows /> },
  { key: "sales-dialer", label: "Sales Dialer", icon: <IconSalesDialer /> },
  { key: "justcall-ai", label: "JustCall AI", icon: <IconJustCallAI /> },
  { key: "email-inbox", label: "Email Inbox", icon: <IconEmailInbox /> },
  {
    key: "teams",
    label: "Teams",
    icon: <IconTeams />,
    expandable: true,
    subItems: [
      { key: "team-members", label: "Team Members" },
      { key: "user-groups", label: "User Groups" },
      { key: "roles-permissions", label: "Roles & Permissions" },
    ],
  },
  { key: "contacts", label: "Contacts", icon: <IconContacts /> },
  { key: "call-logs", label: "Call Logs", icon: <IconCallLogs /> },
  { key: "agent-availability", label: "Agent Availability", icon: <IconAgentAvailability /> },
  { key: "messaging", label: "Messaging", icon: <IconMessaging />, expandable: true },
  { key: "integrations", label: "Integrations", icon: <IconIntegrations /> },
  { key: "scheduler", label: "Scheduler", icon: <IconScheduler />, expandable: true },
  { key: "fax", label: "Fax", icon: <IconFax /> },
];

export type SidenavItemsTransition = "forward" | "back";

export interface SidenavProps extends Omit<React.HTMLAttributes<HTMLElement>, "onSelect"> {
  /** Nav items to render. Defaults to the full JustCall product nav. */
  items?: SidenavItem[];
  /** Key of the currently active item. */
  activeKey?: string;
  onItemSelect?: (key: string) => void;
  /** "Total Credits:" card — pass `null` to hide it entirely. */
  creditsValue?: string | null;
  onAddCredits?: () => void;
  onViewUsageBalance?: () => void;
  /** Optional "Back To Dashboard"-style row rendered above the nav list. */
  backLink?: SidenavBackLink;
  /**
   * Stable key for the current nav set. When it changes, the nav body
   * (back link + items) slides/fades while the logo and footer stay fixed.
   * Omit to keep swaps instant (default).
   */
  itemsKey?: string;
  /**
   * Direction for the itemsKey swap animation.
   * `forward` = exit left / enter from right; `back` = reverse.
   */
  itemsTransition?: SidenavItemsTransition;
}

type NavBodyMotion =
  | "idle"
  | "exit-to-left"
  | "exit-to-right"
  | "enter-from-left"
  | "enter-from-right";

const NAV_EXIT_MS = 150;

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function initialExpandedKeys(items: SidenavItem[], activeKey?: string) {
  const initial = items.find((item) => item.subItems?.some((sub) => sub.key === activeKey));
  return new Set(initial ? [initial.key] : []);
}

export const Sidenav = React.forwardRef<HTMLElement, SidenavProps>(
  (
    {
      items = DEFAULT_ITEMS,
      activeKey,
      onItemSelect,
      creditsValue = "$145.21",
      onAddCredits,
      onViewUsageBalance,
      backLink,
      itemsKey,
      itemsTransition = "forward",
      className,
      ...props
    },
    ref
  ) => {
    const [renderedItems, setRenderedItems] = React.useState(items);
    const [renderedBackLink, setRenderedBackLink] = React.useState(backLink);
    const [motion, setMotion] = React.useState<NavBodyMotion>("idle");
    const [expandedKeys, setExpandedKeys] = React.useState<Set<string>>(() =>
      initialExpandedKeys(items, activeKey)
    );
    const prevKeyRef = React.useRef(itemsKey);
    const itemsRef = React.useRef(items);
    const backLinkRef = React.useRef(backLink);
    const transitionRef = React.useRef(itemsTransition);
    itemsRef.current = items;
    backLinkRef.current = backLink;
    transitionRef.current = itemsTransition;

    React.useEffect(() => {
      if (itemsKey === undefined) {
        setRenderedItems(items);
        setRenderedBackLink(backLink);
        prevKeyRef.current = undefined;
        return;
      }

      if (prevKeyRef.current === undefined) {
        prevKeyRef.current = itemsKey;
        setRenderedItems(items);
        setRenderedBackLink(backLink);
        return;
      }

      if (prevKeyRef.current === itemsKey) return;

      if (prefersReducedMotion()) {
        setRenderedItems(items);
        setRenderedBackLink(backLink);
        setExpandedKeys(initialExpandedKeys(items, activeKey));
        setMotion("idle");
        prevKeyRef.current = itemsKey;
        return;
      }

      const direction = transitionRef.current;
      const exitMotion: NavBodyMotion = direction === "forward" ? "exit-to-left" : "exit-to-right";
      const enterMotion: NavBodyMotion =
        direction === "forward" ? "enter-from-right" : "enter-from-left";

      setMotion(exitMotion);

      const exitTimer = window.setTimeout(() => {
        const nextItems = itemsRef.current;
        const nextBackLink = backLinkRef.current;
        setRenderedItems(nextItems);
        setRenderedBackLink(nextBackLink);
        setExpandedKeys(initialExpandedKeys(nextItems, activeKey));
        setMotion(enterMotion);
        prevKeyRef.current = itemsKey;

        requestAnimationFrame(() => {
          requestAnimationFrame(() => setMotion("idle"));
        });
      }, NAV_EXIT_MS);

      return () => window.clearTimeout(exitTimer);
      // intentionally keyed on itemsKey — items/backLink read from refs at swap time
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [itemsKey]);

    const toggleExpanded = (key: string) => {
      setExpandedKeys((prev) => {
        const next = new Set(prev);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        return next;
      });
    };

    return (
      <nav
        ref={ref}
        style={{ backgroundImage: SIDENAV_BG }}
        className={cn("flex h-full w-[246px] shrink-0 flex-col text-white", className)}
        {...props}
      >
        <div className="flex h-[60px] shrink-0 items-center border-b border-gray-700 px-5">
          <JustCallLogo className="h-[19px] w-auto" />
        </div>

        <div className="sidenav-body flex min-h-0 flex-1 flex-col overflow-hidden" data-motion={motion}>
          {renderedBackLink && (
            <a
              href={renderedBackLink.href ?? "#"}
              onClick={(e) => {
                if (!renderedBackLink.href) e.preventDefault();
                renderedBackLink.onClick?.();
              }}
              className="mt-2 mb-0 flex h-[38px] shrink-0 items-center gap-2.5 px-5 text-label-md text-disabled-fg transition-colors hover:text-white"
            >
              <span className="flex size-[18px] shrink-0 items-center justify-center [&_svg]:size-full">
                {renderedBackLink.icon ?? <IconArrowLeft />}
              </span>
              {renderedBackLink.label}
            </a>
          )}

          <ul
            className={cn(
              "flex flex-1 flex-col gap-0.5 overflow-y-auto pb-2",
              renderedBackLink ? "pt-0.5" : "pt-2"
            )}
          >
            {renderedItems.map((item) => {
              const active = item.key === activeKey;
              const hasSubItems = !!item.subItems?.length;
              const isExpanded = expandedKeys.has(item.key);
              return (
                <React.Fragment key={item.key}>
                  {item.sectionLabel && (
                    <li className="px-6 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-wide text-[#b0b0b0]">
                      {item.sectionLabel}
                    </li>
                  )}
                  <li>
                    <a
                      href={item.href ?? "#"}
                      aria-current={active ? "page" : undefined}
                      aria-expanded={hasSubItems ? isExpanded : undefined}
                      onClick={(e) => {
                        if (hasSubItems) {
                          e.preventDefault();
                          toggleExpanded(item.key);
                          return;
                        }
                        if (!item.href) e.preventDefault();
                        onItemSelect?.(item.key);
                      }}
                      className={cn(
                        "flex h-[38px] items-center gap-2.5 pl-4 pr-3 text-label-md transition-colors",
                        active
                          ? "border-l-4 text-white"
                          : "ml-1 rounded-[5px] text-disabled-fg hover:bg-white/5 hover:text-white"
                      )}
                      style={{
                        borderLeftColor: active ? SIDENAV_ACCENT : undefined,
                        backgroundColor: active ? "#111e36" : undefined,
                      }}
                    >
                      <span className="flex size-[18px] shrink-0 items-center justify-center [&_svg]:size-full">
                        {item.icon}
                      </span>
                      <span className="flex-1 truncate">{item.label}</span>
                      {(item.badge || item.expandable) && (
                        <span className="flex shrink-0 items-center gap-1">
                          {item.badge && (
                            <span
                              className="shrink-0 rounded-full border px-1.5 py-0.5 text-[11px] font-bold leading-none"
                              style={{ borderColor: "#ee46bc", color: "#ee46bc" }}
                            >
                              {item.badge}
                            </span>
                          )}
                          {item.expandable && (
                            <IconChevronDown
                              className={cn("size-4 shrink-0 transition-transform", isExpanded && "rotate-180")}
                            />
                          )}
                        </span>
                      )}
                    </a>
                  </li>
                  {hasSubItems && isExpanded && (
                    <li>
                      <ul className="flex flex-col gap-0.5 pb-1">
                        {item.subItems!.map((sub) => {
                          const subActive = sub.key === activeKey;
                          return (
                            <li key={sub.key}>
                              <a
                                href={sub.href ?? "#"}
                                aria-current={subActive ? "page" : undefined}
                                onClick={(e) => {
                                  if (!sub.href) e.preventDefault();
                                  onItemSelect?.(sub.key);
                                }}
                                className={cn(
                                  "flex h-[34px] items-center pr-3 text-label-md transition-colors",
                                  subActive
                                    ? "border-l-4 pl-12 text-white"
                                    : "pl-[52px] text-disabled-fg hover:text-white"
                                )}
                                style={{
                                  borderLeftColor: subActive ? SIDENAV_ACCENT : undefined,
                                  backgroundColor: subActive ? "#111e36" : undefined,
                                }}
                              >
                                {sub.label}
                              </a>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  )}
                </React.Fragment>
              );
            })}
          </ul>
        </div>

        {creditsValue !== null && (
          <div className="mx-2 mb-2 shrink-0 overflow-hidden rounded-[5px] border border-gray-700 bg-[#1c2838] p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-label-md-semi">💰 Total Credits:</span>
              <span className="rounded-full bg-blue-500 px-2.5 py-1 text-label-md text-white">
                {creditsValue}
              </span>
            </div>
            <button
              type="button"
              onClick={onAddCredits}
              className="w-full rounded-[6px] border border-success bg-gray-900 py-2 text-label-md text-success transition-colors hover:bg-black/40"
            >
              Add Credits
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onViewUsageBalance}
          className="flex h-[49px] shrink-0 items-center justify-center gap-1.5 border-t px-3.5 text-label-sm font-semibold tracking-[0.1px] text-white transition-colors hover:bg-white/5"
          style={{ borderTopColor: SIDENAV_ACCENT, backgroundColor: "#172848" }}
        >
          View Usage Balance
          <IconArrowRight className="size-4 shrink-0" />
        </button>
      </nav>
    );
  }
);
Sidenav.displayName = "Sidenav";
