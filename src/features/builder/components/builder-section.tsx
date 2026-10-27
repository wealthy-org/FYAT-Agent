import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/ui/section-heading";

import { BuilderPlayground } from "./builder-playground";

export function BuilderSection() {
  return (
    <Section id="builder" aria-labelledby="builder-title">
      <Container>
        <SectionHeading
          id="builder-title"
          eyebrow="01 / Build"
          title="The Transaction Builder"
          description="Configure a bounded mandate, preview the execution flow, and copy the SDK code."
        />
        <BuilderPlayground />
      </Container>
    </Section>
  );
}