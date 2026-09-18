import type { Database } from "@/integrations/supabase/types";

export const CLUB_NAME = "The Circle";

export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Invite = Database["public"]["Tables"]["invites"]["Row"];
export type SearchRequest = Database["public"]["Tables"]["search_requests"]["Row"];

export const INDUSTRIES = [
  "Real estate",
  "Private equity",
  "Venture capital",
  "Banking & finance",
  "Crypto & digital assets",
  "Legal",
  "Medicine & healthcare",
  "Education & admissions",
  "Technology",
  "Hospitality",
  "Manufacturing",
  "Energy",
  "Art & culture",
  "Fashion & luxury",
  "Media",
  "Government & policy",
  "Immigration & residency",
  "Family office",
];

export function generateInviteKey() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const part = (n: number) =>
    Array.from({ length: n }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  return `CIRCLE-${part(4)}-${part(4)}`;
}

export function inviteMessage(opts: { name?: string | null; key: string; link: string; note?: string | null }) {
  const greeting = opts.name ? `Dear ${opts.name},` : "Dear friend,";
  return `${greeting}

You have been invited to The Circle — a private, members-only club of friends of friends.

Inside, you will find invitations to by-invitation-only gatherings around the world, and a discreet directory where members find each other by expertise, location and the projects they are working on: real estate, investments, advisors, doctors, lawyers, and the people who simply know how to get things done.

Your personal key: ${opts.key}
Enter it here: ${opts.link}

One key, one person. Please keep it to yourself.${opts.note ? `

${opts.note}` : ""}

Warmly,
The Circle`;
}

export function displayLocation(p: Pick<Profile, "city" | "country">) {
  return [p.city, p.country].filter(Boolean).join(", ");
}

export function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
}
