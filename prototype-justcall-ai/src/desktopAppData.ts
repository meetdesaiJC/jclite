/**
 * Fixtures for the desktop app prototype — the member's dialer window as a
 * Lite or View-only user sees it. Numbers and names follow the production
 * screenshots the user shared, so the walkthrough reads like the real app.
 */

export type DesktopCallDirection = "incoming" | "missed" | "outgoing";

export type DesktopCallLog = {
  id: string;
  direction: DesktopCallDirection;
  /** Saved contact name; absent when the number isn't in the directory. */
  name?: string;
  number: string;
  ago: string;
  /** Talk time. Missed calls have none, so they show their outcome instead. */
  duration?: string;
  outcome?: string;
  /** Answered calls carry a recording to play; voicemails carry the message. */
  recording?: boolean;
  voicemail?: boolean;
};

export const DESKTOP_CALL_LOGS: DesktopCallLog[] = [
  { id: "l1", direction: "incoming", number: "441341610153", ago: "33 minutes ago", duration: "09sec", recording: true },
  { id: "l2", direction: "missed", number: "441341610153", ago: "42 minutes ago", outcome: "No answer" },
  { id: "l3", direction: "incoming", number: "441341610153", ago: "43 minutes ago", duration: "31sec", recording: true },
  { id: "l4", direction: "outgoing", name: "New JustCall Contact", number: "16812466046", ago: "An hour ago", duration: "1min 12sec", recording: true },
  { id: "l5", direction: "missed", name: "Shelly Pyakurel", number: "16504517054", ago: "2 hours ago", outcome: "Left voicemail", voicemail: true },
  { id: "l6", direction: "incoming", name: "Shelly Pyakurel", number: "16504517054", ago: "Yesterday", duration: "4min 03sec", recording: true },
  { id: "l7", direction: "missed", number: "12089658288", ago: "Yesterday", outcome: "Left voicemail", voicemail: true },
];

export type DesktopContact = {
  id: string;
  name: string;
  number: string;
  /** Unnamed contacts show a person glyph, not initials made from digits. */
  initials?: string;
  company?: string;
  email?: string;
  /** The CRM this contact syncs from, with the fields it brings across. */
  crm?: { name: string; fields: { label: string; value: string }[] };
};

const HUBSPOT = (owner: string, stage: string) => ({
  name: "Hubspot",
  fields: [
    { label: "Contact owner", value: owner },
    { label: "Lifecycle stage", value: stage },
  ],
});

export const DESKTOP_CONTACTS: DesktopContact[] = [
  { id: "c1", name: "Shelly Pyakurel", number: "16504517054", initials: "SP", company: "Brightwave", email: "shelly@brightwave.io", crm: HUBSPOT("Priya Rao", "Customer") },
  { id: "c2", name: "+ 18189958707", number: "18189958707" },
  { id: "c3", name: "+ 12089658288", number: "12089658288" },
  { id: "c4", name: "New JustCall Contact", number: "16812466046", initials: "NC", company: "Synqnest", email: "ops@synqnest.com", crm: HUBSPOT("Aditi Desai", "Lead") },
  { id: "c5", name: "New JustCall Contact", number: "19288513417", initials: "NC", company: "Synqnest" },
  { id: "c6", name: "New JustCall Contact", number: "17126257333", initials: "NC" },
];

export const DESKTOP_TEAM: DesktopContact[] = [
  { id: "t1", name: "Aditi Desai", number: "Ext. 101", initials: "AD" },
  { id: "t2", name: "Bhavesh Gupta", number: "Ext. 102", initials: "BG" },
  { id: "t3", name: "Priya Rao", number: "Ext. 104", initials: "PR" },
  { id: "t4", name: "Rohan Nair", number: "Ext. 107", initials: "RN" },
];

export const DESKTOP_INBOXES = ["Payments", "Support", "Sales"] as const;

export type DesktopMessage = {
  id: string;
  direction: "in" | "out";
  text: string;
  time: string;
  /** Who sent an outgoing message — an agent's initials, or BOT. */
  by?: string;
};

export type DesktopThread = {
  id: string;
  name: string;
  number: string;
  initials: string;
  preview: string;
  /** The last message was ours — the list marks it with a reply arrow. */
  lastOutgoing: boolean;
  timestamp: string;
  /** The contact's local time, shown under their name. */
  localTime: string;
  unread?: boolean;
  messages: DesktopMessage[];
};

export const DESKTOP_THREADS: DesktopThread[] = [
  {
    id: "m1",
    name: "New JustCall Contact",
    number: "919773110910",
    initials: "NC",
    preview: "How can i help",
    lastOutgoing: true,
    timestamp: "08/04/26 01:33 PM",
    localTime: "04:26 PM",
    messages: [
      { id: "m1a", direction: "in", text: "Hi", time: "08/04/26 01:33 PM" },
      { id: "m1b", direction: "out", text: "How can i help", time: "08/04/26 01:33 PM", by: "BOT" },
      { id: "m1c", direction: "out", text: "Looping in billing now.", time: "08/04/26 01:34 PM", by: "AM" },
      { id: "m1d", direction: "out", text: "They’ll reply here shortly.", time: "08/04/26 01:34 PM", by: "AM" },
    ],
  },
  {
    id: "m2",
    name: "Shelly Pyakurel",
    number: "16504517054",
    initials: "SP",
    preview: "Thanks, the refund came through.",
    lastOutgoing: false,
    timestamp: "08/03/26 11:02 AM",
    localTime: "03:56 AM",
    unread: true,
    messages: [
      { id: "m2a", direction: "out", text: "We've issued the refund — it should land in 3–5 days.", time: "08/03/26 10:40 AM", by: "AM" },
      { id: "m2b", direction: "in", text: "Thanks, the refund came through.", time: "08/03/26 11:02 AM" },
    ],
  },
];
