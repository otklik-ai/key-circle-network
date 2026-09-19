import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAvatarUrls, useMyPrivateAnswers, useMyProfile } from "@/hooks/useClub";
import { CLUB_NAME } from "@/lib/club";
import { ALL_QUESTIONS, ALWAYS_PRIVATE, CONTENT_GUIDANCE, SECTIONS, flaggedFields, type Question } from "@/lib/questions";
import { Avatar } from "@/components/AppShell";

type Values = Record<string, string | string[]>;
type Vis = Record<string, "shared" | "private">;

const LIST_FIELDS = ["other_cities", "base_countries", "languages", "active_markets"];
const MULTI_FIELDS = ["industries", "functional_roles", "interested_industries", "seeking_people", "offering_types"];
// Chip multi-selects whose database column is a single text field (stored joined).
const JOINED_MULTI_FIELDS = ["contact_pref"];

const initialValues = (): Values => {
  const v: Values = { photo_url: "", city: "", country: "", chapter_role: "" };
  for (const q of ALL_QUESTIONS) {
    // List fields stay as raw text while typing; they are split on save.
    v[q.field] = MULTI_FIELDS.includes(q.field) || JOINED_MULTI_FIELDS.includes(q.field) ? [] : "";
    if (q.noteField) v[q.noteField] = "";
  }
  return v;
};

const steps = [...SECTIONS.map((s) => s.title), "Your portrait"];

