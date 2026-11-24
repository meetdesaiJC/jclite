import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { IconArrowRight } from "@/components/Icon";

/**
 * Non-calling licenses (JustCall Lite and View-only). Two prototypes: the
 * admin who assigns licenses, and the member who has one. Lite and View-only
 * are one flow with a switch inside it, since they differ only in what's
 * locked. A card passed no `onClick` stays inert (no hover lift, no arrow).
 */
type PrototypeLauncherProps = {
  onStartLicenseExperience?: () => void;
  onStartLicenseManagement?: () => void;
  onStartDesktopApp?: () => void;
  onStartMobileApp?: () => void;
  onStartSalesDialerApp?: () => void;
};

function PrototypeCard({
  index,
  title,
  onClick,
}: {
  index: string;
  title: string;
  onClick?: () => void;
}) {
  const ready = Boolean(onClick);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!ready}
      className={cn(
        "group relative flex min-h-[179px] w-full flex-col justify-end overflow-hidden rounded-lg border border-line bg-avatar-indigo-bg p-[19px] text-left",
        // `translate` and `scale`, not `transform` — Tailwind v4 emits the
        // standalone properties, so a transform-named transition matches
        // nothing and the lift snaps.
        "transition-[translate,scale,box-shadow,border-color,background-color] duration-moderate ease-entrance",
        "outline-none focus-visible:ring-4 focus-visible:ring-brand/24",
        ready &&
          "hover:-translate-y-1 hover:border-brand hover:bg-brand-subtle hover:shadow-200 active:scale-[0.98] active:duration-micro active:ease-exit motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100",
        !ready && "cursor-default"
      )}
    >
      <div className="flex w-full items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-heading-xl text-disabled-fg transition-colors duration-moderate ease-entrance group-hover:group-enabled:text-brand">
            {index}
          </p>
          <p className="text-heading-xl text-foreground">{title}</p>
        </div>
        {ready && (
          <IconArrowRight
            size={24}
            className="shrink-0 text-foreground transition-[translate] duration-moderate ease-entrance group-hover:translate-x-1.5 motion-reduce:group-hover:translate-x-0"
          />
        )}
      </div>
    </button>
  );
}

function PrototypeGroup({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-3 sm:w-[400px]">
      <h3 className="text-label-sm uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </h3>
      {children}
    </div>
  );
}

export function PrototypeLauncher({
  onStartLicenseExperience,
  onStartLicenseManagement,
  onStartDesktopApp,
  onStartMobileApp,
  onStartSalesDialerApp,
}: PrototypeLauncherProps) {
  return (
    <div className="h-screen overflow-y-auto bg-white">
      <main className="flex flex-col items-start gap-10 px-6 pb-[42px] pt-[42px] md:px-[75px]">
        <div className="flex flex-col items-start gap-2">
          <h1 className="text-heading-xxxl text-foreground">
            Non Calling Licenses - JC Lite and View-only
          </h1>
        </div>

        {/* Admin and the license experience sit side by side, so the one
            admin card isn't stacked above a long column of member views.
            More air between the groups than between a group's own cards, so
            the admin flow reads as its own thing. Stacks on narrow screens. */}
        <div className="flex w-full flex-col items-start gap-10 sm:flex-row">
          {/* Admin first: licenses have to be assigned before a Lite or
              View-only user has anything to experience. */}
          <PrototypeGroup label="Admin">
            <PrototypeCard
              index="01"
              title="Team Member & License Management"
              onClick={onStartLicenseManagement}
            />
          </PrototypeGroup>

          <PrototypeGroup label="License experience">
            <PrototypeCard
              index="02"
              title="Web"
              onClick={onStartLicenseExperience}
            />
            {/* Desktop and mobile are member-side only: license management
                lives on the web app, so these show what's locked for a Lite
                or View-only user, never an admin view. */}
            <PrototypeCard index="03" title="Desktop app" onClick={onStartDesktopApp} />
            <PrototypeCard index="04" title="JustCall mobile app" onClick={onStartMobileApp} />
            {/* Sales Dialer ships its own mobile app, separate from
                JustCall's, so it gets its own card. */}
            <PrototypeCard index="05" title="Sales Dialer mobile app" onClick={onStartSalesDialerApp} />
          </PrototypeGroup>
        </div>
      </main>
    </div>
  );
}
