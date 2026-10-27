import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/ui/section-heading";

import { platformFeatures } from "../data";
import { FeatureRow } from "./feature-row";

export function PlatformSection() {
  return (
    <Section id="platform" aria-labelledby="platform-title">
      <Container>
        <SectionHeading
          id="platform-title"
          align="center"
          eyebrow="The platform"
          title="Built for agent execution."
          description="Everything autonomous applications need to build, bound, and verify Solana transactions."
        />

        <div className="space-y-6">
          {platformFeatures.map((feature, index) => (
            <FeatureRow
              key={feature.id}
              feature={feature}
              reversed={index % 2 === 1}
            />
          ))}
        </div>
      </Container>
    </Section>
  );
}