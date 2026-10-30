import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCents } from "@/lib/pricing";
import type { CreatorBalanceWithRestaurant, Order } from "@/types/database";

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const supabase = await createClient();

  // Fetch balances
  const { data: balances } = await supabase
    .from("creator_balances")
    .select("*, restaurant:restaurants(*)")
    .eq("creator_id", session.user.id) as { data: CreatorBalanceWithRestaurant[] | null };

  // Fetch recent orders
  const { data: recentOrders } = await supabase
    .from("orders")
    .select("*, food_item:food_items(name), restaurant:restaurants(name)")
    .eq("creator_id", session.user.id)
    .eq("status", "payment_complete")
    .order("created_at", { ascending: false })
    .limit(10) as { data: (Order & { food_item: { name: string }; restaurant: { name: string } })[] | null };

  const totalBalance = (balances || []).reduce((sum, b) => sum + b.balance_cents, 0);
  const totalLifetime = (balances || []).reduce((sum, b) => sum + b.lifetime_earned_cents, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back, {session.user.name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-500">
              {formatCents(totalBalance)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lifetime Earned
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCents(totalLifetime)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Gifts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {recentOrders?.length ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Balance by restaurant */}
      {balances && balances.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Balance by Restaurant</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {balances.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: b.restaurant.brand_color || "#ccc" }}
                    />
                    <span className="font-medium">{b.restaurant.name}</span>
                  </div>
                  <span className="font-bold">{formatCents(b.balance_cents)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent gifts */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Gifts</CardTitle>
        </CardHeader>
        <CardContent>
          {!recentOrders || recentOrders.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              No gifts yet. Share your page to start receiving food!
            </p>
          ) : (
            <div className="space-y-3">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <span className="font-medium">
                      {order.fan_display_name || "Anonymous"}
                    </span>{" "}
                    sent you a{" "}
                    <span className="font-medium">{order.food_item.name}</span>
                    {order.message && (
                      <p className="text-sm text-muted-foreground mt-0.5">
                        &ldquo;{order.message}&rdquo;
                      </p>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatCents(order.creator_credit_cents)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
