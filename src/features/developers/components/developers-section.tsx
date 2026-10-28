import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { CodeBlock } from "@/components/ui/code-block";
import { SectionHeading } from "@/components/ui/section-heading";

import { sdkExample } from "../data";

export function DevelopersSection() {
  return (
    <Section id="developers" aria-labelledby="developers-title">
      <Container>
        <SectionHeading
          id="developers-title"
          align="center"
          eyebrow="Developers"
          title="Built for developers."
          description="Create a mandate, simulate the plan, and execute with a session key in a few lines."
        />

        <div className="mx-auto max-w-3xl">
          <CodeBlock
            filename="agent.ts"
            label="FYAT SDK usage example"
            code={sdkExample}
          />

          <p className="mt-4 text-center text-xs text-fg-subtle">
            Illustrative API example. Not production SDK documentation.
          </p>

          <div className="mt-8 flex justify-center">
            <Button href="/docs/playground" variant="secondary">
              Generate this from your own mandate
            </Button>
          </div>
        </div>
      </Container>
    </Section>
  );
}