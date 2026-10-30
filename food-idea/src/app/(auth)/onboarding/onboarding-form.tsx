"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function OnboardingForm({ userId }: { userId: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [isCreator, setIsCreator] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const usernameValid = /^[a-z0-9_]{3,20}$/.test(username);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!usernameValid) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, username, isCreator }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      setLoading(false);
      return;
    }

    router.push(isCreator ? "/dashboard" : "/");
    router.refresh();
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">Welcome to FoodMe</CardTitle>
        <CardDescription>Pick your username to get started</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">foodme.com/</span>
              <Input
                id="username"
                value={username}
                onChange={(e) =>
                  setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))
                }
                placeholder="yourname"
                maxLength={20}
              />
            </div>
            {username && !usernameValid && (
              <p className="text-sm text-red-500">
                3-20 characters, lowercase letters, numbers, and underscores only
              </p>
            )}
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <div className="space-y-3">
            <Label>What are you here for?</Label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setIsCreator(false)}
                className={`rounded-lg border-2 p-4 text-center transition-colors ${
                  !isCreator
                    ? "border-orange-500 bg-orange-50"
                    : "border-muted hover:border-orange-200"
                }`}
              >
                <div className="text-2xl mb-1">🍔</div>
                <div className="font-medium text-sm">I feed creators</div>
                <div className="text-xs text-muted-foreground">Fan account</div>
              </button>
              <button
                type="button"
                onClick={() => setIsCreator(true)}
                className={`rounded-lg border-2 p-4 text-center transition-colors ${
                  isCreator
                    ? "border-orange-500 bg-orange-50"
                    : "border-muted hover:border-orange-200"
                }`}
              >
                <div className="text-2xl mb-1">🎬</div>
                <div className="font-medium text-sm">I&apos;m a creator</div>
                <div className="text-xs text-muted-foreground">Get fed by fans</div>
              </button>
            </div>
          </div>

          <Button
            type="submit"
            className="w-full bg-orange-500 hover:bg-orange-600"
            size="lg"
            disabled={!usernameValid || loading}
          >
            {loading ? "Setting up..." : "Let's go"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
