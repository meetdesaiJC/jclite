import * as React from "react";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/Modal";
import { WebOnlyNotice } from "./WebOnlyNotice";
import justcallMark from "./assets/justcall-mark.svg";
import googleLogo from "./assets/google-logo.svg";
import microsoftLogo from "./assets/microsoft-logo.svg";

/**
 * Desktop app, as a Lite or View-only member meets it: the sign-in screen,
 * and no further. Neither license includes the desktop app, so the door is
 * shut at login rather than letting them into a dialer where every verb is
 * locked — a window full of dead buttons reads as broken, while a clear
 * refusal at the door reads as a rule.
 *
 * It mirrors the desktop login as it ships today, which predates Design
 * System 2.0, so it is drawn in that older style rather than from DS
 * components, whose look would misrepresent the product. Only the refusal
 * copy is new, and that's the point of the demo.
 */

/** Production's underline field: no box, a single rule beneath. */
const FIELD =
  "h-11 w-full border-b border-control-border bg-transparent px-1 text-paragraph-lg text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-brand";

const SSO_BUTTON =
  "flex h-12 w-full items-center justify-center gap-3 rounded-full border border-control-border bg-white text-paragraph-lg text-foreground outline-none transition-colors hover:bg-secondary-bg focus-visible:ring-2 focus-visible:ring-brand/40";

/* ── Desktop chrome ─────────────────────────────────────────────────────── */

/** One window button: a coloured disc whose glyph shows on group hover. */
function TrafficLight({
  className,
  label,
  onClick,
  children,
}: {
  className: string;
  /** Only a working button gets a name; the others are decoration. */
  label?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const Tag = onClick ? "button" : "span";
  return (
    <Tag
      {...(onClick
        ? { type: "button" as const, "aria-label": label, onClick }
        : { "aria-hidden": true })}
      className={cn(
        "flex size-3 items-center justify-center rounded-full outline-none focus-visible:ring-2 focus-visible:ring-white/60",
        className
      )}
    >
      <svg
        viewBox="0 0 10 10"
        stroke="currentColor"
        fill="none"
        className="size-2 text-desktop-titlebar-ink/70 opacity-0 transition-opacity duration-fast group-hover:opacity-100"
      >
        {children}
      </svg>
    </Tag>
  );
}

/** The app window's title bar, with the traffic lights. */
function WindowTitleBar({ title, onClose }: { title: string; onClose: () => void }) {
  return (
    <div className="relative flex h-8 shrink-0 items-center justify-center border-b border-desktop-titlebar-ink bg-desktop-titlebar select-none">
      {/* Hovering the group reveals all three glyphs at once, as macOS does. */}
      <div className="group absolute left-3 flex items-center gap-2">
        {/* Closing the app ends the demo: back to the prototype launcher. */}
        <TrafficLight className="bg-error" label="Close and return to prototypes" onClick={onClose}>
          <path d="M2.5 2.5l5 5M7.5 2.5l-5 5" strokeWidth="1.3" strokeLinecap="round" />
        </TrafficLight>
        <TrafficLight className="bg-warning">
          <path d="M2 5h6" strokeWidth="1.3" strokeLinecap="round" />
        </TrafficLight>
        <TrafficLight className="bg-success">
          <path d="M2.6 6.9V2.6h4.3z M7.4 3.1v4.3H3.1z" stroke="none" fill="currentColor" />
        </TrafficLight>
      </div>
      <span aria-hidden className="text-label-md-semi text-white">{title}</span>
    </div>
  );
}

/* ── Login ──────────────────────────────────────────────────────────────── */

/**
 * Every way in — password, Google, Microsoft — ends at the same refusal,
 * because it's the license that's turned away, not the credentials. A
 * modal says so and hands off to the web app, which is where both licenses
 * actually live, so the member isn't left guessing whether a different
 * password would have worked.
 */
function LoginCard() {
  const [refused, setRefused] = React.useState(false);
  const formRef = React.useRef<HTMLFormElement>(null);
  const refuse = (event?: React.FormEvent) => {
    event?.preventDefault();
    setRefused(true);
  };
  // A different account is a fresh attempt: clear the form and put the
  // caret back where it starts.
  const tryAnotherAccount = () => {
    setRefused(false);
    formRef.current?.reset();
    formRef.current?.querySelector<HTMLInputElement>("input")?.focus();
  };

  return (
    <div className="flex w-[480px] max-w-full flex-col items-stretch rounded-[24px] bg-white px-12 pt-16 pb-10 shadow-400">
      <div className="mb-10 flex items-center justify-center gap-1">
        <img src={justcallMark} alt="" className="size-14" />
        <span className="text-heading-xxxl text-foreground">
          JustCall
        </span>
      </div>

      <form ref={formRef} onSubmit={refuse} className="flex flex-col">
        <input type="email" placeholder="Business email" aria-label="Business email" className={FIELD} />
        <input
          type="password"
          placeholder="Password"
          aria-label="Password"
          className={cn(FIELD, "mt-6")}
        />
        <button
          type="submit"
          className="mt-6 h-12 rounded-[4px] bg-legacy-login text-paragraph-lg text-foreground outline-none transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          Login
        </button>
      </form>

      {/* Drawn for fidelity; recovering a password wouldn't change the answer. */}
      <span className="mt-8 text-label-sm text-muted-foreground">Forgot Password?</span>

      <div className="my-8 flex items-center gap-2 text-paragraph-sm text-muted-foreground">
        <span className="h-px flex-1 bg-line" />
        or
        <span className="h-px flex-1 bg-line" />
      </div>

      <div className="flex flex-col gap-5">
        <button type="button" onClick={() => refuse()} className={SSO_BUTTON}>
          <img src={googleLogo} alt="" className="size-5" />
          Continue with Google
        </button>
        <button type="button" onClick={() => refuse()} className={SSO_BUTTON}>
          <img src={microsoftLogo} alt="" className="size-5" />
          Continue with Microsoft
        </button>
      </div>

      <p className="mt-12 text-center text-paragraph-lg text-muted-foreground">
        Don't have an account? <span className="text-info underline">Signup here</span>
      </p>
      <p className="mt-4 text-center text-paragraph-md text-info">
        Terms &amp; conditions <span className="text-foreground">•</span> Privacy Policy
      </p>

      {/* No close button — closing only lands the member back on a form
          that gives the same answer, so it isn't offered as an action. A
          click outside or Escape still dismisses, as on any dialog. */}
      <Modal
        open={refused}
        onClose={() => setRefused(false)}
        size="sm"
        showCloseButton={false}
        bodyClassName="p-0"
      >
        <WebOnlyNotice
          appName="desktop app"
          titleId="desktop-web-only-title"
          ctaClassName="rounded-[4px] bg-legacy-login text-foreground transition-[filter] hover:brightness-95 focus-visible:ring-2 focus-visible:ring-brand/40"
          onDifferentAccount={tryAnotherAccount}
        />
      </Modal>
    </div>
  );
}

/** The window's close button is the way home; a reload works too. */
export function DesktopAppPrototype({ onHome }: { onHome: () => void }) {
  return (
    <div className="flex h-screen flex-col overflow-hidden bg-secondary-bg">
      <WindowTitleBar title="JustCall" onClose={onHome} />
      <div className="flex min-h-0 flex-1 items-start justify-center overflow-y-auto px-6 py-10">
        <LoginCard />
      </div>
    </div>
  );
}
