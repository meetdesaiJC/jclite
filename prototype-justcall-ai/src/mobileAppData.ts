/**
 * Fixtures for the mobile app prototype — the member's phone as a Lite or
 * View-only user sees it. Numbers, names and tags follow the production
 * screenshots the user shared, so the walkthrough reads like the real app.
 */

export type MobileRecent = {
  id: string;
  number: string;
  /** Shown under the headline — the same number until a contact is saved. */
  subline: string;
  day: string;
  time: string;
  /** Talk time, played from the row. Missed calls have none. */
  duration?: string;
  missed?: boolean;
  voicemail?: boolean;
  /** The member's JustCall number the call went through. */
  line: string;
};

export const MOBILE_RECENTS: MobileRecent[] = [
  { id: "r1", number: "17126257333", subline: "17126257333", day: "Today", time: "02:05 PM", duration: "20s", line: "12089658288" },
  { id: "r2", number: "13186129980", subline: "13186129980", day: "Today", time: "02:03 PM", duration: "1m 10s", line: "12089658288" },
  { id: "r3", number: "19097862014", subline: "19097862014", day: "Yesterday", time: "06:41 PM", missed: true, line: "12089658288" },
  { id: "r4", number: "12084666567", subline: "12084666567", day: "Yesterday", time: "11:12 AM", missed: true, voicemail: true, duration: "32s", line: "12089658288" },
];

export type MobileContact = {
  id: string;
  name: string;
  number: string;
  initials: string;
  company?: string;
  email?: string;
  blacklisted?: boolean;
};

export const MOBILE_CONTACTS: MobileContact[] = [
  { id: "c1", name: "test123 test123", number: "919113475888", initials: "TT", company: "jhjdfhj", blacklisted: true },
  { id: "c2", name: "+19097862014", number: "19097862014", initials: "+" },
  { id: "c3", name: "Evans Bediako", number: "233267883069", initials: "EB" },
  { id: "c4", name: "New Contact1", number: "9953238282", initials: "NC" },
  { id: "c5", name: "Anchal Siwag", number: "917060795865", initials: "AS", company: "Trackier", email: "anchal@trackier.com" },
  { id: "c6", name: "New JustCall Contact", number: "12562861859", initials: "NJ", company: "Justcall.io" },
  { id: "c7", name: "Mann Woow", number: "40201202021", initials: "MW", company: "JustCall" },
];

export const MOBILE_TEAM: MobileContact[] = [
  { id: "t1", name: "Johnn Smith", number: "Ext. 101", initials: "JS" },
  { id: "t2", name: "Aditi Desai", number: "Ext. 102", initials: "AD" },
  { id: "t3", name: "Priya Rao", number: "Ext. 104", initials: "PR" },
];

/** Tag tones as production draws them: solid dark, solid blue, orange, soft. */
export type MobileTagTone = "dark" | "blue" | "orange" | "soft";

export type MobileThread = {
  id: string;
  number: string;
  preview: string;
  date: string;
  /** Double tick = delivered, single = sent. */
  delivered: boolean;
  tags: { label: string; tone: MobileTagTone }[];
  /** Tags past the first three collapse into "+N", as in production. */
  moreTags?: number;
  assignee: string;
  messages: { id: string; text: string; time: string; delivered: boolean }[];
  /** A system line between messages, e.g. an assignment. */
  event?: { afterId: string; text: string };
};

export const MOBILE_THREADS: MobileThread[] = [
  {
    id: "s1",
    number: "918700437813",
    preview: "ewrfvl;rgkpbi",
    date: "18 Nov",
    delivered: true,
    tags: [
      { label: "FIFTEEN RRR", tone: "dark" },
      { label: "SIXTEEN", tone: "dark" },
      { label: "SEVENTEEN", tone: "blue" },
    ],
    moreTags: 8,
    assignee: "Johnn Smith",
    messages: [{ id: "a", text: "ewrfvl;rgkpbi", time: "10:02", delivered: true }],
  },
  {
    id: "s2",
    number: "15799988634",
    preview: "Hello",
    date: "12 Nov",
    delivered: false,
    tags: [],
    assignee: "Johnn Smith",
    messages: [
      { id: "a", text: "HELP", time: "12:37", delivered: true },
      { id: "b", text: "Hello", time: "12:37", delivered: false },
    ],
    event: { afterId: "a", text: "Assigned to Johnn Smith" },
  },
  {
    id: "s3",
    number: "61483929250",
    preview: "Yo Testing AU Number...",
    date: "12 Nov",
    delivered: true,
    tags: [],
    assignee: "Johnn Smith",
    messages: [{ id: "a", text: "Yo Testing AU Number from the Sydney line", time: "09:14", delivered: true }],
  },
  {
    id: "s4",
    number: "18129944916",
    preview: "test",
    date: "5 Nov",
    delivered: true,
    tags: [],
    assignee: "Johnn Smith",
    messages: [{ id: "a", text: "test", time: "16:20", delivered: true }],
  },
  {
    id: "s5",
    number: "919625330051",
    preview: "hey",
    date: "11 Oct",
    delivered: true,
    tags: [
      { label: "???", tone: "orange" },
      { label: "SADASDS", tone: "soft" },
      { label: "5834U", tone: "dark" },
      { label: "ABCXYZ", tone: "soft" },
    ],
    assignee: "Johnn Smith",
    messages: [{ id: "a", text: "hey", time: "13:05", delivered: true }],
  },
];

export const MOBILE_INBOX = { name: "SMS DONT REMOVE", number: "16073256200" };

/** The AI read-out every answered call in the prototype shares. */
export const MOBILE_CALL_INSIGHTS = {
  summary:
    "1. Caller requested transfer to a representative, but the clinic agent stated they cannot transfer calls and can only help with scheduling/intake; caller declined and ended the call.",
  chapters: [
    { id: "ch1", range: "00:00 - 00:10", title: "Introduction and Caller Identification" },
    { id: "ch2", range: "00:10 - 00:32", title: "Request to Speak with a Representative" },
    { id: "ch3", range: "00:32 - 00:58", title: "Scheduling Options Offered" },
    { id: "ch4", range: "00:58 - 01:10", title: "Caller Declines and Ends Call" },
  ],
  actionItems: [
    "Have a representative call the caller back about their transfer request",
    "Share the clinic's scheduling link by SMS",
  ],
};
