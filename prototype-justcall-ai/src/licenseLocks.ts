import type { Lock } from "@/components/LockedControl";

/**
 * What the non-calling licenses can't do, in one place. Every screen asks
 * here rather than deciding for itself, so the rule stays one rule: a blocked
 * entry point stays visible, muted, and shows "Not available with your
 * license / This action isn’t included in your current license. Contact your
 * admin for access." on hover / focus / tap (LockedControl's defaults).
 *
 * Locks are on actions, never on pages. View-only is read access: someone
 * with it should still be able to open AI Voice Agent, Salesfloor or the
 * Compliance center and see what's been set up — only the verbs inside are
 * locked. So no nav item, menu row or section is locked here.
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


/**
 * Team Members: invite, duplicate and edit are member management.
 */
export function teamMemberLocks(license?: License) {
  const manage = forViewOnly(license);
  return { addMember: manage, duplicate: manage, edit: manage };
}

/**
 * Roles & Permissions: Lite manages roles; View-only can read them.
 */
export function rolesLocks(license?: License) {
  const manage = forViewOnly(license);
  return { create: manage, assign: manage, edit: manage, duplicate: manage, delete: manage };
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
    buyMore: manage,
  };
}

/**
 * Sales Dialer. Neither license dials, and the permissions sheet keeps
 * campaign creation, editing and launch from both — so Create Campaign, the
 * row ▷ (start dialing), Edit, Duplicate, Assign agents and Archive lock for
 * Lite too: reassigning agents or archiving changes the campaign. Lite keeps
 * only the number fixes, which are phone-number management. View-only reads
 * and exports only.
 */
export function salesDialerLocks(license?: License) {
  const both = forBoth(license);
  return {
    createCampaign: both,
    startDialing: both,
    edit: both,
    duplicate: both,
    assignAgents: both,
    archive: both,
    reviewFixes: forViewOnly(license),
  };
}

/**
 * Phone Numbers. The list, search, filters and export stay open to both —
 * knowing which numbers exist and who they're shared with is reading, not
 * managing. Adding, porting, editing settings and duplicating are number
 * management: Lite keeps them, View-only doesn't, matching Team Members.
 * Deleting is number management too — the permissions sheet includes it for
 * Lite — so it follows the same rule.
 */
export function phoneNumberLocks(license?: License) {
  const manage = forViewOnly(license);
  return {
    addNumber: manage,
    portNumber: manage,
    edit: manage,
    duplicate: manage,
    remove: manage,
  };
}

/**
 * Live Monitoring: both licenses can open the page; View-only can't act on a
 * call. Lite can listen and whisper, but Barge — joining the call so the
 * customer hears you — is calling, so it's locked for both.
 */
