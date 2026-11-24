import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Sidenav, SIDENAV_DEFAULT_ITEMS, type SidenavItemsTransition } from "@/components/Sidenav";
import { Dashboard } from "./Dashboard";
import { DialerPanel } from "./DialerPanel";
import {
  JustCallAiShell,
  JUSTCALL_AI_ITEMS,
  isJustCallAiPageKey,
  type JustCallAiPageKey,
} from "./JustCallAiShell";
import { GlobalHeader } from "@/components/GlobalHeader";
import { Toast } from "@/components/Toast";
import { ProfileMenu } from "@/components/ProfileMenu";
import { PrototypeLauncher } from "./PrototypeLauncher";
import { DesktopAppPrototype } from "./DesktopAppPrototype";
import { MobileAppPrototype } from "./MobileAppPrototype";
import { SalesDialerAppPrototype } from "./SalesDialerAppPrototype";
import { TeamMembersPage } from "./TeamMembersPage";
import { RolesPage } from "./RolesPage";
import { BillingPage, BILLING_NAV_ITEMS } from "./BillingPage";
import { AddMembersFlow } from "./AddMembersFlow";
import { cn } from "@/lib/utils";
import { EditMemberPage } from "./EditMemberPage";
import { InboxPage } from "./InboxPage";
import { ContactsPage } from "./ContactsPage";
import { AppIntegrationsPage } from "./AppIntegrationsPage";
import { CallLogsPage } from "./CallLogsPage";
import { WorkflowsPage } from "./WorkflowsPage";
import { BulkSmsPage } from "./BulkSmsPage";
import { PhoneNumbersPage } from "./PhoneNumbersPage";
import { LiveMonitoringPage } from "./LiveMonitoringPage";
import { CampaignsPage, SALES_DIALER_NAV_ITEMS } from "./CampaignsPage";
import { AgentsPage, KnowledgeBasePage } from "./AiVoiceAgentPages";
import { Button } from "@/components/Button";
import { LockedControl } from "@/components/LockedControl";
import { IconAddPlus } from "@/components/Icon";
import { salesDialerLocks } from "./licenseLocks";
import {
  aiVoiceAgentLocks,
  bulkSmsLocks,
  callLogsLocks,
  contactsLocks,
  dialerLock,
  rolesLocks,
  appIntegrationLocks,
  inboxLocks,
  liveMonitoringLocks,
  phoneNumberLocks,
  teamMemberLocks,
  workflowsLocks,
  type License,
} from "./licenseLocks";
import { type TeamMember } from "./teamMembersData";
import { CrmInCallPrototype } from "./CrmInCallPrototype";
import { type AgentAssistScope } from "./agentAssistScope";
import {
  readDialerWindowParams,
  useSharedBusyReasons,
  type DialerWindowParams,
} from "./dialerWindow";

/**
 * V1 and North Star each get their own view keys even though the V1 three
 * currently render the same flows. The seam is the point: when V1 diverges,
 * it diverges here, and the North Star prototypes stay untouched.
 */
type AppView =
  | "launcher"
  | "setup"
  | "setup-empty"
  | "in-call"
  | "v1-setup"
  | "v1-setup-empty"
  | "v1-in-call"
  | "v1-in-call-crm"
  /* Non-calling licenses: one key per experience in the PRD. */
  | "lite"
  | "view-only"
  | "license-admin"
  /* The member's desktop and mobile apps, per license. */
  | "desktop-lite"
  | "desktop-view-only"
  | "mobile-lite"
  | "mobile-view-only"
  | "sales-dialer-lite"
  | "sales-dialer-view-only";

const APP_VIEWS: readonly AppView[] = [
  "launcher",
  "setup",
  "setup-empty",
  "in-call",
  "v1-setup",
  "v1-setup-empty",
  "v1-in-call",
  "v1-in-call-crm",
  "lite",
  "view-only",
  "license-admin",
  "desktop-lite",
  "desktop-view-only",
  "mobile-lite",
  "mobile-view-only",
  "sales-dialer-lite",
  "sales-dialer-view-only",
];

