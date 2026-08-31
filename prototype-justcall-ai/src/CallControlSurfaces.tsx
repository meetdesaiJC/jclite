import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { useDropdownPresence } from "@/components/Dropdown/useDropdownPresence";
import {
  IconCallOnHold,
  IconCheck,
  IconClear,
  IconQueue,
  IconSearch,
  IconVoicemailDrop,
} from "@/components/Icon";
import { WaveformLoader } from "@/components/WaveformLoader";
import {
  TRANSFER_TARGETS,
  VOICEMAIL_GREETINGS,
  targetUnavailable,
  type TransferTarget,
} from "./callTransferData";

/**
 * The three call-bar controls that open something rather than toggling
 * something: the DTMF keypad, the transfer picker, and the voicemail drop.
 *
 * All three hang off their own icon on the bar, so they share one shell —
 * `BarPopover` — which does the anchoring, the outside-click, the Escape, and
 * the exit animation. Each surface is then just its content.
 *
 * The state they act on lives in `DialerPanel`, above the ringing → live
 * morph: a transfer that ends the call and tones sent down the line both
 * outlive the panel that started them.
 */

/** Which bar control currently owns its surface. One at a time, like the bar. */
export type CallSurface = "keypad" | "transfer" | "voicemail";

/** How the agent handed the call over. */
export type TransferMode = "warm" | "cold";

/**
 * A transfer in flight. `consulting` is the warm middle — the customer is on
 * hold, the agent is talking to the target, and the call has not moved yet.
 */
export type CallTransfer = {
  targetId: string;
  mode: TransferMode;
  stage: "consulting" | "connecting";
  /**
   * Whether the customer was already on hold when the transfer started, so
   * backing out of a warm consult can put them back exactly as it found them
   * rather than resuming a call the agent had deliberately paused.
   */
  heldBefore: boolean;
};

/** The greeting is playing out; the line closes when it finishes. */
export type VoicemailDrop = { greetingId: string };

/** Gap between the bar control and the panel that belongs to it. */
const ANCHOR_GAP = 8;
/** Keep the panel off the window edge even when its control is nearly at one. */
const VIEWPORT_MARGIN = 12;
/** How often to look again for a control that hasn't arrived yet. */
const ANCHOR_RETRY_MS = 16;

/**
 * Cold transfer: how long "Transferring to Dana…" stands before the line
 * closes. Long enough to read, short enough that the agent isn't waiting on a
 * prototype. Warm transfers skip it — the consult already was the wait.
 */
export const TRANSFER_CONNECT_MS = 1600;
/** Voicemail drop: the greeting plays, then the call ends. */
export const VOICEMAIL_DROP_MS = 2600;

/**
 * How many tones the readout keeps. It is a reminder of what the IVR on the
 * other end was told, not a transcript — past a dozen the agent is reading the
 * wrong end of the string.
 */
export const DTMF_READOUT_MAX = 14;

/* ── Shell ──────────────────────────────────────────────────────────────── */

/**
 * A panel anchored under one bar control.
 *
 * Fixed-positioned in a body portal rather than absolutely inside the bar: the
 * call workspace clips its own horizontal overflow, and a scroll container on
 * one axis clips the other too, so a panel parented to the bar would be cut
 * off by the stage it hangs over.
 *
 * `role="dialog"` is what keeps Escape sane. Both Escape handlers already in
 * the dialer count `[role="dialog"]` nodes and defer to the topmost one, so
 * announcing this as a dialog makes the popover win Escape without either of
 * them learning about it.
 */
