import { Container } from "@/components/layout/container";
import { ToneSection } from "@/components/layout/tone-section";
import { ExecHeading } from "@/components/ui/exec-heading";
import { Reveal } from "@/components/ui/reveal";

import { graphNodes } from "../data";

export function ExecutionGraph() {
  return (
    <ToneSection tone="dark" aria-labelledby="graph-title">
      <Container>
        <ExecHeading
          id="graph-title"
          tone="dark"
          index="02"
          label="One graph"
          title={
            <>
              Plan. Mandate. Onchain.
              <br />
              One execution graph.
            </>
          }
        />

        <ul className="mt-14 grid gap-4 md:grid-cols-3">
          {graphNodes.map((node, i) => (
            <li key={node.id}>
              <Reveal delay={i * 120} className="h-full">
                <article className="h-full rounded-2xl border border-border-subtle bg-surface p-7 transition duration-500 hover:-translate-y-1 hover:border-border-strong hover:bg-surface-raised hover:shadow-glow">
                  <h3 className="font-display text-xl">{node.title}</h3>
                  <p className="mt-4 text-sm text-fg">{node.lead}</p>
                  <p className="mt-3 text-sm text-fg-muted">{node.body}</p>
                </article>
              </Reveal>
            </li>
          ))}
        </ul>
      </Container>
    </ToneSection>
  );
}