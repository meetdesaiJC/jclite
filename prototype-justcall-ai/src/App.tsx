import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidenav, type SidenavItemsTransition } from "@/components/Sidenav";
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
import { TeamMembersPage } from "./TeamMembersPage";
import { BillingPage, BILLING_NAV_ITEMS } from "./BillingPage";
import { AddMembersFlow } from "./AddMembersFlow";
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
  | "license-admin";

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
];

/**
 * The open prototype lives in the URL hash, so the browser's Back button
 * returns to the launcher and a reload lands where it was. The hash, not the
 * query string: `?` already belongs to the popped-out dialer window.
 */
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
type LicensePage = "dashboard" | "team-members" | "billing";

function LicenseFlow({
  experience,
  onHome,
}: {
  experience: LicenseExperience;
  onHome: () => void;
}) {
  const [page, setPage] = useState<LicensePage>("dashboard");
  // Add Members takes over the page body rather than opening a modal: it is a
  // three-step flow, and the list behind it has nothing to say meanwhile.
  const [addingMembers, setAddingMembers] = useState(false);
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
    setNavTransition("forward");
    setPage("billing");
  }, []);
  const closeBilling = useCallback(() => {
    setNavTransition("back");
    setPage("dashboard");
  }, []);
  const billingBackLink = useMemo(
    () => ({ label: "Back to Dashboard", onClick: closeBilling }),
    [closeBilling]
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
        activeKey={page === "billing" ? "overview" : page}
        items={page === "billing" ? BILLING_NAV_ITEMS : undefined}
        itemsKey={page === "billing" ? "billing" : "product"}
        itemsTransition={navTransition}
        backLink={page === "billing" ? billingBackLink : undefined}
        onItemSelect={(key) => {
          if (key === "dashboard" || key === "team-members") {
            setPage(key);
            setAddingMembers(false);
          }
        }}
      />
      <div className="relative flex min-w-0 flex-1 flex-col">
        {page === "team-members" || page === "billing" ? (
          <>
            {profileMenuOpen ? (
              // Click-away layer below the header, as on the Dashboard.
              <div
                className="fixed inset-x-0 top-[60px] bottom-0 z-40"
                onClick={() => setProfileMenuOpen(false)}
              />
            ) : null}
            <GlobalHeader
              title={page === "billing" ? "Billing" : "Team Members"}
              profileMenuOpen={profileMenuOpen}
              onProfileClick={() => setProfileMenuOpen((open) => !open)}
              profileMenuPanel={
                <ProfileMenu userName="Sarah Johnson" onBillingClick={openBilling} />
              }
            />
            {page === "billing" ? (
              <BillingPage />
            ) : addingMembers ? (
              <AddMembersFlow
                onClose={() => setAddingMembers(false)}
                onComplete={(count) => {
                  setAddingMembers(false);
                  setInvited({ open: true, count });
                }}
              />
            ) : (
              <TeamMembersPage onAddMember={() => setAddingMembers(true)} />
            )}
          </>
        ) : (
          <Dashboard showLiveMonitoringBanner={false} onBillingClick={openBilling} />
        )}
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
        onStartLite={() => openView("lite")}
        onStartViewOnly={() => openView("view-only")}
        onStartLicenseManagement={() => openView("license-admin")}
      />
    );
  }

  if (view === "lite" || view === "view-only" || view === "license-admin") {
    return <LicenseFlow experience={view} onHome={goHome} />;
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
