import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { InputField } from "@/components/InputField";
import { AvatarIndicator } from "@/components/Avatar";
import {
  IconCallLogs,
  IconChevronDown,
  IconClose,
  IconContacts,
  IconMessages,
  IconOtherApps,
  IconVoicemailDrop,
} from "@/components/Icon";
import { IconJcaiSettings } from "./icons/JustCallAiNavIcons";
import { AgentAssistCallSheet } from "./AgentAssistCallSheet";
import { CALL_SCENARIOS, scenarioById, type CallScenario } from "./callSimulation";
import usFlag from "./assets/dialer/us-flag.svg";
import phoneFilled from "./assets/dialer/phone-filled.svg";
import hangupIcon from "./assets/dialer/hangup.svg";
import messageIcon from "./assets/dialer/message.svg";
import muteIcon from "./assets/dialer/mute.svg";
import holdIcon from "./assets/dialer/hold.svg";
import keypadIcon from "./assets/dialer/keypad.svg";
import transferIcon from "./assets/dialer/transfer.svg";
import userIcon from "./assets/dialer/user.svg";
import noteIcon from "./assets/dialer/note.svg";

/**
 * Dialer page — compact 360px webphone, pinned top-center.
 * Once the callee picks up, the panel expands with Agent Assist + script.
 */

type DialerTab = "dialer" | "call-logs" | "contacts" | "messages" | "settings";
type CallPhase = "idle" | "ringing" | "talking";

const RINGING_MS = 2400;
const DEFAULT_NUMBER = "919773110910";

const KEYPAD: { digit: string; letters: string }[][] = [
  [
    { digit: "1", letters: "" },
    { digit: "2", letters: "ABC" },
    { digit: "3", letters: "DEF" },
  ],
  [
    { digit: "4", letters: "GHI" },
    { digit: "5", letters: "JKL" },
    { digit: "6", letters: "MNO" },
  ],
  [
    { digit: "7", letters: "PQRS" },
    { digit: "8", letters: "TUV" },
    { digit: "9", letters: "WXYZ" },
  ],
  [
    { digit: "*", letters: "" },
    { digit: "0", letters: "+" },
    { digit: "#", letters: "" },
  ],
];

const NAV_ITEMS: {
  id: DialerTab;
  label: string;
  icon: ReactNode;
  badge?: string;
}[] = [
  {
    id: "dialer",
    label: "Dialer",
    icon: <IconOtherApps size={20} className="size-5 text-white" />,
  },
  {
    id: "call-logs",
    label: "Call Logs",
    icon: <IconCallLogs size={20} className="size-5 text-white" />,
  },
  {
    id: "contacts",
    label: "Contacts",
    icon: <IconContacts size={20} className="size-5 text-white" />,
  },
  {
    id: "messages",
    label: "Messages",
    icon: <IconMessages size={20} className="size-5 text-white" />,
    badge: "358",
  },
  {
    id: "settings",
    label: "Settings",
    icon: <IconJcaiSettings className="size-5 text-white" />,
  },
];

function Flag({ className }: { className?: string }) {
  return (
    <img
      src={usFlag}
      alt=""
      className={cn("size-4 shrink-0 rounded-full object-cover", className)}
    />
  );
}

function Glyph({ src, className }: { src: string; className?: string }) {
  return (
    <span className={cn("relative size-6 overflow-clip", className)}>
      <img src={src} alt="" className="size-full object-contain" />
    </span>
  );
}

function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return [hours, minutes, seconds]
    .map((value) => String(value).padStart(2, "0"))
    .join(":");
}

