import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, UtensilsCrossed, Wallet, Settings, ExternalLink } from "lucide-react";
import { GiftNotificationListener } from "@/components/gift-notification-listener";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect("/signin");

  const navItems = [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/menu", label: "My Menu", icon: UtensilsCrossed },
    { href: "/dashboard/balance", label: "Balance", icon: Wallet },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top nav */}
      <header className="bg-white border-b sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="text-orange-500">Food</span>Me
          </Link>
          <div className="flex items-center gap-4">
            {session.user.username && (
              <Link
                href={`/${session.user.username}`}
                className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1"
              >
                My Page <ExternalLink className="w-3 h-3" />
              </Link>
            )}
            <div className="text-sm font-medium">{session.user.name}</div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex gap-8">
          {/* Sidebar */}
          <nav className="w-56 shrink-0 hidden md:block">
            <ul className="space-y-1">
              {navItems.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-white hover:text-foreground transition-colors"
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Main content */}
          <main className="flex-1 min-w-0">{children}</main>
          <GiftNotificationListener creatorId={session.user.id} />
        </div>
      </div>
    </div>
  );
}
