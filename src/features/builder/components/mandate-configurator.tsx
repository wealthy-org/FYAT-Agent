"use client";

import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SelectField, TextField } from "@/components/ui/form-fields";

import {
  ACTION_OPTIONS,
  ASSET_LABEL,
  EXPIRY_OPTIONS,
  VENUE_OPTIONS,
} from "../constants";
import type { MandateForm } from "../hooks/use-mandate-form";

type MandateConfiguratorProps = {
  form: MandateForm;
};

export function MandateConfigurator({ form }: MandateConfiguratorProps) {
  const { values, setField, touchField, errorFor } = form;

  return (
    <Card id="playground-configure" className="scroll-mt-24 p-5 md:p-6">
      <Eyebrow>Step 2 / Configure</Eyebrow>
      <h3 className="font-display mt-2 text-xl font-medium">
        Mandate Configurator
      </h3>
      <p className="text-fg-muted mt-2 text-sm">
        Set the allowed action, destination, spending caps, and expiry. The next
        step creates this mandate on-chain.
      </p>

      {/* Tidak ada submit di step ini; cegah Enter me-reload halaman */}
      <form
        noValidate
        onSubmit={(event) => event.preventDefault()}
        className="@container mt-8 space-y-5"
      >
        <SegmentedControl
          legend="Action"
          name="mandate-action"
          value={values.action}
          options={ACTION_OPTIONS}
          onChange={(action) => setField("action", action)}
        />

        <div>
          <span className="text-fg-muted mb-2 block text-xs">Asset</span>
          <p className="border-border-subtle bg-surface-raised text-fg-muted flex h-11 items-center rounded-xl border px-4 text-sm">
            {ASSET_LABEL}
          </p>
        </div>

        {values.action === "SWAP" ? (
          <SelectField
            label="Venue"
            value={values.venue}
            options={VENUE_OPTIONS}
            onChange={(venue) => setField("venue", venue)}
            onBlur={() => touchField("venue")}
            error={errorFor("venue")}
            hint="The only program the agent may route swaps through."
          />
        ) : (
          <TextField
            label="Allowed recipient"
            value={values.recipient}
            onChange={(event) => setField("recipient", event.target.value)}
            onBlur={() => touchField("recipient")}
            error={errorFor("recipient")}
            hint="The agent can send funds to this address only."
            placeholder="Solana address"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            maxLength={64}
            inputClassName="font-mono"
          />
        )}

        <div className="grid gap-5 @md:grid-cols-2">
          <TextField
            label="Max per action"
            value={values.maxPerAction}
            onChange={(event) => setField("maxPerAction", event.target.value)}
            onBlur={() => touchField("maxPerAction")}
            error={errorFor("maxPerAction")}
            suffix="USDC"
            inputMode="decimal"
            autoComplete="off"
            maxLength={16}
          />
          <TextField
            label="Max total budget"
            value={values.maxTotal}
            onChange={(event) => setField("maxTotal", event.target.value)}
            onBlur={() => touchField("maxTotal")}
            error={errorFor("maxTotal")}
            suffix="USDC"
            inputMode="decimal"
            autoComplete="off"
            maxLength={16}
          />
        </div>

        <SelectField
          label="Expires in"
          value={values.expiresInHours}
          options={EXPIRY_OPTIONS}
          onChange={(hours) => setField("expiresInHours", hours)}
          onBlur={() => touchField("expiresInHours")}
          error={errorFor("expiresInHours")}
        />
      </form>
    </Card>
  );
}
