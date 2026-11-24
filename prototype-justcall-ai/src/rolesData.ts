import { TEAM_MEMBERS, memberLicense } from "./teamMembersData";

/**
 * Teams › Roles & Permissions fixtures. The first rows are the live page's,
 * with the two license roles slotted in after the other built-ins so every
 * role the account can't edit sits together at the top.
 */
export interface Role {
  id: string;
  name: string;
  /** Members holding the role, by name — the avatar stack reads initials off them. */
  members: string[];
  updated: string;
  /** Ships with the account: it can't be edited, deleted or bulk-selected. */
  builtIn?: boolean;
  /**
   * The role a non-calling license carries. Its permissions are the license's,
   * and members get it by being invited on that license, never by assignment.
   */
  license?: "JC Lite" | "View-only";
}

const OWNER = "Johnn Smith";

const namesFor = (count: number, offset: number) =>
  TEAM_MEMBERS.slice(10 + offset, 10 + offset + count).map((m) => m.name);

/**
 * Read off the same billed seats Team Members and Billing use, so the people
 * in the JC Lite stack are exactly the ones the members table calls Lite.
 */
const licensed = (license: "Lite" | "View-only") =>
  TEAM_MEMBERS.filter((m) => memberLicense(m.id) === license).map((m) => m.name);

const SEED: Role[] = [
  { id: "owner", name: "Account Owner", members: [OWNER], updated: "Nov 6, 2023 8:34 pm", builtIn: true },
  {
    id: "admin",
    name: "Admin",
    members: ["John Nolan", "Sarah Johnson", "Mohit Agarwal", ...namesFor(26, 0)],
    updated: "Oct 24, 2026 10:24 pm",
    builtIn: true,
  },
  {
    id: "team-member",
    name: "Team Member",
    members: ["Mohit Singh", "Johnn Smith", "Aarav Patel", ...namesFor(5, 30)],
    updated: "Nov 16, 2026 3:22 am",
    builtIn: true,
  },
  {
    id: "jc-lite",
    name: "JC Lite",
    members: licensed("Lite"),
    updated: "Nov 6, 2023 8:34 pm",
    builtIn: true,
    license: "JC Lite",
  },
  {
    id: "view-only",
    name: "View-only",
    members: licensed("View-only"),
    updated: "Nov 6, 2023 8:34 pm",
    builtIn: true,
    license: "View-only",
  },
  { id: "c1", name: "Admin _234ae", members: ["Sourav Das"], updated: "Jul 13, 2026 10:01 pm" },
  { id: "c2", name: "Admin _234ae _62399", members: [], updated: "Jun 23, 2026 1:34 am" },
  { id: "c3", name: "Admin _234ae _6df09", members: [], updated: "Jun 5, 2026 2:34 am" },
  { id: "c4", name: "Admin _234ae _c7af7", members: [], updated: "Oct 8, 2026 12:29 am" },
  { id: "c5", name: "Admin _c2c9e", members: [], updated: "Jul 6, 2025 9:51 pm" },
];

const MORE = [
  "AEs - Team lead",
  "Migrated Team Member",
  "SMS test",
  "Workflow Test Role",
  "Supervisor",
  "Support Agent",
  "Billing Manager",
  "QA Reviewer",
];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];

/**
 * 70 roles — the live page's 68 plus the two license roles. The tail is
 * generated deterministically so pagination always shows the same rows.
 */
export const ROLES: Role[] = [
  ...SEED,
  ...Array.from({ length: 70 - SEED.length }, (_, i): Role => {
    const base = MORE[i % MORE.length];
    const round = Math.floor(i / MORE.length);
    return {
      id: `g${i}`,
      name: round === 0 ? base : `${base} ${round + 1}`,
      members: i % 3 === 0 ? [] : namesFor((i % 4) + 1, 40 + i * 2),
      updated: `${MONTHS[i % MONTHS.length]} ${(i % 27) + 1}, 2026 ${(i % 11) + 1}:${String((i * 7) % 60).padStart(2, "0")} pm`,
    };
  }),
];

export const ROLE_AUTHOR = OWNER;
