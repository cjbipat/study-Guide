import { CTASection } from "@/components/home/CTASection";
import { FeatureShowcase } from "@/components/home/FeatureShowcase";
import { FloatingElements } from "@/components/home/FloatingElements";
import { Hero } from "@/components/home/Hero";
import { InteractiveDemo } from "@/components/home/InteractiveDemo";
import { StatsSection } from "@/components/home/StatsSection";
import { WhySection } from "@/components/home/WhySection";
import { Footer } from "@/components/navigation/Footer";
import { Navbar } from "@/components/navigation/Navbar";

export default function HomePage() {
  return (
    <div className="relative flex min-h-screen flex-col">
      <Navbar />
      <main className="relative flex-1">
        <FloatingElements />
        <Hero />
        <WhySection />
        <InteractiveDemo />
        <StatsSection />
        <FeatureShowcase />
        <CTASection />
      </main>
      <Footer />
    </div>
  );
}
