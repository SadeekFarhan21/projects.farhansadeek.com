import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // TODO: Add proper admin role check

  const { cashoutId, giftCardCode } = await req.json();

  if (!cashoutId || !giftCardCode) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("cashout_requests")
    .update({
      status: "fulfilled",
      gift_card_code: giftCardCode,
      fulfilled_at: new Date().toISOString(),
    })
    .eq("id", cashoutId)
    .eq("status", "pending");

  if (error) {
    return NextResponse.json({ error: "Failed to fulfill" }, { status: 500 });
  }

  // TODO: Send email to creator with gift card code via Resend

  return NextResponse.json({ success: true });
}
