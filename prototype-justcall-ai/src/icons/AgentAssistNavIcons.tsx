import type { SVGProps } from "react";

/**
 * Agent Assist icons — traced from `icon-library/Agent Assist`
 * ("KB icon", "Guidance icon", "Actions Icon", "hand-stop"). Exported at 16px
 * with the stroke switched to `currentColor` so one icon covers both the active
 * and resting nav states — and, for Live Assist, both the white call bar and
 * the dark-on-white panel header.
 *
 * Scripts and Response Cards were tabs before they became nav items, so they
 * had no glyph. They borrow the 20-unit JustCall AI grid (`list-check` for
 * Scripts, a message bubble for Response Cards) drawn at 1.2 stroke, which
 * lands on the same optical weight as the 16-unit icons at 1.
 */

type NavIconProps = SVGProps<SVGSVGElement>;

function NavIcon({
  children,
  viewBox = "0 0 16 16",
  ...props
}: NavIconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconAaKnowledge(props: NavIconProps) {
  return (
    <NavIcon {...props}>
      <path
        d="M8 3.99916C8.91212 3.47255 9.94678 3.19531 11 3.19531C12.0532 3.19531 13.0879 3.47255 14 3.99916V12.6658C13.0879 12.1392 12.0532 11.862 11 11.862C9.94678 11.862 8.91212 12.1392 8 12.6658C7.08788 12.1392 6.05322 11.862 5 11.862C3.94678 11.862 2.91212 12.1392 2 12.6658V3.99916C2.91212 3.47255 3.94678 3.19531 5 3.19531C6.05322 3.19531 7.08788 3.47255 8 3.99916ZM8 12.6658V3.99916"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </NavIcon>
  );
}

export function IconAaScripts(props: NavIconProps) {
  return (
    <NavIcon viewBox="0 0 20 20" {...props}>
      <path
        d="M2.91602 4.58333L4.16602 5.83333L6.24935 3.75M2.91602 9.58333L4.16602 10.8333L6.24935 8.75M2.91602 14.5833L4.16602 15.8333L6.24935 13.75M9.16602 5H16.666M9.16602 10H16.666M9.16602 15H16.666"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </NavIcon>
  );
}

export function IconAaResponseCards(props: NavIconProps) {
  return (
    <NavIcon viewBox="0 0 20 20" {...props}>
      <path
        d="M17.5 12.5C17.5 12.942 17.3244 13.3659 17.0118 13.6785C16.6993 13.9911 16.2754 14.1667 15.8333 14.1667H5.83333L2.5 17.5V4.16667C2.5 3.72464 2.67559 3.30072 2.98816 2.98816C3.30072 2.67559 3.72464 2.5 4.16667 2.5H15.8333C16.2754 2.5 16.6993 2.67559 17.0118 2.98816C17.3244 3.30072 17.5 3.72464 17.5 4.16667V12.5Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M6.66602 6.66797H13.3327M6.66602 10.0013H10.8327"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </NavIcon>
  );
}

export function IconAaCoaching(props: NavIconProps) {
  return (
    <NavIcon {...props}>
      <path
        d="M2.66602 9.33333V7.33333C2.66602 5.91885 3.22792 4.56229 4.22811 3.5621C5.22831 2.5619 6.58486 2 7.99935 2C9.41384 2 10.7704 2.5619 11.7706 3.5621C12.7708 4.56229 13.3327 5.91885 13.3327 7.33333V9.33333M2.66602 9.33333C2.66602 8.97971 2.80649 8.64057 3.05654 8.39052C3.30659 8.14048 3.64573 8 3.99935 8H4.66602C5.01964 8 5.35878 8.14048 5.60882 8.39052C5.85887 8.64057 5.99935 8.97971 5.99935 9.33333V11.3333C5.99935 11.687 5.85887 12.0261 5.60882 12.2761C5.35878 12.5262 5.01964 12.6667 4.66602 12.6667H3.99935C3.64573 12.6667 3.30659 12.5262 3.05654 12.2761C2.80649 12.0261 2.66602 11.687 2.66602 11.3333V9.33333ZM13.3327 9.33333C13.3327 8.97971 13.1922 8.64057 12.9422 8.39052C12.6921 8.14048 12.353 8 11.9993 8H11.3327C10.9791 8 10.6399 8.14048 10.3899 8.39052C10.1398 8.64057 9.99935 8.97971 9.99935 9.33333V11.3333C9.99935 11.687 10.1398 12.0261 10.3899 12.2761C10.6399 12.5262 10.9791 12.6667 11.3327 12.6667H11.9993M13.3327 9.33333V11.3333C13.3327 11.687 13.1922 12.0261 12.9422 12.2761C12.6921 12.5262 12.353 12.6667 11.9993 12.6667M11.9993 12.6667C11.9993 13.7713 10.2087 14.6667 7.99935 14.6667"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </NavIcon>
  );
}

/**
 * Live Assist — the raised hand from the library (`hand-stop`). A hand is the
 * one gesture that reads as "I need someone" without reading as an error.
 */
export function IconAaLiveAssist(props: NavIconProps) {
  return (
    <NavIcon {...props}>
      <path
        d="M7.3335 3.66536C7.3335 3.40015 7.22814 3.14579 7.0406 2.95826C6.85307 2.77072 6.59871 2.66536 6.3335 2.66536C6.06828 2.66536 5.81393 2.77072 5.62639 2.95826C5.43885 3.14579 5.3335 3.40015 5.3335 3.66536V8.66536L4.35346 7.68536C4.15715 7.48928 3.90095 7.36441 3.62556 7.33059C3.35017 7.29677 3.07137 7.35594 2.83346 7.4987C2.61009 7.63261 2.44778 7.84839 2.38104 8.10013C2.31431 8.35187 2.34842 8.61972 2.47612 8.8467C3.72879 11.0734 4.45879 12.346 4.66679 12.6654C4.71017 12.7321 4.75373 12.7988 4.79746 12.8654C5.1618 13.4186 5.65784 13.8727 6.24104 14.1869C6.82425 14.5011 7.47635 14.6655 8.13879 14.6654H8.00012H9.33345C10.3943 14.6654 11.4117 14.2439 12.1619 13.4938C12.912 12.7436 13.3335 11.7262 13.3335 10.6654V4.9987C13.3335 4.73348 13.2281 4.47913 13.0406 4.29159C12.853 4.10405 12.5987 3.9987 12.3335 3.9987C12.0682 3.9987 11.8139 4.10405 11.6263 4.29159C11.4388 4.47913 11.3335 4.73348 11.3335 4.9987M7.3335 3.66536V7.9987M7.3335 3.66536V2.33203C7.3335 2.20071 7.35936 2.07067 7.40962 1.94935C7.45987 1.82802 7.53353 1.71778 7.62639 1.62492C7.71925 1.53207 7.82949 1.45841 7.95081 1.40815C8.07214 1.3579 8.20217 1.33203 8.3335 1.33203C8.46482 1.33203 8.59485 1.3579 8.71618 1.40815C8.8375 1.45841 8.94774 1.53207 9.0406 1.62492C9.13346 1.71778 9.20712 1.82802 9.25738 1.94935C9.30763 2.07067 9.3335 2.20071 9.3335 2.33203V7.9987M9.3335 3.66536C9.3335 3.40015 9.43885 3.14579 9.62639 2.95826C9.81393 2.77072 10.0683 2.66536 10.3335 2.66536C10.5987 2.66536 10.8531 2.77072 11.0406 2.95826C11.2281 3.14579 11.3335 3.40015 11.3335 3.66536V7.9987"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </NavIcon>
  );
}

export function IconAaActions(props: NavIconProps) {
  return (
    <NavIcon {...props}>
      <path
        d="M8.66732 2V6.66667H12.6673L7.33398 14V9.33333H3.33398L8.66732 2Z"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </NavIcon>
  );
}
