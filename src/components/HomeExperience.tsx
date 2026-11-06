"use client";

import { SmoothScroll } from "@/components/scroll/SmoothScroll";
import { HeroExploded } from "@/components/HeroExploded";
import { Services } from "@/components/sections/Services";
import { ContactCta } from "@/components/sections/ContactCta";

export function HomeExperience({ storeShowcase }: { storeShowcase: React.ReactNode }) {
  return (
    <SmoothScroll>
      <main>
        <HeroExploded />
        {storeShowcase}
        <Services />
        <ContactCta />
      </main>
    </SmoothScroll>
  );
}
