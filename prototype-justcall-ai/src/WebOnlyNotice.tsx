import { cn } from "@/lib/utils";
import { IconClose, IconExternalLink } from "@/components/Icon";

/**
 * Where both licenses actually live. The sign-in page rather than the
 * root: the member was mid-sign-in when they were turned away, so they
 * should land where they finish it, not on a landing page they have to
 * find their way out of.
 */
export const WEB_APP_URL = "https://app.justcall.io/login";

/**
 * The phone handing off to the browser: the same account, carried across.
 * It shows the move rather than the refusal, which is the whole tone of the
 * notice. Drawn inline on tokens rather than shipped as an export, so it
 * follows the palette like everything else on the screen.
 */
function WebHandoffIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 184" fill="none" aria-hidden className={className}>
      <circle cx="132" cy="92" r="82" className="fill-handoff-wash" />

      {/* Browser window, with a flat offset shadow rather than a blur. */}
      <rect x="60" y="30" width="160" height="116" rx="10" className="fill-handoff-shadow" />
      <rect x="56" y="26" width="160" height="116" rx="10" strokeWidth="2" className="fill-background stroke-handoff-outline" />
      <path d="M56 46h160" strokeWidth="1.5" className="stroke-handoff-outline" />
      <circle cx="68" cy="36" r="2.25" className="fill-handoff-outline" />
      <circle cx="76" cy="36" r="2.25" className="fill-handoff-outline" />
      <circle cx="84" cy="36" r="2.25" className="fill-handoff-outline" />
      <rect x="66" y="56" width="34" height="76" rx="4" className="fill-muted" />
      <rect x="72" y="64" width="20" height="3" rx="1.5" className="fill-handoff-outline" opacity="0.6" />
      <rect x="72" y="73" width="14" height="3" rx="1.5" className="fill-handoff-outline" opacity="0.6" />
      <rect x="108" y="56" width="98" height="30" rx="4" className="fill-handoff-panel" />
      <rect x="108" y="94" width="45" height="38" rx="4" className="fill-muted" />
      <rect x="161" y="94" width="45" height="38" rx="4" className="fill-muted" />

      {/* The path across: dashed, so it reads as a direction, not a wire. */}
      <path
        d="M70 142C98 140 104 102 138 97"
        strokeWidth="2"
        strokeDasharray="4 4"
        strokeLinecap="round"
        className="stroke-brand"
      />
      <path d="M131 91l8 6-7 7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="stroke-brand" />

      <circle cx="168" cy="72" r="22" className="fill-brand" />
      <g strokeWidth="2" strokeLinecap="round" className="stroke-background">
        <circle cx="168" cy="72" r="11" />
        <ellipse cx="168" cy="72" rx="5" ry="11" />
        <path d="M157 72h22M159 66h18M159 78h18" />
      </g>

      {/* Phone in front: it's where the member is standing right now. */}
      <rect x="20" y="82" width="52" height="90" rx="9" strokeWidth="2.5" className="fill-background stroke-handoff-outline" />
      <rect x="40" y="88" width="12" height="3" rx="1.5" className="fill-handoff-outline" />
      <rect x="27" y="96" width="38" height="66" rx="4" className="fill-handoff-panel" />
    </svg>
  );
}

/**
 * The refusal's body, shared by the desktop app's modal and Sales Dialer's
 * full-page sheet so the two read as one rule. It leads with where to go
 * rather than what went wrong — the member did nothing wrong — and the web
 * app is a real link out, since that's exactly what the native app would
 * do: hand off to the browser and stay put.
 *
 * Each app passes its own CTA styling, so the button still looks like that
 * app's Login button rather than a DS 2.0 one dropped into an older screen.
 */
export function WebOnlyNotice({
  appName,
  ctaClassName,
  onDifferentAccount,
  titleId,
  layout = "dialog",
  onClose,
}: {
  /** "desktop app", "Sales Dialer app" — completes "access to the …". */
  appName: string;
  ctaClassName: string;
  onDifferentAccount: () => void;
  titleId: string;
  /**
   * `page` fills its container, with the whole column — message and
   * actions together — centred in it, so the button reads as the answer to
   * the sentence above it rather than as page chrome. `dialog` is the same
   * column, compact.
   */
  layout?: "dialog" | "page";
  /**
   * The cross at the top of a `page`. A full-screen sheet has no scrim to
   * click away, so it needs its own way back to the login.
   */
  onClose?: () => void;
}) {
  const page = layout === "page";
  return (
    <div
      className={cn(
        "relative flex flex-col items-center px-8 text-center",
        page ? "h-full justify-center py-12" : "pt-8 pb-6"
      )}
    >
      {page && onClose ? (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2 right-3 flex size-10 items-center justify-center rounded-full text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <IconClose size={24} />
        </button>
      ) : null}

      <WebHandoffIllustration className="h-auto w-52" />

      <h2 id={titleId} className="mt-6 text-heading-lg text-foreground">
        Use JustCall on the web
      </h2>
      <p className="mt-3 text-paragraph-md text-muted-foreground">
        Your current license doesn’t include access to the {appName}. You can continue
        using JustCall on the web.
      </p>

      <div className="flex w-full flex-col items-center">
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
          className="mt-4 rounded-sm px-2 py-1 text-paragraph-md text-brand outline-none transition-colors hover:text-brand-hover focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          Sign in with a different account
        </button>
      </div>
    </div>
  );
}
