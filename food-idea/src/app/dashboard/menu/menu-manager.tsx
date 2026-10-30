"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCentsCompact } from "@/lib/pricing";
import { Check, Plus, Minus } from "lucide-react";
import type { FoodItem, Restaurant } from "@/types/database";

type FoodItemWithRestaurant = FoodItem & { restaurant: Restaurant };

export function MenuManager({
  foodItems,
  initialMenuItemIds,
}: {
  foodItems: FoodItemWithRestaurant[];
  initialMenuItemIds: string[];
}) {
  const [menuIds, setMenuIds] = useState<Set<string>>(
    new Set(initialMenuItemIds)
  );
  const [loading, setLoading] = useState<string | null>(null);

  // Group by restaurant
  const grouped = foodItems.reduce(
    (acc, item) => {
      const key = item.restaurant.slug;
      if (!acc[key]) acc[key] = { restaurant: item.restaurant, items: [] };
      acc[key].items.push(item);
      return acc;
    },
    {} as Record<string, { restaurant: Restaurant; items: FoodItemWithRestaurant[] }>
  );

  async function toggleItem(foodItemId: string) {
    setLoading(foodItemId);
    const isOnMenu = menuIds.has(foodItemId);

    const res = await fetch("/api/menu", {
      method: isOnMenu ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ foodItemId }),
    });

    if (res.ok) {
      setMenuIds((prev) => {
        const next = new Set(prev);
        if (isOnMenu) next.delete(foodItemId);
        else next.add(foodItemId);
        return next;
      });
    }
    setLoading(null);
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Check className="w-4 h-4 text-green-500" />
        {menuIds.size} items on your menu
      </div>

      {Object.values(grouped).map(({ restaurant, items }) => (
        <div key={restaurant.slug} className="space-y-3">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: restaurant.brand_color || "#ccc" }}
            />
            <h2 className="text-lg font-semibold">{restaurant.name}</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((item) => {
              const onMenu = menuIds.has(item.id);
              return (
                <Card
                  key={item.id}
                  className={`transition-colors ${
                    onMenu ? "border-orange-300 bg-orange-50/50" : ""
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="font-medium truncate">{item.name}</h3>
                        {item.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                            {item.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {formatCentsCompact(item.fan_price_cents)}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            You earn {formatCentsCompact(item.base_price_cents)}
                          </span>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant={onMenu ? "outline" : "default"}
                        className={
                          onMenu
                            ? "shrink-0"
                            : "shrink-0 bg-orange-500 hover:bg-orange-600"
                        }
                        disabled={loading === item.id}
                        onClick={() => toggleItem(item.id)}
                      >
                        {onMenu ? (
                          <>
                            <Minus className="w-3 h-3 mr-1" /> Remove
                          </>
                        ) : (
                          <>
                            <Plus className="w-3 h-3 mr-1" /> Add
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
