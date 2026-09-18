import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useIsAdmin } from "@/hooks/useClub";
import { CLUB_NAME } from "@/lib/club";

const nav = [
  { to: "/directory", label: "Directory" },
  { to: "/messages", label: "Messages" },
  { to: "/profile", label: "My profile" },
] as const;

export function AppShell({ children, wide }: { children: ReactNode; wide?: boolean }) {
  const navigate = useNavigate();
  const { data: isAdmin } = useIsAdmin();

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-20 border-b border-foreground/10 bg-background/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 sm:px-10">
          <Link to="/directory" className="font-serif text-2xl leading-none tracking-tight">
            {CLUB_NAME}
          </Link>
          <nav className="hidden items-center gap-6 text-sm sm:flex">
            {nav.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                className="text-foreground/60 transition-colors hover:text-foreground"
                activeProps={{ className: "text-foreground" }}
              >
                {n.label}
              </Link>
            ))}
            {isAdmin && (
              <Link to="/admin" className="text-antique" activeProps={{ className: "text-antique underline underline-offset-4" }}>
                Admin
              </Link>
            )}
          </nav>
          <button
            type="button"
            className="text-xs text-foreground/50 hover:text-foreground"
            onClick={async () => {
              await supabase.auth.signOut();
              navigate({ to: "/" });
            }}
          >
            Sign out
          </button>
        </div>
      </header>
      <main className={`mx-auto px-6 py-8 pb-24 sm:px-10 sm:pb-12 ${wide ? "max-w-6xl" : "max-w-4xl"}`}>{children}</main>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex justify-around border-t border-foreground/10 bg-card/95 px-2 py-3 text-xs backdrop-blur sm:hidden">
        {nav.map((n) => (
          <Link key={n.to} to={n.to} className="text-foreground/55" activeProps={{ className: "text-foreground font-medium" }}>
            {n.label}
          </Link>
        ))}
        {isAdmin && (
          <Link to="/admin" className="text-antique">
            Admin
          </Link>
        )}
      </nav>
    </div>
  );
}

export function Avatar({ name, url, size = "md" }: { name: string; url?: string | null | undefined; size?: "sm" | "md" | "lg" | "xl" }) {
  const cls = { sm: "size-9 text-sm", md: "size-12 text-base", lg: "size-20 text-2xl", xl: "size-32 text-4xl" }[size];
  const ini = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join("");
  return url ? (
    <img src={url} alt={name} className={`${cls} shrink-0 rounded-full object-cover outline-1 -outline-offset-1 outline-black/10`} />
  ) : (
    <span className={`${cls} grid shrink-0 place-items-center rounded-full bg-stone-deep font-serif text-foreground/70`}>{ini}</span>
  );
}
