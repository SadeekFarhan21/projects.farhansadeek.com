import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FulfillForm } from "./fulfill-form";

export default async function AdminCashoutsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  // TODO: Replace with proper admin role check
  // For now, this page is accessible by any logged-in user

  const supabase = await createClient();

  const { data: cashouts } = await supabase
    .from("cashout_requests")
    .select("*, restaurant:restaurants(name), creator:users(username, display_name, email)")
    .order("created_at", { ascending: false });

  const pending = cashouts?.filter((c) => c.status === "pending") || [];
  const others = cashouts?.filter((c) => c.status !== "pending") || [];

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admin: Cashout Requests</h1>
        <p className="text-muted-foreground">
          Manually fulfill gift card requests
        </p>
      </div>

      {/* Pending requests */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Pending
            {pending.length > 0 && (
              <Badge className="bg-orange-500">{pending.length}</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {pending.length === 0 ? (
            <p className="text-muted-foreground text-sm">No pending requests</p>
          ) : (
            <div className="space-y-4">
              {pending.map((c) => {
                const creator = c.creator as { username: string; display_name: string; email: string };
                const restaurant = c.restaurant as { name: string };
                return (
                  <div key={c.id} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="font-medium">
                          {creator.display_name} (@{creator.username})
                        </div>
                        <div className="text-sm text-muted-foreground">
                          {restaurant.name} &middot; ${c.gift_card_denomination} gift card
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Email: {c.delivery_email}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Requested: {new Date(c.created_at).toLocaleString()}
                        </div>
                      </div>
                      <Badge variant="secondary">pending</Badge>
                    </div>
                    <FulfillForm cashoutId={c.id} />
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* History */}
      {others.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {others.map((c) => {
                const creator = c.creator as { username: string; display_name: string };
                const restaurant = c.restaurant as { name: string };
                return (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-2 border-b last:border-0 text-sm"
                  >
                    <div>
                      <span className="font-medium">
                        {creator.display_name}
                      </span>{" "}
                      &middot; {restaurant.name} ${c.gift_card_denomination}
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
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
