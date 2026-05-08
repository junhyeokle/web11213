import { HeroSection } from "@/components/landing/hero-section";
import { FeaturesSection } from "@/components/landing/features-section";
import { HowItWorks } from "@/components/landing/how-it-works";
import { AIProtectionSection } from "@/components/landing/ai-protection-section";
import { MonitoringSection } from "@/components/landing/monitoring-section";
import { CTASection } from "@/components/landing/cta-section";

export default function HomePage() {
  return (
    <>
      <HeroSection />
      <FeaturesSection />
      <HowItWorks />
      <AIProtectionSection />
      <MonitoringSection />
      <CTASection />
    </>
  );
}
