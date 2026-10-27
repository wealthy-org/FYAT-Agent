import { Container } from "@/components/layout/container";
import { ToneSection } from "@/components/layout/tone-section";
import { ExecHeading } from "@/components/ui/exec-heading";
import { Reveal } from "@/components/ui/reveal";

import { securityItems } from "../data";

export function SecurityGrid() {
  return (
    <ToneSection id="security" tone="light" aria-labelledby="security-title">
      <Container>
        <ExecHeading
          id="security-title"
          tone="light"
          index="05"
          label="Security"
          title="Bounded by design."
          description="FYAT gives agents scoped execution authority rather than unrestricted wallet ownership."
        />

        <ul className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {securityItems.map((item, i) => (
            <li key={item.id}>
              <Reveal
                delay={(i % 3) * 110 + Math.floor(i / 3) * 160}
                className="h-full"
              >
                <article className="h-full rounded-2xl bg-white p-7 shadow-[0_10px_40px_-24px_rgb(23_17_42/0.3)] ring-1 ring-ink-line transition duration-500 hover:-translate-y-1 hover:shadow-[0_24px_50px_-20px_rgb(124_58_237/0.4)] hover:ring-brand-500/40">
                  <span className="font-mono text-[11px] text-brand-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <h3 className="mt-8 font-display text-lg">{item.title}</h3>
                  <p className="mt-2 text-sm text-ink-muted">{item.body}</p>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </ToneSection>
  );
}