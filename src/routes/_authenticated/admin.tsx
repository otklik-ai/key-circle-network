import { createFileRoute, redirect } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import { generateInviteKey, inviteMessage, type Invite, type SearchRequest } from "@/lib/club";
import { sendInviteEmail } from "@/lib/invites.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.rpc("has_role", { _user_id: context.user.id, _role: "admin" });
    if (!data) throw redirect({ to: "/directory" });
  },
  head: () => ({ meta: [{ title: "Admin — The Circle" }] }),
  component: Admin,
});

type Tab = "invites" | "review" | "requests" | "analytics";

function Admin() {
  const [tab, setTab] = useState<Tab>("invites");
  return (
    <AppShell wide>
      <p className="eyebrow">Admin</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight">The back room.</h1>
      <div className="mt-6 flex gap-2 border-b border-foreground/10">
        {(["invites", "review", "requests", "analytics"] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm capitalize ${tab === t ? "border-antique text-foreground" : "border-transparent text-foreground/50"}`}
          >
            {t === "requests" ? "Open requests" : t === "review" ? "Profiles to review" : t}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "invites" && <Invites />}
        {tab === "review" && <Review />}
        {tab === "requests" && <Requests />}
        {tab === "analytics" && <Analytics />}
      </div>
    </AppShell>
  );
}

function Invites() {
  const qc = useQueryClient();
  const [f, setF] = useState({ invited_name: "", email: "", note: "", industry_hint: "", location_hint: "", grants_admin: false });
  const [last, setLast] = useState<Invite | null>(null);

  const invites = useQuery({
    queryKey: ["invites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("invites").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      return data as Invite[];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("invites")
        .insert({
          key: generateInviteKey(),
          email: f.email.trim() || null,
          invited_name: f.invited_name.trim() || null,
          note: f.note.trim() || null,
          industry_hint: f.industry_hint.trim() || null,
          location_hint: f.location_hint.trim() || null,
          grants_admin: f.grants_admin,
          created_by: auth.user!.id,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Invite;
    },
    onSuccess: (inv) => {
      setLast(inv);
      setF({ invited_name: "", email: "", note: "", industry_hint: "", location_hint: "", grants_admin: false });
      qc.invalidateQueries({ queryKey: ["invites"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("invites").update({ status: "revoked" }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["invites"] }),
  });

  const sendMail = useMutation({
    mutationFn: async (id: string) => {
      const res = await sendInviteEmail({ data: { inviteId: id, origin: window.location.origin } });
      return res;
    },
    onSuccess: (res) => {
      if (res.sent) toast.success(`Invitation sent to ${res.email}.`);
      else toast.info("This address has opted out of emails, so nothing was sent.");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const link = (key: string) => `${window.location.origin}/join?key=${key}`;
  const copy = async (text: string, what: string) => {
    await navigator.clipboard.writeText(text);
    toast.success(`${what} copied.`);
  };

  return (
    <div className="grid gap-8 lg:grid-cols-[22rem_1fr]">
      <form
        className="stone-card h-fit p-6"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <h2 className="font-serif text-2xl">Issue an invitation</h2>
        <div className="mt-4 space-y-3">
          <input className="field" placeholder="Name" value={f.invited_name} onChange={(e) => setF({ ...f, invited_name: e.target.value })} />
          <input className="field" type="email" placeholder="Email (optional)" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
          <div className="grid grid-cols-2 gap-2">
            <input className="field" placeholder="Industry" value={f.industry_hint} onChange={(e) => setF({ ...f, industry_hint: e.target.value })} />
            <input className="field" placeholder="City" value={f.location_hint} onChange={(e) => setF({ ...f, location_hint: e.target.value })} />
          </div>
          <textarea className="field min-h-20" placeholder="Personal note shown on the welcome screen" value={f.note} onChange={(e) => setF({ ...f, note: e.target.value })} />
          <label className="flex items-center gap-2 text-xs text-foreground/60">
            <input type="checkbox" checked={f.grants_admin} onChange={(e) => setF({ ...f, grants_admin: e.target.checked })} />
            Make this person an admin (chapter head)
          </label>
        </div>
        <button type="submit" className="btn-ink mt-4 w-full" disabled={create.isPending}>
          {create.isPending ? "Creating…" : "Create key"}
        </button>

        {last && (
          <div className="mt-5 rounded-xl bg-secondary p-4">
            <p className="label-caps">New key</p>
            <p className="mt-1 font-mono text-lg tracking-wider">{last.key}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" className="btn-outline px-3 py-1.5 text-xs" onClick={() => copy(link(last.key), "Link")}>
                Copy link
              </button>
              <button
                type="button"
                className="btn-outline px-3 py-1.5 text-xs"
                onClick={() => copy(inviteMessage({ name: last.invited_name, key: last.key, link: link(last.key), note: last.note }), "Invitation text")}
              >
                Copy invitation text
              </button>
              {last.email && (
                <>
                  <button
                    type="button"
                    className="btn-outline px-3 py-1.5 text-xs"
                    disabled={sendMail.isPending}
                    onClick={() => sendMail.mutate(last.id)}
                  >
                    {sendMail.isPending ? "Sending…" : "Send by email"}
                  </button>
                  <a
                    className="btn-outline px-3 py-1.5 text-xs"
                    href={`mailto:${last.email}?subject=${encodeURIComponent("An invitation to The Circle")}&body=${encodeURIComponent(
                      inviteMessage({ name: last.invited_name, key: last.key, link: link(last.key), note: last.note }),
                    )}`}
                  >
                    Open in email
                  </a>
                </>
              )}
            </div>
          </div>
        )}
      </form>

      <div>
        <h2 className="font-serif text-2xl">Issued keys</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left label-caps">
              <tr>
                <th className="py-2 pr-4 font-medium">Key</th>
                <th className="py-2 pr-4 font-medium">For</th>
                <th className="py-2 pr-4 font-medium">Status</th>
                <th className="py-2 pr-4 font-medium">Created</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-foreground/8">
              {invites.data?.map((i) => (
                <tr key={i.id}>
                  <td className="py-2 pr-4 font-mono text-xs">{i.key}</td>
                  <td className="py-2 pr-4">
                    {i.invited_name ?? "—"}
                    <span className="block text-xs text-foreground/45">{[i.email, i.industry_hint, i.location_hint].filter(Boolean).join(" · ")}</span>
                  </td>
                  <td className="py-2 pr-4">
                    <span className={`chip ${i.status === "used" ? "text-antique" : ""}`}>{i.status}</span>
                    {i.grants_admin && <span className="chip ml-1">admin</span>}
                  </td>
                  <td className="py-2 pr-4 text-xs text-foreground/50">{new Date(i.created_at).toLocaleDateString()}</td>
                  <td className="py-2 text-right whitespace-nowrap">
                    {i.status === "pending" && (
                      <>
                        <button type="button" className="text-xs underline underline-offset-4" onClick={() => copy(link(i.key), "Link")}>
                          Copy link
                        </button>
                        {i.email && (
                          <button
                            type="button"
                            className="ml-3 text-xs underline underline-offset-4 disabled:opacity-40"
                            disabled={sendMail.isPending}
                            onClick={() => sendMail.mutate(i.id)}
                          >
                            Send
                          </button>
                        )}
                        <button type="button" className="ml-3 text-xs text-destructive" onClick={() => revoke.mutate(i.id)}>
                          Revoke
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Review() {
  const qc = useQueryClient();
  const held = useQuery({
    queryKey: ["held-profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, one_liner, call_about, background, focus_now, offering, seeking_people_note, flagged_fields, review_status")
        .eq("review_status", "held")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const decide = useMutation({
    mutationFn: async (r: { id: string; status: "approved" | "held" }) => {
      const { error } = await supabase.from("profiles").update({ review_status: r.status }).eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated.");
      qc.invalidateQueries({ queryKey: ["held-profiles"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div>
      <p className="text-sm text-foreground/55">
        Profiles whose answers mention figures, valuations or returns. They stay out of the directory until you approve them.
      </p>
      <ul className="mt-4 divide-y divide-foreground/8">
        {held.data?.length === 0 && <li className="py-4 text-sm text-foreground/50">Nothing waiting.</li>}
        {held.data?.map((p) => (
          <li key={p.id} className="py-5">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <p className="font-serif text-2xl">{p.full_name}</p>
                <p className="text-xs text-foreground/50">{p.email}</p>
              </div>
              <button type="button" className="btn-ink px-3 py-2" onClick={() => decide.mutate({ id: p.id, status: "approved" })}>
                Approve and publish
              </button>
            </div>
            {p.flagged_fields.length > 0 && (
              <p className="mt-2 text-xs text-antique">Flagged answers: {p.flagged_fields.join(", ")}</p>
            )}
            <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
              {[
                ["In one sentence", p.one_liner],
                ["Call them about", p.call_about],
                ["Background", p.background],
                ["Focused on", p.focus_now],
                ["Can offer", p.offering],
                ["Would like to meet", p.seeking_people_note],
              ].map(([l, val]) =>
                val ? (
                  <div key={l as string}>
                    <dt className="label-caps">{l}</dt>
                    <dd className="mt-1 whitespace-pre-line text-foreground/80">{val}</dd>
                  </div>
                ) : null,
              )}
            </dl>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Requests() {
  const qc = useQueryClient();
  const reqs = useQuery({
    queryKey: ["search-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.from("search_requests").select("*").order("created_at", { ascending: false }).limit(200);
      if (error) throw error;
      const ids = Array.from(new Set(data.map((r) => r.user_id)));
      const { data: profs } = ids.length ? await supabase.from("profiles").select("user_id, full_name, email").in("user_id", ids) : { data: [] };
      const by = Object.fromEntries((profs ?? []).map((p) => [p.user_id, p]));
      return data.map((r) => ({ ...(r as SearchRequest), who: by[r.user_id] }));
    },
  });
  const update = useMutation({
    mutationFn: async (r: { id: string; status?: string; admin_notes?: string }) => {
      const { id, ...rest } = r;
      const { error } = await supabase.from("search_requests").update(rest).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["search-requests"] }),
  });

  return (
    <div>
      <p className="text-sm text-foreground/55">Searches where the assistant found nobody. Handle them personally, then close.</p>
      <ul className="mt-4 divide-y divide-foreground/8">
        {reqs.data?.length === 0 && <li className="py-4 text-sm text-foreground/50">Nothing open. Lovely.</li>}
        {reqs.data?.map((r) => (
          <li key={r.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_16rem_auto] sm:items-start">
            <div>
              <p className="font-serif text-xl">“{r.query}”</p>
              <p className="mt-1 text-xs text-foreground/50">
                {r.who?.full_name ?? "Member"} · {r.who?.email} · {new Date(r.created_at).toLocaleString()}
              </p>
            </div>
            <textarea
              className="field min-h-16 text-xs"
              placeholder="Notes"
              defaultValue={r.admin_notes ?? ""}
              onBlur={(e) => e.target.value !== (r.admin_notes ?? "") && update.mutate({ id: r.id, admin_notes: e.target.value })}
            />
            <button
              type="button"
              className={r.status === "open" ? "btn-ink px-3 py-2" : "btn-outline px-3 py-2"}
              onClick={() => update.mutate({ id: r.id, status: r.status === "open" ? "closed" : "open" })}
            >
              {r.status === "open" ? "Mark handled" : "Reopen"}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Analytics() {
  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: async () => {
      const [members, pending, used, openReqs, friends, convs, msgs, byCountry] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("onboarding_complete", true),
        supabase.from("invites").select("id", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("invites").select("id", { count: "exact", head: true }).eq("status", "used"),
        supabase.from("search_requests").select("id", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("friendships").select("id", { count: "exact", head: true }).eq("status", "accepted"),
        supabase.from("conversations").select("id", { count: "exact", head: true }),
        supabase.from("messages").select("id", { count: "exact", head: true }),
        supabase.from("profiles").select("country, industries").eq("onboarding_complete", true),
      ]);
      const countries: Record<string, number> = {};
      const industries: Record<string, number> = {};
      for (const p of byCountry.data ?? []) {
        if (p.country) countries[p.country] = (countries[p.country] ?? 0) + 1;
        for (const i of p.industries) industries[i] = (industries[i] ?? 0) + 1;
      }
      const top = (o: Record<string, number>) => Object.entries(o).sort((a, b) => b[1] - a[1]).slice(0, 8);
      return {
        members: members.count ?? 0,
        pending: pending.count ?? 0,
        used: used.count ?? 0,
        openReqs: openReqs.count ?? 0,
        friends: friends.count ?? 0,
        convs: convs.count ?? 0,
        msgs: msgs.count ?? 0,
        countries: top(countries),
        industries: top(industries),
      };
    },
  });
  const s = stats.data;
  if (!s) return <p className="text-sm text-foreground/50">Loading…</p>;
  const tiles = [
    ["Members", s.members],
    ["Keys outstanding", s.pending],
    ["Keys used", s.used],
    ["Open requests", s.openReqs],
    ["Friendships", s.friends],
    ["Conversations", s.convs],
    ["Messages sent", s.msgs],
  ] as const;
  return (
    <div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {tiles.map(([l, v]) => (
          <div key={l} className="stone-card p-5">
            <div className="font-serif text-4xl leading-none">{v}</div>
            <div className="mt-2 label-caps">{l}</div>
          </div>
        ))}
      </div>
      <div className="mt-8 grid gap-8 sm:grid-cols-2">
        <Breakdown title="By country" rows={s.countries} />
        <Breakdown title="By industry" rows={s.industries} />
      </div>
    </div>
  );
}

function Breakdown({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = rows[0]?.[1] ?? 1;
  return (
    <div>
      <h3 className="font-serif text-2xl">{title}</h3>
      <ul className="mt-3 space-y-2">
        {rows.length === 0 && <li className="text-sm text-foreground/50">No data yet.</li>}
        {rows.map(([k, v]) => (
          <li key={k} className="text-sm">
            <div className="flex justify-between">
              <span>{k}</span>
              <span className="text-foreground/50">{v}</span>
            </div>
            <div className="mt-1 h-1 rounded bg-foreground/8">
              <div className="h-1 rounded bg-antique" style={{ width: `${(v / max) * 100}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
