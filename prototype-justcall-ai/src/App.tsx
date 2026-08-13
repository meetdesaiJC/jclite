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

type AppView = "launcher" | "setup" | "in-call";
type AppArea = "dashboard" | "justcall-ai";

/**
 * JustCall AI prototype — lands on the Calls dashboard shell. Clicking
 * JustCall AI runs the nav micro-interaction (product nav exits left,
 * AI nav enters from the right; main content crossfades). Logo + sidenav
 * chrome stay fixed. Back reverses the same motion.
 */
function SetupFlow() {
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
          <JustCallAiShell activeKey={aiPage} />
        </div>
      </div>
    </div>
  );
}

function InCallFlow() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidenav activeKey="dashboard" />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <Dashboard autoOpenDialer autoStartCall />
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
      />
    );
  }

  if (view === "in-call") {
    return <InCallFlow />;
  }

  return <SetupFlow />;
}
