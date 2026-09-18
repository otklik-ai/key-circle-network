import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { CLUB_NAME } from "@/lib/club";
import heroRoom from "@/assets/hero-room.jpg";
import member1 from "@/assets/member-1.jpg";
import member2 from "@/assets/member-2.jpg";
import member3 from "@/assets/member-3.jpg";
import member4 from "@/assets/member-4.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "The Circle — a private members' club, by invitation only" },
      {
        name: "description",
        content:
          "A close circle of friends of friends, gathered worldwide. Enter with your membership key to find trusted people by expertise, location and the deals they do.",
      },
      { property: "og:title", content: "The Circle — a private members' club" },
      { property: "og:description", content: "A close circle of friends of friends, gathered worldwide. By invitation only." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const previews = [
  { img: member1, name: "Elena V.", place: "Tbilisi, Georgia", tags: ["Real estate", "Investing"] },
  { img: member2, name: "Samuel A.", place: "Zurich, Switzerland", tags: ["Private equity", "Hospitality"] },
  { img: member3, name: "Mireille F.", place: "Lyon, France", tags: ["Jewellery", "Retail"] },
  { img: member4, name: "David O.", place: "Lagos, Nigeria", tags: ["Venture", "Fintech"] },
];

function useClubStats() {
  return useQuery({
    queryKey: ["club-stats"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_club_stats");
      if (error) throw error;
      return data as unknown as { members: number; countries: number; friendships: number; introductions: number };
    },
  });
}

function Landing() {
  const [key, setKey] = useState("");
  const navigate = useNavigate();
  const { data: stats } = useClubStats();
  const fmt = (n?: number) => (n ?? 0).toLocaleString();

  return (
    <div className="min-h-screen font-sans text-foreground">
      <section className="mesh">
        <div className="mx-auto max-w-6xl px-6 py-10 sm:px-10 sm:py-14">
          <div className="rise rise-1 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="grid size-9 place-items-center rounded-full border border-foreground/20 font-serif text-lg leading-none">
                C
              </span>
              <span className="font-serif text-2xl leading-none tracking-tight">{CLUB_NAME}</span>
            </div>
            <div className="flex items-center gap-6">
              <span className="hidden label-caps sm:block">By invitation only</span>
              <Link to="/auth" className="text-sm font-medium text-foreground/70 hover:text-foreground">
                Member sign in
              </Link>
            </div>
          </div>

          <div className="mt-16 grid gap-12 sm:mt-24 lg:grid-cols-12 lg:gap-16">
            <div className="rise rise-2 lg:col-span-7">
              <p className="eyebrow">Friends of friends · worldwide</p>
              <h1 className="mt-5 max-w-[30ch] font-serif text-5xl font-semibold leading-[1.02] tracking-tight text-balance sm:text-6xl">
                A close circle of friends of friends, gathered worldwide.
              </h1>
              <p className="mt-6 max-w-[48ch] text-base leading-relaxed text-foreground/65 text-pretty">
                {CLUB_NAME} is a quiet, private community of investors, founders and makers. No noise, no cold outreach —
                only people you can actually trust, introduced through people you already know.
              </p>

              <form
                className="mt-8 flex max-w-md items-stretch gap-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (key.trim()) navigate({ to: "/join", search: { key: key.trim().toUpperCase() } });
                }}
              >
                <label className="sr-only" htmlFor="key">
                  Membership key
                </label>
                <input
                  id="key"
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder="Enter your membership key"
                  autoComplete="off"
                  className="field flex-1"
                />
                <button type="submit" className="btn-ink shrink-0">
                  Enter with your key
                </button>
              </form>
              <p className="mt-3 text-xs text-foreground/40">Keys are issued by an existing member. One key, one person.</p>
            </div>

            <div className="rise rise-3 lg:col-span-5">
              <img
                src={heroRoom}
                alt="A quiet private members' room"
                width={1024}
                height={1280}
                className="aspect-[4/5] w-full rounded-2xl object-cover outline-1 -outline-offset-1 outline-black/5"
              />
            </div>
          </div>

          <div className="rise rise-3 mt-16 grid grid-cols-2 gap-8 border-t border-foreground/10 pt-10 sm:mt-24 sm:grid-cols-4">
            <Stat value={fmt(stats?.members)} label="Members joined" />
            <Stat value={fmt(stats?.countries)} label="Countries" />
            <Stat value={fmt(stats?.friendships)} label="Friendships made" />
            <Stat value={fmt(stats?.introductions)} label="Introductions" />
          </div>
        </div>
      </section>

      <section className="bg-secondary">
        <div className="mx-auto max-w-6xl px-6 py-16 sm:px-10 sm:py-24">
          <div className="max-w-[40ch]">
            <p className="eyebrow">The Directory</p>
            <h2 className="mt-4 font-serif text-4xl font-medium leading-[1.05] tracking-tight text-balance sm:text-5xl">
              Find the right person, the quiet way.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-foreground/60 text-pretty">
              Describe what you're looking for. {CLUB_NAME}'s assistant surfaces members who fit — never more than you
              asked for.
            </p>
          </div>

          <div className="mt-10">
            <div className="mx-auto flex max-w-3xl items-center gap-3 rounded-2xl border border-foreground/12 bg-card px-5 py-4 ring-1 ring-black/5">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-foreground/5">
                <span className="size-2.5 rounded-full bg-antique" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm text-foreground/40">
                Find investors in real estate in Georgia…
              </span>
              <Link to="/auth" className="btn-ink shrink-0 px-4 py-2.5">
                Search
              </Link>
            </div>
            <div className="mx-auto mt-3 flex max-w-3xl flex-wrap gap-2">
              {["Real estate · Tbilisi", "Oncologists · New York", "MIT admissions advisors"].map((t) => (
                <span key={t} className="rounded-full border border-foreground/12 bg-card px-3 py-1.5 text-xs text-foreground/55">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {previews.map((m) => (
              <div key={m.name} className="stone-card flex flex-col p-5">
                <img
                  src={m.img}
                  alt=""
                  loading="lazy"
                  width={736}
                  height={912}
                  className="aspect-[4/5] w-full rounded-xl object-cover outline-1 -outline-offset-1 outline-black/5"
                />
                <div className="mt-4">
                  <h3 className="font-serif text-2xl leading-none">{m.name}</h3>
                  <p className="mt-1 text-sm text-foreground/55">{m.place}</p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {m.tags.map((t) => (
                    <span key={t} className="chip">
                      {t}
                    </span>
                  ))}
                </div>
                <div className="mt-5 flex gap-2 pt-1">
                  <Link to="/auth" className="btn-outline flex-1 px-3 py-2">
                    Message
                  </Link>
                  <Link to="/auth" className="btn-ink flex-1 px-3 py-2">
                    Book a call
                  </Link>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-foreground/40">Illustrative profiles. Real members are visible only to members.</p>
        </div>
      </section>

      <footer className="bg-secondary">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-6 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-10">
          <span className="font-serif text-xl leading-none tracking-tight">{CLUB_NAME}</span>
          <span className="text-xs text-foreground/45">Membership by invitation only. No public listings.</span>
        </div>
      </footer>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <div className="font-serif text-4xl leading-none">{value}</div>
      <div className="mt-2 label-caps">{label}</div>
    </div>
  );
}
