import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MenuManager } from "./menu-manager";
import type { FoodItem, Restaurant, CreatorMenuItem } from "@/types/database";

export default async function MenuPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const supabase = await createClient();

  // Fetch all available food items with restaurants
  const { data: foodItems } = await supabase
    .from("food_items")
    .select("*, restaurant:restaurants(*)")
    .eq("is_active", true)
    .order("sort_order") as {
    data: (FoodItem & { restaurant: Restaurant })[] | null;
  };

  // Fetch creator's current menu items
  const { data: menuItems } = await supabase
    .from("creator_menu_items")
    .select("food_item_id")
    .eq("creator_id", session.user.id) as {
    data: Pick<CreatorMenuItem, "food_item_id">[] | null;
  };

  const menuItemIds = new Set(menuItems?.map((m) => m.food_item_id) || []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Menu</h1>
        <p className="text-muted-foreground">
          Choose which food items appear on your page. Fans will be able to buy
          these for you.
        </p>
      </div>

      <MenuManager
        foodItems={foodItems || []}
        initialMenuItemIds={Array.from(menuItemIds)}
      />
    </div>
  );
}
