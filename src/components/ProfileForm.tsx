import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useMyProfile } from "@/hooks/useClub";
import { CLUB_NAME, INDUSTRIES } from "@/lib/club";
import { Avatar } from "@/components/AppShell";

const steps = ["Who you are", "What you do", "What you're after", "Your portrait"] as const;

export function ProfileForm() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useMyProfile();
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [f, setF] = useState({
    full_name: "",
    headline: "",
    city: "",
    country: "",
    bio: "",
    industries: [] as string[],
    expertise: "",
    passports: "",
    languages: "",
    offering: "",
    seeking: "",
    current_projects: "",
    linkedin_url: "",
    call_link: "",
    photo_url: null as string | null,
  });

  useEffect(() => {
    if (profile) {
      setF((s) => ({
        ...s,
        full_name: profile.full_name || s.full_name,
        headline: profile.headline ?? "",
        city: profile.city ?? "",
        country: profile.country ?? "",
        bio: profile.bio ?? "",
        industries: profile.industries ?? [],
        expertise: profile.expertise.join(", "),
        passports: profile.passports.join(", "),
        languages: profile.languages.join(", "),
        offering: profile.offering ?? "",
        seeking: profile.seeking ?? "",
        current_projects: profile.current_projects ?? "",
        linkedin_url: profile.linkedin_url ?? "",
        call_link: profile.call_link ?? "",
        photo_url: profile.photo_url,
      }));
    }
  }, [profile]);

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setF((s) => ({ ...s, [k]: e.target.value }));
  const list = (s: string) =>
    s
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);

  async function uploadPhoto(file: File) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return;
    if (file.size > 5 * 1024 * 1024) return toast.error("Please choose a photo under 5 MB.");
    const path = `${auth.user.id}/portrait-${Date.now()}.${file.name.split(".").pop() ?? "jpg"}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, { upsert: true });
    if (error) return toast.error(error.message);
    setF((s) => ({ ...s, photo_url: path }));
    setPhotoPreview(URL.createObjectURL(file));
  }

  async function save(complete: boolean) {
    if (!profile) return;
    setBusy(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: f.full_name.trim(),
        headline: f.headline.trim() || null,
        city: f.city.trim() || null,
        country: f.country.trim() || null,
        bio: f.bio.trim() || null,
        industries: f.industries,
        expertise: list(f.expertise),
        passports: list(f.passports),
        languages: list(f.languages),
        offering: f.offering.trim() || null,
        seeking: f.seeking.trim() || null,
        current_projects: f.current_projects.trim() || null,
        linkedin_url: f.linkedin_url.trim() || null,
        call_link: f.call_link.trim() || null,
        photo_url: f.photo_url,
        ...(complete ? { onboarding_complete: true } : {}),
      })
      .eq("id", profile.id);
    setBusy(false);
    if (error) return toast.error(error.message);
    if (complete) {
      await qc.invalidateQueries();
      toast.success(profile.onboarding_complete ? "Profile updated." : `Welcome to ${CLUB_NAME}.`);
      navigate({ to: "/directory" });
    }
  }

  const canNext = step === 0 ? f.full_name.trim() && f.city.trim() && f.country.trim() : step === 1 ? f.industries.length > 0 : true;

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
          {step === 0 && (
            <>
              <h1 className="font-serif text-4xl leading-tight">{profile?.onboarding_complete ? "Your profile." : "Let's introduce you properly."}</h1>
              <p className="mt-2 text-sm text-foreground/55">Members find each other by these details. Be specific — it helps.</p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Field label="Full name" className="sm:col-span-2">
                  <input className="field" value={f.full_name} onChange={set("full_name")} />
                </Field>
                <Field label="One-line headline" hint="e.g. Real-estate investor, Tbilisi & Dubai" className="sm:col-span-2">
                  <input className="field" value={f.headline} onChange={set("headline")} />
                </Field>
                <Field label="City">
                  <input className="field" value={f.city} onChange={set("city")} />
                </Field>
                <Field label="Country">
                  <input className="field" value={f.country} onChange={set("country")} />
                </Field>
                <Field label="Passports / residencies" hint="Comma separated">
                  <input className="field" value={f.passports} onChange={set("passports")} />
                </Field>
                <Field label="Languages" hint="Comma separated">
                  <input className="field" value={f.languages} onChange={set("languages")} />
                </Field>
              </div>
            </>
          )}
          {step === 1 && (
            <>
              <h1 className="font-serif text-4xl leading-tight">What do you do?</h1>
              <p className="mt-2 text-sm text-foreground/55">Choose every industry that applies.</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {INDUSTRIES.map((ind) => {
                  const on = f.industries.includes(ind);
                  return (
                    <button
                      type="button"
                      key={ind}
                      onClick={() =>
                        setF((s) => ({ ...s, industries: on ? s.industries.filter((x) => x !== ind) : [...s.industries, ind] }))
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${on ? "border-foreground bg-foreground text-primary-foreground" : "border-foreground/15 text-foreground/65 hover:border-foreground/40"}`}
                    >
                      {ind}
                    </button>
                  );
                })}
              </div>
              <div className="mt-6 grid gap-4">
                <Field label="Specific expertise" hint="Comma separated — e.g. commercial real estate, Georgian residency, M&A law">
                  <input className="field" value={f.expertise} onChange={set("expertise")} />
                </Field>
                <Field label="About you" hint="A few honest sentences. How did you get here, what have you built?">
                  <textarea className="field min-h-28" value={f.bio} onChange={set("bio")} />
                </Field>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <h1 className="font-serif text-4xl leading-tight">What are you after?</h1>
              <p className="mt-2 text-sm text-foreground/55">This is what our assistant uses to match you with the right people.</p>
              <div className="mt-6 grid gap-4">
                <Field label="What you can offer other members" hint="Deals, introductions, advice, access…">
                  <textarea className="field min-h-24" value={f.offering} onChange={set("offering")} />
                </Field>
                <Field label="What you're looking for right now">
                  <textarea className="field min-h-24" value={f.seeking} onChange={set("seeking")} />
                </Field>
                <Field label="Current projects">
                  <textarea className="field min-h-24" value={f.current_projects} onChange={set("current_projects")} />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="LinkedIn (optional)">
                    <input className="field" value={f.linkedin_url} onChange={set("linkedin_url")} placeholder="https://linkedin.com/in/…" />
                  </Field>
                  <Field label="Booking link (optional)" hint="Zoom, Calendly, Google Calendar…">
                    <input className="field" value={f.call_link} onChange={set("call_link")} placeholder="https://…" />
                  </Field>
                </div>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <h1 className="font-serif text-4xl leading-tight">A portrait, please.</h1>
              <p className="mt-2 text-sm text-foreground/55">A real photo of you. Members trust faces, not logos.</p>
              <div className="mt-6 flex items-center gap-6">
                <Avatar name={f.full_name || "?"} url={photoPreview} size="xl" />
                <label className="btn-outline cursor-pointer">
                  {f.photo_url ? "Change photo" : "Upload photo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    onChange={(e) => e.target.files?.[0] && uploadPhoto(e.target.files[0])}
                  />
                </label>
              </div>
            </>
          )}

          <div className="mt-8 flex items-center justify-between">
            <button type="button" className="text-sm text-foreground/50 disabled:opacity-0" disabled={step === 0} onClick={() => setStep(step - 1)}>
              Back
            </button>
            {step < steps.length - 1 ? (
              <button
                type="button"
                className="btn-ink"
                disabled={!canNext || busy}
                onClick={async () => {
                  await save(false);
                  setStep(step + 1);
                }}
              >
                Continue
              </button>
            ) : (
              <button type="button" className="btn-ink" disabled={busy || !f.photo_url} onClick={() => save(true)}>
                {busy ? "Saving…" : profile?.onboarding_complete ? "Save changes" : "Enter the Circle"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
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
