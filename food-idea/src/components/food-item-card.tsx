"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCentsCompact } from "@/lib/pricing";
import type { FoodItemWithRestaurant } from "@/types/database";

export function FoodItemCard({
  item,
  creatorName,
  onBuy,
}: {
  item: FoodItemWithRestaurant;
  creatorName: string;
  onBuy: () => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold">{item.name}</h3>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                {item.description}
              </p>
            )}
          </div>
          <div className="text-right shrink-0">
            <div className="text-lg font-bold text-orange-500">
              {formatCentsCompact(item.fan_price_cents)}
            </div>
          </div>
        </div>
        <Button
          onClick={onBuy}
          className="w-full mt-3 bg-orange-500 hover:bg-orange-600"
          size="sm"
        >
          Buy for {creatorName}
        </Button>
      </CardContent>
    </Card>
  );
}
