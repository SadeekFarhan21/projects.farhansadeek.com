"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { FoodItemCard } from "@/components/food-item-card";
import { CheckoutModal } from "@/components/checkout-modal";
import type { FoodItemWithRestaurant, Restaurant } from "@/types/database";

type RecentOrder = {
  id: string;
  fanName: string;
  foodName: string;
  message: string | null;
  createdAt: string;
};

type Creator = {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
};

export function CreatorPage({
  creator,
  foodItems,
  recentOrders,
}: {
  creator: Creator;
  foodItems: FoodItemWithRestaurant[];
  recentOrders: RecentOrder[];
}) {
  const [selectedItem, setSelectedItem] = useState<FoodItemWithRestaurant | null>(null);

  // Group items by restaurant
  const grouped = foodItems.reduce(
    (acc, item) => {
      const slug = item.restaurant.slug;
      if (!acc[slug]) acc[slug] = { restaurant: item.restaurant, items: [] };
      acc[slug].items.push(item);
      return acc;
    },
    {} as Record<string, { restaurant: Restaurant; items: FoodItemWithRestaurant[] }>
  );

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-3xl mx-auto px-4 py-8">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={creator.avatar_url || undefined} />
              <AvatarFallback className="text-xl bg-orange-100">
                {creator.display_name.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold">{creator.display_name}</h1>
              {creator.bio && (
                <p className="text-muted-foreground text-sm mt-0.5">
                  {creator.bio}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Food items */}
          <div className="flex-1 space-y-8">
            {Object.keys(grouped).length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-lg">No items on the menu yet</p>
                <p className="text-sm mt-1">Check back later!</p>
              </div>
            ) : (
              Object.values(grouped).map(({ restaurant, items }) => (
                <div key={restaurant.slug} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{
                        backgroundColor: restaurant.brand_color || "#ccc",
                      }}
                    />
                    <h2 className="text-lg font-semibold">{restaurant.name}</h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {items.map((item) => (
                      <FoodItemCard
                        key={item.id}
                        item={item}
                        creatorName={creator.display_name}
                        onBuy={() => setSelectedItem(item)}
                      />
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Activity sidebar */}
          {recentOrders.length > 0 && (
            <div className="w-full lg:w-64 shrink-0">
              <div className="sticky top-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Recent Activity
                </h3>
                <div className="space-y-3">
                  {recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="bg-white rounded-lg p-3 border text-sm"
                    >
                      <p>
                        <span className="font-medium">{order.fanName}</span> sent
                        a <span className="font-medium">{order.foodName}</span>
                      </p>
                      {order.message && (
                        <p className="text-muted-foreground text-xs mt-1">
                          &ldquo;{order.message}&rdquo;
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatTimeAgo(order.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Checkout modal */}
      {selectedItem && (
        <CheckoutModal
          item={selectedItem}
          creatorId={creator.id}
          creatorName={creator.display_name}
          onClose={() => setSelectedItem(null)}
        />
      )}

      {/* Footer */}
      <footer className="border-t bg-white mt-16 py-6">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            Powered by{" "}
            <a href="/" className="font-medium text-orange-500 hover:underline">
              FoodMe
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}

function formatTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
