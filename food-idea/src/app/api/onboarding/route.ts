import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { RESERVED_USERNAMES, USERNAME_REGEX } from "@/lib/constants";

export async function POST(req: NextRequest) {
  const { userId, username, isCreator } = await req.json();

  if (!userId || !username) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  if (!USERNAME_REGEX.test(username)) {
    return NextResponse.json(
      { error: "Invalid username format" },
      { status: 400 }
    );
  }

  if (RESERVED_USERNAMES.has(username)) {
    return NextResponse.json(
      { error: "This username is reserved" },
      { status: 400 }
    );
  }

  const supabase = createServiceClient();

  // Check if username is taken
  const { data: existing } = await supabase
    .from("users")
    .select("id")
    .eq("username", username)
    .single();

  if (existing) {
    return NextResponse.json(
      { error: "Username already taken" },
      { status: 409 }
    );
  }

  // Update user
  const { error } = await supabase
    .from("users")
    .update({
      username,
      is_creator: isCreator,
    })
    .eq("id", userId);

  if (error) {
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true });
}
