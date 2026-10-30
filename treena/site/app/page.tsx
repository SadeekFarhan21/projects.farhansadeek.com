import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import SocialBand from "@/components/SocialBand";
import Features from "@/components/Features";
import Models from "@/components/Models";
import Specs from "@/components/Specs";
import Flow from "@/components/Flow";
import CTA from "@/components/CTA";
import Footer from "@/components/Footer";

export default function Home() {
  return (
    <main className="relative">
      <Nav />
      <Hero />
      <SocialBand />
      <Features />
      <Models />
      <Specs />
      <Flow />
      <CTA />
      <Footer />
    </main>
  );
}
