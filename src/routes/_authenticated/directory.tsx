import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, Avatar } from "@/components/AppShell";
import { useAvatarUrls, useMembers } from "@/hooks/useClub";
import { searchMembers } from "@/lib/ai-search.functions";
import { displayLocation, type Profile } from "@/lib/club";

export const Route = createFileRoute("/_authenticated/directory")({
  head: () => ({ meta: [{ title: "Directory — The Circle" }] }),
  component: Directory,
});

const suggestions = ["Investors in real estate in Georgia", "Best cancer doctors in New York", "MIT admissions advisors", "Lawyers for residency in Portugal"];

function Directory() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState("");
  const { data: members = [], isLoading } = useMembers();
  const search = useServerFn(searchMembers);
  const ai = useMutation({
    mutationFn: (query: string) => search({ data: { query } }),
    onError: (e: Error) => toast.error(e.message || "The assistant is unavailable right now."),
  });

  const avatars = useAvatarUrls(members.map((m) => m.photo_url));
  const byId = useMemo(() => Object.fromEntries(members.map((m) => [m.user_id, m])), [members]);

  const filtered = useMemo(() => {
    const t = filter.trim().toLowerCase();
    if (!t) return members;
    return members.filter((m) =>
      [m.full_name, m.headline, m.city, m.country, ...m.industries, ...m.expertise].filter(Boolean).join(" ").toLowerCase().includes(t),
    );
  }, [members, filter]);

  return (
    <AppShell wide>
      <p className="eyebrow">The Directory</p>
      <h1 className="mt-3 font-serif text-4xl leading-tight sm:text-5xl">Who are you looking for?</h1>

      <form
        className="mt-6 flex items-center gap-3 rounded-2xl border border-foreground/12 bg-card px-4 py-3 ring-1 ring-black/5"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim().length >= 3) ai.mutate(q.trim());
        }}
      >
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground/5">
          <span className={`size-2.5 rounded-full bg-antique ${ai.isPending ? "animate-pulse" : ""}`} />
        </span>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Describe the person — expertise, city, what you need…"
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-foreground/40"
        />
        <button type="submit" disabled={ai.isPending} className="btn-ink shrink-0 px-4 py-2.5">
          {ai.isPending ? "Asking…" : "Ask"}
        </button>
      </form>
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => {
              setQ(s);
              ai.mutate(s);
            }}
            className="rounded-full border border-foreground/12 bg-card px-3 py-1.5 text-xs text-foreground/55 hover:border-foreground/40"
          >
            {s}
          </button>
        ))}
      </div>

      {ai.data && (
        <section className="stone-card rise mt-8 p-6">
          <p className="eyebrow">The assistant's suggestions</p>
          <p className="mt-2 text-sm leading-relaxed text-foreground/70">{ai.data.summary}</p>
          {ai.data.matches.length > 0 ? (
            <ul className="mt-5 divide-y divide-foreground/8">
              {ai.data.matches.map((m) => {
                const p = byId[m.user_id];
                if (!p) return null;
                return (
                  <li key={m.user_id} className="flex items-start gap-4 py-4">
                    <Avatar name={p.full_name} url={avatars.data?.[p.photo_url ?? ""]} />
                    <div className="min-w-0 flex-1">
                      <Link to="/members/$userId" params={{ userId: p.user_id }} className="font-serif text-xl leading-none hover:underline">
                        {p.full_name}
                      </Link>
                      <p className="mt-1 text-xs text-foreground/50">{[p.headline, displayLocation(p)].filter(Boolean).join(" · ")}</p>
                      <p className="mt-2 text-sm text-foreground/75">{m.reason}</p>
                    </div>
                    <Link to="/members/$userId" params={{ userId: p.user_id }} className="btn-outline hidden px-3 py-2 sm:inline-flex">
                      View
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-4 rounded-xl bg-secondary p-4 text-sm text-foreground/70">
              No one in the Circle fits this yet. We've passed your request to our team — they will look through their private
              network and come back to you personally.
            </p>
          )}
        </section>
      )}

      <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">All members</p>
          <p className="mt-1 text-sm text-foreground/55">{members.length} in the Circle</p>
        </div>
        <input value={filter} onChange={(e) => setFilter(e.target.value)} placeholder="Filter by name, city, industry" className="field sm:max-w-xs" />
      </div>

      {isLoading ? (
        <p className="mt-6 text-sm text-foreground/50">Loading…</p>
      ) : filtered.length === 0 ? (
        <p className="mt-6 text-sm text-foreground/50">No members match yet.</p>
      ) : (
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((m) => (
            <MemberCard key={m.id} m={m} url={avatars.data?.[m.photo_url ?? ""]} />
          ))}
        </div>
      )}
    </AppShell>
  );
}

function MemberCard({ m, url }: { m: Profile; url?: string | undefined }) {
  return (
    <Link to="/members/$userId" params={{ userId: m.user_id }} className="stone-card flex gap-4 p-4 transition-transform hover:-translate-y-0.5">
      <Avatar name={m.full_name} url={url} size="lg" />
      <div className="min-w-0">
        <h3 className="truncate font-serif text-xl leading-tight">{m.full_name}</h3>
        <p className="mt-0.5 truncate text-xs text-foreground/55">{m.headline}</p>
        <p className="mt-0.5 text-xs text-foreground/45">{displayLocation(m)}</p>
        <div className="mt-2 flex flex-wrap gap-1">
          {m.industries.slice(0, 3).map((t) => (
            <span key={t} className="chip">
              {t}
            </span>
          ))}
        </div>
      </div>
    </Link>
  );
}
