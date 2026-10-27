"use client";

import { Card } from "@/components/ui/card";

import { useMandateForm } from "../hooks/use-mandate-form";
import { MandateConfigurator } from "./mandate-configurator";

/** bigint tidak bisa di-JSON.stringify secara bawaan. */
function bigintReplacer(_key: string, value: unknown): unknown {
  return typeof value === "bigint" ? value.toString() : value;
}

export function BuilderPlayground() {
  const form = useMandateForm();

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <MandateConfigurator form={form} />

      {/* TEMP (6a): dihapus dan diganti Flow Preview + Code Preview di 6b/6c */}
      <Card className="overflow-hidden">
        <p className="text-xs text-fg-subtle">Parsed config (temporary)</p>
        <pre className="mt-3 overflow-x-auto font-mono text-xs leading-6 text-brand-200">
          {form.config
            ? JSON.stringify(form.config, bigintReplacer, 2)
            : "Form is not valid yet."}
        </pre>
      </Card>
    </div>
  );
}