function BarPopover({
  anchorRef,
  open,
  label,
  width,
  autoFocus = true,
  onClose,
  children,
}: {
  anchorRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  label: string;
  width: number;
  /** Transfer focus into the panel on open. */
  autoFocus?: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  const { mounted, state } = useDropdownPresence(open);
  const panelRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ top: number; left: number } | null>(null);

  /** False when the control isn't on screen yet, so there is nothing to hang off. */
  const place = () => {
    const anchor = anchorRef.current;
    if (!anchor) return false;
    const rect = anchor.getBoundingClientRect();
    // Centred on its control, then pulled back inside the window. A panel that
    // reads as belonging to one icon has to point at that icon.
    const centred = rect.left + rect.width / 2 - width / 2;
    const maxLeft = window.innerWidth - width - VIEWPORT_MARGIN;
    setBox({
      top: rect.bottom + ANCHOR_GAP,
      left: Math.max(VIEWPORT_MARGIN, Math.min(centred, maxLeft)),
    });
    return true;
  };

  useLayoutEffect(() => {
    if (!open) return;
    // The control can open its panel before it exists: Keypad on the ringing
    // phone sets the same state the bar's Keypad does, and the bar is still
    // half a morph away. So keep looking rather than opening into nowhere —
    // and on a timer, not a frame callback, because the prototype is often
    // read in a hidden preview pane where rAF never fires.
    let poll = 0;
    const attempt = () => {
      if (place()) return;
      poll = window.setTimeout(attempt, ANCHOR_RETRY_MS);
    };
    attempt();
    const onReposition = () => place();
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.clearTimeout(poll);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
    // `place` closes over props that don't change for the life of one open.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, width]);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      // The control itself is a toggle — let its own click close the panel,
      // or the two fire and it re-opens on the same press.
      if (anchorRef.current?.contains(target)) return;
      if (panelRef.current?.contains(target)) return;
      onClose();
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      onClose();
      anchorRef.current?.focus();
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey, true);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey, true);
    };
    // `onClose` is re-created each render by design; re-binding is cheap and
    // keeps the handler pointed at the current close.
  }, [open, onClose, anchorRef]);

  useEffect(() => {
    if (!open || !autoFocus) return;
    // A beat, so focus lands after the panel has been placed and painted —
    // and on a timer for the same reason placement uses one.
    const timer = window.setTimeout(() => {
      const panel = panelRef.current;
      if (!panel) return;
      const first = panel.querySelector<HTMLElement>("[data-autofocus]");
      (first ?? panel).focus({ preventScroll: true });
    }, 0);
    return () => window.clearTimeout(timer);
  }, [open, autoFocus]);

  if (!mounted || !box) return null;

  return createPortal(
    <div
      ref={panelRef}
      role="dialog"
      aria-label={label}
      data-call-surface
      data-state={state}
      tabIndex={-1}
      style={{ top: box.top, left: box.left, width }}
      // z-50 puts it over the dialer surface (z-40) and under tooltips (z-100),
      // so the control's own tooltip still reads while the panel is open.
      className="dropdown-panel fixed z-50 flex flex-col overflow-hidden rounded-lg border border-line bg-white shadow-400 outline-none"
    >
      {children}
    </div>,
    document.body
  );
}

/** Section heading inside a popover — quiet, so the rows under it stay loud. */
function SurfaceLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-label-xs text-muted-foreground uppercase">{children}</p>
  );
}

/* ── Keypad ─────────────────────────────────────────────────────────────── */

const DTMF_KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

/**
 * DTMF, not dialling — the number is already connected, so there is no Call
 * button and no field to edit. What the pad owes the agent is a record of what
 * the IVR on the other end has been told, which is the readout at the top.
 */
export function KeypadSurface({
  anchorRef,
  open,
  tones,
  onTone,
  onClear,
  onClose,
}: {
  anchorRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  tones: string;
  onTone: (digit: string) => void;
  onClear: () => void;
  onClose: () => void;
}) {
  return (
    <BarPopover
      anchorRef={anchorRef}
      open={open}
      label="Keypad"
      width={248}
      onClose={onClose}
    >
      <div className="flex items-center justify-between gap-2 border-b border-line px-3 py-2.5">
        <div className="min-w-0">
          <SurfaceLabel>Tones sent</SurfaceLabel>
          <p
            aria-live="polite"
            className={cn(
              "truncate text-paragraph-md tabular-nums",
              tones ? "text-foreground" : "text-disabled-fg"
            )}
          >
            {tones || "None yet"}
          </p>
        </div>
        {tones ? (
          <Button
            variant="link"
            size="xs"
            onClick={onClear}
            leftIcon={<IconClear size={16} />}
          >
            Clear
          </Button>
        ) : null}
      </div>

      <div className="grid grid-cols-3 gap-0.5 p-2">
        {DTMF_KEYS.map((digit) => (
          <button
            key={digit}
            type="button"
            data-autofocus={digit === "1" ? "" : undefined}
            onClick={() => onTone(digit)}
            aria-label={`Send ${digit}`}
            className="button-press flex h-11 items-center justify-center rounded-md text-heading-lg text-brand tabular-nums outline-none hover:bg-brand-subtle focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            {digit}
          </button>
        ))}
      </div>
    </BarPopover>
  );
}

/* ── Transfer ───────────────────────────────────────────────────────────── */

