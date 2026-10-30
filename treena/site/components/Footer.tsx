"use client";

import Image from "next/image";

export default function Footer() {
  return (
    <footer className="border-t border-white/[0.05] py-10 bg-neutral-950">
      <div className="mx-auto max-w-6xl px-5 flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-2.5">
          <Image
            src="/icon.png"
            alt="Treena"
            width={22}
            height={22}
            className="rounded-md ring-1 ring-white/10"
          />
          <span className="font-semibold tracking-tight text-sm text-neutral-50">
            Treena
          </span>
          <span className="text-xs text-neutral-500 font-mono ml-2">
            AI coding on mobile
          </span>
        </div>
        <div className="flex items-center gap-6 text-sm text-neutral-400">
          <a href="#features"  className="hover:text-neutral-50 transition-colors">Features</a>
          <a href="#models"    className="hover:text-neutral-50 transition-colors">Models</a>
          <a href="#specs"     className="hover:text-neutral-50 transition-colors">Specs</a>
          <a href="#flow"      className="hover:text-neutral-50 transition-colors">Flow</a>
          <a href="#"          className="hover:text-neutral-50 transition-colors">Privacy</a>
        </div>
        <div className="text-xs text-neutral-500 font-mono">
          © {new Date().getFullYear()} Treena
        </div>
      </div>
    </footer>
  );
}
