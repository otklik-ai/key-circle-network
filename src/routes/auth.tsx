import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CLUB_NAME } from "@/lib/club";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Member sign in — The Circle" },
      { name: "description", content: "Sign in to The Circle members' directory." },
      { property: "og:title", content: "Member sign in — The Circle" },
      { property: "og:description", content: "Sign in to The Circle members' directory." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Auth,
});

function Auth() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"signin" | "reset">("signin");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/directory", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    if (mode === "reset") {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/profile`,
      });
      setBusy(false);
      if (error) { toast.error(error.message); return; }
      toast.success("If that address is a member, a reset link is on its way.");
      setMode("signin");
      return;
    }
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/directory" });
  }

  return (
    <div className="mesh min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-6xl">
        <Link to="/" className="font-serif text-2xl leading-none tracking-tight">
          {CLUB_NAME}
        </Link>
      </div>
      <form className="stone-card rise mx-auto mt-16 max-w-md p-8 sm:mt-24" onSubmit={submit}>
        <p className="eyebrow">Members</p>
        <h1 className="mt-3 font-serif text-4xl leading-tight">{mode === "reset" ? "Reset your password." : "Welcome back."}</h1>
        <div className="mt-6 space-y-4">
          <div>
            <label className="label-caps" htmlFor="email">
              Email
            </label>
            <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="field mt-2" />
          </div>
          {mode === "signin" && (
            <div>
              <label className="label-caps" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="field mt-2"
              />
            </div>
          )}
        </div>
        <button type="submit" disabled={busy} className="btn-ink mt-6 w-full">
          {busy ? "One moment…" : mode === "reset" ? "Send reset link" : "Sign in"}
        </button>
        <div className="mt-4 flex justify-between text-xs text-foreground/45">
          <button type="button" className="underline underline-offset-4" onClick={() => setMode(mode === "reset" ? "signin" : "reset")}>
            {mode === "reset" ? "Back to sign in" : "Forgot password?"}
          </button>
          <Link to="/join" className="underline underline-offset-4">
            I have a key
          </Link>
        </div>
      </form>
    </div>
  );
}
