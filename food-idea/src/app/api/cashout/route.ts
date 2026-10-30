import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { CASHOUT_DENOMINATIONS } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { restaurantId, denominationCents, deliveryEmail } = await req.json();

  if (!restaurantId || !denominationCents || !deliveryEmail) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Validate denomination
  if (!CASHOUT_DENOMINATIONS.includes(denominationCents as typeof CASHOUT_DENOMINATIONS[number])) {
    return NextResponse.json({ error: "Invalid denomination" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get current balance
  const { data: balance } = await supabase
    .from("creator_balances")
    .select("id, balance_cents")
    .eq("creator_id", session.user.id)
    .eq("restaurant_id", restaurantId)
    .single();

  if (!balance || balance.balance_cents < denominationCents) {
    return NextResponse.json({ error: "Insufficient balance" }, { status: 400 });
  }

  // Deduct balance
  const { error: updateError } = await supabase
    .from("creator_balances")
    .update({
      balance_cents: balance.balance_cents - denominationCents,
    })
    .eq("id", balance.id);

  if (updateError) {
    return NextResponse.json({ error: "Failed to update balance" }, { status: 500 });
  }

  // Create cashout request
  const { error: insertError } = await supabase
    .from("cashout_requests")
    .insert({
      creator_id: session.user.id,
      restaurant_id: restaurantId,
      amount_cents: denominationCents,
      gift_card_denomination: denominationCents / 100,
      status: "pending",
      delivery_email: deliveryEmail,
    });

  if (insertError) {
    // Rollback balance deduction
    await supabase
      .from("creator_balances")
      .update({ balance_cents: balance.balance_cents })
      .eq("id", balance.id);
    return NextResponse.json({ error: "Failed to create request" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
