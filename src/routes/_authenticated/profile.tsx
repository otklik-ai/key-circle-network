import { createFileRoute } from "@tanstack/react-router";
import { ProfileForm } from "@/components/ProfileForm";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({ meta: [{ title: "My profile — The Circle" }] }),
  component: ProfileForm,
});
