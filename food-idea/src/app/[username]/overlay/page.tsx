import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { OverlayClient } from "./overlay-client";

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ token?: string }>;
};

export default async function OverlayPage({ params, searchParams }: Props) {
  const { username } = await params;
  const { token } = await searchParams;

  if (!token) notFound();

  const supabase = await createClient();

  // Verify token matches creator
  const { data: creator } = await supabase
    .from("users")
    .select("id, display_name")
    .eq("username", username)
    .eq("overlay_token", token)
    .single();

  if (!creator) notFound();

  return <OverlayClient creatorId={creator.id} />;
}
