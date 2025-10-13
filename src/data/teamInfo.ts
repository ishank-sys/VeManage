// Re-created team info data module to satisfy imports in Team.tsx
// Provide static mapping of team members per team lead id; extend as needed.
export interface TeamMember { name: string; role: string }

const defaultMembers: TeamMember[] = [
  { name: 'Ravi Kumar', role: 'Senior Engineer' },
  { name: 'Neha Sharma', role: 'Junior Engineer' },
  { name: 'Amit Patel', role: 'Designer' },
];

// Map lead ID (string) to array of members
const teamMap: Record<string, TeamMember[]> = {
  default: defaultMembers,
  // '12': [ { name: 'Alice Johnson', role: 'Lead Engineer' } ], // example override
};

export function getTeamMembersForLead(leadId: number): TeamMember[] {
  return teamMap[String(leadId)] || teamMap.default || [];
}
