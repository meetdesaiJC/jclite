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
import { type AgentAssistScope } from "./agentAssistScope";

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
  | "v1-in-call";
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
}: {
  seeded?: boolean;
  scope?: AgentAssistScope;
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
function InCallFlow({ scope = "v2" }: { scope?: AgentAssistScope }) {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidenav activeKey="dashboard" />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Dashboard scope={scope} />
      </div>
    </div>
  );
}

export default function App() {
  const [view, setView] = useState<AppView>("launcher");

  if (view === "launcher") {
    return (
      <PrototypeLauncher
        onStartV1EmptySetup={() => setView("v1-setup-empty")}
        onStartV1Setup={() => setView("v1-setup")}
        onStartV1InCall={() => setView("v1-in-call")}
        onStartEmptySetup={() => setView("setup-empty")}
        onStartSetup={() => setView("setup")}
        onStartInCall={() => setView("in-call")}
      />
    );
  }

  if (view === "in-call" || view === "v1-in-call") {
    return <InCallFlow scope={view === "v1-in-call" ? "v1" : "v2"} />;
  }

  // Same flow, two axes: the seeded views walk the demo library and the empty
  // ones a brand-new account, while the scope decides how much of Agent Assist
  // exists at all.
  return (
    <SetupFlow
      seeded={view === "setup" || view === "v1-setup"}
      scope={view.startsWith("v1-") ? "v1" : "v2"}
    />
  );
}
