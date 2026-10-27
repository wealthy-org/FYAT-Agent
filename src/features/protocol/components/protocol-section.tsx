import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";

import { protocolPrimitives } from "../data";

export function ProtocolSection() {
  return (
    <Section id="security" aria-labelledby="protocol-title">
      <Container>
        <SectionHeading
          id="protocol-title"
          eyebrow="02 / Protocol"
          title="Session key, PDA vault, policy check. One enforcement path."
        />

        <ul className="grid gap-4 md:grid-cols-3">
          {protocolPrimitives.map(({ id, title, description, icon: Icon }) => (
            <li key={id}>
              <Card className="h-full">
                <span className="grid size-10 place-items-center rounded-xl border border-border-subtle bg-surface-raised text-brand-400">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <h3 className="mt-5 font-display text-lg font-medium">
                  {title}
                </h3>
                <p className="mt-2 text-sm text-fg-muted">{description}</p>
              </Card>
            </li>
          ))}
        </ul>
      </Container>
    </Section>
  );
}