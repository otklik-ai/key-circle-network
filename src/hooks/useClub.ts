import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Profile } from "@/lib/club";

export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      return data.user ?? null;
    },
    staleTime: 60_000,
  });
}

export function useMyProfile() {
  return useQuery({
    queryKey: ["my-profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return null;
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", auth.user.id).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
}

/** The member's own private answers (age bracket, family, the note to the team). */
export function useMyPrivateAnswers() {
  return useQuery({
    queryKey: ["my-private-answers"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return {};
      const { data, error } = await supabase.from("profile_private").select("answers").eq("user_id", auth.user.id).maybeSingle();
      if (error) throw error;
      return (data?.answers ?? {}) as Record<string, unknown>;
    },
  });
}

export function useIsAdmin() {
  return useQuery({
    queryKey: ["is-admin"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return false;
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", auth.user.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("onboarding_complete", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Profile[];
    },
  });
}

/** Resolves private storage paths to short-lived viewable URLs. */
export function useAvatarUrls(paths: (string | null | undefined)[]) {
  const clean = Array.from(new Set(paths.filter((p): p is string => !!p)));
  return useQuery({
    queryKey: ["avatar-urls", clean],
    enabled: clean.length > 0,
    staleTime: 50 * 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("avatars").createSignedUrls(clean, 3600);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const item of data) if (item.path && item.signedUrl) map[item.path] = item.signedUrl;
      return map;
    },
  });
}
