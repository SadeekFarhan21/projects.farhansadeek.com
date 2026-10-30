"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCentsCompact } from "@/lib/pricing";
import type { FoodItemWithRestaurant } from "@/types/database";

export function CheckoutModal({
  item,
  creatorId,
  creatorName,
  onClose,
}: {
  item: FoodItemWithRestaurant;
  creatorId: string;
  creatorName: string;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleCheckout() {
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          foodItemId: item.id,
          creatorId,
          message: message.trim() || null,
          fanDisplayName: displayName.trim() || "Anonymous",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }

      // Redirect to Whop checkout
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      setError("Failed to create checkout");
      setLoading(false);
    }
  }

  return (
    <Dialog open onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            Send a {item.name} to {creatorName}
          </DialogTitle>
          <DialogDescription>
            From {item.restaurant.name} &middot;{" "}
            {formatCentsCompact(item.fan_price_cents)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="displayName">Your name (shown to creator)</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Anonymous"
              maxLength={50}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message (optional)</Label>
            <Input
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enjoy the meal!"
              maxLength={200}
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <div className="flex items-center justify-between pt-2 border-t">
            <div>
              <div className="text-sm text-muted-foreground">Total</div>
              <div className="text-xl font-bold">
                {formatCentsCompact(item.fan_price_cents)}
              </div>
            </div>
            <Button
              onClick={handleCheckout}
              className="bg-orange-500 hover:bg-orange-600"
              size="lg"
              disabled={loading}
            >
              {loading ? "Processing..." : "Send Food"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