export function ProfileForm() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useMyProfile();
  const { data: privateAnswers } = useMyPrivateAnswers();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const existingPhoto = useAvatarUrls([profile?.photo_url]);
  const [v, setV] = useState<Values>(initialValues);
  const [vis, setVis] = useState<Vis>({});
  const [skipped, setSkipped] = useState<string[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!profile || loaded) return;
    const p = profile as unknown as Record<string, unknown>;
    const priv = (privateAnswers ?? {}) as Record<string, unknown>;
    const next = initialValues();
    const pick = (field: string) => priv[field] ?? p[field];
    for (const key of Object.keys(next)) {
      const raw = pick(key);
      if (Array.isArray(raw)) next[key] = LIST_FIELDS.includes(key) ? (raw as string[]).join(", ") : (raw as string[]);
      else if (typeof raw === "string") next[key] = raw;
    }
    // Carry over the answers from the earlier, shorter form.
    if (!next["background"] && typeof p["bio"] === "string") next["background"] = p["bio"] as string;
    if (!next["focus_now"] && typeof p["current_projects"] === "string") next["focus_now"] = (p["current_projects"] as string) ?? "";
    if (!next["seeking_people_note"] && typeof p["seeking"] === "string") next["seeking_people_note"] = (p["seeking"] as string) ?? "";
    if (!next["one_liner"] && typeof p["headline"] === "string") next["one_liner"] = (p["headline"] as string) ?? "";
    setV(next);
    setVis((p["field_visibility"] as Vis) ?? {});
    setSkipped((p["skipped_fields"] as string[]) ?? []);
    setLoaded(true);
  }, [profile, privateAnswers, loaded]);

  const setField = (field: string, value: string | string[]) => {
    setV((s) => ({ ...s, [field]: value }));
    setSkipped((s) => s.filter((f) => f !== field));
  };
  const toggleOption = (field: string, option: string) =>
    setV((s) => {
      const cur = (s[field] as string[]) ?? [];
      return { ...s, [field]: cur.includes(option) ? cur.filter((x) => x !== option) : [...cur, option] };
    });
  const isPrivate = (q: Question) => ALWAYS_PRIVATE.includes(q.field as never) || (vis[q.field] ?? q.vis) === "private";

  async function uploadPhoto(file: File): Promise<void> {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Please choose a photo under 5 MB."); return; }
    const path = `${auth.user.id}/portrait-${Date.now()}.${file.name.split(".").pop() ?? "jpg"}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) { toast.error(error.message); return; }
    setField("photo_url", path);
    setPhotoPreview(URL.createObjectURL(file));
  }

  function buildPayload() {
    const update: Record<string, unknown> = {};
    const priv: Record<string, unknown> = {};
    const emptyFor = (field: string) => (LIST_FIELDS.includes(field) || MULTI_FIELDS.includes(field) ? [] : null);
    const str = (field: string) => (typeof v[field] === "string" ? ((v[field] as string).trim() || null) : null);

    const put = (field: string, value: unknown, private_: boolean) => {
      if (private_) {
        priv[field] = value;
        update[field] = emptyFor(field);
      } else {
        update[field] = value;
      }
    };

    for (const q of ALL_QUESTIONS) {
      const private_ = isPrivate(q);
      if (q.field === "location") {
        update["city"] = str("city");
        update["country"] = str("country");
        continue;
      }
      if (q.field === "home_chapter_city") {
        put("home_chapter_city", str("home_chapter_city"), private_);
        put("chapter_role", str("chapter_role"), private_);
        continue;
      }
      if (LIST_FIELDS.includes(q.field)) {
        put(q.field, (v[q.field] as string).split(",").map((s) => s.trim()).filter(Boolean), private_);
      } else if (MULTI_FIELDS.includes(q.field)) {
        put(q.field, (v[q.field] as string[]) ?? [], private_);
      } else {
        put(q.field, str(q.field), private_);
      }
      if (q.noteField) put(q.noteField, str(q.noteField), private_);
    }

    // Questions 20, 21 and 23 never touch the shared record.
    for (const f of ALWAYS_PRIVATE) delete update[f];
    update["photo_url"] = (v["photo_url"] as string) || null;
    update["field_visibility"] = vis;
    update["skipped_fields"] = skipped;
    // Keep the old headline in step with the new one-line description.
    update["headline"] = str("one_liner");
    return { update, priv };
  }

  async function save(complete: boolean): Promise<void> {
    if (!profile) return;
    setBusy(true);
    const { update, priv } = buildPayload();
    const flags = flaggedFields(v as Record<string, unknown>);
    if (complete) {
      update["onboarding_complete"] = true;
      update["flagged_fields"] = flags;
      update["review_status"] = flags.length > 0 ? "held" : "approved";
    }
    const { error } = await supabase.from("profiles").update(update as never).eq("id", profile.id);
    if (!error) {
      const { data: auth } = await supabase.auth.getUser();
      if (auth.user) {
        await supabase
          .from("profile_private")
          .upsert({ profile_id: profile.id, user_id: auth.user.id, answers: priv as never }, { onConflict: "user_id" });
      }
    }
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    if (complete) {
      await qc.invalidateQueries();
      if (flags.length > 0) {
        toast.info("Thank you. A couple of answers mention figures, so we'll read them over before your profile goes live.");
      } else {
        toast.success(profile.onboarding_complete ? "Profile updated." : `Welcome to ${CLUB_NAME}.`);
      }
      navigate({ to: "/directory" });
    }
  }

  const section = SECTIONS[step];
  const onPortrait = step === SECTIONS.length;
  const missing = (() => {
    if (!section) return [];
    return section.questions
      .filter((q) => q.required)
      .filter((q) => {
        if (q.field === "location") return !(v["city"] as string)?.trim() || !(v["country"] as string)?.trim();
        if (q.field === "offering_types") return ((v["offering_types"] as string[]) ?? []).length === 0 && !(v["offering"] as string)?.trim();
        const val = v[q.field];
        return Array.isArray(val) ? val.length === 0 : !(val as string)?.trim();
      });
  })();

  return (
    <div className="mesh min-h-screen px-6 py-10 sm:px-10">
      <div className="mx-auto max-w-2xl">
        <span className="font-serif text-2xl tracking-tight">{CLUB_NAME}</span>
        <div className="mt-10 flex gap-2">
          {steps.map((s, i) => (
            <div key={s} className={`h-0.5 flex-1 rounded ${i <= step ? "bg-antique" : "bg-foreground/10"}`} />
          ))}
        </div>
        <p className="mt-4 eyebrow">
          Step {step + 1} of {steps.length} · {steps[step]}
        </p>

        <div className="stone-card rise mt-4 p-6 sm:p-8" key={step}>
          {section && (
            <>
              <h1 className="font-serif text-4xl leading-tight">{section.title}</h1>
              <p className="mt-2 text-sm text-foreground/55">{section.blurb}</p>
              <div className="mt-8 space-y-8">
                {section.questions.map((q) => (
                  <QuestionRow
                    key={q.field}
                    q={q}
                    v={v}
                    vis={vis}
                    skipped={skipped.includes(q.field)}
                    isPrivate={isPrivate(q)}
                    onChange={setField}
                    onToggleOption={toggleOption}
                    onToggleVis={() =>
                      setVis((s) => ({ ...s, [q.field]: (s[q.field] ?? q.vis) === "private" ? "shared" : "private" }))
                    }
                    onSkip={() =>
                      setSkipped((s) => (s.includes(q.field) ? s.filter((f) => f !== q.field) : [...s, q.field]))
                    }
                  />
                ))}
              </div>
            </>
          )}

          {onPortrait && (
            <>
              <h1 className="font-serif text-4xl leading-tight">A portrait, please.</h1>
              <p className="mt-2 text-sm text-foreground/55">A real photo of you. Members trust faces, not logos.</p>
              <div className="mt-6 flex items-center gap-6">
                <Avatar name={(v["full_name"] as string) || "?"} url={photoPreview ?? existingPhoto.data?.[profile?.photo_url ?? ""]} size="xl" />
                <label className="btn-outline cursor-pointer">
                  {v["photo_url"] ? "Change photo" : "Upload photo"}
                  <input type="file" accept="image/*" className="sr-only" onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])} />
                </label>
              </div>
            </>
          )}

          <div className="mt-8 flex items-center justify-between gap-4">
            <button type="button" className="text-sm text-foreground/50 disabled:opacity-0" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Back
            </button>
            {missing.length > 0 && <span className="text-xs text-foreground/45">Still needed: {missing.map((q) => q.label).join(", ")}</span>}
            {!onPortrait ? (
              <button
                type="button"
                className="btn-ink"
                disabled={missing.length > 0 || busy}
                onClick={async () => {
                  await save(false);
                  setStep(step + 1);
                }}
              >
                Continue
              </button>
            ) : (
              <button type="button" className="btn-ink" disabled={busy || !v["photo_url"]} onClick={() => save(true)}>
                {busy ? "Saving…" : profile?.onboarding_complete ? "Save changes" : `Enter ${CLUB_NAME}`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function QuestionRow({
  q,
  v,
  skipped,
  isPrivate,
  onChange,
  onToggleOption,
  onToggleVis,
  onSkip,
}: {
  q: Question;
  v: Values;
  vis: Vis;
  skipped: boolean;
  isPrivate: boolean;
  onChange: (field: string, value: string | string[]) => void;
  onToggleOption: (field: string, option: string) => void;
  onToggleVis: () => void;
  onSkip: () => void;
}) {
  const text = (field: string) => (v[field] as string) ?? "";
  const arr = (field: string) => (v[field] as string[]) ?? [];

  return (
    <div className={skipped ? "opacity-50" : ""}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="label-caps">
          {q.n}. {q.label}
        </span>
        <div className="flex items-center gap-3 text-xs">
          {q.locked ? (
            <span className="text-antique">Private — only the team, never shared</span>
          ) : q.fixed ? (
            <span className="text-foreground/35">Shown in the directory</span>
          ) : (
            <button type="button" onClick={onToggleVis} className="text-foreground/50 underline underline-offset-4 hover:text-foreground">
              {isPrivate ? "Private" : "Shared with members"}
            </button>
          )}
          {!q.required && (
            <button type="button" onClick={onSkip} className="text-foreground/40 hover:text-foreground">
              {skipped ? "Undo skip" : "Skip"}
            </button>
          )}
        </div>
      </div>
      {q.hint && <p className="mt-1 text-xs text-foreground/40">{q.hint}</p>}

      {!skipped && (
        <div className="mt-2 space-y-3">
          {q.type === "text" && (
            <input className="field" maxLength={q.max} value={text(q.field)} onChange={(e) => onChange(q.field, e.target.value)} />
          )}
          {q.type === "url" && (
            <input className="field" placeholder="https://…" value={text(q.field)} onChange={(e) => onChange(q.field, e.target.value)} />
          )}
          {q.type === "long_text" && (
            <textarea className="field min-h-24" maxLength={q.max} value={text(q.field)} onChange={(e) => onChange(q.field, e.target.value)} />
          )}
          {q.type === "list" && (
            <input className="field" value={text(q.field)} onChange={(e) => onChange(q.field, e.target.value)} />
          )}
          {q.type === "location" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="field" placeholder="City" value={text("city")} onChange={(e) => onChange("city", e.target.value)} />
              <input className="field" placeholder="Country" value={text("country")} onChange={(e) => onChange("country", e.target.value)} />
            </div>
          )}
          {q.type === "single" && (
            <div className="flex flex-wrap gap-2">
              {q.options?.map((o) => (
                <Chip key={o} on={text(q.field) === o} onClick={() => onChange(q.field, text(q.field) === o ? "" : o)}>
                  {o}
                </Chip>
              ))}
            </div>
          )}
          {(q.type === "multi" || q.type === "multi_text") && (
            <div className="flex flex-wrap gap-2">
              {q.options?.map((o) => (
                <Chip key={o} on={arr(q.field).includes(o)} onClick={() => onToggleOption(q.field, o)}>
                  {o}
                </Chip>
              ))}
            </div>
          )}
          {q.type === "chapter" && (
            <div className="grid gap-3 sm:grid-cols-2">
              <input className="field" placeholder="Home chapter city" value={text("home_chapter_city")} onChange={(e) => onChange("home_chapter_city", e.target.value)} />
              <div className="flex flex-wrap gap-2">
                {q.options?.map((o) => (
                  <Chip key={o} on={text("chapter_role") === o} onClick={() => onChange("chapter_role", text("chapter_role") === o ? "" : o)}>
                    {o}
                  </Chip>
                ))}
              </div>
            </div>
          )}
          {q.noteField && (
            <textarea
              className="field min-h-20"
              placeholder={q.noteLabel}
              value={text(q.noteField)}
              onChange={(e) => onChange(q.noteField!, e.target.value)}
            />
          )}
          {q.guided && <p className="text-xs text-foreground/40">{CONTENT_GUIDANCE}</p>}
          {q.max && (q.type === "text" || q.type === "long_text") && (
            <p className="text-right text-xs text-foreground/30">
              {text(q.field).length}/{q.max}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Chip({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? "border-foreground bg-foreground text-primary-foreground" : "border-foreground/15 text-foreground/65 hover:border-foreground/40"}`}
    >
      {children}
    </button>
  );
}

export function Field({ label, hint, className, children }: { label: string; hint?: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="label-caps">{label}</span>
      <div className="mt-2">{children}</div>
      {hint && <span className="mt-1 block text-xs text-foreground/40">{hint}</span>}
    </label>
  );
}
