import * as React from "react";
import { DURATION } from "@/lib/motion";
import { usePresence } from "@/lib/usePresence";
import { WebOnlyNotice } from "./WebOnlyNotice";
import salesDialerMark from "./assets/dialer-favicon.svg";
import googleLogo from "./assets/google-logo.svg";
import microsoftLogo from "./assets/microsoft-logo.svg";

/**
 * Sales Dialer mobile app, as a Lite or View-only member meets it: the
 * sign-in screen, and no further. Sales Dialer exists to run campaigns, and
 * neither license can run one, so — as on the desktop app — the door is shut
 * at login rather than letting them into an app where every verb is locked.
 *
 * It mirrors the app's login as it ships today, on its own older slate look
 * rather than DS 2.0, so it is drawn in that style from the sales-dialer-*
 * component tokens. Only the refusal copy is new.
 */

/** Production's boxed field: white, hairline border, generous height. */
const FIELD =
  "h-14 w-full rounded-md border border-line bg-white px-5 text-paragraph-lg text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-sales-dialer-bar";

const SSO_BUTTON =
  "flex h-14 w-full items-center justify-center gap-4 rounded-full border border-control-border bg-white text-paragraph-lg text-foreground outline-none transition-colors hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-sales-dialer-bar/40";

function StatusBar({ time }: { time: string }) {
  return (
    // Above the refusal sheet, which runs up behind it: the bar takes the
    // colour of whatever screen is showing, as a real status bar does.
    <div aria-hidden className="relative z-30 flex h-11 shrink-0 items-center justify-between px-8 text-foreground">
      <span className="text-heading-lg">{time}</span>
      <span className="flex items-center gap-1.5">
        <svg viewBox="0 0 16 12" className="h-3 w-4 fill-current">
          <path d="M8 2.2c2.3 0 4.4.9 6 2.4l1.3-1.4A10.3 10.3 0 0 0 8 .3 10.3 10.3 0 0 0 .7 3.2L2 4.6a8.4 8.4 0 0 1 6-2.4Zm0 3.7c1.3 0 2.5.5 3.4 1.3l1.3-1.4A6.8 6.8 0 0 0 8 4a6.8 6.8 0 0 0-4.7 1.8l1.3 1.4C5.5 6.4 6.7 5.9 8 5.9Zm0 3.6c.5 0 .9.2 1.2.5L8 11.6 6.8 10c.3-.3.7-.5 1.2-.5Z" />
        </svg>
        <svg viewBox="0 0 27 13" className="h-3 w-[27px]">
          <rect x="0.5" y="0.5" width="23" height="12" rx="3.5" className="fill-none stroke-current opacity-40" />
          <rect x="2" y="2" width="14" height="9" rx="2" className="fill-success" />
          <rect x="25" y="4.5" width="1.5" height="4" rx="0.75" className="fill-current opacity-40" />
        </svg>
      </span>
    </div>
  );
}

/**
 * The refusal, as a full-page sheet that rises over the login. On a phone a
 * centred dialog leaves a strip of a form that can't be used around it;
 * taking the whole screen says plainly that this is the answer, not an
 * error to retry. It runs up behind the status bar, so the two read as one
 * white surface rather than a grey strip left over from the login.
 *
 * Drawn here rather than with the DS Sidesheet, which portals to the page
 * and would land outside the device frame.
 */
function PhoneSheet({ open, children }: { open: boolean; children: React.ReactNode }) {
  // Matches `.refusal-sheet[data-state="closed"]` in styles.css.
  const { mounted, state } = usePresence(open, DURATION.slow);
  const sheetRef = React.useRef<HTMLDivElement>(null);
  // Focus lands on the way out, as the DS Modal does on open.
  React.useEffect(() => {
    if (open && mounted) sheetRef.current?.querySelector<HTMLElement>("a,button")?.focus();
  }, [open, mounted]);
  if (!mounted) return null;
  return (
    <div
      ref={sheetRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="sales-dialer-web-only-title"
      data-state={state}
      className="refusal-sheet absolute inset-0 z-20 bg-white pt-11"
    >
      {children}
    </div>
  );
}

/**
 * Every way in — password, Google, Microsoft — ends at the same refusal,
 * because it's the license that's turned away, not the credentials. The
 * sheet says so and hands off to the web app, so the member isn't left
 * guessing whether a different password would have worked.
 */
function LoginScreen() {
  const [refused, setRefused] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const refuse = (event?: React.FormEvent) => {
    event?.preventDefault();
    setRefused(true);
  };
  // Closing is a fresh attempt: clear the form and put the caret back
  // where it starts.
  const backToLogin = () => {
    setRefused(false);
    formRef.current?.reset();
    formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-6 pt-12 pb-8">
      <div className="mb-10 flex items-center justify-center gap-4">
        <img src={salesDialerMark} alt="" className="size-[72px]" />
        <div className="flex flex-col items-end">
          <span className="text-heading-xxxl text-foreground">Sales Dialer</span>
          <span className="text-heading-lg text-foreground">by JustCall</span>
        </div>
      </div>

      <form ref={formRef} onSubmit={refuse} className="flex flex-col gap-2">
        <input type="email" placeholder="Email" aria-label="Email" className={FIELD} />
        <input type="password" placeholder="Password" aria-label="Password" className={FIELD} />
        <button
          type="submit"
          className="mt-5 h-14 rounded-full bg-sales-dialer-bar text-heading-lg text-white outline-none transition-colors hover:bg-sales-dialer-bar/90 focus-visible:ring-2 focus-visible:ring-sales-dialer-bar/40"
        >
          Login
        </button>
      </form>

      <div className="my-6 flex items-center gap-3 text-paragraph-lg text-muted-foreground">
        <span className="h-px flex-1 bg-control-border" />
        or
        <span className="h-px flex-1 bg-control-border" />
      </div>

      <div className="flex flex-col gap-3">
        <button type="button" onClick={() => refuse()} className={SSO_BUTTON}>
          <img src={googleLogo} alt="" className="size-6" />
          Continue with Google
        </button>
        <button type="button" onClick={() => refuse()} className={SSO_BUTTON}>
          <img src={microsoftLogo} alt="" className="size-6" />
          Continue with Microsoft
        </button>
      </div>

      <PhoneSheet open={refused}>
        <WebOnlyNotice
          appName="Sales Dialer app"
          titleId="sales-dialer-web-only-title"
          ctaClassName="rounded-full bg-sales-dialer-bar text-white hover:bg-sales-dialer-bar/90 focus-visible:ring-2 focus-visible:ring-sales-dialer-bar/40"
          onClose={backToLogin}
          layout="page"
        />
      </PhoneSheet>
    </div>
  );
}

/** A reload returns to the launcher; there is no window chrome to close. */
export function SalesDialerAppPrototype() {
  return (
    <div className="flex h-screen items-center justify-center overflow-hidden bg-secondary-bg p-6">
      <div className="relative flex h-[812px] max-h-full w-[375px] shrink-0 flex-col overflow-hidden rounded-[44px] border-[6px] border-foreground bg-muted shadow-600">
        <StatusBar time="18:00" />
        <LoginScreen />
      </div>
    </div>
  );
}
