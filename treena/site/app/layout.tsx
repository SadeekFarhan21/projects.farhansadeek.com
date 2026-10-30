import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://treena.app"),
  title: "Treena — AI coding on mobile",
  description:
    "A real IDE in your pocket. Clone repos, edit code, run commands, and ship with Claude, GPT, and Gemini — all from your phone.",
  icons: { icon: "/favicon.png" },
  openGraph: {
    title: "Treena — AI coding on mobile",
    description:
      "A real IDE in your pocket. Clone repos, edit code, run commands, and ship with AI — from your phone.",
    images: ["/icon.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Treena — AI coding on mobile",
    description:
      "A real IDE in your pocket. Clone, edit, run, and ship with AI — from your phone.",
    images: ["/icon.png"],
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
      <body
        className="min-h-screen bg-[var(--color-bg)] text-[var(--color-text)] font-sans"
        suppressHydrationWarning
      >
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