/**
 * Handing the call over, in the two shapes it actually takes.
 *
 * "Ask first" is a warm transfer: the customer goes on hold, the agent and the
 * target talk, and only then does the call move — so the panel stays open and
 * turns into the consult it started. "Transfer now" is cold and final, which
 * is why it is the outline button of the pair rather than the primary: the
 * safer of two irreversible acts should be the easier one to hit.
 */
export function TransferSurface({
  anchorRef,
  open,
  transfer,
  onStart,
  onComplete,
  onCancel,
  onClose,
}: {
  anchorRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  transfer: CallTransfer | null;
  onStart: (target: TransferTarget, mode: TransferMode) => void;
  onComplete: () => void;
  onCancel: () => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const listId = useId();

  // A closed panel forgets the search but not much else — the next open should
  // start from the full list rather than from a filter the agent can't see.
  useEffect(() => {
    if (open) return;
    setQuery("");
  }, [open]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return TRANSFER_TARGETS;
    return TRANSFER_TARGETS.filter((target) =>
      `${target.name} ${target.detail}`.toLowerCase().includes(needle)
    );
  }, [query]);

  const agents = matches.filter((target) => target.kind === "agent");
  const teams = matches.filter((target) => target.kind === "team");
  const selected = selectedId
    ? (TRANSFER_TARGETS.find((target) => target.id === selectedId) ?? null)
    : null;
  const canTransfer = Boolean(selected && !targetUnavailable(selected));

  // Keyed on the mode rather than the stage, so the body the agent was looking
  // at is the body that animates out. Completing a consult flips the stage to
  // `connecting` and closes the panel in the same commit — reading the stage
  // here would swap the consult back to the picker for the 120ms of the exit.
  const consulting = transfer?.mode === "warm";

  return (
    <BarPopover
      anchorRef={anchorRef}
      open={open}
      label="Transfer call"
      width={320}
      onClose={onClose}
    >
      {consulting && transfer ? (
        <ConsultingBody
          target={TRANSFER_TARGETS.find((t) => t.id === transfer.targetId)}
          onComplete={onComplete}
          onCancel={onCancel}
        />
      ) : (
        <>
          <div className="shrink-0 border-b border-line px-3 py-2">
            <div className="flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 focus-within:border-brand">
              <IconSearch
                size={20}
                className="size-5 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <input
                data-autofocus
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search people or teams"
                aria-label="Search transfer destinations"
                aria-controls={listId}
                className="min-w-0 flex-1 bg-transparent text-paragraph-sm text-foreground outline-none placeholder:text-disabled-fg"
              />
            </div>
          </div>

          <div
            id={listId}
            role="listbox"
            aria-label="Transfer destinations"
            className="max-h-[264px] min-h-0 flex-1 overflow-y-auto p-1"
          >
            {matches.length === 0 ? (
              <p className="px-3 py-6 text-center text-paragraph-sm text-muted-foreground">
                Nobody here by that name.
              </p>
            ) : null}

            {agents.map((target) => (
              <TargetRow
                key={target.id}
                target={target}
                selected={target.id === selectedId}
                onSelect={() => setSelectedId(target.id)}
              />
            ))}

            {teams.length ? (
              <div className="mt-1 border-t border-line px-3 pt-2 pb-1">
                <SurfaceLabel>Teams</SurfaceLabel>
              </div>
            ) : null}

            {teams.map((target) => (
              <TargetRow
                key={target.id}
                target={target}
                selected={target.id === selectedId}
                onSelect={() => setSelectedId(target.id)}
              />
            ))}
          </div>

          <div className="flex shrink-0 items-center gap-2 border-t border-line p-3">
            <Button
              variant="grey-outline"
              size="sm"
              disabled={!canTransfer}
              className="flex-1"
              onClick={() => selected && onStart(selected, "cold")}
            >
              Transfer now
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!canTransfer}
              className="flex-1"
              onClick={() => selected && onStart(selected, "warm")}
            >
              Ask first
            </Button>
          </div>
        </>
      )}
    </BarPopover>
  );
}

/**
 * The warm middle. Two customers now — the one on hold and the colleague on
 * the line — so the panel says where each of them stands before it offers the
 * two ways out.
 */
