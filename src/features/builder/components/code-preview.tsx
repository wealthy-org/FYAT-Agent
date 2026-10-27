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
    <p className="rounded-xl border border-dashed border-border-subtle p-6 text-sm text-fg-muted">
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
      <Eyebrow>3 / Code</Eyebrow>
      <h3 className="mb-6 mt-2 font-display text-xl font-medium">
        Generated from your mandate
      </h3>

      <Tabs label="Code preview" tabs={tabs} />

      <p className="mt-6 text-xs text-fg-subtle">
        Illustrative API example. Not production SDK documentation.
      </p>
    </Card>
  );
}