import { useMemo } from "react";

import { CodeBlock } from "@/components/ui/code-block";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { Tabs, type TabItem } from "@/components/ui/tabs";

import { generateMandateJson, generateSdkSnippet } from "../snippets";
import type { AgentAttempt, MandateConfig } from "../types";

type CodePreviewProps = {
  config: MandateConfig | null;
  attempt: AgentAttempt | null;
};

function EmptyCode() {
  return (
    <p className="border-border-subtle text-fg-muted rounded-xl border border-dashed p-6 text-sm">
      Complete the mandate configurator to generate code.
    </p>
  );
}

export function CodePreview({ config, attempt }: CodePreviewProps) {
  const tabs = useMemo<readonly TabItem[]>(
    () => [
      {
        id: "sdk",
        label: "TypeScript SDK",
        panel: config ? (
          <CodeBlock
            filename="agent.ts"
            label="TypeScript SDK example"
            code={generateSdkSnippet(config, attempt)}
          />
        ) : (
          <EmptyCode />
        ),
      },
      {
        id: "json",
        label: "Mandate JSON",
        panel: config ? (
          <CodeBlock
            filename="mandate.json"
            label="Mandate JSON payload"
            code={generateMandateJson(config)}
          />
        ) : (
          <EmptyCode />
        ),
      },
    ],
    [config, attempt],
  );

  return (
    <Card className="p-6 md:p-8">
      <Eyebrow>Step 6 / Review</Eyebrow>
      <h3 className="font-display mt-2 mb-6 text-xl font-medium">
        Generated from your mandate
      </h3>

      <Tabs label="Code preview" tabs={tabs} />

      <p className="text-fg-subtle mt-6 text-xs">
        Illustrative API example. Not production SDK documentation.
      </p>
    </Card>
  );
}
