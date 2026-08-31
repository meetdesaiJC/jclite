import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { DURATION } from "@/lib/motion";
import { Button } from "@/components/Button";
import { Dropdown } from "@/components/Dropdown";
import { FeedbackThumbs, type FeedbackVote } from "@/components/FeedbackThumbs";
import { InputField } from "@/components/InputField";
import { AvatarIndicator } from "@/components/Avatar";
import {
  IconCallDisposition,
  IconCallLogs,
  IconCheck,
  IconChevronDown,
  IconClose,
  IconContacts,
  IconMessages,
  IconOtherApps,
  IconSparkles,
  IconVoice,
  IconVoicemailDrop,
} from "@/components/Icon";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import { IconJcaiSettings } from "./icons/JustCallAiNavIcons";
import {
  IconCallHold,
  IconCallKeypad,
  IconCallNotes,
  IconCallTranscript,
  IconCallTransfer,
} from "./icons/CallControlIcons";
import { AgentAssistCallSheet, LiveTranscriptPanel } from "./AgentAssistCallSheet";
import {
  NotesEditor,
  type NotesEditorCaret,
  type NotesEditorHandle,
  type NotesEditorValue,
} from "./NotesEditor";
import { LiveAgentAssistPanel } from "./LiveAgentAssistPanel";
import { type AgentAssistScope } from "./agentAssistScope";
import {
  LiveAssistControl,
  LiveAssistPanel,
  LiveAssistToast,
  useLiveAssist,
  type LiveAssistThread,
} from "./LiveAssistPanel";
import { CallWaveform } from "./CallWaveform";
import { CallWorkspaceResizeHandle } from "./CallWorkspaceResizeHandle";
import {
  CALL_ASIDE,
  canResizeWorkspace,
  fractionsForAsideOpen,
  type CallPaneCollapsed,
  type CallPaneId,
} from "./callWorkspaceLayout";
import { useCallWorkspaceResize } from "./useCallWorkspaceResize";
import {
  useAsidePanelSwitch,
  type AsidePanel,
} from "./useAsidePanelSwitch";
import {
  NOTES_DISCOVERY,
  useNotesDiscovery,
  type NotesDiscoveryFlight,
} from "./useNotesDiscovery";
import { trackNotes } from "./notesTelemetry";
import {
  CALL_SCENARIOS,
  POST_WRAP_COMPLETED_DELAY_MS,
  scenarioById,
  simulationAt,
  type CallOutcomeValue,
  type CallScenario,
} from "./callSimulation";
import type { ActionState } from "./actionsData";
import {
  CallBarSurfaces,
  callStatusLabel,
  DTMF_READOUT_MAX,
  TRANSFER_CONNECT_MS,
  VOICEMAIL_DROP_MS,
  type CallControlsModel,
  type CallSurface,
  type CallTransfer,
  type TransferMode,
  type VoicemailDrop,
} from "./CallControlSurfaces";
import {
  VOICEMAIL_GREETINGS,
  type TransferTarget,
} from "./callTransferData";
import usFlag from "./assets/dialer/us-flag.svg";
import phoneFilled from "./assets/dialer/phone-filled.svg";
import hangupIcon from "./assets/dialer/hangup.svg";
import messageIcon from "./assets/dialer/message.svg";
import userIcon from "./assets/dialer/user.svg";

/**
 * Dialer page — compact 360px webphone, pinned top-center while idle
 * (and while the line is still ringing). Once the callee picks up, the
 * call workspace — script, guidance, transcript, then wrap-up — sits
 * centered so those panes read as one object.
 */

type DialerTab = "dialer" | "call-logs" | "contacts" | "messages" | "settings";
/**
 * `connecting` is the beat between pickup and the workspace: the phone is still
 * whole, it just stops saying Ringing and starts the clock. The layout only
 * begins to move once that has registered.
 */
type CallPhase = "idle" | "ringing" | "connecting" | "talking" | "wrapup";

const NOTES_MAX = 1500;

/** One call, one set of notes — the live pane and Wrap up edit the same value. */
const EMPTY_NOTES: NotesEditorValue = { html: "", text: "" };

/**
 * How long the workspace takes to give the aside column its width — and
 * to take it away. Matches `--call-aside-open-ms` / `--call-aside-close-ms`.
 */
const ASIDE_OPEN_MS = 280;
const ASIDE_CLOSE_MS = 240;

/** The beat between arming the width transition and changing the widths. */
const ASIDE_RELEASE_MS = 48;

/** Disposition reads at a glance — the dot carries the outcome, not the words. */
const OUTCOME_TONE = {
  positive: "bg-success",
  pending: "bg-warning",
  negative: "bg-error",
  neutral: "bg-disabled-fg",
} as const;

type OutcomeTone = keyof typeof OUTCOME_TONE;

const CALL_OUTCOMES: {
  value: CallOutcomeValue;
  label: string;
  tone: OutcomeTone;
}[] = [
  { value: "interested", label: "Interested", tone: "positive" },
  { value: "follow-up", label: "Follow-up required", tone: "pending" },
  { value: "meeting", label: "Meeting booked", tone: "positive" },
  { value: "not-interested", label: "Not interested", tone: "negative" },
  { value: "no-answer", label: "No answer", tone: "neutral" },
  { value: "voicemail", label: "Left voicemail", tone: "neutral" },
  { value: "wrong-number", label: "Wrong number", tone: "neutral" },
];

const RINGING_MS = 2400;
const DEFAULT_NUMBER = "919773110910";

/**
 * Keypad and ringing are the same phone, so the card cannot change size when
 * the agent hits Call — only what is inside it changes. The number is the
 * ringing state's natural height, since its content is the taller of the two.
 * The keypad needs less, and spreads its rows into the room left over.
 */
const PHONE_SHELL_H = "h-[588px] max-h-full";

/** Tap Call — let the button finish compressing before the dialer turns over. */
const CALL_PRESS_MS = 120;
/** Hangup — Agent Assist lets go first, then the phone changes state. */
const ASSIST_COLLAPSE_MS = 200;
/** After completed cards land, hold them on screen before hangup. */
const POST_COMPLETED_HANGUP_MS = 2800;
/** How long the outgoing card stays on top while the next one resolves. */
const SHELL_CROSSFADE_MS = 180;
/** Save & close — the button confirms before the wrap-up lets go. */
const SAVE_CONFIRM_MS = 520;

/* ── Answered → workspace ───────────────────────────────────────────────────
   One ~640ms move, timed from the moment the line goes live. The phone is
   never swapped for another screen: it becomes the call bar, and the panels
   only arrive once that has almost finished. */

/** 0–120ms — Ringing → Connected, clock starts, nothing has moved yet. */
const CONNECT_BEAT_MS = 120;
/** 120–480ms — the dark card compresses upward and spreads into the bar. */
const MORPH_SURFACE_MS = 360;
/** 140–440ms — avatar, caller, Mute/Hold/Keypad/Transfer and End call travel. */
const MORPH_ELEMENT_DELAY_MS = 20;
const MORPH_ELEMENT_MS = 300;
/** 160ms — anything the bar has no use for, and the form change under a move. */
const MORPH_FADE_MS = 160;
/** 120–640ms — the whole move, measured from the first frame of geometry. */
const MORPH_TOTAL_MS = 520;
/** No bounce: a single decelerating curve carries every part of the move. */
const MORPH_EASE = "cubic-bezier(0.22, 1, 0.36, 1)";
/** Bar chrome with no counterpart on the phone resolves after the travel. */
const BAR_DETAIL_DELAY_MS = 340;
/** 360–580ms, then 420–640ms — panels land last, left to right. */
const PANE_REVEAL_DELAYS_MS = [240, 270, 300];
/**
 * The stage has finished arriving: the last pane's entrance is over (its delay
 * plus the 220ms `call-stage-pane-in` runs to), which lands at the same beat
 * the morph does. Measured from the moment the call goes live, so it holds for
 * a resumed call that had no phone to morph from.
 */
const STAGE_SETTLED_MS = PANE_REVEAL_DELAYS_MS[2] + 220;

/* ── Completed call → dialer ────────────────────────────────────────────
   Putting a finished call away. The recap collapses toward the completed-call
   bar while the dialer arrives underneath it from the same horizontal centre,
   overlapping so the stage is never empty: one workspace folding up, not a
   page change. The choreography itself lives in `styles.css`; what JS needs
   is when the recap stops being on screen and when the dialer starts taking
   clicks.

   Composed from the scale rather than re-typed — the panes leave at `base`,
   the dark bar outlasts them at `moderate`, and the dialer waits a `micro`
   beat before taking `moderate`. Nothing here is a new duration (CLAUDE.md §4). */
/** The whole move: the dialer's beat of overlap plus its arrival. */
const POST_CALL_CLOSE_MS = DURATION.micro + DURATION.moderate;
/**
 * The dialer takes clicks once its entrance is all but done — early enough
 * that a fast agent isn't typing into a dead card, late enough that a click
 * aimed at the recap can't land on the dialer under it.
 */
const DIALER_ARM_MS = DURATION.micro + DURATION.base;
/** Reduced motion: one crossfade, no collapse, no travel, nothing to wait out. */
const POST_CALL_CLOSE_REDUCED_MS = DURATION.fast;

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

type MorphRect = { left: number; top: number; width: number; height: number };
type MorphCapture = { card: MorphRect; parts: Map<string, MorphRect> };

function readRect(el: Element): MorphRect {
  const { left, top, width, height } = el.getBoundingClientRect();
  return { left, top, width, height };
}

/**
 * Viewport rect → stage-relative rect. The morph layers are absolute children
 * of the stage rather than fixed to the viewport: the shell's entrance
 * animation leaves a transform behind, and a transformed ancestor becomes the
 * containing block for fixed children — which would silently offset them by the
 * overlay's top padding. Start and target are converted against one origin read
 * in the same frame, so any ancestor offset cancels out.
 */
function localRect(rect: MorphRect, origin: MorphRect): MorphRect {
  return {
    left: rect.left - origin.left,
    top: rect.top - origin.top,
    width: rect.width,
    height: rect.height,
  };
}

/**
 * Write a rect to an element. Unlike React's style prop, the CSSOM takes no
 * bare numbers — a unitless value is dropped silently, which would leave a
 * layer sitting wherever it happened to land.
 */
function applyRect(el: HTMLElement, rect: MorphRect) {
  el.style.left = `${rect.left}px`;
  el.style.top = `${rect.top}px`;
  el.style.width = `${rect.width}px`;
  el.style.height = `${rect.height}px`;
}

/**
 * Snapshot where the phone and each of its shared elements sit, while the
 * phone is still the thing on screen. Taken during the connect beat, which is
 * the last frame before the layout turns over.
 */
function captureMorph(card: HTMLElement): MorphCapture {
  const parts = new Map<string, MorphRect>();
  card.querySelectorAll<HTMLElement>("[data-morph]").forEach((el) => {
    const key = el.dataset.morph;
    if (key) parts.set(key, readRect(el));
  });
  return { card: readRect(card), parts };
}

/**
 * Play the move. The dark surface takes the geometry — phone footprint to bar
 * footprint — while each element that exists in both places is inverted back
 * to where it was on the phone and released. A control that changes form on
 * the way (a 56px ringed circle becoming a 20px bar icon) cross-dissolves
 * across the same travel, so the change of shape rides the movement instead of
 * cutting.
 */