function ConsultingBody({
  target,
  onComplete,
  onCancel,
}: {
  target?: TransferTarget;
  onComplete: () => void;
  onCancel: () => void;
}) {
  const completeRef = useRef<HTMLButtonElement>(null);

  // The panel was already open when this replaced the picker, so the shell's
  // open-time autofocus has long since run — and the button the agent pressed
  // to get here has just unmounted, which would drop focus to the body.
  useEffect(() => {
    completeRef.current?.focus({ preventScroll: true });
  }, []);

  return (
    <div className="flex flex-col gap-3 p-3">
      <div className="flex items-center gap-2.5">
        {target?.kind === "team" ? (
          <TeamMark />
        ) : (
          <Avatar
            size="md"
            initials={target?.initials}
            color={target?.color}
            status={target?.status}
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-label-md-semi text-foreground">
            {target?.name ?? "Colleague"}
          </p>
          <p className="flex items-center gap-1.5 text-paragraph-sm text-brand">
            <WaveformLoader className="size-4 text-brand" />
            Connected to you
          </p>
        </div>
      </div>

      <p className="flex items-center gap-1.5 rounded-md bg-secondary-bg px-2.5 py-2 text-paragraph-sm text-muted-foreground">
        <IconCallOnHold size={16} className="size-4 shrink-0" aria-hidden="true" />
        The customer is on hold and can't hear this.
      </p>

      <div className="flex items-center gap-2">
        <Button
          variant="grey-outline"
          size="sm"
          className="flex-1"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          ref={completeRef}
          variant="primary"
          size="sm"
          className="flex-1"
          onClick={onComplete}
        >
          Complete transfer
        </Button>
      </div>
    </div>
  );
}

/** Teams have no face, so they get the queue mark at avatar size instead. */
function TeamMark() {
  return (
    <span
      aria-hidden="true"
      className="flex size-8 shrink-0 items-center justify-center rounded-full bg-brand-subtle text-brand"
    >
      <IconQueue size={16} className="size-4" />
    </span>
  );
}

function TargetRow({
  target,
  selected,
  onSelect,
}: {
  target: TransferTarget;
  selected: boolean;
  onSelect: () => void;
}) {
  const unavailable = targetUnavailable(target);
  return (
    <button
      type="button"
      role="option"
      aria-selected={selected}
      disabled={unavailable}
      onClick={onSelect}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left outline-none transition-colors",
        "focus-visible:ring-2 focus-visible:ring-brand/24",
        selected ? "bg-brand-subtle" : "hover:bg-surface-hover",
        unavailable && "cursor-not-allowed opacity-50 hover:bg-transparent"
      )}
    >
      {target.kind === "team" ? (
        <TeamMark />
      ) : (
        <Avatar
          size="md"
          initials={target.initials}
          color={target.color}
          status={target.status}
        />
      )}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-label-md text-foreground">
          {target.name}
        </span>
        <span className="block truncate text-paragraph-sm text-muted-foreground">
          {unavailable ? "Do not disturb" : target.detail}
        </span>
      </span>
      {selected ? (
        <IconCheck size={16} className="size-4 shrink-0 text-brand" />
      ) : null}
    </button>
  );
}

/* ── Voicemail drop ─────────────────────────────────────────────────────── */

/**
 * Confirmation, not a toggle. Dropping a greeting ends the call, and there is
 * no undo on a recording the customer already has — so the agent picks which
 * one plays and commits, rather than firing the last-used one off one click.
 */
