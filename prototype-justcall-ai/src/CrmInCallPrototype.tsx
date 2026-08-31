import { useEffect, useState, type ReactNode } from "react";
import { Avatar } from "@/components/Avatar";
import { IconClose, IconSearch, IconVoice } from "@/components/Icon";
import { Tabs } from "@/components/Tabs";
import { cn } from "@/lib/utils";
import { AgentAssistCallSheet } from "./AgentAssistCallSheet";
import { CALL_SCENARIOS } from "./callSimulation";
import { LiveAgentAssistPanel } from "./LiveAgentAssistPanel";
import { NotesEditor, type NotesEditorValue } from "./NotesEditor";
import {
  IconCallHold,
  IconCallKeypad,
  IconCallNotes,
} from "./icons/CallControlIcons";

type AssistTab = "guidance" | "script" | "notes";

const scenario = CALL_SCENARIOS[0]!;

function HubSpotMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true" className={className}>
      <path d="M8 6v7m0 0 7 4m-7-4-4 5m11-1 4-7m-4 7 5 5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <circle cx="8" cy="5" r="2.3" fill="currentColor" />
      <circle cx="4" cy="19" r="2.3" fill="currentColor" />
      <circle cx="20" cy="8" r="2.3" fill="currentColor" />
      <circle cx="21" cy="23" r="3" fill="none" stroke="currentColor" strokeWidth="2.2" />
    </svg>
  );
}

function HubSpotPlaceholder() {
  return (
    <div className="absolute inset-0 flex min-w-[980px] flex-col overflow-hidden bg-[#f5f8fa] text-[#33475b]" aria-label="HubSpot contact record placeholder">
      <div className="flex h-12 shrink-0 items-center gap-5 bg-[#213343] px-4 text-white">
        <HubSpotMark className="size-7 shrink-0 text-[#ff5c35]" />
        <div className="flex h-8 w-[350px] items-center gap-2 rounded-[6px] bg-[#3e5870] px-3 text-[13px] text-white/85">
          <IconSearch size={16} />
          Search HubSpot
        </div>
        <div className="ml-auto flex items-center gap-5 text-[12px] text-white/75">
          <span>Upgrade</span><span>☎</span><span>▣</span><span>?</span><span>⚙</span>
          <Avatar size="sm" initials="SL" color="indigo" />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        <nav className="flex w-14 shrink-0 flex-col items-center gap-5 bg-[#263f56] py-5 text-white/65">
          {Array.from({ length: 9 }).map((_, index) => (
            <span key={index} className={cn("flex size-7 items-center justify-center rounded-[5px] text-[12px]", index === 1 && "bg-[#516f90] text-white")}>◇</span>
          ))}
        </nav>
        <aside className="w-[300px] shrink-0 border-r border-[#dfe3e8] bg-white">
          <div className="border-b border-[#dfe3e8] p-5">
            <p className="text-[13px] font-semibold text-[#0091ae]">‹ Contacts</p>
            <div className="mt-8 flex items-center gap-4">
              <span className="flex size-16 items-center justify-center rounded-full bg-[#ff5c35] text-xl font-semibold text-white">MJ</span>
              <div><h2 className="text-[22px] font-medium">Maria Johnson</h2><p className="mt-1 text-[13px]">Salesperson at HubSpot</p><p className="text-[13px]">maria@hubspot.com</p></div>
            </div>
            <div className="mt-7 flex justify-between text-center text-[11px]">
              {['Note','Email','Call','Task','Meeting'].map((item) => <span key={item}><i className="mx-auto mb-1 flex size-8 items-center justify-center rounded-full border border-[#cbd6e2] bg-[#f5f8fa] not-italic">○</i>{item}</span>)}
            </div>
          </div>
          {['About this contact','Communication subscriptions','Website activity','Recent activity'].map((item, index) => (
            <div key={item} className="border-b border-[#dfe3e8] p-5">
              <p className="text-[13px] font-semibold">⌄ &nbsp;{item}</p>
              <div className="mt-5 space-y-2"><span className="block h-2 w-2/3 rounded bg-[#dfe7ee]" /><span className="block h-2 w-1/2 rounded bg-[#e8edf2]" />{index > 1 ? <span className="block h-2 w-4/5 rounded bg-[#e8edf2]" /> : null}</div>
            </div>
          ))}
        </aside>
        <main className="min-w-0 flex-1 p-4">
          <div className="grid h-12 grid-cols-3 border border-[#dfe3e8] bg-white text-center text-[13px]"><span className="flex items-center justify-center font-semibold">Overview</span><span className="flex items-center justify-center border-x border-[#dfe3e8]">Activities</span><span className="flex items-center justify-center">Intelligence</span></div>
          <section className="mt-4 rounded-[4px] bg-white p-5 shadow-sm"><h3 className="font-semibold">Data highlights</h3><div className="mt-6 grid grid-cols-3 gap-8 text-center text-[12px]"><div><b>CREATE DATE</b><p className="mt-2">08/01/2025 1:57 PM</p></div><div><b>LIFECYCLE STAGE</b><p className="mt-2">Lead</p></div><div><b>LAST ACTIVITY DATE</b><p className="mt-2">08/19/2025 12:08 PM</p></div></div></section>
          <section className="mt-4 rounded-[4px] bg-white p-5 shadow-sm"><div className="flex items-center justify-between"><h3 className="font-semibold">Recent activities</h3><span className="text-[13px] font-semibold text-[#0091ae]">Collapse all⌄</span></div><div className="mt-4 flex h-9 w-[300px] items-center gap-2 border border-[#cbd6e2] px-3 text-[13px] text-[#516f90]"><IconSearch size={16}/> Search activities</div><div className="mt-5 space-y-3">{['Sam Lee created a note','Task created via HubSpot Processing','Logged call to Maria Johnson','Meeting with Maria Johnson'].map((item, index) => <div key={item} className="rounded-[4px] border border-[#dfe3e8] p-4"><p className="text-[13px] font-semibold text-[#33475b]">› &nbsp; {item}</p><p className="mt-3 text-[12px] text-[#516f90]">{index === 0 ? 'Will need a discussion!' : 'Activity details and contact history recorded in HubSpot.'}</p></div>)}</div></section>
        </main>
      </div>
      <div className="pointer-events-none absolute inset-0 bg-white/25 backdrop-blur-[1.5px]" />
    </div>
  );
}