export function liveMonitoringLocks(license?: License) {
  return { monitor: forViewOnly(license), barge: forBoth(license) };
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
 * Workflows: creating, renaming and publishing Voice workflows is locked for
 * both licenses. The Edit pencil itself stays open — it is the only way to
 * view a workflow. Lite can still delete Voice workflows and manage Sales
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
 * Call Logs: View-only can't archive calls or delete transcripts. There is
 * no call action on a log row, so nothing here is locked for Lite. Playback,
 * transcripts and exports stay open to everyone.
 */
export function callLogsLocks(license?: License) {
  const viewOnly = forViewOnly(license);
  return { archive: viewOnly, deleteTranscript: viewOnly };
}

/**
 * Desktop app — the member's dialer window. It has no admin surfaces at all,
 * so this is only what the permissions sheet lists for "Desktop App": call
 * logs and recordings, contacts (view and filter), inbox threads, and the
 * member's own profile. Everything else on it is calling or sending.
 *
 * - Calling and composing lock for both: the keypad and Call via, call-back
 *   and SMS on log and contact rows, New Message, the reply composer.
 * - Adding a contact is web-app only even for Lite, so the desktop's
 *   add-contact entry points (+, Save contact) lock for both. Editing an
 *   existing contact stays open for Lite; View-only can't edit.
 * - The conversation actions the desktop has (close, delete, mark as
 *   unread) stay open for Lite; View-only reads threads only.
 * - An opened call log reads for both. Rating, disposition and notes edit
 *   the record, and Block / Add to DNC are the DNM / DND / blacklist row —
 *   all open for Lite, locked for View-only.
 */
export function desktopAppLocks(license?: License) {
  const both = forBoth(license);
  const viewOnly = forViewOnly(license);
  return {
    dialer: both,
    call: both,
    sms: both,
    newMessage: both,
    composer: both,
    addContact: both,
    editContact: viewOnly,
    conversation: viewOnly,
    logDetails: viewOnly,
    blockNumber: viewOnly,
  };
}

export type DesktopAppLocks = ReturnType<typeof desktopAppLocks>;

/**
 * Mobile app — the member's phone. Same idea as the desktop: no admin
 * surface, so only what the permissions sheet lists for "Mobile App" opens —
 * recents and recordings, contacts (view and filter), SMS threads, profile.
 *
 * - Calling and composing lock for both: the keypad, every call and SMS
 *   shortcut, New message (+), the composer and its tools.
 * - Adding a contact is web app only — locked for both here. Editing an
 *   existing contact stays open for Lite, as on desktop; View-only can't.
 *   Archiving calls is web app only too, but the app has no archive action,
 *   and opening the archived list is just viewing call logs, so it stays open.
 * - The conversation actions the sheet puts on mobile — assign, close,
 *   archive, mark unread, DNM, DND, blacklist, tags — stay open for Lite.
 *   View-only reads threads only.
 * - An opened call reads for both, recording included. Disposition, rating
 *   and notes edit the record — Lite keeps them, as on desktop. Transcripts
 *   are web app only on the sheet, so View call transcript locks for both.
 */
export function mobileAppLocks(license?: License) {
  const both = forBoth(license);
  const viewOnly = forViewOnly(license);
  return {
    dialer: both,
    call: both,
    sms: both,
    newMessage: both,
    composer: both,
    addContact: both,
    editContact: viewOnly,
    conversation: viewOnly,
    logDetails: viewOnly,
    transcript: both,
  };
}

export type MobileAppLocks = ReturnType<typeof mobileAppLocks>;

/**
 * AI Voice Agent — Agents and Knowledge Base. The permissions sheet gives
 * Lite full access to both (subject to AIVA being on for the account) and
 * View-only none, so this is one switch: View-only can open both lists, see
 * every agent's numbers, status and analytics, and every knowledge base's
 * assignments — and nothing that creates, changes, tests or buys.
 *
 * Testing an agent counts as acting rather than reading: it spends the
 * account's AIVA minutes like a live call does.
 */
export function aiVoiceAgentLocks(license?: License) {
  const manage = forViewOnly(license);
  return {
    create: manage,
    edit: manage,
    toggleStatus: manage,
    test: manage,
    buyMinutes: manage,
  };
}

export type AiVoiceAgentLocks = ReturnType<typeof aiVoiceAgentLocks>;

/**
 * Sales Dialer mobile app — a separate app from JustCall's, built around
 * running campaigns. The permissions sheet's Sales Dialer rows put only the
 * campaign list and campaign analytics on mobile, and keep creating, editing,
 * launching and managing a campaign's contacts from both licenses. So almost
 * everything that acts here locks for both, and the two licenses differ only
 * on an opened call.
 *
 * - Start / Resume / Re-run launch a campaign: locked for both.
 * - Campaign Settings and Contacts Lists are where a campaign is edited and
 *   its contacts managed: locked for both. Archive changes the campaign, as
 *   on the web's Sales Dialer page: locked for both.
 * - Analytics, the dashboard and the call list read: open to both.
 * - The Settings tab is dialer configuration (cool-off, data centre) and
 *   call forwarding. "Edit settings" is web app only on the sheet even for
 *   Lite, and forwarding is calling, so every control there locks for both.
 *   Logout stays open.
 * - An opened call reads for both. Notes, disposition and rating edit the
 *   record — Lite keeps them, as on the JustCall app; View-only doesn't.
 */
export function salesDialerAppLocks(license?: License) {
  const both = forBoth(license);
  return {
    runCampaign: both,
    campaignSettings: both,
    contactLists: both,
    archiveCampaign: both,
    settings: both,
    logDetails: forViewOnly(license),
  };
}

export type SalesDialerAppLocks = ReturnType<typeof salesDialerAppLocks>;
