import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CLUB_NAME } from "@/lib/club";

export const Route = createFileRoute("/join")({
  validateSearch: z.object({ key: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Enter with your key — The Circle" },
      { name: "description", content: "Redeem your personal membership key to join The Circle." },
      { property: "og:title", content: "Enter with your key — The Circle" },
      { property: "og:description", content: "Redeem your personal membership key to join The Circle." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Join,
});

function Join() {
  const { key: initialKey } = Route.useSearch();
  const navigate = useNavigate();
  const [key, setKey] = useState(initialKey ?? "");
  const [submittedKey, setSubmittedKey] = useState(initialKey ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const invite = useQuery({
    queryKey: ["validate-invite", submittedKey],
    enabled: submittedKey.length > 3,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("validate_invite", { _key: submittedKey });
      if (error) throw error;
      const row = data?.[0];
      if (row?.valid) {
        setName((n) => n || row.invited_name || "");
        setEmail((e) => e || row.email || "");
      }
      return row ?? null;
    },
  });

  const valid = invite.data?.valid === true;

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Please choose a password of at least 8 characters.");
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth`,
        data: { full_name: name.trim(), invite_key: submittedKey.toUpperCase() },
      },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    if (data.session) {
      navigate({ to: "/onboarding" });
    } else {
      setSent(true);
    }
  }

  return (
    <div className="mesh min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="font-serif text-2xl leading-none tracking-tight">
          {CLUB_NAME}
        </Link>
      </div>
      <div className="mx-auto mt-16 max-w-md sm:mt-24">
        {sent ? (
          <div className="stone-card rise p-8">
            <p className="eyebrow">One last step</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight">Check your inbox.</h1>
            <p className="mt-4 text-sm leading-relaxed text-foreground/60">
              We sent a confirmation link to <span className="text-foreground">{email}</span>. Open it and you'll be taken
              straight to your onboarding.
            </p>
          </div>
        ) : !valid ? (
          <form
            className="stone-card rise p-8"
            onSubmit={(e) => {
              e.preventDefault();
              setSubmittedKey(key.trim().toUpperCase());
            }}
          >
            <p className="eyebrow">By invitation only</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight">Enter with your key.</h1>
            <label className="mt-6 block label-caps" htmlFor="join-key">
              Membership key
            </label>
            <input
              id="join-key"
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="CIRCLE-XXXX-XXXX"
              autoComplete="off"
              className="field mt-2 font-mono tracking-wider uppercase"
            />
            {invite.data && !invite.data.valid && (
              <p className="mt-3 text-sm text-destructive">This key is not valid, has expired, or was already used.</p>
            )}
            <button type="submit" disabled={invite.isFetching} className="btn-ink mt-6 w-full">
              {invite.isFetching ? "Checking…" : "Continue"}
            </button>
            <p className="mt-4 text-center text-xs text-foreground/45">
              Already a member?{" "}
              <Link to="/auth" className="underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </form>
        ) : (
          <form className="stone-card rise p-8" onSubmit={signUp}>
            <p className="eyebrow">Welcome{invite.data?.invited_name ? `, ${invite.data.invited_name.split(" ")[0]}` : ""}</p>
            <h1 className="mt-3 font-serif text-4xl leading-tight">Your key is accepted.</h1>
            {invite.data?.note && <p className="mt-3 text-sm italic text-foreground/60">“{invite.data.note}”</p>}
            <div className="mt-6 space-y-4">
              <div>
                <label className="label-caps" htmlFor="name">
                  Full name
                </label>
                <input id="name" required value={name} onChange={(e) => setName(e.target.value)} className="field mt-2" />
              </div>
              <div>
                <label className="label-caps" htmlFor="email">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="field mt-2"
                />
              </div>
              <div>
                <label className="label-caps" htmlFor="password">
                  Password
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="field mt-2"
                />
              </div>
            </div>
            <button type="submit" disabled={busy} className="btn-ink mt-6 w-full">
              {busy ? "Creating your membership…" : "Create my membership"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
