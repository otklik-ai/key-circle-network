import { INDUSTRIES } from "@/lib/club";

export type QType = "text" | "long_text" | "single" | "multi" | "multi_text" | "url" | "list" | "location" | "chapter";

export type Question = {
  /** Form state key; also the profiles column (or private answer key). */
  field: string;
  n: number;
  label: string;
  hint?: string;
  type: QType;
  options?: readonly string[];
  max?: number;
  /** Extra free-text companion field (questions 17 and 18). */
  noteField?: string;
  noteLabel?: string;
  /** Default visibility. */
  vis: "shared" | "private";
  /** No visibility control at all — never shareable. */
  locked?: boolean;
  /** Content rule guidance shown under free-text boxes. */
  guided?: boolean;
  required?: boolean;
  /** Always shared — no visibility control (needed for the directory). */
  fixed?: boolean;
};

export type Section = { id: string; title: string; blurb: string; questions: Question[] };

export const CONTENT_GUIDANCE =
  "Describe what you do and what interests you. Please don't post specific offerings, amounts being raised, valuations, terms, returns or minimum investments.";

export const SECTIONS: Section[] = [
  {
    id: "A",
    title: "Where you are",
    blurb: "So members can find you in the right city, in the right language.",
    questions: [
      { field: "full_name", n: 1, label: "Full name", type: "text", vis: "shared", required: true, fixed: true },
      { field: "location", n: 2, label: "City and country where you are based", type: "location", vis: "shared", required: true, fixed: true },
      { field: "other_cities", n: 3, label: "Other cities where you spend real time each year", hint: "Comma separated", type: "list", vis: "shared" },
      { field: "base_countries", n: 4, label: "Countries where you have a base, work, or run something", hint: "Comma separated", type: "list", vis: "shared" },
      { field: "languages", n: 5, label: "Languages you do business in", hint: "Comma separated", type: "list", vis: "shared" },
      {
        field: "contact_pref",
        n: 6,
        label: "Best ways to reach you",
        hint: "Pick as many as you like",
        type: "multi",
        options: ["In the app", "Email", "WhatsApp", "Telegram", "Through the team"],
        vis: "shared",
      },
    ],
  },
  {
    id: "B",
    title: "What you do",
    blurb: "The professional picture other members see first.",
    questions: [
      { field: "role_org", n: 7, label: "Current role and organisation", type: "text", vis: "shared" },
      { field: "industries", n: 8, label: "Industry and sector", type: "multi", options: INDUSTRIES, vis: "shared" },
      {
        field: "functional_roles",
        n: 9,
        label: "What you are, functionally",
        type: "multi",
        options: [
          "Founder",
          "Operator",
          "Investor",
          "Investor relations",
          "Adviser or consultant",
          "Professional services (legal, tax, accounting)",
          "Family office",
          "Corporate executive",
          "Other",
        ],
        vis: "shared",
      },
      { field: "one_liner", n: 10, label: "In one plain sentence, what you actually do", type: "text", max: 160, vis: "shared", guided: true },
      { field: "call_about", n: 11, label: "What people should call you about", type: "text", max: 200, vis: "shared", guided: true },
      {
        field: "background",
        n: 12,
        label: "Background worth knowing",
        hint: "Previous companies, where you trained, what you built.",
        type: "long_text",
        max: 400,
        vis: "shared",
        guided: true,
      },
      { field: "linkedin_url", n: 13, label: "LinkedIn or website", type: "url", vis: "shared" },
    ],
  },
  {
    id: "C",
    title: "What you are working on now",
    blurb: "This is the part that makes the directory useful. We'll ask you to refresh it every quarter.",
    questions: [
      { field: "focus_now", n: 14, label: "What are you focused on right now?", type: "long_text", max: 300, vis: "shared", guided: true },
      { field: "interested_industries", n: 15, label: "Industries you are actively interested in at the moment", type: "multi", options: INDUSTRIES, vis: "shared" },
      { field: "active_markets", n: 16, label: "Markets or regions you are active in, or moving into", hint: "Comma separated", type: "list", vis: "shared" },
      {
        field: "seeking_people",
        n: 17,
        label: "What kind of people would be useful for you to meet right now?",
        type: "multi_text",
        options: [
          "Founders in my sector",
          "Operators",
          "Professional advisers (legal, tax, accounting)",
          "People who know a specific market",
          "Peers in my function",
          "Potential partners",
          "Potential clients",
        ],
        noteField: "seeking_people_note",
        noteLabel: "Anything more specific",
        vis: "shared",
        guided: true,
      },
      {
        field: "offering_types",
        n: 18,
        label: "What can you offer other members?",
        type: "multi_text",
        options: ["Deal flow", "Professional services", "Market access", "Operating expertise", "Introductions", "Hosting and space"],
        noteField: "offering",
        noteLabel: "In your own words",
        vis: "shared",
        guided: true,
        required: true,
      },
      {
        field: "open_to_contact",
        n: 19,
        label: "Are you open to direct contact from other members?",
        type: "single",
        options: ["Yes", "Through the team first", "Not right now"],
        vis: "shared",
      },
    ],
  },
  {
    id: "D",
    title: "Personal context",
    blurb: "Light and entirely optional. These stay private unless you say otherwise.",
    questions: [
      { field: "age_bracket", n: 20, label: "Age bracket", type: "single", options: ["Under 35", "35–44", "45–54", "55–64", "65+"], vis: "private" },
      {
        field: "family_situation",
        n: 21,
        label: "Family situation, if you want to say",
        type: "single",
        options: ["Partnered", "Single", "Partnered with children", "Children, grown"],
        vis: "private",
      },
      { field: "outside_work", n: 22, label: "What you care about outside work", type: "long_text", max: 300, vis: "shared" },
      {
        field: "private_note",
        n: 23,
        label: "Anything you would like us to know that you would not put in a profile",
        hint: "Only Elena and Julia ever see this. It cannot be shared.",
        type: "long_text",
        vis: "private",
        locked: true,
      },
    ],
  },
  {
    id: "E",
    title: "Chapter",
    blurb: "Chapters are the city gatherings. Someone has to host them.",
    questions: [
      {
        field: "home_chapter_city",
        n: 24,
        label: "Your home chapter, and would you be willing to host or help run one?",
        type: "chapter",
        options: ["Happy to host", "Would help organise", "Attend only"],
        vis: "shared",
      },
    ],
  },
];

export const ALL_QUESTIONS = SECTIONS.flatMap((s) => s.questions);

/** Fields whose answers always live in the private record. */
export const ALWAYS_PRIVATE = ["age_bracket", "family_situation", "private_note"] as const;

const MONEY_WORDS =
  /(raising|raise of|pre-?money|post-?money|valuation|ticket size|minimum ticket|min\.? ticket|minimum investment|irr|roi|multiple on invested|guaranteed return|returns? of|cap table|per annum|% return)/i;
const FIGURES = /([$€£₽¥]\s?\d)|(\d[\d.,]*\s?(k|m|mm|bn|million|billion|thousand)\b)|(\d+(\.\d+)?\s?%)/i;

/** Flags free text that reads like an offering rather than a profile. */
export function flagText(value: string | null | undefined): boolean {
  if (!value) return false;
  return MONEY_WORDS.test(value) || FIGURES.test(value);
}

export function flaggedFields(values: Record<string, unknown>): string[] {
  return ALL_QUESTIONS.filter((q) => {
    if (!q.guided) return false;
    const v = values[q.field];
    const note = q.noteField ? values[q.noteField] : null;
    return flagText(typeof v === "string" ? v : null) || flagText(typeof note === "string" ? note : null);
  }).map((q) => q.label);
}