export function VoicemailSurface({
  anchorRef,
  open,
  onDrop,
  onClose,
}: {
  anchorRef: RefObject<HTMLButtonElement | null>;
  open: boolean;
  onDrop: (greetingId: string) => void;
  onClose: () => void;
}) {
  const [greetingId, setGreetingId] = useState(VOICEMAIL_GREETINGS[0].id);

  return (
    <BarPopover
      anchorRef={anchorRef}
      open={open}
      label="Drop a voicemail"
      width={332}
      onClose={onClose}
    >
      <div className="border-b border-line px-3 py-2.5">
        <p className="text-label-md-semi text-foreground">Drop a voicemail</p>
        <p className="text-paragraph-sm text-muted-foreground">
          The greeting plays to the customer and the call ends.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Greeting"
        className="flex flex-col gap-0.5 p-1"
      >
        {VOICEMAIL_GREETINGS.map((greeting) => {
          const active = greeting.id === greetingId;
          return (
            <button
              key={greeting.id}
              type="button"
              role="radio"
              aria-checked={active}
              data-autofocus={active ? "" : undefined}
              onClick={() => setGreetingId(greeting.id)}
              className={cn(
                "flex w-full flex-col gap-0.5 rounded-md px-2.5 py-2 text-left outline-none transition-colors",
                "focus-visible:ring-2 focus-visible:ring-brand/24",
                active ? "bg-brand-subtle" : "hover:bg-surface-hover"
              )}
            >
              <span className="flex w-full items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-label-md text-foreground">
                  {greeting.label}
                </span>
                <span className="shrink-0 text-label-xs text-muted-foreground tabular-nums">
                  {greeting.durationLabel}
                </span>
                {active ? (
                  <IconCheck size={16} className="size-4 shrink-0 text-brand" />
                ) : null}
              </span>
              <span className="line-clamp-2 text-paragraph-sm text-muted-foreground">
                “{greeting.preview}”
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 border-t border-line p-3">
        <Button
          variant="grey-outline"
          size="sm"
          className="flex-1"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="flex-1"
          leftIcon={<IconVoicemailDrop size={16} />}
          onClick={() => onDrop(greetingId)}
        >
          Drop
        </Button>
      </div>
    </BarPopover>
  );
}

/* ── The model the bar and the phone share ──────────────────────────────── */

/**
 * Everything the three opening controls need, as one prop.
 *
 * Bundled rather than spread because it travels four components deep — the
 * ringing phone's Keypad and the bar's Keypad are the same control mid-morph,
 * so both ends read the same state, and threading a dozen callbacks through
 * `InCallShell` → `CallMorphStage` → `LiveCallStage` twice over would bury the
 * props that actually differ between them.
 */
export interface CallControlsModel {
  surface: CallSurface | null;
  /** DTMF sent this call, oldest first. */
  tones: string;
  transfer: CallTransfer | null;
  voicemail: VoicemailDrop | null;
  /** The line is on its way somewhere else — nothing else may touch it. */
  busy: boolean;
  onSurfaceToggle: (next: CallSurface) => void;
  onSurfaceClose: () => void;
  onTone: (digit: string) => void;
  onTonesClear: () => void;
  onTransferStart: (target: TransferTarget, mode: TransferMode) => void;
  onTransferComplete: () => void;
  onTransferCancel: () => void;
  onVoicemailDrop: (greetingId: string) => void;
}

/**
 * What the bar says under the caller's name.
 *
 * One line, and the line the agent needs most: a transfer or a voicemail drop
 * is about to take the call away, which outranks the hold it put the customer
 * on to get there. Returns null when there is nothing to say and the clock
 * should stand alone.
 */
export function callStatusLabel(
  controls: Pick<CallControlsModel, "transfer" | "voicemail">,
  onHold: boolean
): string | null {
  if (controls.voicemail) return "Dropping voicemail";
  const { transfer } = controls;
  if (transfer) {
    const target = TRANSFER_TARGETS.find((item) => item.id === transfer.targetId);
    const who = target?.shortName ?? "colleague";
    return transfer.stage === "consulting"
      ? `Consulting ${who}`
      : `Transferring to ${who}`;
  }
  if (onHold) return "On hold";
  return null;
}

/**
 * The three panels, anchored to the three controls that open them.
 *
 * Rendered once by the bar rather than by each control, so only one can be
 * open and the bar keeps deciding which — the same rule the aside column
 * follows on the other side of the divider.
 */
export function CallBarSurfaces({
  controls,
  keypadRef,
  transferRef,
  voicemailRef,
}: {
  controls: CallControlsModel;
  keypadRef: RefObject<HTMLButtonElement | null>;
  transferRef: RefObject<HTMLButtonElement | null>;
  voicemailRef: RefObject<HTMLButtonElement | null>;
}) {
  return (
    <>
      <KeypadSurface
        anchorRef={keypadRef}
        open={controls.surface === "keypad"}
        tones={controls.tones}
        onTone={controls.onTone}
        onClear={controls.onTonesClear}
        onClose={controls.onSurfaceClose}
      />
      <TransferSurface
        anchorRef={transferRef}
        open={controls.surface === "transfer"}
        transfer={controls.transfer}
        onStart={controls.onTransferStart}
        onComplete={controls.onTransferComplete}
        onCancel={controls.onTransferCancel}
        onClose={controls.onSurfaceClose}
      />
      <VoicemailSurface
        anchorRef={voicemailRef}
        open={controls.surface === "voicemail"}
        onDrop={controls.onVoicemailDrop}
        onClose={controls.onSurfaceClose}
      />
    </>
  );
}
