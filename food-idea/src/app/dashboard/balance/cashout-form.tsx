"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CASHOUT_DENOMINATIONS } from "@/lib/constants";
import { formatCents } from "@/lib/pricing";
import { toast } from "sonner";

type BalanceInfo = {
  restaurantId: string;
  restaurantName: string;
  balanceCents: number;
};

export function CashoutForm({
  balances,
  userEmail,
}: {
  balances: BalanceInfo[];
  userEmail: string;
}) {
  const [selectedRestaurant, setSelectedRestaurant] = useState<string>("");
  const [selectedDenomination, setSelectedDenomination] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  const currentBalance =
    balances.find((b) => b.restaurantId === selectedRestaurant)?.balanceCents || 0;

  // Available denominations based on balance (in cents)
  const availableDenominations = CASHOUT_DENOMINATIONS.filter(
    (d) => d <= currentBalance
  );

  async function handleCashout() {
    if (!selectedRestaurant || !selectedDenomination) return;

    setLoading(true);
    const res = await fetch("/api/cashout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        restaurantId: selectedRestaurant,
        denominationCents: selectedDenomination,
        deliveryEmail: userEmail,
      }),
    });

    const data = await res.json();
    setLoading(false);

    if (res.ok) {
      toast.success("Cashout request submitted! We'll send your gift card soon.");
      setSelectedRestaurant("");
      setSelectedDenomination(0);
    } else {
      toast.error(data.error || "Failed to submit cashout");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Cash Out</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Restaurant</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {balances.map((b) => (
              <button
                key={b.restaurantId}
                onClick={() => {
                  setSelectedRestaurant(b.restaurantId);
                  setSelectedDenomination(0);
                }}
                className={`rounded-lg border-2 p-3 text-left transition-colors text-sm ${
                  selectedRestaurant === b.restaurantId
                    ? "border-orange-500 bg-orange-50"
                    : "border-muted hover:border-orange-200"
                }`}
              >
                <div className="font-medium">{b.restaurantName}</div>
                <div className="text-muted-foreground text-xs">
                  {formatCents(b.balanceCents)} available
                </div>
              </button>
            ))}
          </div>
        </div>

        {selectedRestaurant && (
          <div className="space-y-2">
            <Label>Gift Card Amount</Label>
            {availableDenominations.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                Not enough balance. You need at least{" "}
                {formatCents(CASHOUT_DENOMINATIONS[0])} to cash out.
              </p>
            ) : (
              <div className="flex gap-2">
                {availableDenominations.map((d) => (
                  <button
                    key={d}
                    onClick={() => setSelectedDenomination(d)}
                    className={`rounded-lg border-2 px-4 py-2 font-medium transition-colors ${
                      selectedDenomination === d
                        ? "border-orange-500 bg-orange-50"
                        : "border-muted hover:border-orange-200"
                    }`}
                  >
                    {formatCents(d)}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {selectedDenomination > 0 && (
          <div className="pt-2 border-t">
            <p className="text-sm text-muted-foreground mb-3">
              Gift card will be sent to <strong>{userEmail}</strong>
            </p>
            <Button
              onClick={handleCashout}
              className="bg-orange-500 hover:bg-orange-600"
              disabled={loading}
            >
              {loading ? "Submitting..." : `Cash out ${formatCents(selectedDenomination)} gift card`}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
