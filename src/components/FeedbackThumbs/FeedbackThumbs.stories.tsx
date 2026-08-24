import type { Meta, StoryObj } from "@storybook/react-vite";
import * as React from "react";
import { FeedbackThumbs, type FeedbackVote } from "./FeedbackThumbs";

const meta = {
  title: "Components/FeedbackThumbs",
  component: FeedbackThumbs,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
  argTypes: {
    tone: { control: "inline-radio", options: ["light", "dark"] },
    size: { control: "inline-radio", options: ["sm", "md"] },
    shape: { control: "inline-radio", options: ["pill", "rounded"] },
    clearable: { control: "boolean" },
  },
} satisfies Meta<typeof FeedbackThumbs>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The control is fully controlled, so every story owns a vote. */
function Demo({
  initial = null,
  ...props
}: Omit<React.ComponentProps<typeof FeedbackThumbs>, "value" | "onChange"> & {
  initial?: FeedbackVote;
}) {
  const [vote, setVote] = React.useState<FeedbackVote>(initial);
  return <FeedbackThumbs value={vote} onChange={setVote} {...props} />;
}

export const Default: Story = {
  args: { value: null, onChange: () => {} },
  render: (args) => <Demo {...args} initial={args.value} />,
};

/**
 * On the dialer's dark chrome. The semantic greys have no contrast there, so
 * the dark tone tints the surface itself instead of taking a fill.
 */
export const OnDark: Story = {
  args: { value: null, onChange: () => {} },
  render: () => (
    <div className="flex h-[72px] items-center gap-3 rounded-[16px] bg-dialer-surface px-4">
      <span className="text-[13px] leading-5 text-white/60">How was the call quality?</span>
      <Demo tone="dark" size="md" shape="rounded" />
    </div>
  ),
};

/** Both sizes, both shapes, unanswered and answered. */
export const Matrix: Story = {
  args: { value: null, onChange: () => {} },
  render: () => (
    <div className="grid grid-cols-[auto_auto_auto] items-center gap-x-8 gap-y-4">
      {(
        [
          ["sm · pill", "sm", "pill"],
          ["md · rounded", "md", "rounded"],
        ] as const
      ).map(([label, size, shape]) => (
        <React.Fragment key={label}>
          <span className="text-label-sm text-muted-foreground">{label}</span>
          <Demo size={size} shape={shape} />
          <Demo size={size} shape={shape} initial="up" />
        </React.Fragment>
      ))}
    </div>
  ),
};

/**
 * `clearable={false}` — used where the rating is a signal we keep, so there is
 * no "never mind": changing your mind means picking the other thumb.
 */
export const NotClearable: Story = {
  args: { value: null, onChange: () => {} },
  render: () => <Demo initial="up" clearable={false} />,
};
