"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import {
  motion,
  useMotionValueEvent,
  useScroll,
  type Variants,
} from "framer-motion";
import { useState } from "react";

const links = [
  { href: "#features", label: "Features" },
  { href: "#models", label: "Models" },
  { href: "#specs", label: "Specs" },
  { href: "#flow", label: "How it works" },
];

const navVariants: Variants = {
  hidden: { y: "-110%", opacity: 0 },
  visible: { y: 0, opacity: 1 },
};

export default function Nav() {
  const { scrollY } = useScroll();
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useMotionValueEvent(scrollY, "change", (current) => {
    const previous = scrollY.getPrevious() ?? 0;
    const delta = current - previous;
    setScrolled(current > 12);
    if (current < 80) {
      setHidden(false);
      return;
    }
    if (delta > 6) setHidden(true);
    else if (delta < -6) setHidden(false);
  });

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={hidden ? "hidden" : "visible"}
      variants={navVariants}
      transition={{ type: "spring", stiffness: 220, damping: 28, mass: 0.7 }}
      className={`fixed inset-x-0 top-0 z-50 backdrop-blur-xl transition-colors duration-300 ${
        scrolled
          ? "bg-neutral-950/80 border-b border-white/[0.06]"
          : "bg-neutral-950/40 border-b border-transparent"
      }`}
    >
      <div className="mx-auto max-w-6xl px-5 h-14 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src="/icon.png"
            alt="Treena"
            width={26}
            height={26}
            className="rounded-md ring-1 ring-white/10 group-hover:ring-emerald-500/40 transition"
          />
          <span className="font-semibold tracking-tight text-[15px] text-neutral-50">
            Treena
          </span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-sm text-neutral-400">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="relative hover:text-neutral-50 transition-colors"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <motion.a
          href="#get-started"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.97 }}
          transition={{ type: "spring", stiffness: 380, damping: 22 }}
          className="btn-neon inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium"
        >
          Get started
          <ArrowRight className="size-4" strokeWidth={2.5} />
        </motion.a>
      </div>
    </motion.header>
  );
}
