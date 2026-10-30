import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { createWhopCheckout } from "@/lib/whop";

export async function POST(req: NextRequest) {
  const { foodItemId, creatorId, message, fanDisplayName } = await req.json();

  if (!foodItemId || !creatorId) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const session = await auth();
  const supabase = createServiceClient();

  // Get food item details
  const { data: foodItem } = await supabase
    .from("food_items")
    .select("*, restaurant:restaurants(*)")
    .eq("id", foodItemId)
    .eq("is_active", true)
    .single();

  if (!foodItem) {
    return NextResponse.json({ error: "Food item not found" }, { status: 404 });
  }

  // Get creator
  const { data: creator } = await supabase
    .from("users")
    .select("id, username")
    .eq("id", creatorId)
    .eq("is_creator", true)
    .single();

  if (!creator) {
    return NextResponse.json({ error: "Creator not found" }, { status: 404 });
  }

  // Create order in pending state
  const { data: order, error: orderError } = await supabase
    .from("orders")
    .insert({
      fan_id: session?.user?.id || null,
      creator_id: creatorId,
      food_item_id: foodItemId,
      restaurant_id: foodItem.restaurant_id,
      fan_paid_cents: foodItem.fan_price_cents,
      platform_fee_cents: foodItem.fan_price_cents - foodItem.base_price_cents,
      creator_credit_cents: foodItem.base_price_cents,
      status: "pending_payment",
      message: message || null,
      fan_display_name: fanDisplayName || "Anonymous",
    })
    .select("id")
    .single();

  if (orderError || !order) {
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  try {
    // Create Whop checkout session
    const checkout = await createWhopCheckout({
      amountCents: foodItem.fan_price_cents,
      metadata: {
        order_id: order.id,
        creator_id: creatorId,
        food_item_id: foodItemId,
        restaurant_id: foodItem.restaurant_id,
      },
      redirectUrl: `${appUrl}/${creator.username}?payment=success&order=${order.id}`,
    });

    return NextResponse.json({ checkoutUrl: checkout.purchase_url });
  } catch (err) {
    // Clean up failed order
    await supabase.from("orders").delete().eq("id", order.id);
    console.error("Whop checkout error:", err);
    return NextResponse.json(
      { error: "Failed to create checkout" },
      { status: 500 }
    );
  }
}
