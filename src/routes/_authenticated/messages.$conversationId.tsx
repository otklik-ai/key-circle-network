import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useClub";
import { useConversations } from "./messages";

export const Route = createFileRoute("/_authenticated/messages/$conversationId")({
  component: Thread,
});

function Thread() {
  const { conversationId } = Route.useParams();
  const { data: me } = useSession();
  const qc = useQueryClient();
  const { data: convs } = useConversations();
  const other = convs?.find((c) => c.id === conversationId)?.other;
  const [text, setText] = useState("");
  const bottom = useRef<HTMLDivElement>(null);

  const messages = useQuery({
    queryKey: ["messages", conversationId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` }, () =>
        qc.invalidateQueries({ queryKey: ["messages", conversationId] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, qc]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages.data]);

  const send = useMutation({
    mutationFn: async (body: string) => {
      const { error } = await supabase.from("messages").insert({ conversation_id: conversationId, sender_id: me!.id, body });
      if (error) throw error;
    },
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["messages", conversationId] });
      qc.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="flex h-[calc(100vh-13rem)] flex-col">
      <div className="flex items-center justify-between border-b border-foreground/10 pb-3">
        <div>
          <Link to="/messages" className="text-xs text-foreground/50 md:hidden">← All messages</Link>
          {other ? (
            <Link to="/members/$userId" params={{ userId: other.user_id }} className="block font-serif text-2xl leading-none hover:underline">
              {other.full_name}
            </Link>
          ) : (
            <span className="block font-serif text-2xl leading-none">Conversation</span>
          )}
        </div>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto py-4">
        {messages.data?.length === 0 && <p className="text-center text-sm text-foreground/45">Say hello — politely, of course.</p>}
        {messages.data?.map((m) => {
          const mine = m.sender_id === me?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${mine ? "bg-primary text-primary-foreground" : "bg-card text-foreground ring-1 ring-black/5"}`}>
                <p className="whitespace-pre-wrap">{m.body}</p>
                <p className={`mt-1 text-[10px] ${mine ? "text-primary-foreground/60" : "text-foreground/40"}`}>
                  {new Date(m.created_at).toLocaleString(undefined, { hour: "2-digit", minute: "2-digit", day: "numeric", month: "short" })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottom} />
      </div>
      <form
        className="flex gap-2 border-t border-foreground/10 pt-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) send.mutate(text.trim());
        }}
      >
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              if (text.trim()) send.mutate(text.trim());
            }
          }}
          rows={1}
          placeholder="Write a message…"
          className="field min-h-11 flex-1 resize-none"
          autoFocus
        />
        <button type="submit" className="btn-ink" disabled={send.isPending || !text.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}
