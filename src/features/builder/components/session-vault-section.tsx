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
      setMessage("Session berhasil dienkripsi dan disimpan di browser ini.");
      controller.refreshStoredSessions();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Gagal menyimpan session.",
      );
    }
  }

  async function handleRestore() {
    setError("");
    setMessage("");

    if (!restorePda.trim()) {
      setError("Pilih mandate PDA yang ingin dipulihkan.");
      return;
    }

    try {
      await controller.restoreSession(restorePda, passphrase);
      setMessage(
        "Session berhasil dipulihkan dan diverifikasi dengan data on-chain.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Gagal memulihkan session.",
      );
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-border-subtle p-4">
      <h4 className="font-medium">Session Key Vault</h4>

      <p className="mt-1 text-sm text-fg-muted">
        Simpan session key dengan passphrase agar dapat dipulihkan setelah
        halaman dimuat ulang. Passphrase tidak boleh dibagikan.
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
        placeholder={`Minimal ${MIN_PASSPHRASE_LENGTH} karakter`}
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
          ? "Menyimpan session..."
          : "Enkripsi & Simpan Session"}
      </Button>

      <div className="mt-5 border-t border-border-subtle pt-4">
        <label htmlFor="restore-mandate" className="block text-sm font-medium">
          Pulihkan session berdasarkan mandate PDA
        </label>

        <select
          id="restore-mandate"
          value={restorePda}
          onChange={(event) => setRestorePda(event.target.value)}
          className={inputClass}
        >
          <option value="">Pilih session tersimpan...</option>

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
          Atau masukkan PDA secara manual
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
            ? "Memulihkan session..."
            : "Pulihkan & Verifikasi Session"}
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
        Session tersimpan di browser ini. Menghapus data browser dapat
        menghilangkan salinan terenkripsi. Simpan passphrase dengan aman.
      </p>
    </section>
  );
}
