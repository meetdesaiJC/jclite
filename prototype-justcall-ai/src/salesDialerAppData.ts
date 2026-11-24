/**
 * Fixtures for the Sales Dialer mobile app prototype. Numbers and names are
 * invented; the shapes follow the shipping app's screens (Dashboard,
 * Campaigns, All Calls, Call Details).
 */

export type SdCampaign = {
  id: string;
  name: string;
  contacts: number;
  assignee: string;
  /** Remaining campaigns resume or start; completed ones re-run. */
  status: "in-progress" | "not-started" | "completed";
  /** For the campaign's own analytics screen. */
  dialled: number;
  answered: number;
  voicemailDrops: number;
  minutes: number;
};

export const SD_AGENT = "Johnn Smith";

export const SD_CAMPAIGNS: SdCampaign[] = [
  { id: "3415600", name: "Test oct 27", contacts: 4, assignee: SD_AGENT, status: "in-progress", dialled: 3, answered: 1, voicemailDrops: 0, minutes: 2 },
  { id: "3397001", name: "Test Campaign - SJ", contacts: 5, assignee: "Sara Jacobs", status: "not-started", dialled: 0, answered: 0, voicemailDrops: 0, minutes: 0 },
  { id: "3396067", name: "Re2: Re: New Campaign", contacts: 3, assignee: SD_AGENT, status: "in-progress", dialled: 2, answered: 0, voicemailDrops: 1, minutes: 0 },
  { id: "3394922", name: "New Campaign", contacts: 50, assignee: SD_AGENT, status: "in-progress", dialled: 6, answered: 0, voicemailDrops: 0, minutes: 0 },
  { id: "3394881", name: "New Campaign", contacts: 12, assignee: SD_AGENT, status: "not-started", dialled: 0, answered: 0, voicemailDrops: 0, minutes: 0 },
  { id: "3413622", name: "New Campaign", contacts: 6, assignee: SD_AGENT, status: "completed", dialled: 6, answered: 2, voicemailDrops: 1, minutes: 4 },
  { id: "3398135", name: "New Campaign", contacts: 5, assignee: SD_AGENT, status: "completed", dialled: 5, answered: 1, voicemailDrops: 0, minutes: 3 },
  { id: "3398131", name: "New Campaign", contacts: 2, assignee: SD_AGENT, status: "completed", dialled: 2, answered: 0, voicemailDrops: 0, minutes: 0 },
  { id: "3396054", name: "Re: New Campaign", contacts: 3, assignee: SD_AGENT, status: "completed", dialled: 3, answered: 1, voicemailDrops: 0, minutes: 1 },
  { id: "3388006", name: "Sep 28", contacts: 8, assignee: SD_AGENT, status: "completed", dialled: 8, answered: 3, voicemailDrops: 2, minutes: 9 },
];

/** The dashboard's period totals, in the order production lists them. */
export const SD_DASHBOARD = {
  successIndex: "0%",
  campaigns: 0,
  contactsCalled: 9,
  answered: 1,
  outboundMinutes: "0m",
  dialled: 11,
  voicemailDrops: 0,
};

/** One point per day on the dashboard chart: dialled (D) and answered (A). */
export const SD_CHART: { day: string; dialled: number; answered: number }[] = [
  { day: "17-Nov-2026", dialled: 10, answered: 1 },
  { day: "18-Nov-2026", dialled: 0, answered: 0 },
  { day: "19-Nov-2026", dialled: 0, answered: 0 },
  { day: "20-Nov-2026", dialled: 0, answered: 0 },
  { day: "21-Nov-2026", dialled: 0, answered: 0 },
  { day: "22-Nov-2026", dialled: 1, answered: 0 },
  { day: "23-Nov-2026", dialled: 0, answered: 0 },
  { day: "24-Nov-2026", dialled: 0, answered: 0 },
];

export type SdCall = {
  id: string;
  contact?: string;
  clientNumber: string;
  callerNumber: string;
  campaign: string;
  when: string;
  duration: string;
  status: string;
  /** Failed and abandoned calls read in the error colour on the list. */
  failed?: boolean;
  disposition?: string;
  notes?: string;
  rating: number;
};

export const SD_CALLS: SdCall[] = [
  { id: "c1", clientNumber: "15125550139", callerNumber: "(469) 414-3613", campaign: "Test oct 27", when: "Yesterday 10:39 PM", duration: "Failed", status: "Abandoned (Agent failed)", failed: true, disposition: "Interested", rating: 4 },
  { id: "c2", contact: "Maria Lopez", clientNumber: "15125550188", callerNumber: "(469) 414-3613", campaign: "Test oct 27", when: "Yesterday 10:31 PM", duration: "1m 42s", status: "Answered", disposition: "Call back later", notes: "Asked for pricing deck", rating: 5 },
  { id: "c3", clientNumber: "15125550102", callerNumber: "(469) 414-3613", campaign: "Re2: Re: New Campaign", when: "Yesterday 10:24 PM", duration: "0m 21s", status: "Voicemail drop", rating: 0 },
  { id: "c4", contact: "Daniel Kim", clientNumber: "16465550147", callerNumber: "(469) 414-3613", campaign: "New Campaign", when: "17 Nov, 4:12 PM", duration: "No answer", status: "Not answered", failed: true, rating: 0 },
  { id: "c5", clientNumber: "16465550193", callerNumber: "(469) 414-3613", campaign: "New Campaign", when: "17 Nov, 4:09 PM", duration: "No answer", status: "Not answered", failed: true, rating: 0 },
  { id: "c6", contact: "Priya Raman", clientNumber: "13125550110", callerNumber: "(469) 414-3613", campaign: "Sep 28", when: "17 Nov, 3:55 PM", duration: "3m 05s", status: "Answered", disposition: "Not interested", rating: 3 },
];

export const SD_DISPOSITIONS = ["Interested", "Not interested", "Call back later", "Wrong number", "Do not call"];
