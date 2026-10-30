import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowRight, Gift, CreditCard, Zap } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 via-white to-white">
      {/* Nav */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur border-b">
        <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="text-xl font-bold">
            <span className="text-orange-500">Food</span>Me
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/signin">
              <Button variant="ghost" size="sm">
                Sign In
              </Button>
            </Link>
            <Link href="/signin">
              <Button size="sm" className="bg-orange-500 hover:bg-orange-600">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-4 pt-24 pb-16 text-center">
        <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight">
          Feed your favorite
          <br />
          <span className="text-orange-500">creators</span>
        </h1>
        <p className="mt-6 text-lg text-muted-foreground max-w-2xl mx-auto">
          Buy a Big Mac, Frosty, or Burrito Bowl for the creators you love.
          They cash out as restaurant gift cards. It&apos;s fun, it&apos;s easy,
          and it actually means something.
        </p>
        <div className="mt-8 flex items-center justify-center gap-3">
          <Link href="/signin">
            <Button size="lg" className="bg-orange-500 hover:bg-orange-600">
              Start Feeding <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
          <Link href="/signin">
            <Button size="lg" variant="outline">
              I&apos;m a Creator
            </Button>
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-12">How it works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <Gift className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="font-semibold text-lg">Pick a food item</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Browse your favorite creator&apos;s menu and pick something
                delicious to send them.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="font-semibold text-lg">Send it to them</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Pay securely and add a message. Your creator gets notified
                instantly, even live on stream.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6 text-center">
              <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-orange-500" />
              </div>
              <h3 className="font-semibold text-lg">They cash out</h3>
              <p className="text-sm text-muted-foreground mt-2">
                Credits add up. Creators cash out as real restaurant gift cards
                whenever they want.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Example menu preview */}
      <section className="max-w-5xl mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-4">
          Every creator gets their own page
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-lg mx-auto">
          Like <span className="font-mono text-sm bg-muted px-2 py-0.5 rounded">foodme.com/yourname</span> &mdash;
          fans browse your food menu and send you meals with a click.
        </p>

        <div className="max-w-md mx-auto">
          <Card className="border-2 border-orange-200">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-orange-200 flex items-center justify-center text-lg font-bold">
                  F
                </div>
                <div>
                  <div className="font-bold">Leon</div>
                  <div className="text-xs text-muted-foreground">
                    Streamer & content creator
                  </div>
                </div>
              </div>

              {[
                { name: "Big Mac", restaurant: "McDonald's", price: "$8.40", color: "#DA291C" },
                { name: "Burrito Bowl", restaurant: "Chipotle", price: "$13.20", color: "#A81612" },
                { name: "Iced Latte", restaurant: "Starbucks", price: "$7.20", color: "#00704A" },
              ].map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.color }}
                    />
                    <div>
                      <div className="font-medium text-sm">{item.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {item.restaurant}
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    className="bg-orange-500 hover:bg-orange-600 h-7 text-xs"
                  >
                    {item.price}
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to get fed?</h2>
        <p className="text-muted-foreground mb-8">
          Set up your page in 60 seconds. Start receiving food from fans today.
        </p>
        <Link href="/signin">
          <Button size="lg" className="bg-orange-500 hover:bg-orange-600">
            Create Your Page <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="max-w-5xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>
            <span className="font-bold text-foreground">
              <span className="text-orange-500">Food</span>Me
            </span>{" "}
            &mdash; Buy food for creators. They cash out as gift cards.
          </p>
        </div>
      </footer>
    </div>
  );
}
