"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { useGsap } from "@/lib/useGsap";
import { gsap } from "@/lib/gsap";

export default function CTA() {
  const ref = useGsap<HTMLElement>((_ctx, scope) => {
    const q = gsap.utils.selector(scope);

    // Aura ambient breathing
    gsap.to(q("[data-cta-aura]"), {
      scale: 1.12,
      opacity: 0.85,
      duration: 4,
      ease: "sine.inOut",
      repeat: -1,
      yoyo: true,
    });

    // Parallax reveal — driven by scroll
    gsap.from(q("[data-cta-icon]"), {
      yPercent: 50,
      opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger: scope,
        start: "top bottom",
        end: "center center",
        scrub: 0.6,
      },
    });

    gsap.from(q("[data-cta-title]"), {
      yPercent: 30,
      opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger: scope,
        start: "top bottom",
        end: "center 70%",
        scrub: 0.6,
      },
    });

    gsap.from(q("[data-cta-sub]"), {
      yPercent: 20,
      opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger: scope,
        start: "top 90%",
        end: "center 75%",
        scrub: 0.6,
      },
    });

    gsap.from(q("[data-cta-button]"), {
      yPercent: 30,
      opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger: scope,
        start: "top 80%",
        end: "center 80%",
        scrub: 0.6,
      },
    });

    gsap.from(q("[data-cta-meta]"), {
      opacity: 0,
      ease: "none",
      scrollTrigger: {
        trigger: scope,
        start: "top 75%",
        end: "center 85%",
        scrub: 0.6,
      },
    });
  });

  return (
    <section
      ref={ref}
      id="get-started"
      className="relative py-28 md:py-40 overflow-hidden"
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden>
        <div
          data-cta-aura
          className="absolute left-1/2 -translate-x-1/2 top-10 w-[860px] h-[860px] bg-[radial-gradient(circle,rgba(16,185,129,0.20),transparent_60%)] blur-2xl"
        />
      </div>

      <div className="relative mx-auto max-w-3xl px-5 text-center">
        <Image
          data-cta-icon
          src="/icon.png"
          alt="Treena"
          width={80}
          height={80}
          className="mx-auto rounded-2xl ring-1 ring-white/10"
        />

        <h2
          data-cta-title
          className="mt-8 text-4xl md:text-6xl font-semibold tracking-tight leading-[1.02] gradient-text"
        >
          Your next commit
          <br />
          will come from your pocket.
        </h2>

        <p
          data-cta-sub
          className="mt-6 text-lg text-neutral-400"
        >
          Treena is in beta on iOS and Android. Join the TestFlight and start shipping from anywhere.
        </p>

        <div className="mt-10 flex items-center justify-center">
          <motion.a
            data-cta-button
            href="#"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.97 }}
            transition={{ type: "spring", stiffness: 360, damping: 22 }}
            className="btn-neon inline-flex items-center gap-2 rounded-full px-8 py-4 text-base font-medium will-change-transform"
          >
            Join the Beta
            <ArrowRight className="size-5" strokeWidth={2.5} />
          </motion.a>
        </div>

        <p
          data-cta-meta
          className="mt-6 text-xs text-neutral-500 font-mono"
        >
          iOS 16+ · Android 10+ · Free while in beta
        </p>
      </div>
    </section>
  );
}
