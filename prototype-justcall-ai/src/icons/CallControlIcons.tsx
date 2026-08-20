import type { ReactNode, SVGProps } from "react";

/**
 * Call-control marks for the webphone and the call bar.
 *
 * The design-system library (`@/components/Icon`) already ships the two the
 * telephony set needs — `IconVoice` (mute) and `IconVoicemailDrop` — so those
 * are imported there rather than redrawn here. Hold, Keypad, Transfer, Notes
 * and Transcript have no library entry yet, so they are drawn on the same
 * 24-unit grid the library uses: 2 units of padding, `currentColor` strokes,
 * round caps and joins, and the library's per-size weights (1 at 16, 1.25 at
 * 20, 1.5 at 24) so a bar mixing both sources reads as one set.
 *
 * Replace these with generated icons once the Figma library carries them.
 */

type CallIconSize = 16 | 20 | 24;

export type CallIconProps = Omit<SVGProps<SVGSVGElement>, "width" | "height"> & {
  /** Matches the library's `IconProps` — 16 / 20 / 24. */
  size?: CallIconSize;
};

/** Library optical weights, held constant across the 24-unit geometry. */
const STROKE: Record<CallIconSize, number> = { 16: 1, 20: 1.25, 24: 1.5 };

function CallIcon({
  size = 24,
  children,
  ...props
}: CallIconProps & { children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      stroke="currentColor"
      strokeWidth={STROKE[size]}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

/** Hold — the pause pair. */
export function IconCallHold(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M6 5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V5Z" />
      <path d="M14 5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V5Z" />
    </CallIcon>
  );
}

/** Keypad — the dialpad, 1–9 over a centred 0. */
export function IconCallKeypad(props: CallIconProps) {
  // Keys are 5 across on 24 with 2 of padding — wide enough that the stroke
  // still leaves a hole at 20 and 16.
  const cells = [
    [2, 2],
    [9.5, 2],
    [17, 2],
    [2, 9.5],
    [9.5, 9.5],
    [17, 9.5],
    [9.5, 17],
  ] as const;

  return (
    <CallIcon {...props}>
      {cells.map(([x, y]) => (
        <rect key={`${x}-${y}`} x={x} y={y} width={5} height={5} rx={1.25} />
      ))}
    </CallIcon>
  );
}

/** Transfer — hand the call to someone else. */
export function IconCallTransfer(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
      <path d="M3 21v-2a4 4 0 0 1 4-4h4" />
      <path d="M16 19h6M19 16v6" />
    </CallIcon>
  );
}

/**
 * Get help — the library's raised hand (`hand-stop`), recentred on the
 * 24-unit call-control grid so it sits with Mute and Transfer.
 */
export function IconCallHelp(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <g transform="translate(4 4)">
        <path d="M7.3335 3.66536C7.3335 3.40015 7.22814 3.14579 7.0406 2.95826C6.85307 2.77072 6.59871 2.66536 6.3335 2.66536C6.06828 2.66536 5.81393 2.77072 5.62639 2.95826C5.43885 3.14579 5.3335 3.40015 5.3335 3.66536V8.66536L4.35346 7.68536C4.15715 7.48928 3.90095 7.36441 3.62556 7.33059C3.35017 7.29677 3.07137 7.35594 2.83346 7.4987C2.61009 7.63261 2.44778 7.84839 2.38104 8.10013C2.31431 8.35187 2.34842 8.61972 2.47612 8.8467C3.72879 11.0734 4.45879 12.346 4.66679 12.6654C4.71017 12.7321 4.75373 12.7988 4.79746 12.8654C5.1618 13.4186 5.65784 13.8727 6.24104 14.1869C6.82425 14.5011 7.47635 14.6655 8.13879 14.6654H8.00012H9.33345C10.3943 14.6654 11.4117 14.2439 12.1619 13.4938C12.912 12.7436 13.3335 11.7262 13.3335 10.6654V4.9987C13.3335 4.73348 13.2281 4.47913 13.0406 4.29159C12.853 4.10405 12.5987 3.9987 12.3335 3.9987C12.0682 3.9987 11.8139 4.10405 11.6263 4.29159C11.4388 4.47913 11.3335 4.73348 11.3335 4.9987M7.3335 3.66536V7.9987M7.3335 3.66536V2.33203C7.3335 2.20071 7.35936 2.07067 7.40962 1.94935C7.45987 1.82802 7.53353 1.71778 7.62639 1.62492C7.71925 1.53207 7.82949 1.45841 7.95081 1.40815C8.07214 1.3579 8.20217 1.33203 8.3335 1.33203C8.46482 1.33203 8.59485 1.3579 8.71618 1.40815C8.8375 1.45841 8.94774 1.53207 9.0406 1.62492C9.13346 1.71778 9.20712 1.82802 9.25738 1.94935C9.30763 2.07067 9.3335 2.20071 9.3335 2.33203V7.9987M9.3335 3.66536C9.3335 3.40015 9.43885 3.14579 9.62639 2.95826C9.81393 2.77072 10.0683 2.66536 10.3335 2.66536C10.5987 2.66536 10.8531 2.77072 11.0406 2.95826C11.2281 3.14579 11.3335 3.40015 11.3335 3.66536V7.9987" />
      </g>
    </CallIcon>
  );
}

/** Notes — the sticky note with its corner turned. */
export function IconCallNotes(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M21 13V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8l8-8Z" />
      <path d="M13 21v-7a1 1 0 0 1 1-1h7" />
    </CallIcon>
  );
}

/** Transcript — the same waveform the transcript panel's header wears. */
export function IconCallTranscript(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M4 10v4M8 6v12M12 4v16M16 7v10M20 10v4" />
    </CallIcon>
  );
}