function formatLocalTime(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

export interface DialerPanelProps {
  className?: string;
  onCall?: (number: string) => void;
  onClose?: () => void;
}

export function DialerPanel({ className, onCall, onClose }: DialerPanelProps) {
  const inputId = useId();
  const [number, setNumber] = useState("");
  const [tab, setTab] = useState<DialerTab>("dialer");
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [onHold, setOnHold] = useState(false);
  const [scenarioId, setScenarioId] = useState(CALL_SCENARIOS[0].id);
  const callStartedAt = useRef<number | null>(null);
  const holdStartedAt = useRef<number | null>(null);
  const pausedMs = useRef(0);
  const inCall = phase !== "idle";
  const talking = phase === "talking";
  const scenario = scenarioById(scenarioId);

  useEffect(() => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    input?.focus();
  }, [inputId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    if (!inCall) return;
    const tick = () => {
      const started = callStartedAt.current;
      if (!started) return;
      const raw = Date.now() - started;
      setPhase((current) =>
        current === "ringing" && raw >= RINGING_MS ? "talking" : current
      );
      const holdNow = holdStartedAt.current ? Date.now() - holdStartedAt.current : 0;
      setElapsedMs(Math.max(0, raw - RINGING_MS - pausedMs.current - holdNow));
    };
    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [inCall]);

  useEffect(() => {
    if (!talking || !onHold) return;
    holdStartedAt.current = Date.now();
    return () => {
      if (holdStartedAt.current == null) return;
      pausedMs.current += Date.now() - holdStartedAt.current;
      holdStartedAt.current = null;
    };
  }, [talking, onHold]);

  const appendDigit = (digit: string) => {
    setNumber((current) => `${current}${digit}`);
  };

  const startCall = () => {
    const digits = number.replace(/\D/g, "") || DEFAULT_NUMBER;
    setMuted(false);
    setOnHold(false);
    setElapsedMs(0);
    setScenarioId(CALL_SCENARIOS[0].id);
    holdStartedAt.current = null;
    pausedMs.current = 0;
    callStartedAt.current = Date.now();
    setPhase("ringing");
    onCall?.(digits);
  };

  const endCall = () => {
    callStartedAt.current = null;
    holdStartedAt.current = null;
    pausedMs.current = 0;
    setPhase("idle");
    setElapsedMs(0);
    setMuted(false);
    setOnHold(false);
    setScenarioId(CALL_SCENARIOS[0].id);
  };

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Dialer"
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center overflow-y-auto bg-white pt-8",
        className
      )}
    >
      {onClose ? (
        <button
          type="button"
          aria-label="Close dialer"
          onClick={onClose}
          className="absolute top-4 right-4 flex size-8 items-center justify-center rounded-[4px] text-muted-foreground outline-none transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconClose size={20} />
        </button>
      ) : null}

      {inCall ? (
        <InCallShell
          phase={phase}
          talking={talking}
          elapsedMs={elapsedMs}
          contactName={scenario.contactName}
          contactMeta={scenario.contactMeta}
          muted={muted}
          onHold={onHold}
          tab={tab}
          scenario={scenario}
          onScenarioChange={setScenarioId}
          onTabChange={setTab}
          onMute={() => setMuted((value) => !value)}
          onHoldToggle={() => setOnHold((value) => !value)}
          onHangup={endCall}
        />
      ) : (
        <IdleDialer
          inputId={inputId}
          number={number}
          tab={tab}
          onNumberChange={setNumber}
          onTabChange={setTab}
          onDigit={appendDigit}
          onCall={startCall}
        />
      )}
    </div>,
    document.body
  );
}

function IdleDialer({
  inputId,
  number,
  tab,
  onNumberChange,
  onTabChange,
  onDigit,
  onCall,
}: {
  inputId: string;
  number: string;
  tab: DialerTab;
  onNumberChange: (value: string) => void;
  onTabChange: (tab: DialerTab) => void;
  onDigit: (digit: string) => void;
  onCall: () => void;
}) {
  return (
    <div className="flex w-[360px] shrink-0 flex-col overflow-hidden rounded-[16px] bg-white shadow-600">
      <div className="flex w-full items-center justify-center">
        <div className="flex h-5 w-24 items-center justify-center gap-1.5 rounded-b-lg bg-badge-beta px-2">
          <AvatarIndicator
            status="available"
            size="xs"
            className="static size-2 shrink-0 border-0"
          />
          <span className="text-[10px] leading-3 font-normal whitespace-nowrap text-white">
            Available
          </span>
        </div>
      </div>

      <div className="flex w-full flex-col items-center gap-4 p-4">
        <InputField
          id={inputId}
          variant="prefix"
          prefix={
            <span className="inline-flex items-center gap-1">
              <Flag />
              +1
            </span>
          }
          type="tel"
          inputMode="tel"
          autoComplete="off"
          placeholder="Enter a number"
          value={number}
          onChange={(event) => onNumberChange(event.target.value)}
          aria-label="Phone number"
        />

        <div className="flex flex-col items-center gap-2">
          {KEYPAD.map((row) => (
            <div key={row.map((key) => key.digit).join("")} className="flex gap-2">
              {row.map((key) => (
                <button
                  key={key.digit}
                  type="button"
                  onClick={() => onDigit(key.digit)}
                  className="flex h-[52px] w-[104px] flex-col items-center justify-center rounded-full outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/24 active:scale-[0.97]"
                >
                  <span className="text-[18px] leading-[26px] font-medium text-brand tabular-nums">
                    {key.digit}
                  </span>
                  <span className="min-h-3.5 text-[10px] leading-[14px] font-medium text-muted-foreground uppercase">
                    {key.letters || "\u00a0"}
                  </span>
                </button>
              ))}
            </div>
          ))}
        </div>

        <div className="flex w-full items-center justify-center gap-3">
          <span className="size-14 shrink-0" aria-hidden="true" />
          <button
            type="button"
            aria-label="Call"
            onClick={onCall}
            className="flex size-14 shrink-0 items-center justify-center overflow-clip rounded-full bg-brand outline-none transition-colors hover:bg-brand-hover focus-visible:ring-4 focus-visible:ring-brand/24 active:scale-[0.97]"
          >
            <Glyph src={phoneFilled} />
          </button>
          <button
            type="button"
            aria-label="Send message"
            className="flex size-14 shrink-0 items-center justify-center overflow-clip rounded-full bg-brand-subtle outline-none transition-colors hover:bg-info-secondary focus-visible:ring-4 focus-visible:ring-brand/24 active:scale-[0.97]"
          >
            <span className="relative size-6 overflow-clip">
              <img src={messageIcon} alt="" className="size-full object-contain" />
            </span>
          </button>
        </div>

        <div className="flex w-full items-center justify-center gap-2">
          <span className="text-label-sm text-muted-foreground">Call via</span>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-1 rounded-[4px] border border-line bg-white px-2 outline-none transition-colors hover:border-gray-300 hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <Flag />
            <span className="text-label-sm text-foreground">Support outbound</span>
            <IconChevronDown size={16} className="size-4 shrink-0 text-foreground" />
          </button>
        </div>
      </div>

      <DialerNav tab={tab} onTabChange={onTabChange} />
    </div>
  );
}