function CallControl({ label, children }: { label: string; children: ReactNode }) {
  return <button type="button" aria-label={label} className="flex size-8 items-center justify-center rounded-full bg-white/10 text-white outline-none hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/50">{children}</button>;
}

function formatDuration(ms: number) {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

export function CrmInCallPrototype() {
  const [tab, setTab] = useState<AssistTab>("guidance");
  const [elapsedMs, setElapsedMs] = useState(14_000);
  const [notes, setNotes] = useState<NotesEditorValue>({ html: "", text: "" });

  useEffect(() => {
    const startedAt = Date.now() - 14_000;
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt), 1000);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div className="relative h-screen min-h-[640px] overflow-hidden bg-[#f5f8fa]">
      <HubSpotPlaceholder />
      <aside aria-label="JustCall Agent Assist inside HubSpot" className="absolute inset-y-4 right-4 z-10 flex w-[430px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_16px_48px_rgba(33,51,67,0.2)]">
        <header className="flex h-12 shrink-0 items-center justify-between border-b border-line px-4"><div className="flex items-center gap-2"><span className="flex size-6 items-center justify-center rounded-[6px] bg-brand text-[11px] font-bold text-white">JC</span><span className="text-label-md-semi text-foreground">JustCall</span></div><button type="button" aria-label="Close panel" className="text-muted-foreground hover:text-foreground"><IconClose size={20}/></button></header>
        <section className="shrink-0 bg-[#071a3a] px-4 py-3 text-white">
          <div className="flex items-start justify-between gap-3"><div><p className="text-label-md-semi">Elena Vasquez</p><p className="mt-0.5 text-[12px] text-white/70">+1 (415) 555-0142 · {formatDuration(elapsedMs)}</p></div><div className="flex items-end gap-[3px] pt-1" aria-label="Strong connection">{[8,12,16,20].map((height) => <span key={height} className="w-[3px] rounded-full bg-success" style={{height}} />)}</div></div>
          <div className="mt-3 flex items-center gap-2"><span className="mr-auto inline-flex h-7 items-center gap-1.5 rounded-full bg-white px-2.5 text-[11px] font-medium text-error"><i className="size-2 rounded-full bg-error not-italic"/>Recording</span><CallControl label="Mute"><IconVoice size={18}/></CallControl><CallControl label="Hold"><IconCallHold size={18}/></CallControl><CallControl label="Keypad"><IconCallKeypad size={18}/></CallControl><CallControl label="Notes"><IconCallNotes size={18}/></CallControl><button type="button" className="ml-1 h-8 rounded-full bg-white px-3 text-[11px] font-medium text-error hover:bg-white/90">☎ &nbsp; End call</button></div>
        </section>
        <Tabs items={[{key:"guidance",label:"Guidance"},{key:"script",label:"Script"},{key:"notes",label:"Notes"}]} value={tab} onValueChange={(key) => setTab(key as AssistTab)} className="grid h-11 w-full shrink-0 grid-cols-3 gap-0 border-b border-line px-1 [&>button]:items-center" />
        <div className="min-h-0 flex-1 overflow-hidden">
          {tab === "guidance" ? <LiveAgentAssistPanel elapsedMs={elapsedMs} scenario={scenario} scope="v1" className="h-full [&>header]:hidden" /> : null}
          {tab === "script" ? <AgentAssistCallSheet elapsedMs={elapsedMs} scenario={scenario} onScenarioChange={() => undefined} scope="v1" guidanceDetached className="h-full [&>header]:hidden" /> : null}
          {tab === "notes" ? <div className="flex h-full flex-col gap-3 p-4"><div><p className="text-label-md-semi text-foreground">Call notes</p><p className="mt-1 text-paragraph-sm text-muted-foreground">Notes will be saved to this HubSpot contact.</p></div><NotesEditor value={notes} onChange={setNotes} placeholder="Add notes from this call…" ariaLabel="Call notes" wrapperClassName="min-h-0 flex-1" className="h-full min-h-[240px]" /></div> : null}
        </div>
        <footer className="flex h-12 shrink-0 items-center justify-center border-t border-line bg-white"><button type="button" className="text-label-sm text-brand hover:underline">Open Agent Assist in full window ↗</button></footer>
      </aside>
    </div>
  );
}
