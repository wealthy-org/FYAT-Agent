import { Container } from "@/components/layout/container";
import { ToneSection } from "@/components/layout/tone-section";
import { Button } from "@/components/ui/button";
import { ExecHeading } from "@/components/ui/exec-heading";
import { Reveal } from "@/components/ui/reveal";

import { receiptRecords, receiptRows } from "../data";

export function ReceiptPreview() {
  return (
    <ToneSection tone="dark" aria-labelledby="receipts-preview-title">
      <Container>
        <ExecHeading
          id="receipts-preview-title"
          tone="dark"
          index="04"
          label="Receipts"
          title="Execution receipts"
          description="Every action has a trace from authorization to final transaction."
        />

        <div className="mt-14 grid items-center gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-16">
          <Reveal>
            <div className="relative isolate overflow-hidden rounded-3xl bg-[linear-gradient(135deg,#4c1d95,#6d28d9_45%,#a855f7)] p-6 sm:p-10">
              <div
                aria-hidden="true"
                className="receipt-glow absolute -left-1/4 -top-1/4 -z-10 size-3/4 rounded-full bg-[radial-gradient(closest-side,rgb(216_180_254/0.55),transparent)]"
              />
              <div
                aria-hidden="true"
                className="dot-grid absolute inset-0 -z-10 opacity-40"
              />

              <div className="rounded-2xl bg-[#0c0914] p-6 font-mono text-xs shadow-[0_30px_60px_-20px_rgb(0_0_0/0.7)] ring-1 ring-white/10">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <span className="font-semibold text-fg">FYAT #0184</span>
                  <span className="text-[10px] tracking-[0.18em] text-fg-subtle">
                    EXAMPLE RECEIPT
                  </span>
                </div>

                <dl>
                  {receiptRows.map((row, i) => (
                    <Reveal
                      key={row.label}
                      delay={250 + i * 110}
                      className="flex items-center justify-between border-b border-white/10 py-3 last:border-b-0"
                    >
                      <dt className="text-fg-subtle">{row.label}</dt>
                      <dd
                        className={
                          "accent" in row ? "font-semibold text-success" : "text-fg"
                        }
                      >
                        {row.value}
                      </dd>
                    </Reveal>
                  ))}
                </dl>
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal delay={150}>
              <h3 className="font-display text-lg">Every receipt records</h3>
            </Reveal>

            <ul className="mt-5">
              {receiptRecords.map((record, i) => (
                <li key={record}>
                  <Reveal
                    delay={250 + i * 80}
                    className="border-t border-border-subtle py-3.5 text-sm text-fg-muted transition-colors hover:text-brand-200"
                  >
                    {record}
                  </Reveal>
                </li>
              ))}
            </ul>

            <Reveal delay={850} className="mt-8">
              <Button href="/builder#receipts" variant="secondary">
                View live receipts
              </Button>
            </Reveal>
          </div>
        </div>
      </Container>
    </ToneSection>
  );
}