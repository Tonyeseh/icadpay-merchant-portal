import type { TeamMember } from "@/types";

const now = Date.now();
function isoDaysAgo(days: number) {
  return new Date(now - days * 24 * 60 * 60 * 1000).toISOString();
}

export const initialTeam: TeamMember[] = [
  {
    id: "tm_01",
    name: "Adaeze Okafor",
    email: "adaeze@lagosthreadworks.ng",
    role: "owner",
    status: "active",
    invitedAt: isoDaysAgo(220),
  },
  {
    id: "tm_02",
    name: "Tunde Adekunle",
    email: "tunde@lagosthreadworks.ng",
    role: "admin",
    status: "active",
    invitedAt: isoDaysAgo(180),
  },
  {
    id: "tm_03",
    name: "Yusuf Ibrahim",
    email: "yusuf@lagosthreadworks.ng",
    role: "developer",
    status: "active",
    invitedAt: isoDaysAgo(120),
  },
  {
    id: "tm_04",
    name: "Chioma Eze",
    email: "chioma@lagosthreadworks.ng",
    role: "support",
    status: "invited",
    invitedAt: isoDaysAgo(2),
  },
];
