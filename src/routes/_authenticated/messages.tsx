import { createFileRoute, Link, Outlet, useMatches } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell, Avatar } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrls, useSession } from "@/hooks/useClub";

export const Route = createFileRoute("/_authenticated/messages")({
  head: () => ({ meta: [{ title: "Messages — The Circle" }] }),
  component: Messages,
});

export function useConversations() {
  const { data: me } = useSession();
  return useQuery({
    queryKey: ["conversations"],
    enabled: !!me,
    queryFn: async () => {
      const { data: parts, error } = await supabase.from("conversation_participants").select("conversation_id, user_id");
      if (error) throw error;
      const convIds = Array.from(new Set(parts.map((p) => p.conversation_id)));
      if (convIds.length === 0) return [];
      const others = parts.filter((p) => p.user_id !== me!.id);
      const otherIds = Array.from(new Set(others.map((p) => p.user_id)));
      const [{ data: convs }, { data: profiles }] = await Promise.all([
        supabase.from("conversations").select("id, updated_at").in("id", convIds).order("updated_at", { ascending: false }),
        supabase.from("profiles").select("user_id, full_name, headline, photo_url").in("user_id", otherIds),
      ]);
      const profById = Object.fromEntries((profiles ?? []).map((p) => [p.user_id, p]));
      return (convs ?? []).map((c) => {
        const other = others.find((o) => o.conversation_id === c.id);
        return { id: c.id, updated_at: c.updated_at, other: other ? profById[other.user_id] : undefined };
      });
    },
  });
}

function Messages() {
  const { data: convs = [], isLoading } = useConversations();
  const avatars = useAvatarUrls(convs.map((c) => c.other?.photo_url));
  const matches = useMatches();
  const inThread = matches.some((m) => m.routeId === "/_authenticated/messages/$conversationId");

  return (
    <AppShell wide>
      <div className="grid gap-6 md:grid-cols-[18rem_1fr]">
        <aside className={inThread ? "hidden md:block" : ""}>
          <p className="eyebrow">Messages</p>
          <ul className="mt-4 divide-y divide-foreground/8">
            {isLoading && <li className="py-3 text-sm text-foreground/50">Loading…</li>}
            {!isLoading && convs.length === 0 && (
              <li className="py-3 text-sm text-foreground/55">
                No conversations yet. Start one from a member's page in the{" "}
                <Link to="/directory" className="underline underline-offset-4">directory</Link>.
              </li>
            )}
            {convs.map((c) => (
              <li key={c.id}>
                <Link
                  to="/messages/$conversationId"
                  params={{ conversationId: c.id }}
                  className="flex items-center gap-3 py-3"
                  activeProps={{ className: "flex items-center gap-3 py-3 text-antique" }}
                >
                  <Avatar name={c.other?.full_name ?? "?"} url={avatars.data?.[c.other?.photo_url ?? ""]} size="sm" />
                  <div className="min-w-0">
                    <p className="truncate font-serif text-lg leading-none">{c.other?.full_name ?? "Member"}</p>
                    <p className="mt-1 truncate text-xs text-foreground/50">{c.other?.headline}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
        <section className={inThread ? "" : "hidden md:block"}>
          {inThread ? <Outlet /> : <p className="pt-12 text-center text-sm text-foreground/45">Choose a conversation.</p>}
        </section>
      </div>
    </AppShell>
  );
}