function runMorph(
  from: MorphCapture,
  root: HTMLElement,
  surface: HTMLElement,
  ghost: HTMLElement | null
): () => void {
  const bar = root.querySelector<HTMLElement>("[data-morph-bar]");
  if (!bar) return () => {};

  // One origin, read in the same frame as the target, for both layers.
  const origin = readRect(root);
  const footprint = localRect(from.card, origin);
  const to = readRect(bar);
  const travelling: HTMLElement[] = [];

  bar.querySelectorAll<HTMLElement>("[data-morph]").forEach((el) => {
    const key = el.dataset.morph;
    const start = key ? from.parts.get(key) : undefined;
    if (!start) return;
    const end = readRect(el);
    if (end.width === 0 || end.height === 0) return;

    // Text re-flows rather than scales; a control keeps its proportions and
    // takes the ratio that matches how it is read — its overall height.
    const mode = el.dataset.morphScale ?? "width";
    const scale =
      mode === "none"
        ? 1
        : mode === "height"
          ? start.height / end.height
          : start.width / end.width;
    const dx = start.left + start.width / 2 - (end.left + end.width / 2);
    const dy = start.top + start.height / 2 - (end.top + end.height / 2);

    el.style.transition = "none";
    el.style.transformOrigin = "center center";
    el.style.transform = `translate(${dx}px, ${dy}px) scale(${scale})`;
    el.style.opacity = "0";
    el.style.willChange = "transform, opacity";
    travelling.push(el);
  });

  // Both layers start on the phone's footprint. Written here rather than in
  // render because only now is the origin they resolve against known — and a
  // layout effect still lands before the first paint, so nothing shows late.
  applyRect(surface, footprint);
  if (ghost) applyRect(ghost, footprint);

  // Flush the inverted state so the first painted frame is still the phone.
  void surface.offsetWidth;

  const frame = requestAnimationFrame(() => {
    surface.style.transition = (["left", "top", "width", "height"] as const)
      .map((prop) => `${prop} ${MORPH_SURFACE_MS}ms ${MORPH_EASE}`)
      .join(", ");
    applyRect(surface, localRect(to, origin));

    travelling.forEach((el) => {
      el.style.transition = [
        `transform ${MORPH_ELEMENT_MS}ms ${MORPH_EASE} ${MORPH_ELEMENT_DELAY_MS}ms`,
        `opacity ${MORPH_FADE_MS}ms ease-out ${MORPH_ELEMENT_DELAY_MS}ms`,
      ].join(", ");
      el.style.transform = "none";
      el.style.opacity = "1";
    });
  });

  return () => {
    cancelAnimationFrame(frame);
    travelling.forEach((el) => {
      el.style.removeProperty("transition");
      el.style.removeProperty("transform");
      el.style.removeProperty("transform-origin");
      el.style.removeProperty("opacity");
      el.style.removeProperty("will-change");
    });
  };
}

/**
 * Cross-dissolve between two call cards. The outgoing card is snapshotted and
 * held on top at the same footprint while the incoming card resolves under it,
 * so dialing → ringing → wrap-up reads as one surface changing state.
 */
function ShellSwap({
  swapKey,
  reduced,
  instant = false,
  className,
  children,
}: {
  swapKey: string;
  reduced: boolean;
  /**
   * Hand the next card over with no dissolve. The post-call close runs its
   * own choreography across both cards, and a generic crossfade laid on top
   * of it reads as the recap flashing back in on its way out.
   */
  instant?: boolean;
  className?: string;
  children: (enterClassName: string) => ReactNode;
}) {
  const [live, setLive] = useState({ key: swapKey, entering: false });
  const [outgoing, setOutgoing] = useState<ReactNode>(null);
  const onScreen = useRef<ReactNode>(null);
  const timer = useRef<number | null>(null);
  const cut = reduced || instant;

  // Commit the entering state in the same render as the swap, so the incoming
  // card never lands at full opacity for a frame before the dissolve starts.
  if (live.key !== swapKey) setLive({ key: swapKey, entering: !cut });
  const rendered = children(
    live.key === swapKey && live.entering ? "dialer-shell-in" : ""
  );

  useEffect(() => {
    const previous = onScreen.current;
    if (!previous || cut) return;
    setOutgoing(previous);
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setOutgoing(null), SHELL_CROSSFADE_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [swapKey]);

  useEffect(() => {
    onScreen.current = rendered;
  });

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current);
    },
    []
  );

  return (
    <div className={cn("relative", className)}>
      {outgoing ? (
        <div
          aria-hidden="true"
          inert
          className="dialer-shell-out pointer-events-none absolute inset-0 z-10 flex items-center justify-center"
        >
          {outgoing}
        </div>
      ) : null}
      {rendered}
    </div>
  );
}

export interface DialerPanelProps {
  /** V1 has no Live Assist, coaching cues or suggested actions. */
  scope?: AgentAssistScope;
  className?: string;
  onCall?: (number: string) => void;
  onClose?: () => void;
}

