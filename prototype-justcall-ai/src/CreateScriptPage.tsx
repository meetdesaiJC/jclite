import * as React from "react";
import { Button } from "@/components/Button";
import { Dropdown, type DropdownListItem } from "@/components/Dropdown";
import { IconClose, IconPencil } from "@/components/Icon";
import {
  ScriptChecklistEditor,
  type ScriptChecklistItem,
} from "./ScriptChecklistEditor";

/**
 * Create Script — adapted from Knowledge Base create layout (Figma 19:6340).
 * Header: editable script name. Left: team/group assignment. Right: script checklist.
 */

const TEAM_MEMBERS: DropdownListItem[] = [
  { value: "olivia", label: "Olivia Rhye" },
  { value: "phoenix", label: "Phoenix Baker" },
  { value: "lana", label: "Lana Steiner" },
  { value: "demi", label: "Demi Wilkinson" },
  { value: "candice", label: "Candice Wu" },
  { value: "natali", label: "Natali Craig" },
  { value: "drew", label: "Drew Cano" },
];

const USER_GROUPS: DropdownListItem[] = [
  { value: "support", label: "Support" },
  { value: "sales", label: "Sales" },
  { value: "success", label: "Customer Success" },
  { value: "billing", label: "Billing" },
  { value: "ops", label: "Operations" },
];

export interface CreateScriptPageProps {
  onClose: () => void;
  onCreate?: (payload: {
    name: string;
    teamMembers: string[];
    userGroups: string[];
    scripts: ScriptChecklistItem[];
  }) => void;
}

export function CreateScriptPage({ onClose, onCreate }: CreateScriptPageProps) {
  const [name, setName] = React.useState("New script");
  const [editingName, setEditingName] = React.useState(false);
  const [teamMembers, setTeamMembers] = React.useState<string[]>([]);
  const [userGroups, setUserGroups] = React.useState<string[]>([]);
  const [scripts, setScripts] = React.useState<ScriptChecklistItem[]>([]);
  const nameInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (editingName) nameInputRef.current?.select();
  }, [editingName]);

  const canCreate = scripts.length > 0;

  return (
    <main className="flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-white">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-line bg-white px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            className="flex size-8 shrink-0 items-center justify-center rounded-[4px] text-foreground hover:bg-surface-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/24"
          >
            <IconClose size={20} />
          </button>
          <div className="flex min-w-0 items-center gap-1.5">
            {editingName ? (
              <input
                ref={nameInputRef}
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => setEditingName(false)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "Escape") {
                    setEditingName(false);
                  }
                }}
                className="min-w-0 border-0 bg-transparent p-0 text-heading-lg text-foreground outline-none"
                aria-label="Script name"
              />
            ) : (
              <>
                <h1 className="truncate text-heading-lg text-foreground">
                  {name}
                </h1>
                <button
                  type="button"
                  aria-label="Edit script name"
                  onClick={() => setEditingName(true)}
                  className="flex size-6 shrink-0 items-center justify-center rounded-[4px] text-muted-foreground hover:bg-surface-hover hover:text-foreground"
                >
                  <IconPencil size={16} />
                </button>
              </>
            )}
          </div>
        </div>
        <Button
          size="sm"
          disabled={!canCreate}
          onClick={() => {
            if (!canCreate) return;
            onCreate?.({
              name: name.trim() || "New script",
              teamMembers,
              userGroups,
              scripts,
            });
          }}
        >
          Create
        </Button>
      </header>

      <div className="flex min-h-0 flex-1 gap-6 overflow-hidden p-6">
        {/* Left — assignment */}
        <aside className="flex w-[300px] shrink-0 flex-col overflow-auto">
          <div className="flex flex-col gap-4 rounded-lg border border-line bg-white p-4">
            <Dropdown
              label="Assign team members"
              placeholder="Search team members"
              searchPlaceholder="Search team members"
              options={TEAM_MEMBERS}
              multiple
              searchable
              maxVisibleTags={1}
              value={teamMembers}
              onValueChange={(value) =>
                setTeamMembers(Array.isArray(value) ? value : [value])
              }
            />

            <Dropdown
              label="Assign user groups"
              placeholder="Search user groups"
              searchPlaceholder="Search user groups"
              options={USER_GROUPS}
              multiple
              searchable
              maxVisibleTags={1}
              value={userGroups}
              onValueChange={(value) =>
                setUserGroups(Array.isArray(value) ? value : [value])
              }
            />
          </div>
        </aside>

        {/* Right — script checklist */}
        <ScriptChecklistEditor items={scripts} onChange={setScripts} />
      </div>
    </main>
  );
}
