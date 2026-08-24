import * as React from "react";
import { cn } from "@/lib/utils";
import { IconArrowRight } from "@/components/Icon";

type PrototypeLauncherProps = {
  /* V1 — the scope planned for the first release. */
  onStartV1EmptySetup: () => void;
  onStartV1Setup: () => void;
  onStartV1InCall: () => void;
  /* V2 — the fuller experience the existing prototypes already cover. */
  onStartEmptySetup: () => void;
  onStartSetup: () => void;
  onStartInCall: () => void;
};

function PrototypeCard({
  index,
  title,
  onClick,
}: {
  index: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group flex h-[179px] w-full flex-col justify-end overflow-hidden rounded-lg border border-line bg-avatar-indigo-bg p-[19px] text-left",
        // `translate` and `scale`, not `transform` — Tailwind v4 emits the
        // standalone properties, so a transform-named transition matches
        // nothing and the lift snaps.
        "transition-[translate,scale,box-shadow,border-color,background-color] duration-moderate ease-entrance",
        "hover:-translate-y-1 hover:border-brand hover:bg-brand-subtle hover:shadow-200",
        "active:scale-[0.98] active:duration-micro active:ease-exit",
        "outline-none focus-visible:ring-4 focus-visible:ring-brand/24",
        // Travel is the part reduced motion drops; the border, fill and
        // shadow still answer the pointer.
        "motion-reduce:hover:translate-y-0 motion-reduce:active:scale-100"
      )}
    >
      <div className="flex w-full items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-heading-xl text-disabled-fg transition-colors duration-moderate ease-entrance group-hover:text-brand">
            {index}
          </p>
          <p className="text-heading-xl text-foreground">{title}</p>
        </div>
        <IconArrowRight
          size={24}
          className="shrink-0 text-foreground transition-[translate] duration-moderate ease-entrance group-hover:translate-x-1.5 motion-reduce:group-hover:translate-x-0"
        />
      </div>
    </button>
  );
}

function PrototypeGroup({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex w-full shrink-0 flex-col items-start gap-3 sm:w-[333px]">
      <h3 className="text-label-sm uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </h3>
      {children}
    </div>
  );
}

function LauncherSection({
  title,
  description,
  muted = false,
  children,
}: {
  title: string;
  /**
   * With the badges gone this is the only copy separating the two versions.
   * V1 lists its contents outright; V2 states itself as V1 plus the pieces
   * it adds, which is shorter to scan than repeating the shared four.
   */
  description: string;
  /**
   * Softens the heading so V1 stays the louder of the two. The cards are
   * identical in both sections, so this and the gap are what carry the split.
   */
  muted?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col items-start gap-8">
      <div className="flex max-w-[560px] flex-col items-start gap-3">
        <h2
          className={cn(
            "text-heading-xxl",
            muted ? "text-muted-foreground" : "text-foreground"
          )}
        >
          {title}
        </h2>
        <p className="text-paragraph-md text-muted-foreground">{description}</p>
      </div>

      {/* One column per category, so the categories read as siblings rather
          than as one long queue. */}
      <div className="flex flex-wrap items-start gap-[31px]">{children}</div>
    </section>
  );
}

export function PrototypeLauncher({
  onStartV1EmptySetup,
  onStartV1Setup,
  onStartV1InCall,
  onStartEmptySetup,
  onStartSetup,
  onStartInCall,
}: PrototypeLauncherProps) {
  return (
    <div className="h-screen overflow-y-auto bg-white">
      <main className="flex flex-col items-start gap-12 px-6 pb-[42px] pt-[42px] md:px-[75px]">
        <h1 className="text-heading-xxxl text-foreground">
          Agent Assist Prototypes
        </h1>

        {/* V1 first — it is the direction being designed for implementation.
            The gap between the two is wider than anything inside a section so
            the split is legible before you read either heading. */}
        <div className="flex flex-col items-start gap-16 md:gap-20">
          <LauncherSection
            title="V1"
            description="Includes Scripts, Response Cards, and Knowledge Base."
          >
            <PrototypeGroup label="Setup">
              {/* Same flow as 02, walked on a day-one account so every list
                  lands on its empty state. */}
              <PrototypeCard
                index="01"
                title="Empty States"
                onClick={onStartV1EmptySetup}
              />
              <PrototypeCard
                index="02"
                title="Configured State"
                onClick={onStartV1Setup}
              />
            </PrototypeGroup>

            <PrototypeGroup label="In-Call">
              <PrototypeCard
                index="03"
                title="Agent Experience"
                onClick={onStartV1InCall}
              />
            </PrototypeGroup>
          </LauncherSection>

          <LauncherSection
            title="V2"
            description="V1 + Behavioral Coaching, Next Best Actions, and Live Assist."
            muted
          >
            <PrototypeGroup label="Setup">
              <PrototypeCard
                index="01"
                title="Empty States"
                onClick={onStartEmptySetup}
              />
              <PrototypeCard
                index="02"
                title="Configured State"
                onClick={onStartSetup}
              />
            </PrototypeGroup>

            <PrototypeGroup label="In-Call">
              <PrototypeCard
                index="03"
                title="Agent Experience"
                onClick={onStartInCall}
              />
            </PrototypeGroup>
          </LauncherSection>
        </div>
      </main>
    </div>
  );
}
