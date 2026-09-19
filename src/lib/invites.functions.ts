import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Sends the invitation email for an existing invite. Admin only. */
export const sendInviteEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ inviteId: z.string().uuid(), origin: z.string().url() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: isAdmin } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (!isAdmin) throw new Error("Only admins can send invitations.");

    const { data: invite, error } = await supabase
      .from("invites")
      .select("id, key, email, invited_name, note, status")
      .eq("id", data.inviteId)
      .single();
    if (error || !invite) throw new Error("Invitation not found.");
    if (invite.status !== "pending") throw new Error("This invitation is no longer pending.");
    if (!invite.email) throw new Error("This invitation has no email address.");

    const joinUrl = `${data.origin}/join?key=${encodeURIComponent(invite.key)}`;

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const result = await sendTemplateEmail("invite", invite.email, {
      templateData: {
        name: invite.invited_name ?? undefined,
        inviteKey: invite.key,
        joinUrl,
        note: invite.note ?? undefined,
      },
      idempotencyKey: `invite-${invite.id}`,
    });

    if (!result.sent) {
      return { sent: false as const, reason: result.reason };
    }
    return { sent: true as const, email: invite.email };
  });
