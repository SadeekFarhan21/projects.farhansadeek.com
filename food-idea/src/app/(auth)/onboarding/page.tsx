import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  // If user already has a username, skip onboarding
  const supabase = await createClient();
  const { data: user } = await supabase
    .from("users")
    .select("username")
    .eq("id", session.user.id)
    .single();

  if (user?.username) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-red-50 p-4">
      <OnboardingForm userId={session.user.id} />
    </div>
  );
}