/**
 * The open prototype lives in the URL hash, so the browser's Back button
 * returns to the launcher and a shared link opens straight into a prototype.
 * The hash, not the query string: `?` already belongs to the popped-out
 * dialer window.
 *
 * A reload is the exception: it returns to the launcher. A demo restarts
 * from the entry point rather than mid-flow, with whatever state the page
 * had already gone. Only a reload — a link opened fresh still deep-links.
 */
const RELOADED =
  (performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined)
    ?.type === "reload";
if (RELOADED && window.location.hash) {
  window.history.replaceState(null, "", window.location.pathname + window.location.search);
}

function viewFromHash(): AppView {
  const key = window.location.hash.slice(1);
  return (APP_VIEWS as readonly string[]).includes(key) ? (key as AppView) : "launcher";
}

type LicenseExperience = "lite" | "view-only" | "license-admin";
type AppArea = "dashboard" | "justcall-ai";

/**
 * JustCall AI prototype — lands on the Calls dashboard shell. Clicking
 * JustCall AI runs the nav micro-interaction (product nav exits left,
 * AI nav enters from the right; main content crossfades). Logo + sidenav
 * chrome stay fixed. Back reverses the same motion.
 *
 * `seeded` decides which account the same flow is walked through: on, the
 * demo library everything is already configured with; off, the day-one
 * account where every list opens on its empty state.
 *
 * `scope` decides which release: V1 authors Scripts and Response Cards only.
 */
function SetupFlow({
  seeded = true,
  scope = "v2",
  onHome,
}: {
  seeded?: boolean;
  scope?: AgentAssistScope;
  onHome: () => void;
}) {
  const [area, setArea] = useState<AppArea>("dashboard");
  const [navTransition, setNavTransition] = useState<SidenavItemsTransition>("forward");
  const [aiPage, setAiPage] = useState<JustCallAiPageKey>("agent-assist");

  const openJustCallAi = useCallback(() => {
    setNavTransition("forward");
    setArea("justcall-ai");
  }, []);

  const goBack = useCallback(() => {
    setNavTransition("back");
    setArea("dashboard");
  }, []);

  const backLink = useMemo(
    () => (area === "justcall-ai" ? { label: "Back", onClick: goBack } : undefined),
    [area, goBack]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidenav
        onLogoClick={onHome}
        activeKey={area === "justcall-ai" ? aiPage : "dashboard"}
        items={area === "justcall-ai" ? JUSTCALL_AI_ITEMS : undefined}
        itemsKey={area}
        itemsTransition={navTransition}
        backLink={backLink}
        onItemSelect={(key) => {
          if (area === "dashboard" && key === "justcall-ai") {
            openJustCallAi();
            return;
          }
          if (area === "justcall-ai" && isJustCallAiPageKey(key)) {
            setAiPage(key);
          }
        }}
      />

      <div className="relative flex min-w-0 flex-1 flex-col">
        <div
          className="sidenav-content-layer absolute inset-0 flex flex-col"
          data-active={area === "dashboard"}
          aria-hidden={area !== "dashboard"}
        >
          <Dashboard />
        </div>
        <div
          className="sidenav-content-layer absolute inset-0 flex flex-col"
          data-active={area === "justcall-ai"}
          aria-hidden={area !== "justcall-ai"}
        >
          <JustCallAiShell
            activeKey={aiPage}
            onNavigate={setAiPage}
            seeded={seeded}
            scope={scope}
          />
        </div>
      </div>
    </div>
  );
}

/**
 * In-call prototype — starts on the Calls dashboard. The agent opens the
 * dialer from the top nav, dials a number, and hits Call; ringing → pickup →
 * Agent Assist all play out from that first tap.
 *
 * `scope` decides which release: V1 drops the coaching cues and suggested
 * actions from the guidance column, and the Live Assist control from the call
 * bar.
 */
