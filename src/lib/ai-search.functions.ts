import { createServerFn } from "@tanstack/react-start";
import { createOpenAI } from "@ai-sdk/openai";
import { streamText, Output } from "ai";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

const SearchInput = z.object({ query: z.string().min(3).max(500) });

const ResultSchema = z.object({
  matches: z.array(
    z.object({
      user_id: z.string(),
      reason: z.string(),
    }),
  ),
  summary: z.string(),
});

export const searchMembers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SearchInput.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env["LOVABLE_API_KEY"];
    if (!key) throw new Error("AI search is not configured yet.");

    const { data: profiles, error } = await context.supabase
      .from("profiles")
      .select(
        "user_id, full_name, one_liner, headline, role_org, functional_roles, call_about, background, bio, city, country, other_cities, base_countries, industries, interested_industries, active_markets, languages, focus_now, seeking_people, seeking_people_note, offering_types, offering, open_to_contact, home_chapter_city",
      )
      .eq("onboarding_complete", true)
      .eq("review_status", "approved")
      .neq("user_id", context.userId);
    if (error) throw error;

    if (!profiles || profiles.length === 0) {
      await logRequest(context, data.query, 0);
      return { matches: [], summary: "The directory is still empty — our team will handle this personally.", logged: true };
    }

    const directory = profiles
      .map(
        (p) =>
          `ID: ${p.user_id}\nName: ${p.full_name}\nHeadline: ${p.headline ?? ""}\nLocation: ${[p.city, p.country].filter(Boolean).join(", ")}\nIndustries: ${p.industries.join(", ")}\nExpertise: ${p.expertise.join(", ")}\nPassports: ${p.passports.join(", ")}\nLanguages: ${p.languages.join(", ")}\nOffers: ${p.offering ?? ""}\nSeeking: ${p.seeking ?? ""}\nProjects: ${p.current_projects ?? ""}\nAbout: ${p.bio ?? ""}`,
      )
      .join("\n\n---\n\n");

    const lovable = createOpenAI({
      baseURL: "https://ai.gateway.lovable.dev/v1",
      apiKey: key,
      headers: { "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
    });

    const result = streamText({
      model: lovable.responses("openai/gpt-6-astra"),
      output: Output.object({ schema: ResultSchema }),
      system: `You are the discreet concierge of a private members' club. A member describes who they are looking for. From the directory, pick ONLY members who genuinely fit (expertise, industry, location, passports, what they offer). Return at most 8 matches, best first. If nobody fits, return an empty list. Give a one-sentence reason per match written to the searching member ("Runs a real-estate fund in Tbilisi and has done deals in Batumi"). Keep the summary to one or two warm, concise sentences. Never invent facts not in the directory.`,
      prompt: `Request: ${data.query}\n\nDirectory:\n\n${directory}`,
      providerOptions: {
        openai: {
          forceReasoning: true,
          reasoningEffort: "low",
          reasoningSummary: "auto",
          store: false,
          include: ["reasoning.encrypted_content"],
        },
      },
    });

    const output = await result.output;
    const validIds = new Set(profiles.map((p) => p.user_id));
    const matches = output.matches.filter((m) => validIds.has(m.user_id));

    let logged = false;
    if (matches.length === 0) {
      await logRequest(context, data.query, 0);
      logged = true;
    }

    return { matches, summary: output.summary, logged };
  });

async function logRequest(
  context: { supabase: SupabaseClient<Database>; userId: string },
  query: string,
  count: number,
) {
  const { error } = await context.supabase
    .from("search_requests")
    .insert({ user_id: context.userId, query, result_count: count, status: "open" });
  if (error) console.error("Failed to log search request", error);
}
