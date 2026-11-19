import type { Lock } from "@/components/LockedControl";

/**
 * What the non-calling licenses can't do, in one place. Every screen asks
 * here rather than deciding for itself, so the rule stays one rule: a blocked
 * entry point stays visible, muted, and shows "Unavailable with your current
 * license / Contact your admin to request access." on hover / focus / tap
 * (LockedControl's defaults).
 *
 * Locks are on actions, never on pages. View-only is read access: someone
 * with it should still be able to open AI Voice Agent, Salesfloor or the
 * Compliance center and see what's been set up — only the verbs inside are
 * locked. So no nav item or menu row is ever locked here.
 *
 * `undefined` means "not locked" — the admin experience, or an action this
 * license keeps. Screens pass the result straight to a `locked` / `*Locked`
 * prop.
 */
export type License = "lite" | "view-only";

/** Locked, with the generic reason. */
const LOCKED: Lock = {};

/** Blocked for both non-calling licenses. */
function forBoth(license: License | undefined): Lock | undefined {
  return license ? LOCKED : undefined;
}

/** Blocked for View-only; Lite keeps it. */
function forViewOnly(license: License | undefined): Lock | undefined {
  return license === "view-only" ? LOCKED : undefined;
}


/** Header › Dialer: calling is Standard-only. */
export function dialerLock(license?: License) {
  return forBoth(license);
}


/** Team Members: invite, duplicate and edit are member management. */
export function teamMemberLocks(license?: License) {
  const manage = forViewOnly(license);
  return { addMember: manage, duplicate: manage, edit: manage };
}

/** Billing actions. */
export function billingLocks(license?: License) {
  return {
    cancel: forBoth(license),
    addCard: forViewOnly(license),
    cardActions: forViewOnly(license),
    changePlan: forViewOnly(license),
  };
}

/**
 * SMS Inbox. Neither license sends: new message and the reply composer (send
 * and schedule included) are locked for both. View-only also can't manage a
 * conversation — assign, close, and the ⋮ menu (archive, delete, download,
 * mark read/unread, block).
 */
export function inboxLocks(license?: License) {
  const manage = forViewOnly(license);
  return {
    newMessage: forBoth(license),
    composer: forBoth(license),
    assign: manage,
    close: manage,
    more: manage,
  };
}

/**
 * Sales Dialer. Neither license dials, and the PRD keeps campaign creation,
 * editing and launch from both — so Create Campaign, the row ▷ (start
 * dialing), Edit and Duplicate lock for Lite too. Lite keeps "Manage Sales
 * Dialer workflows": it can still reassign agents, archive a campaign and
 * apply the number fixes (phone-number management). View-only reads and
 * exports only.
 */
export function salesDialerLocks(license?: License) {
  const manage = forViewOnly(license);
  return {
    createCampaign: forBoth(license),
    startDialing: forBoth(license),
    edit: forBoth(license),
    duplicate: forBoth(license),
    assignAgents: manage,
    archive: manage,
    reviewFixes: manage,
  };
}

/**
 * Phone Numbers. The list, search, filters and export stay open to both —
 * knowing which numbers exist and who they're shared with is reading, not
 * managing. Adding, porting, editing settings and duplicating are number
 * management: Lite keeps them, View-only doesn't, matching Team Members.
 * Deleting releases the number back to the carrier and can't be undone, so
 * it is locked for both, like cancelling the subscription in Billing.
 */
export function phoneNumberLocks(license?: License) {
  const manage = forViewOnly(license);
  return {
    addNumber: manage,
    portNumber: manage,
    edit: manage,
    duplicate: manage,
    remove: forBoth(license),
  };
}

/**
 * Live Monitoring: both licenses can open the page; View-only can't act on a
 * call. (Barge, when it appears, is blocked for both.)
 */
export function liveMonitoringLocks(license?: License) {
  return { monitor: forViewOnly(license) };
}

/**
 * Integrations: Lite manages connections; View-only can look but not
 * connect, change, or reconfigure sync.
 */
export function appIntegrationLocks(license?: License) {
  const viewOnly = forViewOnly(license);
  return { connect: viewOnly, manage: viewOnly, syncConfig: viewOnly };
}

/**
 * Bulk SMS/MMS: neither license sends campaigns, so creating, editing,
 * duplicating, follow-ups, deleting and paying are locked for both. View-only
 * also can't change SMS settings. Lists and analytics stay open.
 */
export function bulkSmsLocks(license?: License) {
  const both = forBoth(license);
  return {
    create: both,
    edit: both,
    duplicate: both,
    followUp: both,
    delete: both,
    payment: both,
    smsSettings: forViewOnly(license),
  };
}

/**
 * Contacts: CRM click-to-call and SMS sending are locked for both licenses.
 * View-only also can't add or edit contacts, import or bulk-sync, or change
 * integration connections. Export isn't in the rules, so it stays open.
 */
export function contactsLocks(license?: License) {
  const viewOnly = forViewOnly(license);
  return {
    call: forBoth(license),
    sms: forBoth(license),
    editContact: viewOnly,
    importContacts: viewOnly,
    integrationChanges: viewOnly,
  };
}

/**
 * Workflows: creating, editing and publishing Voice workflows is locked for
 * both licenses. Lite can still delete Voice workflows and manage Sales
 * Dialer ones; View-only can do neither.
 */
export function workflowsLocks(license?: License) {
  const viewOnly = forViewOnly(license);
  return {
    createVoice: forBoth(license),
    editVoice: forBoth(license),
    deleteVoice: viewOnly,
    manageSalesDialer: viewOnly,
  };
}

/**
 * Call Logs: calling shortcuts follow the Dialer rule (locked for both).
 * View-only also can't archive calls or delete transcripts. Playback,
 * transcripts and exports stay open to everyone.
 */
export function callLogsLocks(license?: License) {
  const viewOnly = forViewOnly(license);
  return { call: forBoth(license), archive: viewOnly, deleteTranscript: viewOnly };
}
