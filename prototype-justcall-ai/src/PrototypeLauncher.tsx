import * as React from "react";
import { IconArrowRight } from "@/components/Icon";

type PrototypeLauncherProps = {
  onStartSetup: () => void;
  onStartInCall: () => void;
  /** The setup flow again, on an account with nothing configured yet. */
  onStartEmptySetup: () => void;
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
      className="group flex h-[179px] w-full flex-col justify-end overflow-hidden rounded-lg border border-line bg-avatar-indigo-bg p-[19px] text-left transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out hover:-translate-y-1 hover:border-brand hover:bg-brand-subtle hover:shadow-200 active:scale-[0.98] active:duration-75 active:ease-in"
    >
      <div className="flex w-full items-end justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-heading-xl text-disabled-fg transition-colors duration-200 ease-out group-hover:text-brand">
            {index}
          </p>
          <p className="text-heading-xl text-foreground">{title}</p>
        </div>
        <IconArrowRight
          size={24}
          className="shrink-0 text-foreground transition-transform duration-200 ease-out group-hover:translate-x-1.5"
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
    <div className="flex w-full flex-col items-start gap-3">
      <p className="text-label-sm font-medium uppercase tracking-[0.08em] text-muted-foreground">
        {label}
      </p>
      {children}
    </div>
  );
}

export function PrototypeLauncher({
  onStartSetup,
  onStartInCall,
  onStartEmptySetup,
}: PrototypeLauncherProps) {
  return (
    <div className="flex h-screen overflow-y-auto bg-white pb-[42px] pl-[75px] pt-[42px]">
      <div className="flex w-[333px] flex-col items-start gap-[31px]">
        <p className="w-full text-heading-xl text-foreground">Prototypes</p>

        <PrototypeGroup label="Setup">
          {/* Same flow as 02, walked on a day-one account so every list lands
              on its empty state. */}
          <PrototypeCard
            index="01"
            title="Empty States"
            onClick={onStartEmptySetup}
          />
          <PrototypeCard
            index="02"
            title="With Data"
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
      </div>
    </div>
  );
}
