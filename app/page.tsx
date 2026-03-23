import { MarketingTopBar } from "@/components/marketing-top-bar"
import { HeroSection } from "@/components/sections/hero-section"
import { TextRevealSection } from "@/components/sections/text-reveal-section"
import { FeatureCardsSection } from "@/components/sections/feature-cards-section"
import { StickyProductSection } from "@/components/sections/sticky-product-section"
import { StatsSection } from "@/components/sections/stats-section"
import { TestimonialSection } from "@/components/sections/testimonial-section"
import { FAQSection } from "@/components/sections/faq-section"
import { CTASection } from "@/components/sections/cta-section"
import { Footer } from "@/components/sections/footer"

export default function Home() {
  return (
    <main className="bg-background text-foreground min-h-screen">
      <MarketingTopBar />
      <HeroSection />
      <TextRevealSection />
      <FeatureCardsSection />
      <StickyProductSection />
      <StatsSection />
      <TestimonialSection />
      <FAQSection />
      <CTASection />
      <Footer />
    </main>
  )
}
