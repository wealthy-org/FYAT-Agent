"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

import { MIN_PASSPHRASE_LENGTH, isPassphraseValid } from "../lib/session-vault";
import type { MandateCreatorController } from "../mandate-creator-types";

type SessionVaultSectionProps = {
  walletConnected: boolean;
  executeBusy: boolean;
  controller: MandateCreatorController;
};

const inputClass =
  "mt-2 w-full rounded-xl border border-border-subtle bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-400";

export function SessionVaultSection({
  walletConnected,
  executeBusy,
  controller,
}: SessionVaultSectionProps) {
  const [passphrase, setPassphrase] = useState("");
  const [restorePda, setRestorePda] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const activeMandate = controller.activeMandate;

  async function handleSave() {
    setError("");
    setMessage("");

    try {
      await controller.saveSession(passphrase);
      setMessage("The session was encrypted and saved in this browser.");
      controller.refreshStoredSessions();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to save the session.",
      );
    }
  }

  async function handleRestore() {
    setError("");
    setMessage("");

    if (!restorePda.trim()) {
      setError("Select the mandate PDA you want to restore.");
      return;
    }

    try {
      await controller.restoreSession(restorePda, passphrase);
      setMessage(
        "The session was restored and verified against the on-chain data.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Failed to restore the session.",
      );
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-border-subtle p-4">
      <h4 className="font-medium">Session Key Vault</h4>

      <p className="mt-1 text-sm text-fg-muted">
        Save the session key with a passphrase so it can be restored after
        reloading the page. Do not share your passphrase.
      </p>

      <label
        htmlFor="session-passphrase"
        className="mt-4 block text-sm font-medium"
      >
        Passphrase
      </label>

      <input
        id="session-passphrase"
        type="password"
        autoComplete="new-password"
        value={passphrase}
        onChange={(event) => setPassphrase(event.target.value)}
        minLength={MIN_PASSPHRASE_LENGTH}
        placeholder={`At least ${MIN_PASSPHRASE_LENGTH} characters`}
        className={inputClass}
      />

      <Button
        className="mt-3 w-full"
        disabled={
          !walletConnected ||
          !activeMandate ||
          !controller.sessionPubkey ||
          controller.busy ||
          controller.sessionBusy ||
          executeBusy ||
          !isPassphraseValid(passphrase)
        }
        onClick={() => void handleSave()}
      >
        {controller.sessionBusy
          ? "Saving session..."
          : "Encrypt & Save Session"}
      </Button>

      <div className="mt-5 border-t border-border-subtle pt-4">
        <label htmlFor="restore-mandate" className="block text-sm font-medium">
          Restore session by mandate PDA
        </label>

        <select
          id="restore-mandate"
          value={restorePda}
          onChange={(event) => setRestorePda(event.target.value)}
          className={inputClass}
        >
          <option value="">Select a saved session...</option>

          {controller.storedSessions.map((pda) => (
            <option key={pda} value={pda}>
              {pda}
            </option>
          ))}
        </select>

        <label
          htmlFor="restore-manual-pda"
          className="mt-3 block text-sm font-medium"
        >
          Or enter the PDA manually
        </label>

        <input
          id="restore-manual-pda"
          type="text"
          value={restorePda}
          onChange={(event) => setRestorePda(event.target.value)}
          placeholder="Mandate PDA"
          className={inputClass}
        />

        <Button
          className="mt-3 w-full"
          disabled={
            !walletConnected ||
            !restorePda.trim() ||
            !passphrase ||
            controller.busy ||
            controller.sessionBusy ||
            executeBusy
          }
          onClick={() => void handleRestore()}
        >
          {controller.sessionBusy
            ? "Restoring session..."
            : "Restore & Verify Session"}
        </Button>
      </div>

      {message && (
        <p aria-live="polite" className="mt-3 break-all text-sm text-success">
          {message}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 break-all text-sm text-danger">
          {error}
        </p>
      )}

      <p className="mt-3 text-xs text-fg-subtle">
        The session is stored in this browser. Clearing browser data may
        remove the encrypted copy. Store your passphrase securely.
      </p>
    </section>
  );
}