function InCallShell({
  phase,
  talking,
  elapsedMs,
  contactName,
  contactMeta,
  muted,
  onHold,
  tab,
  scenario,
  onScenarioChange,
  onTabChange,
  onMute,
  onHoldToggle,
  onHangup,
}: {
  phase: CallPhase;
  talking: boolean;
  elapsedMs: number;
  contactName: string;
  contactMeta: string;
  muted: boolean;
  onHold: boolean;
  tab: DialerTab;
  scenario: CallScenario;
  onScenarioChange: (id: string) => void;
  onTabChange: (tab: DialerTab) => void;
  onMute: () => void;
  onHoldToggle: () => void;
  onHangup: () => void;
}) {
  const reduced = prefersReducedMotion();
  const localTime = formatLocalTime(new Date());

  return (
    <div
      className={cn(
        "flex h-[588px] overflow-hidden rounded-[16px] bg-[#071532] shadow-600",
        reduced
          ? ""
          : "transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]"
      )}
    >
      <div
        className={cn(
          "flex h-full w-[360px] shrink-0 flex-col overflow-hidden bg-[#071532]",
          talking ? "rounded-l-[16px]" : "rounded-[16px]"
        )}
      >
        <div className="flex w-full items-center justify-center px-4">
          <div className="flex h-5 w-[54px] items-center justify-center gap-1.5 rounded-b-lg bg-badge-beta px-2">
            <span className="size-2 shrink-0 rounded-full bg-warning" aria-hidden="true" />
            <span className="text-[10px] leading-3 font-normal whitespace-nowrap text-white">
              Busy
            </span>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col items-center gap-6 overflow-hidden p-4">
          <div className="relative flex h-8 w-full items-center justify-center">
            <p className="text-center text-[12px] leading-4 text-white/70">
              It’s {localTime} there
            </p>
            {talking ? (
              <button
                type="button"
                className="absolute top-1/2 left-0 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-white px-2 py-1 outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              >
                <span className="text-[10px] leading-3 text-error">Record</span>
                <span className="size-2 rounded-full bg-error" aria-hidden="true" />
              </button>
            ) : null}
            <div className="absolute top-1/2 right-0 flex -translate-y-1/2 items-center gap-2">
              {talking ? (
                <>
                  <IconChevronDown size={16} className="size-4 text-white" />
                  <SignalBars />
                </>
              ) : null}
              <button
                type="button"
                aria-label="Notes"
                className="flex size-8 items-center justify-center rounded-lg bg-[#713f12] outline-none transition-colors hover:brightness-110 focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.97]"
              >
                <span className="relative size-4 overflow-clip">
                  <img src={noteIcon} alt="" className="size-full object-contain" />
                </span>
              </button>
            </div>
          </div>

          <div className="flex w-full flex-col items-center gap-2">
            <span className="relative flex size-10 items-center justify-center overflow-clip rounded-full bg-[#344054]">
              <img src={userIcon} alt="" className="size-6 object-contain" />
            </span>
            <div className="flex w-full flex-col items-center gap-1 text-center">
              <p className="text-[16px] leading-6 font-medium text-pretty text-white">
                {contactName}
              </p>
              <p className="text-[12px] leading-4 text-white/70">
                {phase === "ringing" ? `Incoming · Support` : contactMeta}
              </p>
            </div>
            <div className="flex h-11 w-24 flex-col items-center justify-end gap-1 text-center text-white">
              {talking ? (
                <p className="text-[12px] leading-4">Talking</p>
              ) : (
                <p className="text-[12px] leading-4 opacity-0" aria-hidden="true">
                  Talking
                </p>
              )}
              <p className="text-[16px] leading-6 font-medium tabular-nums">
                {phase === "ringing" ? "Ringing" : formatDuration(elapsedMs)}
              </p>
            </div>
          </div>

          <div className="flex flex-col items-center justify-center gap-4">
            <div className="flex gap-4">
              <CallControl
                label="Mute"
                src={muteIcon}
                pressed={muted}
                disabled={!talking}
                onClick={onMute}
              />
              <CallControl
                label="Hold"
                src={holdIcon}
                pressed={onHold}
                disabled={!talking}
                onClick={onHoldToggle}
              />
            </div>
            <div className="flex gap-4">
              <CallControl label="Keypad" src={keypadIcon} disabled={!talking} />
              <CallControl label="Transfer" src={transferIcon} disabled={!talking} />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="size-12 shrink-0" aria-hidden="true" />
            <button
              type="button"
              aria-label="End call"
              onClick={onHangup}
              className="flex h-14 w-32 items-center justify-center overflow-clip rounded-full bg-white outline-none transition-transform hover:bg-surface-hover focus-visible:ring-4 focus-visible:ring-white/30 active:scale-[0.97]"
            >
              <Glyph src={hangupIcon} />
            </button>
            <button
              type="button"
              aria-label="Voicemail drop"
              className="flex size-12 items-center justify-center overflow-clip rounded-full bg-white text-success outline-none transition-transform hover:bg-surface-hover focus-visible:ring-4 focus-visible:ring-white/30 active:scale-[0.97]"
            >
              <IconVoicemailDrop size={24} className="size-6" />
            </button>
          </div>
        </div>

        <DialerNav tab={tab} onTabChange={onTabChange} />
      </div>

      <div
        className={cn(
          "h-full overflow-hidden bg-white",
          reduced ? "" : "transition-[width] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
          talking ? "w-[480px]" : "w-0"
        )}
        aria-hidden={!talking}
        inert={!talking ? true : undefined}
      >
        <AgentAssistCallSheet
          elapsedMs={elapsedMs}
          scenario={scenario}
          onScenarioChange={onScenarioChange}
        />
      </div>
    </div>
  );
}

