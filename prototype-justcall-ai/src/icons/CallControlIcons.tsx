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
 * Get help — the library's raised hand (`hand-stop`) at its 24-unit drawing,
 * not the 16 scaled up, so the palm carries the same weight and 2-unit padding
 * as Mute and Transfer beside it.
 */
export function IconCallHelp(props: CallIconProps) {
  return (
    <CallIcon {...props}>
      <path d="M11 5.5C11 5.102 10.842 4.721 10.561 4.439C10.28 4.158 9.898 4 9.5 4C9.102 4 8.721 4.158 8.44 4.439C8.158 4.721 8 5.102 8 5.5V13L6.53 11.53C6.236 11.236 5.851 11.049 5.438 10.998C5.025 10.947 4.607 11.036 4.25 11.25C3.915 11.451 3.672 11.775 3.572 12.152C3.471 12.53 3.523 12.932 3.714 13.272C5.593 16.612 6.688 18.521 7 19C7.065 19.1 7.131 19.2 7.196 19.3C7.743 20.13 8.487 20.811 9.362 21.282C10.236 21.754 11.215 22 12.208 22H12H14C15.591 22 17.118 21.368 18.243 20.243C19.368 19.117 20 17.591 20 16V7.5C20 7.102 19.842 6.721 19.561 6.439C19.28 6.158 18.898 6 18.5 6C18.102 6 17.721 6.158 17.44 6.439C17.158 6.721 17 7.102 17 7.5M11 5.5V12M11 5.5V3.5C11 3.303 11.039 3.108 11.114 2.926C11.19 2.744 11.3 2.579 11.44 2.439C11.579 2.3 11.744 2.19 11.926 2.114C12.108 2.039 12.303 2 12.5 2C12.697 2 12.892 2.039 13.074 2.114C13.256 2.19 13.422 2.3 13.561 2.439C13.7 2.579 13.811 2.744 13.886 2.926C13.961 3.108 14 3.303 14 3.5V12M14 5.5C14 5.102 14.158 4.721 14.44 4.439C14.721 4.158 15.102 4 15.5 4C15.898 4 16.28 4.158 16.561 4.439C16.842 4.721 17 5.102 17 5.5V12" />
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
