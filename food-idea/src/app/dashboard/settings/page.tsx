import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { signOut } from "@/auth";
import { Button } from "@/components/ui/button";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const supabase = await createClient();
  const { data: user } = await supabase
    .from("users")
    .select("username, overlay_token")
    .eq("id", session.user.id)
    .single();

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const overlayUrl = `${appUrl}/${user?.username}/overlay?token=${user?.overlay_token}`;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Page</CardTitle>
          <CardDescription>Share this link with your audience</CardDescription>
        </CardHeader>
        <CardContent>
          <Label>Page URL</Label>
          <Input
            value={`${appUrl}/${user?.username}`}
            readOnly
            className="mt-1 font-mono text-sm"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>OBS Overlay</CardTitle>
          <CardDescription>
            Add this URL as a Browser Source in OBS to show gift alerts on stream.
            Set width to 800 and height to 200.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Label>Overlay URL</Label>
          <Input
            value={overlayUrl}
            readOnly
            className="mt-1 font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Keep this URL private. It includes your secret token.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <Button variant="outline">Sign Out</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