function CallControl({
  label,
  src,
  pressed,
  disabled,
  onClick,
}: {
  label: string;
  src: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 outline-none",
        disabled && "cursor-not-allowed opacity-45"
      )}
    >
      <span
        className={cn(
          "flex size-14 items-center justify-center overflow-clip rounded-full border border-white transition-colors",
          pressed ? "bg-white/15" : "bg-transparent",
          !disabled && "hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.97]"
        )}
      >
        <Glyph src={src} />
      </span>
      <span className="text-[10px] leading-3 whitespace-nowrap text-white">{label}</span>
    </button>
  );
}

function SignalBars() {
  return (
    <span className="flex items-end gap-px" aria-hidden="true">
      <span className="h-[5px] w-[3px] rounded-[2px] bg-success" />
      <span className="h-2 w-[3px] rounded-[2px] bg-success" />
      <span className="h-[11px] w-[3px] rounded-[2px] bg-success" />
      <span className="h-3.5 w-[3px] rounded-[2px] bg-success" />
    </span>
  );
}

function DialerNav({
  tab,
  onTabChange,
}: {
  tab: DialerTab;
  onTabChange: (tab: DialerTab) => void;
}) {
  return (
    <nav aria-label="Dialer" className="flex w-full items-start bg-brand">
      {NAV_ITEMS.map((item) => {
        const active = tab === item.id;
        return (
          <button
            key={item.id}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onTabChange(item.id)}
            className={cn(
              "relative flex min-w-0 flex-1 flex-col items-center gap-1 py-3 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40",
              active ? "bg-brand-hover" : "bg-brand hover:bg-brand-hover/70"
            )}
          >
            {item.badge && (
              <span className="absolute top-1 right-0 flex items-center justify-center rounded-full bg-error px-1 text-label-xs text-white uppercase">
                {item.badge}
              </span>
            )}
            {item.icon}
            <span className="text-paragraph-sm whitespace-nowrap text-white">
              {item.label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
