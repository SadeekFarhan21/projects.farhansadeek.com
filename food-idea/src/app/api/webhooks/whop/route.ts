import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyWhopWebhook } from "@/lib/whop";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("x-whop-signature") || "";

  // Verify webhook signature
  if (!verifyWhopWebhook(body, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  const event = JSON.parse(body);

  if (event.event !== "payment.succeeded") {
    // Acknowledge other events
    return NextResponse.json({ received: true });
  }

  const metadata = event.data?.metadata;
  if (!metadata?.order_id) {
    return NextResponse.json({ error: "Missing order_id" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // Get the order
  const { data: order } = await supabase
    .from("orders")
    .select("*")
    .eq("id", metadata.order_id)
    .single();

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  // Idempotency: skip if already processed
  if (order.status === "payment_complete") {
    return NextResponse.json({ received: true, already_processed: true });
  }

  const whopPaymentId = event.data?.id || event.id;

  // Update order status
  await supabase
    .from("orders")
    .update({
      status: "payment_complete",
      whop_payment_id: whopPaymentId,
      paid_at: new Date().toISOString(),
    })
    .eq("id", order.id);

  // Upsert creator balance
  const { data: existingBalance } = await supabase
    .from("creator_balances")
    .select("id, balance_cents, lifetime_earned_cents")
    .eq("creator_id", order.creator_id)
    .eq("restaurant_id", order.restaurant_id)
    .single();

  if (existingBalance) {
    await supabase
      .from("creator_balances")
      .update({
        balance_cents: existingBalance.balance_cents + order.creator_credit_cents,
        lifetime_earned_cents:
          existingBalance.lifetime_earned_cents + order.creator_credit_cents,
      })
      .eq("id", existingBalance.id);
  } else {
    await supabase.from("creator_balances").insert({
      creator_id: order.creator_id,
      restaurant_id: order.restaurant_id,
      balance_cents: order.creator_credit_cents,
      lifetime_earned_cents: order.creator_credit_cents,
    });
  }

  // Get food item name for notification
  const { data: foodItem } = await supabase
    .from("food_items")
    .select("name")
    .eq("id", order.food_item_id)
    .single();

  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name, slug")
    .eq("id", order.restaurant_id)
    .single();

  // Create notification (triggers Supabase Realtime)
  await supabase.from("notifications").insert({
    creator_id: order.creator_id,
    order_id: order.id,
    type: "food_gift",
    payload: {
      food_name: foodItem?.name || "food",
      fan_name: order.fan_display_name || "Anonymous",
      message: order.message,
      amount_cents: order.creator_credit_cents,
      restaurant_name: restaurant?.name || "",
      restaurant_slug: restaurant?.slug || "",
    },
  });

  return NextResponse.json({ received: true, order_id: order.id });
}