export function DialerPanel({
  className,
  onCall,
  onClose,
  scope = "v2",
}: DialerPanelProps) {
  const inputId = useId();
  const [number, setNumber] = useState("");
  const [tab, setTab] = useState<DialerTab>("dialer");
  const [phase, setPhase] = useState<CallPhase>("idle");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [muted, setMuted] = useState(false);
  const [onHold, setOnHold] = useState(false);
  // Recording is the one bar control that reports rather than acts, so pausing
  // it is the exception the agent reaches for — a card number about to be read
  // aloud — and the pill has to say so plainly while it is off.
  const [recordingPaused, setRecordingPaused] = useState(false);
  // The three controls that open something rather than toggle something, and
  // what they leave behind. Owned here, above the ringing → live morph: a
  // transfer takes the call with it, so it cannot live in the bar it started
  // from. See CallControlSurfaces.tsx.
  const [surface, setSurface] = useState<CallSurface | null>(null);
  const [tones, setTones] = useState("");
  const [transfer, setTransfer] = useState<CallTransfer | null>(null);
  const [voicemail, setVoicemail] = useState<VoicemailDrop | null>(null);
  const [scenarioId, setScenarioId] = useState(CALL_SCENARIOS[0].id);
  const [assistCollapsing, setAssistCollapsing] = useState(false);
  // The completed call is on its way out: the recap is collapsing and the
  // dialer is arriving under it. Also the transition lock — one close runs,
  // however many × clicks, Escapes or Save & closes arrive while it does.
  const [closing, setClosing] = useState(false);
  // The arriving dialer stops being a picture and starts taking clicks.
  const [dialerArmed, setDialerArmed] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const collapseTimer = useRef<number | null>(null);
  const closeTimers = useRef<number[]>([]);
  // Where the close came from decides where focus lands afterwards.
  const closedByKeyboard = useRef(false);
  const callStartedAt = useRef<number | null>(null);
  const holdStartedAt = useRef<number | null>(null);
  const pausedMs = useRef(0);
  const autoEnded = useRef(false);
  const inCall = phase !== "idle";
  const connecting = phase === "connecting";
  const talking = phase === "talking";
  const wrapping = phase === "wrapup";
  const scenario = scenarioById(scenarioId);

  useEffect(() => {
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    input?.focus();
  }, [inputId]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // During a live call the stage owns Escape (close the open panel, not
      // the whole dialer). A dialog opened from inside the call — the battle
      // card zoom, say — still owns Escape first.
      if (talking) return;
      // A close is already running. Leaving mid-collapse would cut the
      // screen in half; the transition is short enough to wait out.
      if (closing) return;
      const dialogs = document.querySelectorAll('[role="dialog"]');
      const topmost = dialogs[dialogs.length - 1];
      if (topmost && topmost !== rootRef.current) return;
      onClose?.();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [onClose, talking, closing]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, []);

  useEffect(() => {
    if (phase !== "ringing" && phase !== "connecting" && phase !== "talking") return;
    const tick = () => {
      const started = callStartedAt.current;
      if (!started) return;
      const raw = Date.now() - started;
      setPhase((current) =>
        current === "ringing" && raw >= RINGING_MS ? "connecting" : current
      );
      const holdNow = holdStartedAt.current ? Date.now() - holdStartedAt.current : 0;
      setElapsedMs(Math.max(0, raw - RINGING_MS - pausedMs.current - holdNow));
    };
    tick();
    const timer = window.setInterval(tick, 200);
    return () => window.clearInterval(timer);
  }, [phase]);

  // Answered. Let the phone say so and start counting before anything moves.
  useEffect(() => {
    if (phase !== "connecting") return;
    if (prefersReducedMotion()) {
      setPhase("talking");
      return;
    }
    const beat = window.setTimeout(() => setPhase("talking"), CONNECT_BEAT_MS);
    return () => window.clearTimeout(beat);
  }, [phase]);

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

  /** New line, clean slate — no panel, no tones, nothing in flight. */
  const clearCallControls = () => {
    setSurface(null);
    setTones("");
    setTransfer(null);
    setVoicemail(null);
  };

  const startCall = (opts?: {
    skipRinging?: boolean;
    scenarioId?: string;
    elapsedMs?: number;
  }) => {
    const digits = number.replace(/\D/g, "") || DEFAULT_NUMBER;
    const seek = opts?.elapsedMs ?? 0;
    setMuted(false);
    setOnHold(false);
    setRecordingPaused(false);
    clearCallControls();
    setElapsedMs(seek);
    setScenarioId(opts?.scenarioId ?? CALL_SCENARIOS[0].id);
    holdStartedAt.current = null;
    pausedMs.current = 0;
    autoEnded.current = false;
    if (opts?.skipRinging) {
      callStartedAt.current = Date.now() - RINGING_MS - seek;
      setPhase("talking");
    } else {
      callStartedAt.current = Date.now();
      setPhase("ringing");
    }
    onCall?.(digits);
  };

  const resetToIdle = () => {
    callStartedAt.current = null;
    holdStartedAt.current = null;
    pausedMs.current = 0;
    autoEnded.current = false;
    setPhase("idle");
    setElapsedMs(0);
    setMuted(false);
    setOnHold(false);
    setRecordingPaused(false);
    clearCallControls();
    setScenarioId(CALL_SCENARIOS[0].id);
  };

  const clearCloseTimers = () => {
    closeTimers.current.forEach((id) => window.clearTimeout(id));
    closeTimers.current = [];
  };

  const finishClose = () => {
    clearCloseTimers();
    resetToIdle();
  };

  /**
   * × on the completed-call bar, and Save & close after it has confirmed.
   *
   * Anything the agent could lose is settled here, before the first frame:
   * a recap that animates away and then asks about unsaved notes has already
   * told them the call was filed. The outcome and the notes are held above
   * this swap — the notes are the same value the live pane was writing — so
   * there is nothing to hold the transition back for. Nor does a summary
   * still being generated: the agent should never wait on the model to be
   * allowed to make their next call.
   */
  const closeRecap = (fromKeyboard = false) => {
    if (closing) return;
    closedByKeyboard.current = fromKeyboard;
    const reduced = prefersReducedMotion();
    setClosing(true);
    // A crossfade has no travel to protect the dialer from.
    setDialerArmed(reduced);
    if (!reduced) {
      closeTimers.current.push(
        window.setTimeout(() => setDialerArmed(true), DIALER_ARM_MS)
      );
    }
    closeTimers.current.push(
      window.setTimeout(
        finishClose,
        reduced ? POST_CALL_CLOSE_REDUCED_MS : POST_CALL_CLOSE_MS
      )
    );
  };

  /** Dialled straight out of the arriving dialer — the close has been overtaken. */
  const callFromArrival = () => {
    clearCloseTimers();
    startCall();
  };

  const endToWrapUp = () => {
    collapseTimer.current = null;
    holdStartedAt.current = null;
    pausedMs.current = 0;
    setAssistCollapsing(false);
    setMuted(false);
    setOnHold(false);
    setRecordingPaused(false);
    clearCallControls();
    setPhase("wrapup");
  };

  const hangup = () => {
    if (collapseTimer.current != null) return;
    // Freeze the clock at hangup; the panel gets its beat to let go first.
    callStartedAt.current = null;
    if (phase === "talking") {
      if (prefersReducedMotion()) {
        endToWrapUp();
        return;
      }
      setAssistCollapsing(true);
      collapseTimer.current = window.setTimeout(endToWrapUp, ASSIST_COLLAPSE_MS);
      return;
    }
    holdStartedAt.current = null;
    pausedMs.current = 0;
    setMuted(false);
    setOnHold(false);
    setRecordingPaused(false);
    resetToIdle();
  };

  /* ── The three controls that open something ──────────────────────────────
     Keypad, Transfer and Voicemail drop. Toggling ones (Mute, Hold) are just
     booleans; these three own a surface and two of them end the call, so the
     line's fate is decided here rather than inside the panel that asked. */

  /** The line is leaving. Nothing else on the bar may touch it. */
  const controlsBusy = transfer?.stage === "connecting" || voicemail !== null;

  const toggleSurface = (next: CallSurface) => {
    if (controlsBusy) return;
    setSurface((current) => (current === next ? null : next));
  };

  const sendTone = (digit: string) => {
    // The readout is a reminder of what the IVR was told, not a transcript —
    // past a dozen tones the agent is reading the wrong end of the string.
    setTones((current) => `${current}${digit}`.slice(-DTMF_READOUT_MAX));
  };

  /**
   * "Ask first" holds the customer and puts the agent on with the target;
   * "Transfer now" hands the call straight over. Either way the panel closes
   * on a cold transfer — there is nothing left to decide — and stays open on a
   * warm one, because the consult is the next thing it has to show.
   */
  const startTransfer = (target: TransferTarget, mode: TransferMode) => {
    setTransfer({
      targetId: target.id,
      mode,
      stage: mode === "warm" ? "consulting" : "connecting",
      heldBefore: onHold,
    });
    if (mode === "warm") {
      setOnHold(true);
      return;
    }
    setSurface(null);
  };

  const completeTransfer = () => {
    setTransfer((current) =>
      current ? { ...current, stage: "connecting" } : current
    );
    setSurface(null);
  };

  /** Backing out of a consult gives the customer back — held or not, as found. */
  const cancelTransfer = () => {
    setOnHold(transfer?.heldBefore ?? false);
    setTransfer(null);
  };

  const dropVoicemail = (greetingId: string) => {
    setVoicemail({ greetingId });
    setSurface(null);
  };

  const callControls: CallControlsModel = {
    surface,
    tones,
    transfer,
    voicemail,
    busy: controlsBusy,
    onSurfaceToggle: toggleSurface,
    onSurfaceClose: () => setSurface(null),
    onTone: sendTone,
    onTonesClear: () => setTones(""),
    onTransferStart: startTransfer,
    onTransferComplete: completeTransfer,
    onTransferCancel: cancelTransfer,
    onVoicemailDrop: dropVoicemail,
  };

  // A transfer that has stopped consulting is the call leaving. Let the bar
  // say where it went before the line closes — the recap that follows is the
  // only record the agent gets.
  useEffect(() => {
    if (transfer?.stage !== "connecting") return;
    const timer = window.setTimeout(hangup, TRANSFER_CONNECT_MS);
    return () => window.clearTimeout(timer);
    // `hangup` is rebuilt every render; the stage change is the trigger.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfer?.stage]);

  // The greeting plays out, then the line closes. No cancel: by the time the
  // bar says this, the customer already has the recording.
  useEffect(() => {
    if (!voicemail) return;
    const timer = window.setTimeout(hangup, VOICEMAIL_DROP_MS);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voicemail]);

  const callWrapped = talking && simulationAt(scenario, elapsedMs).wrapped;

  useEffect(() => {
    if (!callWrapped || autoEnded.current) return;
    autoEnded.current = true;
    const timer = window.setTimeout(
      hangup,
      POST_WRAP_COMPLETED_DELAY_MS + POST_COMPLETED_HANGUP_MS
    );
    return () => window.clearTimeout(timer);
  }, [callWrapped]);

  useEffect(
    () => () => {
      if (collapseTimer.current) window.clearTimeout(collapseTimer.current);
      closeTimers.current.forEach((id) => window.clearTimeout(id));
    },
    []
  );

  /**
   * The close is over — either the dialer landed, or a call was dialled out of
   * it before it did. Drop the lock, then put focus somewhere defensible.
   *
   * Only a keyboard close earns the caret: filling the number field after a
   * pointer close would open the OS keyboard on a phone, and on desktop it
   * hands the next keystroke to a field the agent never asked for. The
   * container takes focus instead, so the dialog still owns the keyboard.
   */
  useEffect(() => {
    if (!closing || phase === "wrapup") return;
    setClosing(false);
    setDialerArmed(false);
    if (phase !== "idle") return;
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const input = document.getElementById(inputId) as HTMLInputElement | null;
    if (closedByKeyboard.current && !coarse) input?.focus();
    else rootRef.current?.focus({ preventScroll: true });
  }, [closing, phase, inputId]);

  const resetCallClock = () => {
    if (callStartedAt.current == null) return;
    pausedMs.current = 0;
    holdStartedAt.current = null;
    if (onHold) setOnHold(false);
    autoEnded.current = false;
    callStartedAt.current = Date.now() - RINGING_MS;
    setElapsedMs(0);
  };

  return createPortal(
    <div
      ref={rootRef}
      role="dialog"
      aria-modal="true"
      aria-label="Dialer"
      // Focusable so a closed recap has somewhere to leave focus that isn't
      // the number field (see the close effect above).
      tabIndex={-1}
      className={cn(
        // Page-level surface, so it sits under dialogs (Modal/Sidesheet, z-50)
        // and popovers (tooltips, z-100) — otherwise anything opened from
        // inside the call workspace, like the battle card zoom, renders behind it.
        "fixed inset-0 z-40 flex flex-col items-center overflow-hidden bg-secondary-bg pt-8 pb-8 outline-none",
        className
      )}
    >
      {onClose ? (
        <button
          type="button"
          aria-label="Close dialer"
          // Above the stage, which claims a layer of its own while a recap
          // is collapsing over the arriving dialer.
          onClick={() => {
            if (closing) return;
            onClose();
          }}
          className="absolute top-4 right-4 z-20 flex size-8 items-center justify-center rounded-[4px] text-muted-foreground outline-none transition-colors hover:bg-white hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
        >
          <IconClose size={20} />
        </button>
      ) : null}

      {/* The dialer, already on stage underneath the recap that is collapsing
          off it — same horizontal centre, same top edge it will keep, so the
          hand-over reads as one workspace rather than two screens. Inert
          until its entrance is all but done, so a click meant for the recap
          cannot fall through to the keypad. */}
      {closing && wrapping ? (
        <div
          inert={!dialerArmed}
          className="absolute inset-0 flex items-start justify-center pt-8 pb-8"
        >
          <IdleDialer
            className="post-call-dialer-in"
            inputId={`${inputId}-arriving`}
            number={number}
            tab={tab}
            onNumberChange={setNumber}
            onTabChange={setTab}
            onDigit={appendDigit}
            onCall={callFromArrival}
          />
        </div>
      ) : null}

      {/* Dialing → ringing: the dialer transforms into the dark call state
          rather than hard-switching. */}
      <ShellSwap
        swapKey={inCall ? "call" : "idle"}
        reduced={prefersReducedMotion()}
        instant={closing}
        className="relative z-10 flex h-full min-h-0 w-full flex-1 items-center justify-center"
      >
        {(enter) =>
          inCall ? (
            <InCallShell
              className={enter}
              scope={scope}
              talking={talking}
              connecting={connecting}
              wrapping={wrapping}
              assistCollapsing={assistCollapsing}
              elapsedMs={elapsedMs}
              contactName={scenario.contactName}
              contactMeta={scenario.contactMeta}
              muted={muted}
              onHold={onHold}
              recordingPaused={recordingPaused}
              tab={tab}
              scenario={scenario}
              onScenarioChange={(id) => {
                setScenarioId(id);
                resetCallClock();
              }}
              onTabChange={setTab}
              onMute={() => setMuted((value) => !value)}
              onHoldToggle={() => setOnHold((value) => !value)}
              onRecordingToggle={() => setRecordingPaused((value) => !value)}
              controls={callControls}
              onHangup={hangup}
              closing={closing}
              onCloseWrapUp={closeRecap}
            />
          ) : (
            // Compact phone (idle keypad, and ringing via CallMorphStage)
            // sits at the top. The live script and wrap-up stay centered.
            <div className="flex h-full w-full items-start justify-center self-stretch">
              <IdleDialer
                className={enter}
                inputId={inputId}
                number={number}
                tab={tab}
                onNumberChange={setNumber}
                onTabChange={setTab}
                onDigit={appendDigit}
                onCall={startCall}
              />
            </div>
          )
        }
      </ShellSwap>
    </div>,
    document.body
  );
}

function IdleDialer({
  inputId,
  number,
  tab,
  className,
  onNumberChange,
  onTabChange,
  onDigit,
  onCall,
}: {
  inputId: string;
  number: string;
  tab: DialerTab;
  className?: string;
  onNumberChange: (value: string) => void;
  onTabChange: (tab: DialerTab) => void;
  onDigit: (digit: string) => void;
  onCall: () => void;
}) {
  const [pressing, setPressing] = useState(false);
  const pressTimer = useRef<number | null>(null);

  useEffect(
    () => () => {
      if (pressTimer.current) window.clearTimeout(pressTimer.current);
    },
    []
  );

  // Let the press land before the dialer turns over, so the compress reads.
  const handleCall = () => {
    if (pressTimer.current) return;
    if (prefersReducedMotion()) {
      onCall();
      return;
    }
    setPressing(true);
    pressTimer.current = window.setTimeout(() => {
      pressTimer.current = null;
      setPressing(false);
      onCall();
    }, CALL_PRESS_MS);
  };

  return (
    <div
      className={cn(
        "flex w-[360px] shrink-0 flex-col overflow-hidden rounded-[16px] bg-white shadow-600",
        PHONE_SHELL_H,
        className
      )}
    >
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

      <div className="flex min-h-0 w-full flex-1 flex-col items-center justify-between gap-4 p-4">
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
            onClick={handleCall}
            className={cn(
              "flex size-14 shrink-0 items-center justify-center overflow-clip rounded-full bg-brand outline-none transition-colors hover:bg-brand-hover focus-visible:ring-4 focus-visible:ring-brand/24",
              pressing ? "dialer-press" : "active:scale-[0.97]"
            )}
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
  className,
  scope,
  talking,
  connecting,
  wrapping,
  assistCollapsing,
  elapsedMs,
  contactName,
  contactMeta,
  muted,
  onHold,
  recordingPaused,
  tab,
  scenario,
  onScenarioChange,
  onTabChange,
  onMute,
  onHoldToggle,
  onRecordingToggle,
  controls,
  onHangup,
  closing,
  onCloseWrapUp,
}: {
  className?: string;
  scope: AgentAssistScope;
  talking: boolean;
  connecting: boolean;
  wrapping: boolean;
  assistCollapsing: boolean;
  elapsedMs: number;
  contactName: string;
  contactMeta: string;
  muted: boolean;
  onHold: boolean;
  recordingPaused: boolean;
  tab: DialerTab;
  scenario: CallScenario;
  onScenarioChange: (id: string) => void;
  onTabChange: (tab: DialerTab) => void;
  onMute: () => void;
  onHoldToggle: () => void;
  onRecordingToggle: () => void;
  controls: CallControlsModel;
  onHangup: () => void;
  /** The recap is collapsing off the stage — see POST_CALL_CLOSE_MS. */
  closing: boolean;
  onCloseWrapUp: (fromKeyboard?: boolean) => void;
}) {
  const reduced = prefersReducedMotion();
  const localTime = formatLocalTime(new Date());
  const [actionStates, setActionStates] = useState<Record<string, ActionState>>(
    {}
  );
  // Owned here, above the live/wrap-up swap: the Notes pane during the call and
  // the Notes field in Wrap up are the same notes, so whatever the agent typed
  // while the line was open is already in the field they file with.
  const [notes, setNotes] = useState<NotesEditorValue>(EMPTY_NOTES);

  useEffect(() => {
    setActionStates({});
    setNotes(EMPTY_NOTES);
  }, [scenario.id]);

  // Ringing and live are the same surface, so they share a swap key: the phone
  // morphs into the bar instead of dissolving into a different card. Only
  // wrap-up is a genuinely new card, and it still cross-dissolves.
  return (
    <ShellSwap
      swapKey={wrapping ? "wrapup" : "call"}
      reduced={reduced}
      // A call dialled out of the arriving dialer leaves wrap-up mid-close;
      // the recap is already invisible by then, so it goes without a second
      // dissolve rather than snapshotting itself back into view.
      instant={closing}
      className={cn(
        "flex h-full min-h-0 w-full items-center justify-center",
        className
      )}
    >
      {(enter) =>
        wrapping ? (
          <PostCallStage
            className={enter}
            reduced={reduced}
            elapsedMs={elapsedMs}
            contactName={contactName}
            contactMeta={contactMeta}
            scenario={scenario}
            actionStates={actionStates}
            notes={notes}
            onNotesChange={setNotes}
            onScenarioChange={onScenarioChange}
            closing={closing}
            onClose={onCloseWrapUp}
          />
        ) : (
          <CallMorphStage
            className={enter}
            scope={scope}
            reduced={reduced}
            live={talking}
            connecting={connecting}
            elapsedMs={elapsedMs}
            contactName={contactName}
            contactMeta={contactMeta}
            localTime={localTime}
            muted={muted}
            onHold={onHold}
            recordingPaused={recordingPaused}
            tab={tab}
            scenario={scenario}
            assistCollapsing={assistCollapsing}
            notes={notes}
            onNotesChange={setNotes}
            onScenarioChange={onScenarioChange}
            onTabChange={onTabChange}
            onMute={onMute}
            onHoldToggle={onHoldToggle}
            onRecordingToggle={onRecordingToggle}
            controls={controls}
            onHangup={onHangup}
            onActionStatesChange={setActionStates}
          />
        )
      }
    </ShellSwap>
  );
}

/**
 * Ringing → live workspace, as one continuous move.
 *
 * The phone is not faded out and replaced. Three layers overlap for ~520ms:
 * a dark surface that starts on the phone's footprint and compresses upward
 * into the call bar; a ghost of the phone, pinned to that same footprint,
 * carrying the bottom nav and the dial-pad chrome out; and the live workspace
 * itself, whose bar elements are inverted back onto their phone positions and
 * then released. The dark never breaks, so the phone reads as becoming the bar
 * rather than being swapped for it.
 *
 * A resumed call (or reduced motion) has no phone to measure, so it skips
 * straight to the workspace with a plain reveal.
 */
function CallMorphStage({
  className,
  scope,
  reduced,
  live,
  connecting,
  elapsedMs,
  contactName,
  contactMeta,
  localTime,
  muted,
  onHold,
  recordingPaused,
  tab,
  scenario,
  assistCollapsing,
  notes,
  onNotesChange,
  onScenarioChange,
  onTabChange,
  onMute,
  onHoldToggle,
  onRecordingToggle,
  controls,
  onHangup,
  onActionStatesChange,
}: {
  className?: string;
  scope: AgentAssistScope;
  reduced: boolean;
  live: boolean;
  connecting: boolean;
  elapsedMs: number;
  contactName: string;
  contactMeta: string;
  localTime: string;
  muted: boolean;
  onHold: boolean;
  recordingPaused: boolean;
  tab: DialerTab;
  scenario: CallScenario;
  assistCollapsing: boolean;
  notes: NotesEditorValue;
  onNotesChange: (value: NotesEditorValue) => void;
  onScenarioChange: (id: string) => void;
  onTabChange: (tab: DialerTab) => void;
  onMute: () => void;
  onHoldToggle: () => void;
  onRecordingToggle: () => void;
  controls: CallControlsModel;
  onHangup: () => void;
  onActionStatesChange?: (states: Record<string, ActionState>) => void;
}) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const surfaceRef = useRef<HTMLDivElement | null>(null);
  const ghostRef = useRef<HTMLDivElement | null>(null);
  const captured = useRef<MorphCapture | null>(null);
  const [morph, setMorph] = useState<
    { phase: "idle" | "settled" } | { phase: "run"; from: MorphCapture }
  >({ phase: "idle" });

  // Measure while the phone is still the thing on screen.
  useLayoutEffect(() => {
    if (!connecting || reduced) return;
    const card = rootRef.current?.querySelector<HTMLElement>("[data-morph-card]");
    if (card) captured.current = captureMorph(card);
  }, [connecting, reduced]);

  // Commit `run` in the same pass that mounts the bar, so the bar never gets a
  // painted frame at its settled size before the move starts.
  if (live && morph.phase === "idle" && captured.current) {
    setMorph({ phase: "run", from: captured.current });
  }
  if (!live && morph.phase !== "idle") {
    setMorph({ phase: "idle" });
  }

  useLayoutEffect(() => {
    if (morph.phase !== "run") return;
    captured.current = null;
    const root = rootRef.current;
    const surface = surfaceRef.current;
    if (!root || !surface) {
      setMorph({ phase: "settled" });
      return;
    }
    const stop = runMorph(morph.from, root, surface, ghostRef.current);
    const settle = window.setTimeout(
      () => setMorph({ phase: "settled" }),
      MORPH_TOTAL_MS
    );
    return () => {
      window.clearTimeout(settle);
      stop();
    };
  }, [morph]);

  const morphing = morph.phase === "run";

  return (
    <div
      ref={rootRef}
      className={cn(
        "relative flex h-full min-h-0 w-full justify-center",
        live ? "items-center" : "items-start",
        className
      )}
    >
      {morphing ? (
        <>
          {/* The dark surface owns the geometry — and, while it is moving, the
              call bar's background, so the two never read as separate. Both
              layers are placed by the layout effect, which knows the origin. */}
          <div
            aria-hidden="true"
            ref={surfaceRef}
            className="call-morph-surface"
          />
          {/* Everything the call bar has no use for, on its way out. */}
          <div
            aria-hidden="true"
            inert
            ref={ghostRef}
            className="call-morph-ghost"
          >
            <RingingPhone
              reduced
              connected
              ghost
              elapsedMs={elapsedMs}
              contactName={contactName}
              contactMeta={contactMeta}
              localTime={localTime}
              tab={tab}
              onTabChange={() => {}}
              onHangup={() => {}}
              className="h-full"
            />
          </div>
        </>
      ) : null}

      {live ? (
        <LiveCallStage
          className="call-morph-stage"
          scope={scope}
          reduced={reduced}
          morphing={morphing}
          elapsedMs={elapsedMs}
          contactName={contactName}
          muted={muted}
          onHold={onHold}
          recordingPaused={recordingPaused}
          scenario={scenario}
          assistCollapsing={assistCollapsing}
          notes={notes}
          onNotesChange={onNotesChange}
          onScenarioChange={onScenarioChange}
          onMute={onMute}
          onHoldToggle={onHoldToggle}
          onRecordingToggle={onRecordingToggle}
          controls={controls}
          onHangup={onHangup}
          onActionStatesChange={onActionStatesChange}
        />
      ) : (
        <RingingPhone
          className={PHONE_SHELL_H}
          reduced={reduced}
          connected={connecting}
          elapsedMs={elapsedMs}
          contactName={contactName}
          contactMeta={contactMeta}
          localTime={localTime}
          tab={tab}
          muted={muted}
          onHold={onHold}
          controls={controls}
          onTabChange={onTabChange}
          onMute={onMute}
          onHoldToggle={onHoldToggle}
          onHangup={onHangup}
        />
      )}
    </div>
  );
}

/**
 * Notes, Transcript, and Live Assist share one right-side shell. Opening it
 * slides the column in from the right while Script and Guidance compress;
 * closing slides it out and restores those widths. Switching views never
 * re-opens the shell.
 *
 * Two beats, and the order matters. First `shifting` arms the width transition
 * on every pane in the row and mounts the column at no width — a transition
 * only runs when the element was already transition-able in the frame before
 * the value changed, so arming and moving in one commit animates nothing.
 * `entered` is the second beat: the widths change and all three panes travel
 * together. Closing runs the same two beats in reverse. After the first open,
 * `mounted` stays true so Transcript scroll, Notes, and Live Assist keep
 * their state in a zero-width column.
 */
function useCallAsidePresence(open: boolean, reduced: boolean) {
  /** The value the width model reads — one frame behind `open` on a change. */
  const [entered, setEntered] = useState(open);
  const [mounted, setMounted] = useState(open);
  const [shifting, setShifting] = useState(false);
  const [shift, setShift] = useState<"open" | "close" | null>(null);
  const prevOpen = useRef(open);
  const timersRef = useRef<number[]>([]);
  const rafRef = useRef(0);

  const clear = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  };

  useLayoutEffect(() => {
    if (prevOpen.current === open) return;
    prevOpen.current = open;
    clear();

    if (reduced) {
      if (open) setMounted(true);
      setEntered(open);
      setShifting(false);
      setShift(null);
      return;
    }

    if (open) setMounted(true);
    setShift(open ? "open" : "close");
    setShifting(true);

    const duration = open ? ASIDE_OPEN_MS : ASIDE_CLOSE_MS;

    // Second beat, on whichever clock arrives first. A frame is the accurate
    // one; the timer is there because a backgrounded tab stops handing out
    // frames, and the column still has to end up open.
    let released = false;
    const release = () => {
      if (released) return;
      released = true;
      setEntered(open);
    };
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = requestAnimationFrame(release);
    });
    timersRef.current.push(window.setTimeout(release, ASIDE_RELEASE_MS));

    timersRef.current.push(
      window.setTimeout(() => {
        setShifting(false);
        setShift(null);
        // Stay mounted after the first open so Transcript scroll, Notes
        // caret, and Live Assist chat survive close — width goes to 0.
      }, duration + ASIDE_RELEASE_MS)
    );
  }, [open, reduced]);

  useLayoutEffect(() => clear, []);

  return { mounted, entered, leaving: mounted && !open, shifting, shift };
}

