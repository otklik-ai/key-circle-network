import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
    const user = data.user;

    let { data: profile } = await supabase.from("profiles").select("id, onboarding_complete").eq("user_id", user.id).maybeSingle();

    // First sign-in after email confirmation: redeem the key stored at signup.
    if (!profile) {
      const key = (user.user_metadata as { invite_key?: string } | null)?.invite_key;
      if (key) {
        const { error: redeemError } = await supabase.rpc("redeem_invite", { _key: key });
        if (!redeemError) {
          const res = await supabase.from("profiles").select("id, onboarding_complete").eq("user_id", user.id).maybeSingle();
          profile = res.data;
        }
      }
      if (!profile) {
        await supabase.auth.signOut();
        throw redirect({ to: "/join" });
      }
    }

    if (!profile.onboarding_complete && !location.pathname.startsWith("/onboarding")) {
      throw redirect({ to: "/onboarding" });
    }
    return { user };
  },
  component: () => <Outlet />,
});
