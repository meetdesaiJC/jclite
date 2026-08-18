import type { SVGProps } from "react";

/**
 * Agent Assist section-nav icons — traced from `icon-library/Agent Assist`
 * ("KB icon", "Guidance icon", "Actions Icon"). Exported at 16px with the
 * stroke switched to `currentColor` so one icon covers both the active and
 * resting nav states.
 */

type NavIconProps = SVGProps<SVGSVGElement>;

function NavIcon({ children, ...props }: NavIconProps) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 16 16"
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

export function IconAaPlaybooks(props: NavIconProps) {
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
