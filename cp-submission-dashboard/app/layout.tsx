import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";
import { owner } from "../lib/config";

export const metadata: Metadata = {
  title: "Submission Activity",
  description:
    "Daily submission heatmap and feed across Codeforces, AtCoder, LeetCode, CodeChef, CSES, Kattis, and UVa.",
  ...(owner.iconUrl ? { icons: { icon: owner.iconUrl } } : {}),
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      {/* Browser extensions inject attributes (e.g. style="isolation:isolate") before hydration. */}
      <body className="antialiased" suppressHydrationWarning>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
