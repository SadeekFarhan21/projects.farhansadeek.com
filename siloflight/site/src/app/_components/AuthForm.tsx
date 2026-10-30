"use client";

import { useActionState, useRef, useState } from "react";
import { gsap, useGSAP, prefersReducedMotion } from "@/lib/gsap";
import {
  signInWithEmail,
  signUpWithEmail,
  type AuthFormState,
} from "../actions";

type Mode = "signin" | "signup";

const initial: AuthFormState = null;

export default function AuthForm() {
  const [mode, setMode] = useState<Mode>("signin");
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithEmail,
    initial,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithEmail,
    initial,
  );

  const isSignIn = mode === "signin";
  const action = isSignIn ? signInAction : signUpAction;
  const pending = isSignIn ? signInPending : signUpPending;
  const state = isSignIn ? signInState : signUpState;

  const tabsRef = useRef<HTMLDivElement | null>(null);
  const pillRef = useRef<HTMLSpanElement | null>(null);
  const initialPlacement = useRef(true);

  useGSAP(
    () => {
      const tabs = tabsRef.current;
      const pill = pillRef.current;
      if (!tabs || !pill) return;
      const target = tabs.querySelector(
        `[data-tab="${mode}"]`,
      ) as HTMLElement | null;
      if (!target) return;
      const tRect = target.getBoundingClientRect();
      const cRect = tabs.getBoundingClientRect();
      const next = {
        x: tRect.left - cRect.left,
        y: tRect.top - cRect.top,
        width: tRect.width,
        height: tRect.height,
        autoAlpha: 1,
      };
      if (initialPlacement.current || prefersReducedMotion()) {
        initialPlacement.current = false;
        gsap.set(pill, next);
        return;
      }
      gsap.to(pill, {
        ...next,
        duration: 0.45,
        ease: "siloOut",
        overwrite: "auto",
      });
    },
    { scope: tabsRef, dependencies: [mode] },
  );

  return (
    <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-white/[0.025] p-6 backdrop-blur-sm">
      <div
        ref={tabsRef}
        className="relative mb-5 flex rounded-lg bg-white/[0.04] p-1 text-sm"
      >
        <span
          ref={pillRef}
          aria-hidden
          className="pointer-events-none absolute left-0 top-0 rounded-md bg-white/10"
          style={{
            opacity: 0,
            willChange: "transform, width, height",
          }}
        />
        <button
          type="button"
          data-tab="signin"
          onClick={() => setMode("signin")}
          className={`relative z-[1] flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${
            isSignIn ? "text-neutral-50" : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          data-tab="signup"
          onClick={() => setMode("signup")}
          className={`relative z-[1] flex-1 rounded-md px-3 py-1.5 font-medium transition-colors ${
            !isSignIn ? "text-neutral-50" : "text-neutral-400 hover:text-neutral-200"
          }`}
        >
          Sign up
        </button>
      </div>

      <form action={action} className="flex flex-col gap-3 text-left">
        {!isSignIn && (
          <Field
            label="Name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Optional"
          />
        )}
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={isSignIn ? "current-password" : "new-password"}
          required
          minLength={isSignIn ? undefined : 8}
          placeholder={isSignIn ? "" : "At least 8 characters"}
        />

        {state?.error && (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-3 py-2 text-xs text-rose-200">
            {state.error}
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          aria-busy={pending}
          className="mt-1 inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-sm font-semibold text-black shadow-lg shadow-black/40 transition-colors hover:bg-neutral-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)] disabled:opacity-60"
        >
          {pending ? "Working…" : isSignIn ? "Sign in" : "Create account"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium text-neutral-300">
      <span>{label}</span>
      <input
        {...props}
        className="h-11 rounded-xl border border-white/10 bg-white/[0.04] px-3 text-sm text-neutral-50 placeholder:text-neutral-600 outline-none transition-colors focus:border-white/30 focus:bg-white/[0.06] focus-visible:ring-2 focus-visible:ring-[var(--accent)]/60 focus-visible:ring-offset-0"
      />
    </label>
  );
}
