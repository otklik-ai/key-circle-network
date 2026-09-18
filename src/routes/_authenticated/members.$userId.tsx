import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AppShell, Avatar } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrls, useSession } from "@/hooks/useClub";
import { displayLocation, type Profile } from "@/lib/club";

export const Route = createFileRoute("/_authenticated/members/$userId")({
  head: () => ({ meta: [{ title: "Member — The Circle" }] }),
  component: Member,
});

function Member() {
  const { userId } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: me } = useSession();

  const profile = useQuery({
    queryKey: ["member", userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
      if (error) throw error;
      return data as Profile | null;
    },
  });
  const avatar = useAvatarUrls([profile.data?.photo_url]);

  const friendship = useQuery({
    queryKey: ["friendship", userId],
    enabled: !!me,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("friendships")
        .select("*")
        .or(`and(requester_id.eq.${me!.id},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${me!.id})`)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const message = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.rpc("get_or_create_conversation", { _other_user: userId });
      if (error) throw error;
      return data;
    },
    onSuccess: (id) => navigate({ to: "/messages/$conversationId", params: { conversationId: id } }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addFriend = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("friendships").insert({ requester_id: me!.id, addressee_id: userId, status: "pending" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Friend request sent.");
      qc.invalidateQueries({ queryKey: ["friendship", userId] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const respond = useMutation({
    mutationFn: async (status: "accepted" | "rejected") => {
      const { error } = await supabase.from("friendships").update({ status }).eq("id", friendship.data!.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["friendship", userId] }),
  });

  const p = profile.data;
  if (profile.isLoading) return <AppShell><p className="text-sm text-foreground/50">Loading…</p></AppShell>;
  if (!p)
    return (
      <AppShell>
        <p className="text-sm text-foreground/60">This member isn't visible.</p>
        <Link to="/directory" className="mt-4 inline-block text-sm underline underline-offset-4">Back to the directory</Link>
      </AppShell>
    );

  const isMe = me?.id === userId;
  const fr = friendship.data;
  const fs = fr?.status;

  return (
    <AppShell>
      <Link to="/directory" className="text-xs text-foreground/50 hover:text-foreground">← Directory</Link>
      <div className="stone-card rise mt-4 p-6 sm:p-8">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start">
          <Avatar name={p.full_name} url={avatar.data?.[p.photo_url ?? ""]} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="font-serif text-4xl leading-none">{p.full_name}</h1>
            {p.headline && <p className="mt-2 text-sm text-foreground/65">{p.headline}</p>}
            <p className="mt-1 text-sm text-foreground/45">{displayLocation(p)}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {p.industries.map((t) => (
                <span key={t} className="chip">{t}</span>
              ))}
            </div>
            {!isMe && (
              <div className="mt-6 flex flex-wrap gap-2">
                <button type="button" className="btn-ink" onClick={() => message.mutate()} disabled={message.isPending}>
                  Message
                </button>
                {p.call_link ? (
                  <a href={p.call_link} target="_blank" rel="noreferrer" className="btn-outline">
                    Book a call
                  </a>
                ) : (
                  <button type="button" className="btn-outline" onClick={() => message.mutate()}>
                    Ask for a call
                  </button>
                )}
                {!fr && (
                  <button type="button" className="btn-outline" onClick={() => addFriend.mutate()} disabled={addFriend.isPending}>
                    Add as friend
                  </button>
                )}
                {fs === "pending" && fr?.requester_id === me?.id && <span className="self-center text-xs text-foreground/50">Friend request sent</span>}
                {fs === "pending" && fr?.addressee_id === me?.id && (
                  <>
                    <button type="button" className="btn-outline" onClick={() => respond.mutate("accepted")}>Accept friend</button>
                    <button type="button" className="text-xs text-foreground/50" onClick={() => respond.mutate("rejected")}>Decline</button>
                  </>
                )}
                {fs === "accepted" && <span className="self-center text-xs text-antique">Friends</span>}
              </div>
            )}
            {isMe && <Link to="/profile" className="btn-outline mt-6">Edit my profile</Link>}
          </div>
        </div>

        <dl className="mt-8 grid gap-6 border-t border-foreground/10 pt-8 sm:grid-cols-2">
          <Block label="About" value={p.bio} full />
          <Block label="Expertise" value={p.expertise.join(", ")} />
          <Block label="Languages" value={p.languages.join(", ")} />
          <Block label="Passports / residencies" value={p.passports.join(", ")} />
          {p.linkedin_url && (
            <div>
              <dt className="label-caps">LinkedIn</dt>
              <dd className="mt-1 text-sm"><a href={p.linkedin_url} target="_blank" rel="noreferrer" className="underline underline-offset-4">{p.linkedin_url.replace(/^https?:\/\//, "")}</a></dd>
            </div>
          )}
          <Block label="Can offer" value={p.offering} full />
          <Block label="Looking for" value={p.seeking} full />
          <Block label="Current projects" value={p.current_projects} full />
        </dl>
      </div>
    </AppShell>
  );
}

function Block({ label, value, full }: { label: string; value?: string | null; full?: boolean }) {
  if (!value) return null;
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <dt className="label-caps">{label}</dt>
      <dd className="mt-1 text-sm leading-relaxed whitespace-pre-line text-foreground/80">{value}</dd>
    </div>
  );
}
