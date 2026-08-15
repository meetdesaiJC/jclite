import * as React from "react";
import { Dropdown, type DropdownListItem } from "@/components/Dropdown";

export interface AssignTeamAndGroupsProps {
  members: DropdownListItem[];
  groups: DropdownListItem[];
  selectedMembers: string[];
  selectedGroups: string[];
  onMembersChange: (value: string[]) => void;
  onGroupsChange: (value: string[]) => void;
  /**
   * "card" is the standalone sidebar panel (bordered box, field labels).
   * "summary" renders bare dropdowns for use under externally-provided dt labels, e.g. inside
   * the publish confirmation modal.
   */
  variant?: "card" | "summary";
}

export function AssignTeamAndGroups({
  members,
  groups,
  selectedMembers,
  selectedGroups,
  onMembersChange,
  onGroupsChange,
  variant = "card",
}: AssignTeamAndGroupsProps) {
  const isCard = variant === "card";

  const membersDropdown = (
    <Dropdown
      label={isCard ? "Assign team members" : undefined}
      placeholder="Search team members"
      searchPlaceholder="Search team members"
      options={members}
      multiple
      searchable
      maxVisibleTags={1}
      value={selectedMembers}
      onValueChange={(value) => onMembersChange(Array.isArray(value) ? value : [value])}
    />
  );

  const groupsDropdown = (
    <Dropdown
      label={isCard ? "Assign user groups" : undefined}
      placeholder="Search user groups"
      searchPlaceholder="Search user groups"
      options={groups}
      multiple
      searchable
      maxVisibleTags={1}
      value={selectedGroups}
      onValueChange={(value) => onGroupsChange(Array.isArray(value) ? value : [value])}
    />
  );

  if (!isCard) {
    return (
      <>
        <div>
          <dt className="text-label-sm text-muted-foreground">Team members</dt>
          <dd className="mt-1.5">{membersDropdown}</dd>
        </div>
        <div>
          <dt className="text-label-sm text-muted-foreground">User groups</dt>
          <dd className="mt-1.5">{groupsDropdown}</dd>
        </div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-line bg-white p-4">
      {membersDropdown}
      {groupsDropdown}
    </div>
  );
}
