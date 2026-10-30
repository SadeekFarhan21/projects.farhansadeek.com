import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCents } from "@/lib/pricing";
import { CashoutForm } from "./cashout-form";
import type { CreatorBalanceWithRestaurant, CashoutRequestWithRestaurant } from "@/types/database";

export default async function BalancePage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const supabase = await createClient();

  // Fetch balances with restaurant info
  const { data: balances } = await supabase
    .from("creator_balances")
    .select("*, restaurant:restaurants(*)")
    .eq("creator_id", session.user.id)
    .order("balance_cents", { ascending: false }) as {
    data: CreatorBalanceWithRestaurant[] | null;
  };

  // Fetch recent cashout requests
  const { data: cashouts } = await supabase
    .from("cashout_requests")
    .select("*, restaurant:restaurants(*)")
    .eq("creator_id", session.user.id)
    .order("created_at", { ascending: false })
    .limit(10) as {
    data: CashoutRequestWithRestaurant[] | null;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Balance & Cash Out</h1>
        <p className="text-muted-foreground">
          Your credits by restaurant. Cash out as gift cards.
        </p>
      </div>

      {/* Balance cards */}
      {!balances || balances.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <p>No balance yet. Share your page to start receiving food!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {balances.map((balance) => (
            <Card key={balance.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{
                      backgroundColor: balance.restaurant.brand_color || "#ccc",
                    }}
                  />
                  <CardTitle className="text-base">
                    {balance.restaurant.name}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-500">
                  {formatCents(balance.balance_cents)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Lifetime: {formatCents(balance.lifetime_earned_cents)}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Cashout form */}
      {balances && balances.length > 0 && (
        <CashoutForm
          balances={balances.map((b) => ({
            restaurantId: b.restaurant_id,
            restaurantName: b.restaurant.name,
            balanceCents: b.balance_cents,
          }))}
          userEmail={session.user.email || ""}
        />
      )}

      {/* Cashout history */}
      {cashouts && cashouts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Cashout History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cashouts.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <span className="font-medium">{c.restaurant.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      &middot; ${c.gift_card_denomination} gift card
                    </span>
                  </div>
                  <Badge
                    variant={
                      c.status === "fulfilled"
                        ? "default"
                        : c.status === "failed"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {c.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