/**
 * Live call — the call bar owns the top edge, then Script and Conversation
 * Guidance split the rest. Notes, Transcript, and Live Assist share one
 * right-side utility shell, off by default; only one of them is open at a
 * time, and switching views keeps the column where it is. Closing it does
 * not reset panel state. Column widths are a shared tokenized model
 * (A + divider + B + divider + C); dragging one divider only trades space
 * between its two neighbours.
 */
function LiveCallStage({
  className,
  scope,
  reduced,
  morphing,
  elapsedMs,
  contactName,
  muted,
  onHold,
  recordingPaused,
  scenario,
  assistCollapsing,
  notes,
  onNotesChange,
  onScenarioChange,
  onMute,
  onHoldToggle,
  onRecordingToggle,
  controls,
  onHangup,
  onActionStatesChange,
}: {
  className?: string;
  scope: AgentAssistScope;
  reduced: boolean;
  morphing?: boolean;
  elapsedMs: number;
  contactName: string;
  muted: boolean;
  onHold: boolean;
  recordingPaused: boolean;
  scenario: CallScenario;
  assistCollapsing: boolean;
  notes: NotesEditorValue;
  onNotesChange: (value: NotesEditorValue) => void;
  onScenarioChange: (id: string) => void;
  onMute: () => void;
  onHoldToggle: () => void;
  onRecordingToggle: () => void;
  controls: CallControlsModel;
  onHangup: () => void;
  onActionStatesChange?: (states: Record<string, ActionState>) => void;
}) {
  const [asidePanel, setAsidePanel] = useState<AsidePanel | null>(null);

  const liveAssist = useLiveAssist({
    scenarioId: scenario.id,
    elapsedMs,
    panelOpen: asidePanel === "assist",
  });

  const asideOpen = asidePanel !== null;
  const aside = useCallAsidePresence(asideOpen, reduced);
  // `entered`, not `asideOpen` — the column is in the width model from the beat
  // the panes start travelling, not from the click.
  const collapsed = useMemo<CallPaneCollapsed>(
    () => ({ transcript: !aside.entered }),
    [aside.entered]
  );
  const workspace = useCallWorkspaceResize(collapsed);
  const asideSwitch = useAsidePanelSwitch(asidePanel, reduced);

  // The width the aside settles at, kept across the close so the cards inside
  // keep their layout while the column clips away from them. Next open uses
  // this rather than a fresh default, unless the agent has never opened it.
  const asideWidthRef = useRef<number>(CALL_ASIDE.defaultPx);
  const closedSnapshotRef = useRef<{ script: number; suggestions: number } | null>(
    null
  );
  if (workspace.widths.transcript > 0) {
    asideWidthRef.current = workspace.widths.transcript;
  }

  const shownNotes = asideSwitch.shown === "notes";
  const shownTranscript = asideSwitch.shown === "transcript";
  const shownAssist = asideSwitch.shown === "assist";

  const notesEditorRef = useRef<NotesEditorHandle>(null);
  // Parent-owned: the editor unmounts with the column, the caret shouldn't.
  const notesCaret = useRef<NotesEditorCaret>({ offset: 0, scroll: 0 });
  const notesPaneRef = useRef<HTMLDivElement>(null);
  const notesHeaderRef = useRef<HTMLDivElement>(null);
  const notesMarkRef = useRef<HTMLSpanElement>(null);
  const notesControlRef = useRef<HTMLButtonElement>(null);

  /**
   * Notes coming back is its own move, not a repeat of the introduction: the
   * column re-opens the way any panel does, and the card fades up out of the
   * edge it left through. Only ever set for an open the agent asked for.
   */
  const [notesReopening, setNotesReopening] = useState(false);
  const reopenTimerRef = useRef(0);
  /** The introduction has run and put the panel away, so an open is a re-open. */
  const introClosedRef = useRef(false);
  /** First keystroke of the call — reported once, whoever opened the panel. */
  const notesTypedRef = useRef(false);

  useEffect(() => () => window.clearTimeout(reopenTimerRef.current), []);

  const [stageSettled, setStageSettled] = useState(false);
  useEffect(() => {
    const id = window.setTimeout(() => setStageSettled(true), STAGE_SETTLED_MS);
    return () => window.clearTimeout(id);
  }, []);

  const saveNotesCaret = () => notesEditorRef.current?.saveCaret();

  /**
   * Anything that changes the notes ends the introduction — a paste from the
   * menu never reaches the panel's key handler, and content arriving is the
   * clearest possible sign the agent is using the panel rather than reading it.
   */
  const handleNotesChange = (value: NotesEditorValue) => {
    discovery.cancel();
    if (!notesTypedRef.current && value.text.trim().length > 0) {
      notesTypedRef.current = true;
      trackNotes("notes_first_input_started");
    }
    onNotesChange(value);
  };

  /** Close with no opinion about why — the introduction uses this one too. */
  const dismissAside = () => {
    if (asidePanel === "notes") saveNotesCaret();
    setAsidePanel(null);
  };

  /** Every open of Notes the agent asked for — the introduction's own is not one. */
  const openNotesManually = () => {
    if (introClosedRef.current) trackNotes("notes_panel_reopened");
    if (reduced) return;
    window.clearTimeout(reopenTimerRef.current);
    setNotesReopening(true);
    reopenTimerRef.current = window.setTimeout(
      () => setNotesReopening(false),
      DURATION.slow
    );
  };

  const openAside = (next: AsidePanel) => {
    if (asidePanel === "notes") saveNotesCaret();
    if (!asidePanel && workspace.workspaceWidth > 0) {
      closedSnapshotRef.current = {
        script: workspace.widths.script,
        suggestions: workspace.widths.suggestions,
      };
      workspace.replaceFractions(
        fractionsForAsideOpen(
          closedSnapshotRef.current,
          asideWidthRef.current,
          workspace.workspaceWidth
        )
      );
    }
    setAsidePanel(next);
  };

  const discovery = useNotesDiscovery({
    // Nothing introduces itself over an entrance: the panes have to be in and
    // the phone has to have finished becoming the bar.
    ready: stageSettled && !morphing && workspace.measured,
    reduced,
    // Three panes at their minimums, not two — the column has to have somewhere
    // to open into or there is nothing to demonstrate.
    hasRoom: canResizeWorkspace(workspace.workspaceWidth),
    busy: asidePanel !== null,
    hasContent: notes.text.trim().length > 0,
    headerRef: notesHeaderRef,
    markRef: notesMarkRef,
    targetRef: notesControlRef,
    onOpen: () => openAside("notes"),
    onClose: () => {
      // The panel opened itself and took the caret with it; it gives both back.
      // Not to the toolbar icon, tempting as that is — focus there pops the
      // tooltip, and the move is supposed to make the label unnecessary.
      const active = document.activeElement;
      if (active instanceof HTMLElement && notesPaneRef.current?.contains(active)) {
        active.blur();
      }
      dismissAside();
      introClosedRef.current = true;
    },
  });

  const closeAside = () => {
    discovery.cancel();
    dismissAside();
  };

  const toggleAside = (next: AsidePanel) => {
    discovery.cancel();
    if (asidePanel === next) {
      dismissAside();
      return;
    }
    if (next === "notes") openNotesManually();
    openAside(next);
  };

  const scenarioRef = useRef(scenario.id);
  useEffect(() => {
    if (scenarioRef.current === scenario.id) return;
    scenarioRef.current = scenario.id;
    notesTypedRef.current = false;
    discovery.cancel();
    setAsidePanel(null);
    // `discovery.cancel` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenario.id]);

  useEffect(() => {
    if (!assistCollapsing) return;
    discovery.cancel();
    setAsidePanel(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assistCollapsing]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      // Nested surfaces (battle-card zoom, etc.) own Escape. The dialer
      // itself is a dialog, so only a second one means something else is up.
      const dialogs = document.querySelectorAll('[role="dialog"]');
      if (dialogs.length > 1) return;
      if (document.querySelector('[role="listbox"]')) return;
      // The notes formatting overlay dismisses itself first.
      if (document.querySelector("[data-notes-overlay]")) return;
      if (!asidePanel) return;
      event.preventDefault();
      event.stopPropagation();
      closeAside();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [asidePanel]);

  useLayoutEffect(() => {
    if (!shownNotes || !aside.entered || aside.leaving) return;
    notesEditorRef.current?.focus();
  }, [shownNotes, aside.entered, aside.leaving]);

  const prevEnteredRef = useRef(aside.entered);
  useLayoutEffect(() => {
    const was = prevEnteredRef.current;
    prevEnteredRef.current = aside.entered;
    const snap = closedSnapshotRef.current;
    if (!was || aside.entered || !snap || workspace.workspaceWidth <= 0) return;
    workspace.replaceFractions(
      fractionsForAsideOpen(snap, asideWidthRef.current, workspace.workspaceWidth)
    );
    // Restore runs in the same close beat as the width model collapsing, so
    // Script and Guidance travel back to the sizes they had before this open.
    // workspace is read from the render that flipped `entered`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aside.entered]);

  return (
    <div
      className={cn(
        // The gutter clears the overlay's close button at narrow widths and
        // settles the stage at 1440 once there is room for it. The stage takes
        // the height its content needs rather than the whole window, and sits
        // in the middle of it — the three panes read as one object, not as
        // three columns stretched to the viewport. Horizontal overflow is
        // clipped so a resize never introduces a workspace scrollbar.
        "relative z-0 flex h-[700px] max-h-full min-h-0 w-full max-w-[1504px] flex-col gap-3 overflow-x-hidden px-16",
        className
      )}
      // Notes' introduction spans the pane and the toolbar icon, so the two
      // durations both surfaces animate on are published once, here.
      style={
        {
          "--notes-body-fade-ms": `${NOTES_DISCOVERY.bodyFadeMs}ms`,
          "--notes-flight-ms": `${NOTES_DISCOVERY.flightMs}ms`,
          "--notes-pulse-ms": `${NOTES_DISCOVERY.pulseMs}ms`,
        } as CSSProperties
      }
    >
      <CallBar
        // Morphing in from the phone, the bar's own entrance would fight the
        // travelling elements — the dark surface behind it is the entrance.
        className={!reduced && !morphing ? "call-bar-in" : undefined}
        morphing={morphing}
        revealing={!reduced}
        elapsedMs={elapsedMs}
        contactName={contactName}
        muted={muted}
        onHold={onHold}
        recordingPaused={recordingPaused}
        notesOpen={asidePanel === "notes"}
        notesControlRef={notesControlRef}
        notesFound={discovery.pulsing}
        transcriptOpen={asidePanel === "transcript"}
        scope={scope}
        liveAssistOpen={asidePanel === "assist"}
        help={liveAssist}
        onMute={onMute}
        onHoldToggle={onHoldToggle}
        onRecordingToggle={onRecordingToggle}
        controls={controls}
        onHangup={onHangup}
        onNotesToggle={() => {
          trackNotes("notes_icon_clicked", { opening: asidePanel !== "notes" });
          toggleAside("notes");
        }}
        onTranscriptToggle={() => toggleAside("transcript")}
        onLiveAssistToggle={() => toggleAside("assist")}
      />

      <div
        ref={workspace.containerRef}
        className={cn(
          "call-workspace-row flex min-h-0 min-w-0 flex-1",
          workspace.resizable ? "call-workspace-panes" : "gap-3",
          aside.shift === "open" && "is-shifting-open",
          aside.shift === "close" && "is-shifting-close"
        )}
      >
        <StagePane
          index={0}
          paneId="script"
          reduced={reduced}
          grow={3}
          fraction={workspace.fractions.script}
          widthPx={workspace.resizable ? workspace.widths.script : undefined}
          settling={workspace.settling}
        >
          <AgentAssistCallSheet
            key={scenario.id}
            elapsedMs={elapsedMs}
            scenario={scenario}
            onScenarioChange={onScenarioChange}
            active
            exiting={assistCollapsing}
            transcriptDetached
            guidanceDetached
            className="h-full"
          />
        </StagePane>
        {workspace.resizable ? (
          <CallWorkspaceResizeHandle {...workspace.handleProps(0)} />
        ) : null}
        <StagePane
          index={1}
          paneId="suggestions"
          reduced={reduced}
          grow={7}
          fraction={workspace.fractions.suggestions}
          widthPx={workspace.resizable ? workspace.widths.suggestions : undefined}
          settling={workspace.settling}
        >
          <LiveAgentAssistPanel
            key={scenario.id}
            scope={scope}
            elapsedMs={elapsedMs}
            scenario={scenario}
            exiting={assistCollapsing}
            onActionStatesChange={onActionStatesChange}
            className="h-full"
          />
        </StagePane>
        {workspace.resizable && aside.mounted ? (
          <CallWorkspaceResizeHandle
            {...workspace.handleProps(1)}
            collapsing={!aside.entered}
          />
        ) : null}
        {aside.mounted ? (
        <StagePane
          index={2}
          paneId="transcript"
          reduced={reduced}
          grow={5}
          fraction={workspace.fractions.transcript}
          widthPx={workspace.resizable ? workspace.widths.transcript : undefined}
          settling={workspace.settling}
          surface={false}
          animateIn={false}
          className="call-aside-pane"
          // Nothing to read or reach in a column that is on its way out.
          inert={aside.leaving || undefined}
        >
          <div
            className={cn(
              "call-aside-stage min-h-0 flex-1",
              asideSwitch.switching && "is-switching"
            )}
            // Pinned to the pane's right edge at the width it settles at, so
            // the clip opens across the cards instead of reflowing them.
            style={
              workspace.resizable && asideWidthRef.current
                ? { width: `${asideWidthRef.current}px` }
                : undefined
            }
          >
            <div
              ref={notesPaneRef}
              className={cn(
                "call-aside-view",
                shownNotes && "is-active",
                discovery.handingOff && "is-notes-handoff",
                notesReopening && "is-notes-reopening"
              )}
              aria-hidden={!shownNotes}
              inert={!shownNotes || undefined}
              // Any real touch of Notes ends the introduction: a panel the
              // agent has started using is theirs, not a demonstration.
              onPointerDownCapture={discovery.cancel}
              onKeyDownCapture={discovery.cancel}
              // Hover is attention, not use: it holds the collapse instead of
              // ending the introduction, and leaving is what releases it.
              onPointerEnter={discovery.onPanelEnter}
              onPointerLeave={discovery.onPanelLeave}
            >
              <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden rounded-[16px] border border-line bg-white">
                <header className="flex h-11 shrink-0 items-center justify-between gap-1.5 border-b border-line px-4">
                  <div ref={notesHeaderRef} className="notes-pane-mark flex items-center gap-1.5">
                    <span ref={notesMarkRef} className="flex size-4 shrink-0 items-center justify-center">
                      <NotesPaneIcon className="size-4 text-muted-foreground" />
                    </span>
                    <p className="text-label-md-semi text-foreground">Notes</p>
                  </div>
                  <button
                    type="button"
                    aria-label="Close notes"
                    onClick={closeAside}
                    className="notes-pane-body flex size-6 items-center justify-center rounded-[4px] text-muted-foreground outline-none hover:bg-surface-hover hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/24"
                  >
                    <IconClose size={16} />
                  </button>
                </header>
                <div className="notes-pane-body flex min-h-0 flex-1 flex-col gap-1 p-4">
                  <NotesEditor
                    ref={notesEditorRef}
                    caretRef={notesCaret}
                    placeholder="Type your notes here..."
                    maxLength={NOTES_MAX}
                    value={notes}
                    onChange={handleNotesChange}
                    wrapperClassName="min-h-0 flex-1"
                    className="min-h-0 flex-1"
                    ariaLabel="Call notes"
                  />
                  <p className="shrink-0 text-right text-label-sm text-muted-foreground tabular-nums">
                    {notes.text.length}/{NOTES_MAX}
                  </p>
                </div>
              </div>
            </div>
            <div
              className={cn("call-aside-view", shownTranscript && "is-active")}
              aria-hidden={!shownTranscript}
              inert={!shownTranscript || undefined}
            >
              <div className="h-full min-h-0 w-full overflow-hidden rounded-[16px] border border-line bg-white">
                <LiveTranscriptPanel
                  key={scenario.id}
                  elapsedMs={elapsedMs}
                  scenario={scenario}
                  exiting={assistCollapsing}
                  active={shownTranscript}
                  onClose={closeAside}
                  className="h-full"
                />
              </div>
            </div>
            <div
              className={cn("call-aside-view", shownAssist && "is-active")}
              aria-hidden={!shownAssist}
              inert={!shownAssist || undefined}
            >
              <div className="h-full min-h-0 w-full overflow-hidden rounded-[16px] border border-line bg-white">
                <LiveAssistPanel
                  thread={liveAssist}
                  scenario={scenario}
                  active={shownAssist && aside.entered && !aside.leaving}
                  onClose={closeAside}
                  className="h-full"
                />
              </div>
            </div>
          </div>
        </StagePane>
        ) : null}
      </div>

      <LiveAssistToast
        toast={scope === "v2" ? liveAssist.toast : null}
        onDismiss={liveAssist.dismissToast}
        onView={() => {
          liveAssist.dismissToast();
          if (asidePanel !== "assist") toggleAside("assist");
        }}
      />

      <NotesDiscoveryGhost flight={discovery.flight} />
    </div>
  );
}

/**
 * The travelling half of Notes' first showing: a copy of the panel header,
 * pinned to the viewport where the real one stood, on its way to the call
 * bar's Notes icon. Only the mark travels — the panel itself just gives its
 * width back, and shrinking a whole column into a 20px circle would read as
 * the column being thrown away rather than put away.
 */
function NotesDiscoveryGhost({ flight }: { flight: NotesDiscoveryFlight | null }) {
  if (!flight) return null;
  return createPortal(
    <div
      aria-hidden="true"
      className={cn("notes-discovery-ghost", flight.moving && "is-moving")}
      style={
        {
          top: flight.top,
          left: flight.left,
          width: flight.width,
          height: flight.height,
          "--ghost-origin-x": `${flight.originX}px`,
          "--ghost-origin-y": `${flight.originY}px`,
          "--ghost-dx": `${flight.dx}px`,
          "--ghost-dy": `${flight.dy}px`,
          "--ghost-scale": NOTES_DISCOVERY.endScale,
          "--ghost-ms": `${NOTES_DISCOVERY.flightMs}ms`,
          "--ghost-fade-ms": `${NOTES_DISCOVERY.fadeMs}ms`,
          "--ghost-fade-delay": `${NOTES_DISCOVERY.fadeDelayMs}ms`,
        } as CSSProperties
      }
    >
      <span className="flex size-4 shrink-0 items-center justify-center">
        <NotesPaneIcon className="size-4 text-muted-foreground" />
      </span>
      <p className="text-label-md-semi whitespace-nowrap text-foreground">Notes</p>
    </div>,
    document.body
  );
}

/** Panels wait out the call bar, then arrive left to right. */
function StagePane({
  index,
  paneId,
  grow,
  fraction,
  widthPx,
  settling = false,
  reduced,
  surface = true,
  animateIn = true,
  className,
  inert,
  children,
}: {
  index: number;
  paneId?: CallPaneId;
  grow: number;
  /** Stored proportion — used before the row has a measured pixel width. */
  fraction?: number;
  widthPx?: number;
  settling?: boolean;
  reduced: boolean;
  /** White card chrome. Off when this column stacks its own cards. */
  surface?: boolean;
  /** Off for the aside column — its entrance is the width it opens into. */
  animateIn?: boolean;
  className?: string;
  inert?: boolean;
  children: ReactNode;
}) {
  const sized = widthPx != null;
  return (
    <div
      id={paneId ? `call-pane-${paneId}` : undefined}
      inert={inert}
      className={cn(
        "call-stage-pane flex min-h-0 min-w-0 flex-col",
        surface && "overflow-hidden rounded-[16px] border border-line bg-white",
        !reduced && animateIn && "call-stage-pane-in",
        settling && sized && "is-settling",
        className
      )}
      style={
        {
          flex: sized
            ? `0 0 ${widthPx}px`
            : `${fraction != null ? Math.round(fraction * 100) : grow} 1 0px`,
          "--pane-delay": `${PANE_REVEAL_DELAYS_MS[index] ?? 0}ms`,
        } as CSSProperties
      }
    >
      {children}
    </div>
  );
}

/**
 * The call bar. `data-morph` marks each element that also exists on the phone,
 * so the ringing → live move can carry it across; `data-morph-scale` says how
 * the size difference should be read (text re-flows, controls keep their
 * proportions off their height). While the move runs the bar is transparent —
 * the morph surface behind it is the dark, and the two end on the same rect.
 */
function CallBar({
  className,
  morphing,
  revealing,
  elapsedMs,
  contactName,
  muted,
  onHold,
  recordingPaused,
  notesOpen,
  notesControlRef,
  notesFound,
  transcriptOpen,
  liveAssistOpen,
  scope = "v2",
  help,
  controls,
  onMute,
  onHoldToggle,
  onRecordingToggle,
  onHangup,
  onNotesToggle,
  onTranscriptToggle,
  onLiveAssistToggle,
}: {
  className?: string;
  morphing?: boolean;
  revealing?: boolean;
  elapsedMs: number;
  contactName: string;
  muted: boolean;
  onHold: boolean;
  recordingPaused: boolean;
  notesOpen?: boolean;
  notesControlRef?: RefObject<HTMLButtonElement | null>;
  /** The introduction has just landed here — light up, once. */
  notesFound?: boolean;
  transcriptOpen?: boolean;
  liveAssistOpen?: boolean;
  scope?: AgentAssistScope;
  help: LiveAssistThread;
  controls: CallControlsModel;
  onMute: () => void;
  onHoldToggle: () => void;
  onRecordingToggle: () => void;
  onHangup: () => void;
  onNotesToggle?: () => void;
  onTranscriptToggle?: () => void;
  onLiveAssistToggle: () => void;
}) {
  const detail = (delay: number) =>
    revealing
      ? {
          className: "call-bar-detail-in",
          style: { "--detail-delay": `${delay}ms` } as CSSProperties,
        }
      : {};

  // Each opening control anchors its own panel, so the panel points at the
  // icon it came from rather than at the bar as a whole.
  const keypadRef = useRef<HTMLButtonElement | null>(null);
  const transferRef = useRef<HTMLButtonElement | null>(null);
  const voicemailRef = useRef<HTMLButtonElement | null>(null);

  const status = callStatusLabel(controls, onHold);
  // Mid-transfer the bar is reporting, not offering: the line is already on
  // its way somewhere and a second Hold would be a lie.
  const locked = controls.busy;

  return (
    <div
      data-morph-bar
      className={cn(
        "relative z-30 flex h-[72px] shrink-0 items-center gap-4 rounded-[16px] px-4",
        morphing ? "bg-transparent" : "bg-dialer-surface shadow-600",
        className
      )}
    >
      <div
        data-morph="identity"
        data-morph-scale="none"
        className="min-w-0 max-w-[220px] shrink-0"
      >
        <p className="truncate text-[14px] leading-5 font-medium text-white">
          {contactName}
        </p>
        <p
          aria-live="polite"
          className="truncate text-[12px] leading-4 text-white/60 tabular-nums"
        >
          {status ? `${status} · ` : ""}
          {formatDuration(elapsedMs)}
        </p>
      </div>

      <span
        style={{ "--detail-delay": `${BAR_DETAIL_DELAY_MS}ms` } as CSSProperties}
        className={cn(
          "h-8 w-px shrink-0 bg-white/15",
          revealing && "call-bar-detail-in"
        )}
        aria-hidden="true"
      />

      <div className="flex shrink-0 items-center gap-2.5">
        {/* The pill states what the line is doing, so the tooltip has to carry
            the verb — "Recording" is the status, "Pause recording" is the act.
            Paused drops the red rather than the pill: the agent still needs to
            see, at a glance, that recording is a thing this call has. */}
        <TooltipTrigger
          placement="bottom"
          content={
            <Tooltip
              theme="dark"
              arrow="top-center"
              title={recordingPaused ? "Resume recording" : "Pause recording"}
            />
          }
          className="shrink-0"
        >
          <button
            type="button"
            aria-label={recordingPaused ? "Resume recording" : "Pause recording"}
            aria-pressed={recordingPaused}
            disabled={locked}
            onClick={onRecordingToggle}
            style={{ "--detail-delay": `${BAR_DETAIL_DELAY_MS}ms` } as CSSProperties}
            className={cn(
              "flex h-6 items-center gap-1.5 rounded-full bg-white px-2 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-white/40",
              locked ? "cursor-not-allowed opacity-40" : "active:scale-[0.97]",
              revealing && "call-bar-detail-in"
            )}
          >
            <span
              className={cn(
                "size-2 rounded-full transition-colors",
                recordingPaused ? "bg-muted-foreground" : "bg-error"
              )}
              aria-hidden="true"
            />
            <span
              className={cn(
                "text-[10px] leading-3 whitespace-nowrap transition-colors",
                recordingPaused ? "text-muted-foreground" : "text-error"
              )}
            >
              {recordingPaused ? "Paused" : "Recording"}
            </span>
          </button>
        </TooltipTrigger>

        <span
          style={{ "--detail-delay": `${BAR_DETAIL_DELAY_MS}ms` } as CSSProperties}
          className={cn(
            "hidden items-end lg:flex",
            revealing && "call-bar-detail-in"
          )}
        >
          <SignalBars />
        </span>
      </div>

      <span
        style={{ "--detail-delay": `${BAR_DETAIL_DELAY_MS}ms` } as CSSProperties}
        className={cn(
          "hidden min-w-0 flex-1 px-2 md:block",
          revealing && "call-bar-detail-in"
        )}
      >
        <CallWaveform active={!morphing} muted={muted} onHold={onHold} reduced={!revealing} />
      </span>

      {/* Icon-only: on a bar this dense the labels cost more room than they
          buy, and the four that morph in from the phone were already circles
          there. Two groups, told apart by the space between them rather than
          another rule: the controls that run the line itself, then the tools
          the agent opens alongside it. Notes, Transcript, and Live Assist
          share one right-side shell. */}
      <div className="ml-auto flex shrink-0 items-center gap-1.5">
        {/* Call controls — everything here acts on the line, Voicemail drop
            included: it is what the agent does when nobody picked up. */}
        <div className="flex items-center gap-1.5">
          <BarControl
            morphKey="mute"
            label={muted ? "Unmute" : "Mute"}
            pressed={muted}
            disabled={locked}
            onClick={onMute}
          >
            <IconVoice size={20} />
          </BarControl>
          <BarControl
            morphKey="hold"
            label={onHold ? "Resume call" : "Hold"}
            pressed={onHold}
            disabled={locked}
            onClick={onHoldToggle}
          >
            <IconCallHold size={20} />
          </BarControl>
          <BarControl
            morphKey="keypad"
            label="Keypad"
            pressed={controls.surface === "keypad"}
            buttonRef={keypadRef}
            disabled={locked}
            // A tone already sent is the only trace of an IVR the agent
            // navigated, so the icon carries it while the pad is shut.
            badge={Boolean(controls.tones) && controls.surface !== "keypad"}
            onClick={() => controls.onSurfaceToggle("keypad")}
          >
            <IconCallKeypad size={20} />
          </BarControl>
          <BarControl
            morphKey="transfer"
            label="Transfer"
            pressed={controls.surface === "transfer" || controls.transfer !== null}
            buttonRef={transferRef}
            disabled={locked}
            onClick={() => controls.onSurfaceToggle("transfer")}
          >
            <IconCallTransfer size={20} />
          </BarControl>
          <BarControl
            label="Voicemail drop"
            pressed={controls.surface === "voicemail"}
            buttonRef={voicemailRef}
            disabled={locked}
            onClick={() => controls.onSurfaceToggle("voicemail")}
            {...detail(BAR_DETAIL_DELAY_MS)}
          >
            <IconVoicemailDrop size={20} />
          </BarControl>
        </div>

        {/* In-call tools — each opens a surface; none touch the call. */}
        <div className="ml-3 flex items-center gap-1.5">
          {scope === "v2" ? (
            <LiveAssistControl
              help={help}
              panelOpen={Boolean(liveAssistOpen)}
              revealing={revealing}
              onToggle={onLiveAssistToggle}
            />
          ) : null}
          <BarControl
            label={notesOpen ? "Hide notes" : "Notes"}
            pressed={notesOpen}
            buttonRef={notesControlRef}
            onClick={onNotesToggle}
            {...detail(BAR_DETAIL_DELAY_MS)}
            className={cn(
              revealing && "call-bar-detail-in",
              notesFound && "is-notes-found"
            )}
          >
            <IconCallNotes size={20} />
          </BarControl>
          <BarControl
            label={transcriptOpen ? "Hide transcript" : "Show transcript"}
            pressed={transcriptOpen}
            onClick={onTranscriptToggle}
            {...detail(BAR_DETAIL_DELAY_MS)}
          >
            <IconCallTranscript size={20} />
          </BarControl>
        </div>

        <span
          style={{ "--detail-delay": `${BAR_DETAIL_DELAY_MS}ms` } as CSSProperties}
          className={cn(
            "mr-4 ml-2 h-8 w-px bg-white/15",
            revealing && "call-bar-detail-in"
          )}
          aria-hidden="true"
        />

        <button
          type="button"
          data-morph="end"
          onClick={onHangup}
          className="flex h-10 shrink-0 items-center gap-2 rounded-full bg-white pr-4 pl-3 outline-none transition-colors hover:bg-surface-hover focus-visible:ring-4 focus-visible:ring-white/30 active:scale-[0.97]"
        >
          <Glyph src={hangupIcon} className="size-6" />
          <span className="text-label-sm whitespace-nowrap text-error">
            End call
          </span>
        </button>
      </div>

      {/* Hosted by the bar, not by each control: only one may be open, and the
          bar is what decides which — the same rule the aside column follows on
          the other side of the divider. */}
      <CallBarSurfaces
        controls={controls}
        keypadRef={keypadRef}
        transferRef={transferRef}
        voicemailRef={voicemailRef}
      />
    </div>
  );
}

/**
 * One icon-only control on the bar. The label is the only naming the control
 * gets, so it does double duty: the accessible name, and the hover tooltip
 * that stands in for the caption the phone's controls wear. The bubble sits
 * below — the bar is pinned to the top of the workspace.
 */
function BarControl({
  label,
  pressed,
  badge,
  disabled,
  morphKey,
  buttonRef,
  className,
  style,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  /** Something came back while the panel was shut — a dot, not a count. */
  badge?: boolean;
  /** The line is on its way elsewhere and this control no longer applies. */
  disabled?: boolean;
  morphKey?: string;
  buttonRef?: RefObject<HTMLButtonElement | null>;
  className?: string;
  style?: CSSProperties;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <TooltipTrigger
      placement="bottom"
      content={<Tooltip theme="dark" arrow="top-center" title={label} />}
      className="shrink-0"
    >
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-pressed={pressed}
        disabled={disabled}
        data-morph={morphKey}
        data-morph-scale={morphKey ? "height" : undefined}
        style={style}
        onClick={onClick}
        className={cn(
          "call-bar-control relative flex size-9 shrink-0 items-center justify-center rounded-full text-white outline-none focus-visible:ring-2 focus-visible:ring-white/40",
          // The hover tint and the press nudge both come off `.call-bar-control`,
          // so a locked control has to opt out of the press rather than the
          // class — `disabled:` already stops the tint.
          disabled ? "cursor-not-allowed opacity-40" : "active:scale-[0.97]",
          className
        )}
      >
        <span className="relative flex size-5 items-center justify-center overflow-clip">
          {children}
        </span>
        {badge ? (
          <span
            aria-hidden="true"
            // Ringed in the bar's own dark so the dot reads as sitting on the
            // icon rather than floating next to it.
            className="absolute top-1.5 right-1.5 size-2 rounded-full border border-dialer-surface bg-brand"
          />
        ) : null}
      </button>
    </TooltipTrigger>
  );
}

/**
 * Ringing — nothing to assist with yet, so the phone keeps the stage. With
 * `connected` it is the same phone on the beat after pickup: the label turns
 * over and the clock starts, but nothing has moved yet. Its `data-morph`
 * elements are the ones the call bar takes over.
 *
 * `ghost` renders the same phone as the copy that fades out during the move.
 * It drops the capture marker so it can never be mistaken for the live phone.
 */
function RingingPhone({
  className,
  reduced,
  connected,
  ghost,
  elapsedMs,
  contactName,
  contactMeta,
  localTime,
  tab,
  muted,
  onHold,
  controls,
  onTabChange,
  onMute,
  onHoldToggle,
  onHangup,
}: {
  className?: string;
  reduced: boolean;
  connected?: boolean;
  ghost?: boolean;
  elapsedMs?: number;
  contactName: string;
  contactMeta: string;
  localTime: string;
  tab: DialerTab;
  /**
   * The line's state, and the controls that change it. Optional because the
   * morph ghost is a picture of this phone — it renders the same markup with
   * nothing behind it, and must never be able to act on the call.
   */
  muted?: boolean;
  onHold?: boolean;
  controls?: CallControlsModel;
  onTabChange: (tab: DialerTab) => void;
  onMute?: () => void;
  onHoldToggle?: () => void;
  onHangup: () => void;
}) {
  return (
    <div
      data-morph-card={ghost ? undefined : true}
      className={cn(
        "flex w-[360px] shrink-0 flex-col overflow-hidden rounded-[16px] bg-dialer-surface shadow-600",
        className
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
        <div className="flex h-8 w-full items-center justify-center">
          <p className="text-center text-[12px] leading-4 text-white/70">
            It’s {localTime} there
          </p>
        </div>

        <div className="flex w-full flex-col items-center gap-2">
          <span
            data-morph="avatar"
            className="relative flex size-10 items-center justify-center overflow-clip rounded-full bg-gray-700"
          >
            <img src={userIcon} alt="" className="size-6 object-contain" />
          </span>
          {/* Hugs its text so the box centre is the text centre — that is what
              the move aligns to when it travels into the bar. */}
          <div
            data-morph="identity"
            className="flex max-w-full flex-col items-center gap-1 text-center"
          >
            <p className="text-[16px] leading-6 font-medium text-pretty text-white">
              {contactName}
            </p>
            <p
              className={cn(
                "text-[12px] leading-4 text-white/70",
                !reduced && "dialer-text-in"
              )}
            >
              {contactMeta}
            </p>
          </div>
          <div
            data-morph="status"
            className="flex h-11 flex-col items-center justify-end gap-1 text-center text-white"
          >
            {connected ? (
              <>
                <p
                  className={cn(
                    "text-[10px] leading-3 tracking-[0.06em] text-white/60 uppercase",
                    !reduced && "dialer-text-in"
                  )}
                >
                  Connected
                </p>
                <p
                  className={cn(
                    "text-[16px] leading-6 font-medium tabular-nums",
                    !reduced && "dialer-text-in"
                  )}
                >
                  {formatDuration(elapsedMs ?? 0)}
                </p>
              </>
            ) : (
              <p
                aria-live="polite"
                className={cn(
                  "text-[16px] leading-6 font-medium",
                  !reduced && "dialer-text-in"
                )}
              >
                {controls?.voicemail ? "Dropping voicemail" : "Ringing"}
              </p>
            )}
          </div>
        </div>

        {/* The four controls the call bar keeps. They come alive on connect,
            which is also the moment they start travelling. */}
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="flex gap-4">
            <CallControl
              morphKey="mute"
              label={muted ? "Unmute" : "Mute"}
              pressed={muted}
              disabled={!connected}
              onClick={onMute}
            >
              <IconVoice size={24} />
            </CallControl>
            <CallControl
              morphKey="hold"
              label={onHold ? "Resume" : "Hold"}
              pressed={onHold}
              disabled={!connected}
              onClick={onHoldToggle}
            >
              <IconCallHold size={24} />
            </CallControl>
          </div>
          <div className="flex gap-4">
            {/* These two open a panel the phone has no room for, so they set
                the state and the bar — half a morph away — shows it. Same
                control either side of the move, so pressing it before the
                workspace lands is not a click into nothing. */}
            <CallControl
              morphKey="keypad"
              label="Keypad"
              pressed={controls?.surface === "keypad"}
              disabled={!connected}
              onClick={() => controls?.onSurfaceToggle("keypad")}
            >
              <IconCallKeypad size={24} />
            </CallControl>
            <CallControl
              morphKey="transfer"
              label="Transfer"
              pressed={controls?.surface === "transfer"}
              disabled={!connected}
              onClick={() => controls?.onSurfaceToggle("transfer")}
            >
              <IconCallTransfer size={24} />
            </CallControl>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="size-12 shrink-0" aria-hidden="true" />
          <button
            type="button"
            aria-label="End call"
            data-morph="end"
            onClick={onHangup}
            className="flex h-14 w-32 items-center justify-center overflow-clip rounded-full bg-white outline-none transition-transform hover:bg-surface-hover focus-visible:ring-4 focus-visible:ring-white/30 active:scale-[0.97]"
          >
            <Glyph src={hangupIcon} className="size-7" />
          </button>
          <button
            type="button"
            aria-label="Voicemail drop"
            disabled={Boolean(controls?.voicemail)}
            onClick={() =>
              controls?.onVoicemailDrop(VOICEMAIL_GREETINGS[0].id)
            }
            className="flex size-12 items-center justify-center overflow-clip rounded-full bg-white text-success outline-none transition-transform hover:bg-surface-hover focus-visible:ring-4 focus-visible:ring-white/30 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50"
          >
            <IconVoicemailDrop size={24} className="size-6" />
          </button>
        </div>
      </div>

      <DialerNav tab={tab} onTabChange={onTabChange} />
    </div>
  );
}

/**
 * Post-call — the same stage the live call used, in its ended state. The call
 * bar keeps the top edge (now reporting the call rather than running it), the
 * recap keeps the wide pane it had while the line was open, and Wrap up takes
 * the column guidance and the transcript were using. Nothing the agent was
 * reading moves to a different part of the screen when the call ends.
 *
 * Call quality sits under Wrap up as its own card, not inside it: filing the
 * call and telling us how the line sounded are two different jobs, and only the
 * first one is the customer's record.
 */
function PostCallStage({
  className,
  reduced,
  elapsedMs,
  contactName,
  contactMeta,
  scenario,
  actionStates,
  notes,
  onNotesChange,
  onScenarioChange,
  closing,
  onClose,
}: {
  className?: string;
  reduced: boolean;
  elapsedMs: number;
  contactName: string;
  contactMeta: string;
  scenario: CallScenario;
  actionStates?: Record<string, ActionState>;
  notes: NotesEditorValue;
  onNotesChange: (value: NotesEditorValue) => void;
  onScenarioChange: (id: string) => void;
  closing: boolean;
  onClose: (fromKeyboard?: boolean) => void;
}) {
  const [transcriptOpen, setTranscriptOpen] = useState(false);

  return (
    <div
      // One visual group: recap, Wrap up and the completed-call bar leave as
      // the session they were, not as three panels being dismissed. `inert`
      // both takes the pointer off it and drops it out of the accessibility
      // tree the moment it starts leaving.
      data-closing={closing ? "true" : undefined}
      inert={closing}
      className={cn(
        // Same geometry the live stage settles at, so hanging up doesn't
        // resize the surface the agent is already reading.
        "post-call-stage flex h-[700px] max-h-full min-h-0 w-full max-w-[1504px] flex-col gap-3 px-16",
        className
      )}
    >
      <EndedCallBar
        // The bar outlasts the panes on the way out, so the session reads as
        // leaving after its own contents.
        className={cn("post-call-bar", !reduced && "call-bar-in")}
        elapsedMs={elapsedMs}
        contactName={contactName}
        contactMeta={contactMeta}
        onClose={onClose}
      />

      <div className="post-call-body flex min-h-0 flex-1 gap-3">
        <StagePane index={0} reduced={reduced} grow={7}>
          <AgentAssistCallSheet
            key={scenario.id}
            elapsedMs={elapsedMs}
            scenario={scenario}
            onScenarioChange={onScenarioChange}
            ended
            transcriptOpen={transcriptOpen}
            onTranscriptOpenChange={setTranscriptOpen}
            actionStates={actionStates}
            className="h-full"
          />
        </StagePane>
        <StagePane index={1} reduced={reduced} grow={4}>
          <WrapUpPanel
            key={scenario.id}
            suggestedOutcome={scenario.wrapUp.suggestedOutcome}
            notes={notes}
            onNotesChange={onNotesChange}
            onClose={onClose}
          />
        </StagePane>
      </div>
    </div>
  );
}

/**
 * The call bar after hangup. Same surface, same geometry — the live controls
 * give way to the two things left to do with the bar itself: say how the line
 * sounded, and leave. Reading the call is the recap pane's own business.
 *
 * Call quality lives here rather than in Wrap up on purpose. Wrap up is the
 * customer's record — what happened on the call and what we do next. How the
 * audio held up is our record, about our infrastructure, and folding it into
 * the disposition form would put a question the agent can answer in half a
 * second behind one they have to think about. The bar is also the thing that
 * was carrying the call, so it is the honest place to ask about the call.
 *
 * Deliberately not a survey: two thumbs, no comment box, no submit. The vote
 * stays local because it is the prototype's — there is no backend to file it
 * against, and re-mounting per call is exactly the lifetime it should have.
 */
function EndedCallBar({
  className,
  elapsedMs,
  contactName,
  contactMeta,
  onClose,
}: {
  className?: string;
  elapsedMs: number;
  contactName: string;
  contactMeta: string;
  onClose: (fromKeyboard?: boolean) => void;
}) {
  // The contact's clock stops being useful the moment the line drops — what
  // the agent is filing against now is when this call ended, stamped once.
  const [endedAt] = useState(() => formatLocalTime(new Date()));
  const [quality, setQuality] = useState<FeedbackVote>(null);

  return (
    <div
      className={cn(
        "flex h-[72px] shrink-0 items-center gap-4 rounded-[16px] bg-dialer-surface px-4 shadow-600",
        className
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-[14px] leading-5 font-medium text-white">
          {contactName}
        </p>
        <p className="truncate text-[11px] leading-4 text-white/60">
          {contactMeta} · Ended {endedAt}
        </p>
      </div>

      <div className="flex shrink-0 flex-col justify-center pl-2">
        <p className="text-[10px] leading-3 tracking-[0.06em] whitespace-nowrap text-white/60 uppercase">
          Duration
        </p>
        <p className="text-[16px] leading-6 font-medium text-white tabular-nums">
          {formatDuration(elapsedMs)}
        </p>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        {/* The label stays put once a thumb is picked. Swapping it for a
            thank-you would shift the buttons out from under the cursor at the
            exact moment the agent might want to correct a mis-tap — and the
            filled thumb already says it was heard. */}
        <span className="text-[13px] leading-5 whitespace-nowrap text-white/60">
          How was the call quality?
        </span>
        <FeedbackThumbs
          tone="dark"
          size="md"
          shape="rounded"
          value={quality}
          onChange={setQuality}
          upLabel="Call quality was good"
          downLabel="Call quality was poor"
        />

        {/* Leaving is a different kind of act from answering a question, so
            the rule keeps the cross from reading as a third thumb. */}
        <span aria-hidden="true" className="h-6 w-px bg-white/15" />

        {/* Dismissal reads the same everywhere on this page: a bare cross, no
            label — only the colours change for the dark surface.

            The press answers under the finger while the screen is already
            leaving — neither waits for the other, or dismissing a call would
            cost two animations end to end. A click carries `detail: 0` only
            when the keyboard activated it, which is what decides where focus
            lands once the dialer is back. */}
        <button
          type="button"
          aria-label="Close"
          onClick={(event) => onClose(event.detail === 0)}
          className="call-close-press flex size-8 shrink-0 items-center justify-center rounded-[4px] text-white/70 outline-none hover:bg-white/10 hover:text-white focus-visible:ring-2 focus-visible:ring-white/40 active:bg-white/16"
        >
          <IconClose size={20} className="call-close-icon" />
        </button>
      </div>
    </div>
  );
}

/**
 * Wrap up — disposition and notes. The recap next door is the raw material: the
 * agent copies the generated summary from there if they want it in the notes,
 * or writes their own.
 *
 * The notes field is the call's notes, not a second set: anything typed in the
 * live Notes pane is already here, and editing either place edits the same
 * value. Nobody should have to re-type what they wrote while talking.
 *
 * The disposition arrives already filled: Agent Assist heard the whole call, so
 * making the agent re-derive it from memory is busywork. It stays a plain
 * dropdown — changing it is one click, and the sparkle says where it came from
 * so an agent who disagrees knows it wasn't their own earlier pick.
 */
function WrapUpPanel({
  suggestedOutcome,
  notes,
  onNotesChange,
  onClose,
}: {
  suggestedOutcome: CallOutcomeValue;
  notes: NotesEditorValue;
  onNotesChange: (value: NotesEditorValue) => void;
  onClose: (fromKeyboard?: boolean) => void;
}) {
  const [outcome, setOutcome] = useState<string>(suggestedOutcome);
  // Read once, on the way in: the field stays labelled as carried over even
  // after the agent edits it, because that is still where the text came from.
  const [carriedOver] = useState(() => notes.text.trim().length > 0);
  const [saved, setSaved] = useState(false);
  const saveTimer = useRef<number | null>(null);
  // Read at the click and spent half a second later, once the button has
  // finished confirming: by then the event that carried it is long gone.
  const savedByKeyboard = useRef(false);

  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    },
    []
  );

  // Saving is the end of the call: confirm on the button, then let the wrap-up go.
  const save = (event: MouseEvent<HTMLButtonElement>) => {
    if (saveTimer.current) return;
    savedByKeyboard.current = event.detail === 0;
    setSaved(true);
    saveTimer.current = window.setTimeout(
      () => onClose(savedByKeyboard.current),
      SAVE_CONFIRM_MS
    );
  };

  const outcomeOptions = CALL_OUTCOMES.map((item) => ({
    value: item.value,
    label: item.label,
    icon: <OutcomeDot tone={item.tone} />,
  }));
  const selected = CALL_OUTCOMES.find((item) => item.value === outcome);
  // The mark is about the value in the field, not about who typed it last: it
  // disappears the moment the agent picks something else, and comes back if
  // they land on the suggestion again.
  const aiFilled = outcome === suggestedOutcome;

  return (
    <section
      aria-label="Wrap up"
      className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden bg-white"
    >
      <header className="flex h-11 shrink-0 items-center gap-1.5 border-b border-line px-4">
        <IconCallDisposition size={16} className="size-4 shrink-0 text-muted-foreground" />
        <p className="text-label-md-semi text-foreground">Wrap up</p>
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-4">
        <div className="relative">
          <Dropdown
            searchable={false}
            label={
              <>
                Call outcome <span className="text-error">*</span>
              </>
            }
            placeholder="Select call outcome"
            options={outcomeOptions}
            leftIcon={selected ? <OutcomeDot tone={selected.tone} /> : undefined}
            value={outcome}
            onValueChange={(value) =>
              setOutcome(Array.isArray(value) ? value[0] ?? "" : value)
            }
            aria-label="Call outcome"
          />
          {/* Sits inside the field, clear of the chevron, so the mark belongs to
              the value rather than to the label. */}
          {aiFilled ? (
            <TooltipTrigger
              placement="top"
              className="absolute right-9 bottom-0 h-10 items-center"
              content={
                <Tooltip
                  theme="dark"
                  arrow="bottom-center"
                  title="Filled in by Agent Assist"
                  description="Suggested from this call — change it if you disagree."
                />
              }
            >
              <span
                tabIndex={0}
                aria-label="Filled in by Agent Assist"
                className="flex size-5 items-center justify-center rounded-[4px] text-ai outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
              >
                <IconSparkles size={16} className="size-4 shrink-0" />
              </span>
            </TooltipTrigger>
          ) : null}
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-label-md text-foreground">Notes</p>
            {/* Says why the field is already full, so a pre-filled box doesn't
                read as someone else's text. */}
            {carriedOver ? (
              <p className="shrink-0 text-label-sm text-muted-foreground">
                Carried over from the call
              </p>
            ) : null}
          </div>
          <div className="flex flex-col gap-1">
            <NotesEditor
              placeholder="Add your notes about this call..."
              maxLength={NOTES_MAX}
              value={notes}
              onChange={onNotesChange}
              // Opens at the height it always had; the grabber is there for the
              // call that needed more room than one screen of notes.
              resizable
              className="h-32 min-h-32"
              ariaLabel="Notes"
            />
            <p className="text-right text-label-sm text-muted-foreground tabular-nums">
              {notes.text.length}/{NOTES_MAX}
            </p>
          </div>
        </div>
      </div>

      {/* What closes the call sits on its own edge, not at the end of a scroll. */}
      <div className="flex shrink-0 flex-col gap-2 border-t border-line px-4 py-3">
        <Button
          type="button"
          variant="primary"
          size="md"
          className="w-full"
          disabled={!outcome}
          leftIcon={saved ? <IconCheck size={20} /> : undefined}
          onClick={save}
        >
          {saved ? "Saved" : "Save & close"}
        </Button>
      </div>
    </section>
  );
}

function OutcomeDot({ tone }: { tone: OutcomeTone }) {
  return (
    <span
      aria-hidden="true"
      className={cn("size-2 shrink-0 rounded-full", OUTCOME_TONE[tone])}
    />
  );
}

function CallControl({
  label,
  pressed,
  disabled,
  morphKey,
  onClick,
  children,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  morphKey?: string;
  onClick?: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-2 outline-none transition-opacity duration-150",
        disabled && "cursor-not-allowed opacity-45"
      )}
    >
      {/* The mark travels, not the button — circle to circle, so the ratio the
          morph reads off the height is the two diameters. */}
      <span
        data-morph={morphKey}
        className={cn(
          "flex size-14 items-center justify-center overflow-clip rounded-full border border-white transition-colors",
          pressed ? "bg-white/15" : "bg-transparent",
          !disabled && "hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.97]"
        )}
      >
        <span className="relative flex size-6 items-center justify-center overflow-clip text-white">
          {children}
        </span>
      </span>
      <span className="text-[10px] leading-3 whitespace-nowrap text-white">{label}</span>
    </button>
  );
}

/** Sticky-note mark for the light Notes pane — same shape as the dialer asset, muted like sibling headers. */
function NotesPaneIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M11.167 6.5V1.833A1.333 1.333 0 0 0 9.833.5H1.833A1.333 1.333 0 0 0 .5 1.833v8A1.333 1.333 0 0 0 1.833 11.167H6.5L11.167 6.5ZM6.5 11.167V7.167c0-.177.07-.347.195-.472.125-.125.295-.195.472-.195h4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
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
  className,
}: {
  tab: DialerTab;
  onTabChange: (tab: DialerTab) => void;
  className?: string;
}) {
  return (
    <nav
      aria-label="Dialer"
      className={cn("dialer-nav flex w-full shrink-0 items-start bg-brand", className)}
    >
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
