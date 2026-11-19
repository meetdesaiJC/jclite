import * as React from "react";
import { Button } from "@/components/Button";
import { Tag } from "@/components/Tag";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/Table";
import { IconCircleCheck, IconDotsVertical, IconInfoCircle } from "@/components/Icon";
import { Tooltip, TooltipTrigger } from "@/components/Tooltip";
import {
  IconInvoiceDoc,
  IconOverviewEye,
  IconPricingCard,
  IconUsageBalanceBars,
  type SidenavItem,
} from "@/components/Sidenav";
import cardVisa from "./assets/card-visa.svg";
import {
  ACCOUNT_PLAN,
  BILLING,
  LICENSE_SEATS,
  PLAN_CHARGE_KEYS,
  PLAN_CHARGES,
  planChargeTotal,
  type PlanChargeKey,
} from "./teamMembersData";
import { PlanDetailsModal } from "./PlanDetailsModal";

/**
 * Profile › Billing — the account's plan, with Lite and View-only licenses as
 * line items in it, and the billing housekeeping (address, card, cancel).
 * Sections and copy follow the ai-review-assist billing screen; the card
 * treatment matches the add-ons prototype's Billing Overview so the two read
 * as one product.
 */

/** The "Your Plan" nav that replaces the product nav while in billing. */
export const BILLING_NAV_ITEMS: SidenavItem[] = [
  { key: "overview", label: "Overview", icon: <IconOverviewEye />, sectionLabel: "Your Plan" },
  { key: "invoices", label: "Invoices", icon: <IconInvoiceDoc /> },
  { key: "pricing", label: "Pricing", icon: <IconPricingCard /> },
  { key: "usage-balance", label: "Usage Balance", icon: <IconUsageBalanceBars /> },
];

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function Card({ children }: { children: React.ReactNode }) {
  return (
    <section className="flex w-full flex-col gap-6 rounded-sm border border-line bg-white p-6">
      {children}
    </section>
  );
}