function InCallFlow({
  scope = "v2",
  onHome,
}: {
  scope?: AgentAssistScope;
  onHome: () => void;
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidenav activeKey="dashboard" onLogoClick={onHome} />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Dashboard scope={scope} />
      </div>
    </div>
  );
}

/**
 * Non-calling license experiences — each lands on the Calls dashboard. All
 * three render the same shell for now; `experience` is the seam where Lite,
 * View-only and the admin's license management start to differ.
 */
type LicensePage =
  | "dashboard"
  | "team-members"
  | "billing"
  | "inbox"
  | "phone-numbers"
  | "live-monitoring"
  | "campaigns"
  | "contacts"
  | "integrations"
  | "call-logs"
  | "workflows"
  | "bulk-sms"
  | "ai-agents"
  | "ai-knowledge-base"
  | "roles-permissions";

/** Pages reached straight from a sidenav key, with their header titles. */
const NAV_PAGES: Partial<Record<LicensePage, string>> = {
  contacts: "Contacts",
  integrations: "Integrations",
  "call-logs": "Call Logs",
  workflows: "Workflows",
  "bulk-sms": "Bulk SMS/MMS",
  "ai-agents": "AI Voice Agent",
  "ai-knowledge-base": "Knowledge Base",
  "roles-permissions": "Roles & Permissions",
};

/**
 * The product nav with AI Voice Agent opened up into its two pages, as the
 * web app has it. Only this flow routes them, so the default nav other
 * prototypes draw is left as it is.
 */
const LICENSE_NAV_ITEMS = SIDENAV_DEFAULT_ITEMS.map((item) =>
  item.key === "ai-voice-agent"
    ? {
        ...item,
        subItems: [
          { key: "ai-agents", label: "Agents" },
          { key: "ai-knowledge-base", label: "Knowledge Base" },
        ],
      }
    : item
);

/**
 * Prototype control, not product UI: floats above the app so a reviewer can
 * flip the same screen between Lite and View-only and see what each locks.
 * Starts top-centre; drag it by its frame to clear whatever it covers. The
 * spot is remembered per browser (a convenience — it renders fine without).
 */
const SWITCH_POSITION_KEY = "jclite:license-switch-position-v2";

function readSwitchPosition(key: string): { x: number; y: number } | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as { x: number; y: number }) : null;
  } catch {
    return null;
  }
}

