import { createFileRoute } from "@tanstack/react-router";
import { ProfileForm } from "@/components/ProfileForm";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Your introduction — The Circle" }] }),
  component: ProfileForm,
});
