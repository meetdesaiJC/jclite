import { cn } from "@/lib/utils";
import { IconExternalLink, IconWorld } from "@/components/Icon";
import justcallMark from "./assets/justcall-mark.svg";

/**
 * How a sign-in that the license can't use is turned away. Two candidates
 * for the same rule, kept side by side so they can be compared on one
 * screen: an error inline on the login form, or a modal that takes over the
 * screen and sends the member on to the web app.
 */
export type LoginBlockStyle = "inline" | "modal";

/** Where both licenses actually live. */
export const WEB_APP_URL = "https://app.justcall.io";

/**
 * The modal's body, shared by the desktop app and Sales Dialer so the two
 * refusals read as one rule. It leads with where to go rather than what
 * went wrong — the member did nothing wrong — and the web app is a real
 * link out, since that's exactly what the native app would do: hand off to
 * the browser and stay put.
 *
 * Each app passes its own CTA styling, so the button still looks like that
 * app's Login button rather than a DS 2.0 one dropped into an older screen.
 */
export function WebOnlyNotice({
  appName,
  ctaClassName,
  onDifferentAccount,
  titleId,
}: {
  /** "desktop app", "Sales Dialer app" — completes "access to the …". */
  appName: string;
  ctaClassName: string;
  onDifferentAccount: () => void;
  titleId: string;
}) {
  return (
    <div className="flex flex-col items-center px-8 pt-8 pb-6 text-center">
      <div className="flex items-center gap-1">
        <img src={justcallMark} alt="" className="size-8" />
        <span className="text-heading-xl text-foreground">JustCall</span>
      </div>

      <span className="mt-8 flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {/* The 24 drawing scaled to 32 by CSS: the viewBox stretches it, and
            there is no 32 drawing to pass as `size`. */}
        <IconWorld size={24} className="size-8" />
      </span>

      <h2 id={titleId} className="mt-6 text-heading-lg text-foreground">
        Use JustCall on the web
      </h2>
      <p className="mt-3 text-paragraph-md text-muted-foreground">
        Your current license doesn’t include access to the {appName}. You can continue
        using JustCall on the web.
      </p>

      <a
        href={WEB_APP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "mt-8 flex h-12 w-full items-center justify-center gap-2 text-paragraph-lg outline-none transition-colors",
          ctaClassName
        )}
      >
        Open web app
        <IconExternalLink size={16} />
        <span className="sr-only">(opens in your browser)</span>
      </a>
      <button
        type="button"
        onClick={onDifferentAccount}
        className="mt-4 rounded-sm px-2 py-1 text-paragraph-md text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        Sign in with a different account
      </button>
    </div>
  );
}
