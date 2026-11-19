import { NETWORK_NAME } from "@/lib/network";
import { Container } from "@/components/layout/container";
import { Section } from "@/components/layout/section";
import { SectionHeading } from "@/components/ui/section-heading";

import type { ReceiptPageDto } from "../types";
import { ReceiptsFeed } from "./receipts-feed";

type ReceiptsSectionProps = {
  /** null = data tidak tersedia (misalnya database sedang bermasalah). */
  initial: ReceiptPageDto | null;
};

export function ReceiptsSection({ initial }: ReceiptsSectionProps) {
  return (
    <Section id="receipts" aria-labelledby="receipts-title">
      <Container>
        <SectionHeading
          id="receipts-title"
          eyebrow="02 / Receipts"
          title="Execution receipts"
          description="Every attempt under a mandate leaves a public record: what the agent tried, and whether the policy let it through."
        />

        <ReceiptsFeed initial={initial} />

        <p className="text-fg-subtle mt-6 text-xs">
          Rows marked PASS link to real {NETWORK_NAME} transactions.
        </p>
      </Container>
    </Section>
  );
}
