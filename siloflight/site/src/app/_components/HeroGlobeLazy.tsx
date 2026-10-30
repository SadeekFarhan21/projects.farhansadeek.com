"use client";

import dynamic from "next/dynamic";

const HeroGlobe = dynamic(() => import("./HeroGlobe"), {
  ssr: false,
  loading: () => null,
});

export default function HeroGlobeLazy(props: { className?: string }) {
  return <HeroGlobe {...props} />;
}
