import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreatorPage } from "@/components/creator-page";
import type { Metadata } from "next";
import type { FoodItemWithRestaurant } from "@/types/database";

type Props = {
  params: Promise<{ username: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data: creator } = await supabase
    .from("users")
    .select("display_name, bio")
    .eq("username", username)
    .eq("is_creator", true)
    .single();

  if (!creator) return { title: "Not Found" };

  return {
    title: `Feed ${creator.display_name}`,
    description:
      creator.bio || `Send ${creator.display_name} their favorite foods on FoodMe`,
  };
}

export default async function CreatorProfilePage({ params }: Props) {
  const { username } = await params;
  const supabase = await createClient();

  // Get creator
  const { data: creator } = await supabase
    .from("users")
    .select("id, username, display_name, avatar_url, bio")
    .eq("username", username)
    .eq("is_creator", true)
    .single();

  if (!creator) notFound();

  // Get creator's menu items with food and restaurant details
  type MenuItemRow = {
    food_item: FoodItemWithRestaurant | null;
  };

  const { data: menuItems } = await supabase
    .from("creator_menu_items")
    .select("*, food_item:food_items(*, restaurant:restaurants(*))")
    .eq("creator_id", creator.id)
    .order("is_pinned", { ascending: false })
    .order("sort_order") as { data: MenuItemRow[] | null };

  // Get recent orders for this creator (activity feed)
  const { data: recentOrders } = await supabase
    .from("orders")
    .select("id, fan_display_name, message, created_at, food_item:food_items(name)")
    .eq("creator_id", creator.id)
    .eq("status", "payment_complete")
    .order("created_at", { ascending: false })
    .limit(5) as { data: { id: string; fan_display_name: string | null; message: string | null; created_at: string; food_item: { name: string } | null }[] | null };

  // Transform menu items to typed format
  const foodItems: FoodItemWithRestaurant[] =
    (menuItems || [])
      .map((mi) => mi.food_item)
      .filter((fi): fi is FoodItemWithRestaurant => fi !== null);

  return (
    <CreatorPage
      creator={creator}
      foodItems={foodItems}
      recentOrders={
        (recentOrders || []).map((o) => ({
          id: o.id,
          fanName: o.fan_display_name || "Anonymous",
          foodName: o.food_item?.name || "something",
          message: o.message,
          createdAt: o.created_at,
        }))
      }
    />
  );
}