function LicenseSwitch({
  value,
  onChange,
  anchor = "top",
}: {
  value: License;
  onChange: (license: License) => void;
  /**
   * Where it starts. The desktop prototype has a menu bar and a title bar up
   * top, so it starts bottom-centre there instead — and remembers its own
   * dragged spot, since a spot chosen over the web app means nothing on it.
   */
  anchor?: "top" | "bottom";
}) {
  const storageKey = anchor === "bottom" ? `${SWITCH_POSITION_KEY}:bottom` : SWITCH_POSITION_KEY;
  const panelRef = useRef<HTMLDivElement>(null);
  // null = the default spot, until someone drags it.
  const [position, setPosition] = useState(() => readSwitchPosition(storageKey));

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    // The buttons are for switching, not dragging.
    if ((event.target as HTMLElement).closest("button")) return;
    const panel = panelRef.current;
    if (!panel) return;
    event.preventDefault();
    const rect = panel.getBoundingClientRect();
    const offsetX = event.clientX - rect.left;
    const offsetY = event.clientY - rect.top;
    let last = { x: rect.left, y: rect.top };
    const move = (e: PointerEvent) => {
      // Clamped so it can't be lost off-screen.
      last = {
        x: Math.min(Math.max(0, e.clientX - offsetX), window.innerWidth - rect.width),
        y: Math.min(Math.max(0, e.clientY - offsetY), window.innerHeight - rect.height),
      };
      setPosition(last);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(last));
      } catch {
        /* storage unavailable — the spot just won't survive a reload */
      }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const options: { key: License; label: string }[] = [
    { key: "lite", label: "Lite" },
    { key: "view-only", label: "View-only" },
  ];

  // One thumb that slides between the options, rather than each button
  // painting its own background — that swap is what made the switch blink.
  // The labels differ in width, so the thumb is measured, not a fixed half.
  const optionRefs = useRef(new Map<License, HTMLButtonElement>());
  const [thumb, setThumb] = useState<{ left: number; width: number } | null>(null);
  // No slide on first paint: the thumb should only move between options,
  // never fly in from the panel's edge.
  const [canAnimate, setCanAnimate] = useState(false);

  useLayoutEffect(() => {
    const button = optionRefs.current.get(value);
    if (!button) return;
    setThumb({ left: button.offsetLeft, width: button.offsetWidth });
  }, [value]);

  useEffect(() => {
    if (!thumb || canAnimate) return;
    const frame = requestAnimationFrame(() => setCanAnimate(true));
    return () => cancelAnimationFrame(frame);
  }, [thumb, canAnimate]);

  // Dark on purpose: it's a prototype control, so it reads as sitting on top
  // of the product rather than being part of it.
  return (
    <div
      ref={panelRef}
      onPointerDown={startDrag}
      role="radiogroup"
      aria-label="License"
      style={position ? { left: position.x, top: position.y } : undefined}
      className={cn(
        "fixed z-50 isolate flex cursor-grab touch-none items-center gap-0.5 rounded-full bg-tooltip-dark-bg p-1 shadow-400 select-none active:cursor-grabbing",
        !position && "left-1/2 -translate-x-1/2",
        !position && (anchor === "bottom" ? "bottom-3" : "top-3")
      )}
    >
      {thumb && (
        <span
          aria-hidden
          // Absolutely positioned, so travelling it reflows nothing. Moving in
          // place, hence ease-standard; ~80px of travel sits at `moderate`.
          className={cn(
            "pointer-events-none absolute inset-y-1 left-0 -z-10 rounded-full bg-white motion-reduce:transition-none",
            canAnimate && "transition-[transform,width] duration-moderate ease-standard"
          )}
          style={{ width: thumb.width, transform: `translateX(${thumb.left}px)` }}
        />
      )}
      {options.map((option) => {
        const selected = option.key === value;
        return (
          <button
            key={option.key}
            ref={(node) => {
              if (node) optionRefs.current.set(option.key, node);
              else optionRefs.current.delete(option.key);
            }}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.key)}
            className={cn(
              // Label colour crossfades on the thumb's clock so the text and
              // the pill arrive together.
              "cursor-pointer rounded-full px-3 py-1 text-label-sm transition-colors duration-moderate ease-standard outline-none focus-visible:ring-2 focus-visible:ring-white/40",
              selected
                ? "text-foreground"
                : "text-tooltip-dark-muted hover:text-tooltip-dark-fg"
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

function LicenseFlow({
  experience,
  onHome,
  onLicenseChange,
}: {
  experience: LicenseExperience;
  onHome: () => void;
  /** Switches between Lite and View-only; the admin flow has no switch. */
  onLicenseChange?: (license: License) => void;
}) {
  const [page, setPage] = useState<LicensePage>("dashboard");
  // The admin experience has no license limits; Lite and View-only get the
  // locks from licenseLocks.ts, so every screen follows the same rule.
  const license: License | undefined =
    experience === "license-admin" ? undefined : experience;
  // Add Members takes over the page body rather than opening a modal: it is a
  // three-step flow, and the list behind it has nothing to say meanwhile.
  const [addingMembers, setAddingMembers] = useState(false);
  // Edit Member also takes over the body; it holds the member being edited.
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  // How many were just invited — the confirmation waits for the list, so the
  // admin reads it on the page where the new people now appear.
  // `count` outlives `open` so the title doesn't change while the toast exits.
  const [invited, setInvited] = useState({ open: false, count: 0 });
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  // Billing swaps the product nav for its own "Your Plan" nav, with the same
  // slide JustCall AI uses: forward on the way in, back on the way out.
  const [navTransition, setNavTransition] = useState<SidenavItemsTransition>("forward");
  const openBilling = useCallback(() => {
    setProfileMenuOpen(false);
    setAddingMembers(false);
    setEditingMember(null);
    setNavTransition("forward");
    setPage("billing");
  }, []);
  // The header's SMS Inbox icon is a shortcut to the same page as the nav
  // item, so it lands exactly as picking "SMS Inbox" in the sidenav would.
  // From Billing or Sales Dialer that means leaving their nav, so it slides
  // back the way their own back links do.
  const openInbox = useCallback(() => {
    setNavTransition("back");
    setProfileMenuOpen(false);
    setAddingMembers(false);
    setEditingMember(null);
    setPage("inbox");
  }, []);
  const closeBilling = useCallback(() => {
    setNavTransition("back");
    setPage("dashboard");
  }, []);
  const billingBackLink = useMemo(
    () => ({ label: "Back to Dashboard", onClick: closeBilling }),
    [closeBilling]
  );
  // Sales Dialer is its own product inside JustCall: it swaps in its own nav
  // with the same slide as Billing, and lands on Campaigns.
  const openSalesDialer = useCallback(() => {
    setAddingMembers(false);
    setEditingMember(null);
    setNavTransition("forward");
    setPage("campaigns");
  }, []);
  const closeSalesDialer = useCallback(() => {
    setNavTransition("back");
    setPage("dashboard");
  }, []);
  const salesDialerBackLink = useMemo(
    () => ({ label: "Go To JustCall", onClick: closeSalesDialer }),
    [closeSalesDialer]
  );
  const campaignLocks = salesDialerLocks(license);
  // On the dark nav a locked button can't take Button's white-surface muted
  // palette, so it dims against the navy instead.
  const createCampaignAction = (
    <LockedControl
      locked={Boolean(campaignLocks.createCampaign)}
      placement="right"
      triggerClassName="flex w-full"
    >
      <Button
        size="md"
        leftIcon={<IconAddPlus size={20} />}
        className="w-full data-[locked=true]:bg-white/10 data-[locked=true]:text-disabled-fg"
      >
        Create Campaign
      </Button>
    </LockedControl>
  );
  const closeInvitedToast = useCallback(
    () => setInvited((current) => ({ ...current, open: false })),
    []
  );

  return (
    <div
      className="flex h-screen overflow-hidden bg-background"
      data-experience={experience}
    >
      <Sidenav
        onLogoClick={onHome}
        activeKey={page === "billing" ? "overview" : page === "inbox" ? "sms-inbox" : page}
        items={
          page === "billing"
            ? BILLING_NAV_ITEMS
            : page === "campaigns"
              ? SALES_DIALER_NAV_ITEMS
              : LICENSE_NAV_ITEMS
        }
        itemsKey={page === "billing" ? "billing" : page === "campaigns" ? "sales-dialer" : "product"}
        itemsTransition={navTransition}
        backLink={
          page === "billing"
            ? billingBackLink
            : page === "campaigns"
              ? salesDialerBackLink
              : undefined
        }
        action={page === "campaigns" ? createCampaignAction : undefined}
        onItemSelect={(key) => {
          if (key === "sales-dialer") {
            openSalesDialer();
            return;
          }
          if (
            key === "dashboard" ||
            key === "team-members" ||
            key === "sms-inbox" ||
            key === "phone-numbers" ||
            key === "live-monitoring" ||
            key in NAV_PAGES
          ) {
            setPage(key === "sms-inbox" ? "inbox" : (key as LicensePage));
            setAddingMembers(false);
            setEditingMember(null);
          }
        }}
      />
      <div className="relative flex min-w-0 flex-1 flex-col">
        {page === "team-members" ||
        page === "billing" ||
        page === "inbox" ||
        page === "phone-numbers" ||
        page === "live-monitoring" ||
        page === "campaigns" ||
        page in NAV_PAGES ? (
          <>
            {profileMenuOpen ? (
              // Click-away layer below the header, as on the Dashboard.
              <div
                className="fixed inset-x-0 top-[60px] bottom-0 z-40"
                onClick={() => setProfileMenuOpen(false)}
              />
            ) : null}
            <GlobalHeader
              title={
                page === "billing"
                  ? "Billing"
                  : page === "inbox"
                    ? "Inbox"
                    : page === "phone-numbers"
                      ? "Phone Numbers"
                      : page === "live-monitoring"
                        ? "Live Monitoring"
                        : page === "campaigns"
                          ? "Campaigns"
                          : NAV_PAGES[page] ?? "Team Members"
              }
              dialerLocked={dialerLock(license)}
              onMessagesClick={openInbox}
              profileMenuOpen={profileMenuOpen}
              onProfileClick={() => setProfileMenuOpen((open) => !open)}
              profileMenuPanel={
                <ProfileMenu
                  userName="Sarah Johnson"
                  onBillingClick={openBilling}
                />
              }
            />
            {page === "billing" ? (
              <BillingPage />
            ) : page === "campaigns" ? (
              <CampaignsPage locks={campaignLocks} />
            ) : page === "contacts" ? (
              <ContactsPage locks={contactsLocks(license)} />
            ) : page === "integrations" ? (
              <AppIntegrationsPage locks={appIntegrationLocks(license)} />
            ) : page === "call-logs" ? (
              <CallLogsPage locks={callLogsLocks(license)} />
            ) : page === "workflows" ? (
              <WorkflowsPage locks={workflowsLocks(license)} />
            ) : page === "bulk-sms" ? (
              <BulkSmsPage locks={bulkSmsLocks(license)} />
            ) : page === "ai-agents" ? (
              <AgentsPage locks={aiVoiceAgentLocks(license)} />
            ) : page === "ai-knowledge-base" ? (
              <KnowledgeBasePage locks={aiVoiceAgentLocks(license)} />
            ) : page === "roles-permissions" ? (
              <RolesPage locks={rolesLocks(license)} />
            ) : page === "inbox" ? (
              <InboxPage locks={inboxLocks(license)} />
            ) : page === "phone-numbers" ? (
              <PhoneNumbersPage
                locks={phoneNumberLocks(license)}
                registrationCta={license === "lite"}
              />
            ) : page === "live-monitoring" ? (
              // Open to every license; View-only's Monitor Call is locked.
              <LiveMonitoringPage locks={liveMonitoringLocks(license)} />
            ) : editingMember ? (
              <EditMemberPage
                key={editingMember.id}
                member={editingMember}
                onClose={() => setEditingMember(null)}
              />
            ) : addingMembers ? (
              <AddMembersFlow
                onClose={() => setAddingMembers(false)}
                onComplete={(count) => {
                  setAddingMembers(false);
                  setInvited({ open: true, count });
                }}
              />
            ) : (
              <TeamMembersPage
                locks={teamMemberLocks(license)}
                onAddMember={() => setAddingMembers(true)}
                onEditMember={setEditingMember}
              />
            )}
          </>
        ) : (
          <Dashboard
            showLiveMonitoringBanner={false}
            onBillingClick={openBilling}
            onMessagesClick={openInbox}
            dialerLocked={dialerLock(license)}
          />
        )}
        {license && onLicenseChange ? (
          <LicenseSwitch value={license} onChange={onLicenseChange} />
        ) : null}
        <Toast
          open={invited.open}
          onClose={closeInvitedToast}
          title={`${invited.count} team ${invited.count === 1 ? "member" : "members"} invited`}
        />
      </div>
    </div>
  );
}

/**
 * The popped-out webphone — V1's Dialer button opens this in a tab of its own
 * rather than swapping it over the page. It is handed no `onClose`, so the
 * close cross never renders: there is no page behind it for a cross to reveal,
 * and a button whose only effect is an empty tab is worse than no button.
 */
function DialerWindow({
  scope,
  assistConfigured,
  assistAvailable,
}: DialerWindowParams) {
  const busyReasons = useSharedBusyReasons();

  // The tab is its own window now, so its title is the only label the agent
  // has for it while it sits behind the page they popped it from.
  useEffect(() => {
    document.title = "Dialer — JustCall";
  }, []);

  return (
    <DialerPanel
      scope={scope}
      assistConfigured={assistConfigured}
      assistAvailable={assistAvailable}
      busyReasons={busyReasons}
    />
  );
}

// Read once, at module scope: whether this tab is the webphone is fixed for
// the tab's lifetime, and nothing inside App should be able to change it.
const DIALER_WINDOW = readDialerWindowParams(window.location.search);

export default function App() {
  const [view, setView] = useState<AppView>(viewFromHash);

  useEffect(() => {
    const sync = () => setView(viewFromHash());
    window.addEventListener("popstate", sync);
    return () => window.removeEventListener("popstate", sync);
  }, []);

  const openView = useCallback((next: AppView) => {
    window.history.pushState({ fromLauncher: true }, "", `#${next}`);
    setView(next);
  }, []);

  // The logo in each prototype's sidenav. When the launcher opened this view,
  // step back through history so Back/Forward stay a clean pair; on a fresh
  // load straight into a prototype there's nothing behind it, so swap in place.
  const goHome = useCallback(() => {
    if ((window.history.state as { fromLauncher?: boolean } | null)?.fromLauncher) {
      window.history.back();
      return;
    }
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
    setView("launcher");
  }, []);

  if (DIALER_WINDOW) {
    return <DialerWindow {...DIALER_WINDOW} />;
  }

  if (view === "launcher") {
    return (
      <PrototypeLauncher
        onStartLicenseExperience={() => openView("lite")}
        onStartLicenseManagement={() => openView("license-admin")}
        onStartDesktopApp={() => openView("desktop-lite")}
        onStartMobileApp={() => openView("mobile-lite")}
        onStartSalesDialerApp={() => openView("sales-dialer-lite")}
      />
    );
  }

  if (view === "lite" || view === "view-only" || view === "license-admin") {
    // Lite and View-only are one prototype: same element, same position, so
    // switching license keeps whatever page the reviewer is on. The switch
    // swaps the hash in place (no new history entry), so Back still leads
    // to the launcher.
    return (
      <LicenseFlow
        experience={view}
        onHome={goHome}
        onLicenseChange={(next) => {
          window.history.replaceState(window.history.state, "", `#${next}`);
          setView(next);
        }}
      />
    );
  }

  // No license switch: Lite and View-only meet the same refusal at sign-in,
  // so there is nothing for it to change. Both hashes still resolve.
  if (view === "desktop-lite" || view === "desktop-view-only") {
    return <DesktopAppPrototype onHome={goHome} />;
  }

  if (view === "mobile-lite" || view === "mobile-view-only") {
    const license: License = view === "mobile-lite" ? "lite" : "view-only";
    return (
      <>
        <MobileAppPrototype license={license} />
        <LicenseSwitch
          anchor="bottom"
          value={license}
          onChange={(next) => {
            const key: AppView = next === "lite" ? "mobile-lite" : "mobile-view-only";
            window.history.replaceState(window.history.state, "", `#${key}`);
            setView(key);
          }}
        />
      </>
    );
  }

  if (view === "sales-dialer-lite" || view === "sales-dialer-view-only") {
    return <SalesDialerAppPrototype />;
  }

  if (view === "in-call" || view === "v1-in-call") {
    return <InCallFlow scope={view === "v1-in-call" ? "v1" : "v2"} onHome={goHome} />;
  }

  if (view === "v1-in-call-crm") {
    return <CrmInCallPrototype />;
  }

  // Same flow, two axes: the seeded views walk the demo library and the empty
  // ones a brand-new account, while the scope decides how much of Agent Assist
  // exists at all.
  return (
    <SetupFlow
      seeded={view === "setup" || view === "v1-setup"}
      scope={view.startsWith("v1-") ? "v1" : "v2"}
      onHome={goHome}
    />
  );
}
