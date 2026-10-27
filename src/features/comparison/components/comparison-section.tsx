import { Check, X } from "lucide-react";

import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { cn } from "@/lib/cn";

import { withFyat, withoutFyat } from "../data";
import type { ComparisonSide } from "../types";

type Tone = "bad" | "good";

function ComparisonCard({ side, tone }: { side: ComparisonSide; tone: Tone }) {
  const Icon = tone === "good" ? Check : X;

  return (
    <Card variant={tone === "good" ? "glow" : "default"} className="h-full p-8">
      <h3 className="font-display text-xl font-medium">{side.title}</h3>
      <p className="mt-2 text-sm text-fg-muted">{side.description}</p>

      <ul className="mt-6 space-y-3">
        {side.points.map((point) => (
          <li key={point} className="flex items-start gap-3 text-sm">
            <Icon
              aria-hidden="true"
              className={cn(
                "mt-0.5 size-4 shrink-0",
                tone === "good" ? "text-success" : "text-danger",
              )}
            />
            <span>
              <span className="sr-only">
                {tone === "good" ? "Included: " : "Problem: "}
              </span>
              {point}
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function ComparisonSection() {
  return (
    <Section aria-labelledby="comparison-title">
      <Container>
        <SectionHeading
          id="comparison-title"
          eyebrow="04 / Execution"
          title="Before FYAT. With FYAT."
        />

        <div className="grid gap-4 md:grid-cols-2">
          <ComparisonCard side={withoutFyat} tone="bad" />
          <ComparisonCard side={withFyat} tone="good" />
        </div>
      </Container>
    </Section>
  );
}