"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export function FulfillForm({ cashoutId }: { cashoutId: string }) {
  const [giftCardCode, setGiftCardCode] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleFulfill() {
    if (!giftCardCode.trim()) {
      toast.error("Enter the gift card code");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/admin/fulfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cashoutId, giftCardCode: giftCardCode.trim() }),
    });

    setLoading(false);

    if (res.ok) {
      toast.success("Cashout fulfilled!");
      window.location.reload();
    } else {
      const data = await res.json();
      toast.error(data.error || "Failed to fulfill");
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        value={giftCardCode}
        onChange={(e) => setGiftCardCode(e.target.value)}
        placeholder="Enter gift card code..."
        className="flex-1"
      />
      <Button
        onClick={handleFulfill}
        disabled={loading || !giftCardCode.trim()}
        className="bg-green-600 hover:bg-green-700"
        size="sm"
      >
        {loading ? "..." : "Fulfill"}
      </Button>
    </div>
  );
}