function CardHeading({ title, subtitle }: { title: React.ReactNode; subtitle?: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col gap-1">
      {/* 16 medium, a step under Figma's 18 semibold: at full weight the five
          stacked titles read louder than the content they label. */}
      <h2 className="flex items-center gap-2 text-label-lg text-foreground">{title}</h2>
      {subtitle ? <p className="text-paragraph-md text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export function BillingPage() {
  const full = ACCOUNT_PLAN.fullLicenses;
  const total = PLAN_CHARGE_KEYS.reduce((sum, key) => sum + planChargeTotal(key), 0);
  // The modal remembers its last tab while closed so the exit animation
  // doesn't flash back to the first one.
  const [breakdownOpen, setBreakdownOpen] = React.useState(false);
  const [breakdownTab, setBreakdownTab] = React.useState<PlanChargeKey>("team-members");
  const openBreakdown = (key: PlanChargeKey) => {
    setBreakdownTab(key);
    setBreakdownOpen(true);
  };

  return (
    <main className="flex min-h-0 flex-1 flex-col overflow-y-auto bg-white p-6">
      <div className="mx-auto flex w-full max-w-[1280px] flex-col gap-6">
        <Card>
          <CardHeading
            title="Plan Details"
            subtitle={`Your subscription renews on ${BILLING.renewsOn}`}
          />
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-label-md">Plan name</TableHead>
                <TableHead className="text-label-md">Plan details</TableHead>
                <TableHead className="w-[200px] text-label-md">
                  <span className="inline-flex items-center gap-1.5">
                    Licenses
                    {/* One icon for the whole column: the rule differs by
                        type (a minimum vs a limit), so it's explained once
                        here rather than per row. */}
                    <TooltipTrigger
                      placement="bottom"
                      content={
                        // Children-only mode, not title/description: that
                        // pair is 12px grey, sized for one-line hints. A
                        // three-part explanation needs the 14px white body.
                        <Tooltip
                          theme="dark"
                          arrow="top-center"
                          padded="comfortable"
                          className="max-w-[380px] p-4"
                        >
                          <span className="flex flex-col gap-2 whitespace-normal">
                            <span className="text-label-md">How license counts work</span>
                            {/* Each type's name on its own line, so the two
                                rules scan as a pair rather than a paragraph. */}
                            <span className="flex flex-col">
                              <span className="font-medium">Standard</span>
                              {/* Body in the tooltip's secondary text, so the
                                  type names above carry the scan. */}
                              <span className="text-tooltip-dark-muted">
                                Your contract sets a minimum. You can add more Standard licenses as needed. Your license count will be adjusted to match the number of active team members at the time of billing renewal.
                              </span>
                            </span>
                            <span className="flex flex-col">
                              <span className="font-medium">Lite and View-only</span>
                              <span className="text-tooltip-dark-muted">Your contract sets a limit for each license type. Contact your CSM to increase it.</span>
                            </span>
                          </span>
                        </Tooltip>
                      }
                    >
                      <button
                        type="button"
                        aria-label="How license counts work"
                        className="inline-flex rounded-full text-muted-foreground outline-none focus-visible:ring-4 focus-visible:ring-brand/24"
                      >
                        <IconInfoCircle size={16} className="size-4 shrink-0" />
                      </button>
                    </TooltipTrigger>
                  </span>
                </TableHead>
                <TableHead className="w-[146px] text-right text-label-md">Subscription Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent [&>td]:align-top">
                {/* Every cell top-aligned: the line items and license rows run
                    three or four lines deep, so centring would leave the name
                    and total floating beside the second line. */}
                <TableCell>
                  <div className="flex flex-col">
                    <span className="text-label-lg text-foreground">{ACCOUNT_PLAN.name}</span>
                    <span className="text-paragraph-md text-muted-foreground">Monthly</span>
                  </div>
                </TableCell>
                <TableCell>
                  {/* Team Members is one figure across every license type:
                      Standard, Lite and View-only fold in, and the counts live
                      in the Licenses column. The other charges stay itemised. */}
                  <ul className="list-disc space-y-0.5 pl-[18px] text-label-md text-brand">
                    {PLAN_CHARGE_KEYS.map((key) => (
                      <li key={key}>
                        <button
                          type="button"
                          onClick={() => openBreakdown(key)}
                          className="rounded-[2px] text-left outline-none hover:underline focus-visible:ring-4 focus-visible:ring-brand/24"
                        >
                          {PLAN_CHARGES[key].label}: {money.format(planChargeTotal(key))}
                        </button>
                      </li>
                    ))}
                  </ul>
                </TableCell>
                <TableCell>
                  {/* Each type reads used / contracted. For Standard the
                      denominator is the contract minimum, not a cap — the
                      tooltip on the header says so. */}
                  <dl className="grid grid-cols-[auto_auto] justify-start gap-x-6 gap-y-1 text-paragraph-md">
                    <dt className="text-muted-foreground">Standard</dt>
                    <dd className="text-label-md text-foreground">
                      {full}/{ACCOUNT_PLAN.fullLicenses}
                    </dd>
                    <dt className="text-muted-foreground">Lite</dt>
                    <dd className="text-label-md text-foreground">
                      {LICENSE_SEATS.lite.used}/{LICENSE_SEATS.lite.total}
                    </dd>
                    <dt className="text-muted-foreground">View-only</dt>
                    <dd className="text-label-md text-foreground">
                      {LICENSE_SEATS["view-only"].used}/{LICENSE_SEATS["view-only"].total}
                    </dd>
                  </dl>
                </TableCell>
                <TableCell className="text-right text-label-lg text-foreground">
                  {money.format(total)}
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>

        <Card>
          <div className="flex items-center gap-6">
            <CardHeading
              title={
                <>
                  Update Billing Address
                  <IconCircleCheck size={20} className="shrink-0 text-success" aria-hidden="true" />
                </>
              }
              subtitle={BILLING.address}
            />
            <Button variant="grey-outline" size="md" className="shrink-0">
              Update Address
            </Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-6">
            <CardHeading
              title="Payment Method"
              subtitle="Manage your saved cards to keep billing seamless."
            />
            <Button variant="grey-outline" size="md" className="shrink-0">
              Add Card
            </Button>
          </div>
          {/* Same table treatment as Plan Details (Figma 40003082:102894),
              so every card with records on this page reads one way. */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-label-md">Card</TableHead>
                <TableHead className="w-[480px] text-label-md">Name on card</TableHead>
                <TableHead className="w-[160px] text-center text-label-md">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow className="hover:bg-transparent">
                <TableCell>
                  <div className="flex items-center gap-3">
                    <img src={cardVisa} alt={BILLING.card.brand} width={35} height={24} className="shrink-0" />
                    <div className="flex items-start gap-3">
                      <div className="flex flex-col">
                        <span className="text-label-md text-foreground">
                          **** **** **** {BILLING.card.last4}
                        </span>
                        <span className="text-paragraph-sm text-muted-foreground">
                          Expires {BILLING.card.expires.replace("-", "/")}
                        </span>
                      </div>
                      <Tag size="sm" color="grey">
                        Default
                      </Tag>
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-paragraph-md text-muted-foreground">
                  {BILLING.card.nameOnCard}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="grey-outline"
                    size="sm"
                    iconOnly
                    aria-label="Card actions"
                    className="mx-auto"
                  >
                    <IconDotsVertical size={20} />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </Card>

        <Card>
          <div className="flex items-center gap-6">
            <CardHeading
              title="Cancel Subscription"
              // The date is the renewal date above, so "stays active until"
              // and "renews on" never disagree on the same page.
              subtitle={`If you cancel now, your subscription will stay active until ${BILLING.renewsOn}. Prefer a temporary break? You can choose to pause your subscription instead.`}
            />
            <Button variant="grey-outline" size="md" className="shrink-0">
              Cancel Subscription
            </Button>
          </div>
        </Card>

        <Card>
          <div className="flex items-center gap-6">
            <CardHeading
              title="Change Plan"
              subtitle="Upgrade as your team grows or switch to a lower plan if you need less. Compare plans and pick what fits today."
            />
            <Button variant="primary" size="md" className="shrink-0">
              Compare Plans
            </Button>
          </div>
        </Card>
      </div>
      <PlanDetailsModal
        open={breakdownOpen}
        tab={breakdownTab}
        onTabChange={setBreakdownTab}
        onClose={() => setBreakdownOpen(false)}
      />
    </main>
  );
}
