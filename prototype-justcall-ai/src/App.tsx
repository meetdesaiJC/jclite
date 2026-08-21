import { useCallback, useMemo, useState } from "react";
import { Sidenav, type SidenavItemsTransition } from "@/components/Sidenav";
import { Dashboard } from "./Dashboard";
import {
  JustCallAiShell,
  JUSTCALL_AI_ITEMS,
  isJustCallAiPageKey,
  type JustCallAiPageKey,
} from "./JustCallAiShell";
import { PrototypeLauncher } from "./PrototypeLauncher";

type AppView = "launcher" | "setup" | "setup-empty" | "in-call";
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
 */
function SetupFlow({ seeded = true }: { seeded?: boolean }) {
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
 */
function InCallFlow() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidenav activeKey="dashboard" />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Dashboard />
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<AppView>("launcher");

  if (view === "launcher") {
    return (
      <PrototypeLauncher
        onStartSetup={() => setView("setup")}
        onStartInCall={() => setView("in-call")}
        onStartEmptySetup={() => setView("setup-empty")}
      />
    );
  }

  if (view === "in-call") {
    return <InCallFlow />;
  }

  // Same flow, different account: "setup" walks the demo library, "setup-empty"
  // walks a brand-new account with nothing configured yet.
  return <SetupFlow seeded={view === "setup"} />;
}
