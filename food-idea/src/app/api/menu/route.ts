import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { createServiceClient } from "@/lib/supabase/server";

// Add a food item to creator's menu
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { foodItemId } = await req.json();
  if (!foodItemId) {
    return NextResponse.json({ error: "Missing foodItemId" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase.from("creator_menu_items").insert({
    creator_id: session.user.id,
    food_item_id: foodItemId,
  });

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "Already on your menu" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to add item" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

// Remove a food item from creator's menu
export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { foodItemId } = await req.json();
  if (!foodItemId) {
    return NextResponse.json({ error: "Missing foodItemId" }, { status: 400 });
  }

  const supabase = createServiceClient();

  const { error } = await supabase
    .from("creator_menu_items")
    .delete()
    .eq("creator_id", session.user.id)
    .eq("food_item_id", foodItemId);

  if (error) {
    return NextResponse.json({ error: "Failed to remove item" }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
