
"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui/eyebrow";
import { env } from "@/lib/env";

import { buildFlowSteps } from "../flow";
import type { AgentAttemptForm } from "../hooks/use-agent-attempt";
import type { SimulationController } from "../hooks/use-simulation";
import type { MandateConfig } from "../types";
import { AgentAttemptFields } from "./agent-attempt-fields";
import { FlowStepList } from "./flow-step-list";
import { SimulationControls } from "./simulation-controls";
import { USDC_DECIMALS } from "@/features/builder/constants";
import {
  MIN_PASSPHRASE_LENGTH,
  isPassphraseValid,
} from "../lib/session-vault";

type CreatedMandate = {
  signature: string;
  mandatePda: string;
  sessionPubkey: string;
  response: unknown;
  id: string;
};

type ActiveMandate = {
  id: string;
  mandatePda: string;
  owner: string;
  mint: string;
  recipient: string;
  maxPerAction: bigint;
  maxTotal: bigint;
};

type ExecutionFlowPreviewProps = {
  config: MandateConfig | null;
  attemptForm: AgentAttemptForm;
  simulation: SimulationController;
  mandateCreator: {
    create: (config: MandateConfig) => Promise<CreatedMandate>;
    execute: (amount: bigint) => Promise<string>;
    saveSession: (passphrase: string) => Promise<void>;
    restoreSession: (
      mandatePda: string,
      passphrase: string,
    ) => Promise<ActiveMandate>;
    storedSessions: string[];
    sessionBusy: boolean;
    refreshStoredSessions: () => void;
    busy: boolean;
    status: string;
    error: string;
    signature: string;
    sessionPubkey: string;
    activeMandate: ActiveMandate | null;
  };
};

export function ExecutionFlowPreview({
  config,
  attemptForm,
  simulation,
  mandateCreator,
}: ExecutionFlowPreviewProps) {
  const { attempt } = attemptForm;
  const { state, start, walletConnected } = simulation;

  const [executeError, setExecuteError] = useState("");
  const [executeStatus, setExecuteStatus] = useState("");
  const [executeBusy, setExecuteBusy] = useState(false);

  const [sessionPassphrase, setSessionPassphrase] = useState("");
  const [restorePda, setRestorePda] = useState("");
  const [sessionMessage, setSessionMessage] = useState("");
  const [sessionError, setSessionError] = useState("");

  const steps = useMemo(
    () => buildFlowSteps(config, attempt, state),
    [config, attempt, state],
  );

  const verifyStatus = steps.find(
    (step) => step.id === "verify",
  )?.status;

  const policyPassed = verifyStatus === "complete";
  const activeMandate = mandateCreator.activeMandate;

  const configMatchesMandate =
    !!config &&
    !!activeMandate &&
    config.action === "TRANSFER" &&
    config.recipient === activeMandate.recipient &&
    config.maxPerAction === activeMandate.maxPerAction &&
    config.maxTotal === activeMandate.maxTotal;

  const canExecute =
    walletConnected &&
    policyPassed &&
    state.status !== "running" &&
    !!attempt &&
    attempt.target === "ALLOWED" &&
    configMatchesMandate &&
    !!mandateCreator.sessionPubkey &&
    !mandateCreator.busy &&
    !mandateCreator.sessionBusy &&
    !executeBusy;

  async function handleExecute() {
    if (!config || !attempt || !activeMandate || !canExecute) {
      return;
    }

    setExecuteError("");
    setExecuteStatus("");
    setExecuteBusy(true);

    try {
      setExecuteStatus("Mengirim transaksi execute ke Solana...");

      const txSignature = await mandateCreator.execute(
        attempt.amount,
      );

      setExecuteStatus(
        `Transfer berhasil dikonfirmasi: ${txSignature}`,
      );
    } catch (cause) {
      setExecuteError(
        cause instanceof Error
          ? cause.message
          : "Eksekusi transfer gagal.",
      );
      setExecuteStatus("");
    } finally {
      setExecuteBusy(false);
    }
  }

  async function handleSaveSession() {
    setSessionError("");
    setSessionMessage("");

    try {
      await mandateCreator.saveSession(sessionPassphrase);
      setSessionMessage(
        "Session berhasil dienkripsi dan disimpan di browser ini.",
      );
      mandateCreator.refreshStoredSessions();
    } catch (cause) {
      setSessionError(
        cause instanceof Error
          ? cause.message
          : "Gagal menyimpan session.",
      );
    }
  }

  async function handleRestoreSession() {
    setSessionError("");
    setSessionMessage("");

    if (!restorePda.trim()) {
      setSessionError("Pilih mandate PDA yang ingin dipulihkan.");
      return;
    }

    try {
      await mandateCreator.restoreSession(
        restorePda,
        sessionPassphrase,
      );

      setSessionMessage(
        "Session berhasil dipulihkan dan diverifikasi dengan data on-chain.",
      );
    } catch (cause) {
      setSessionError(
        cause instanceof Error
          ? cause.message
          : "Gagal memulihkan session.",
      );
    }
  }

  return (
    <Card className="p-6 md:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Eyebrow>2 / Execution flow</Eyebrow>
          <h3 className="mt-2 font-display text-xl font-medium">
            Build → Verify → Simulate → Execute
          </h3>
        </div>

        <div aria-live="polite" className="shrink-0">
          {policyPassed && (
            <span className="rounded-full border border-success/40 bg-success/10 px-3 py-1 text-xs font-medium text-success">
              PASS
            </span>
          )}

          {verifyStatus === "blocked" && (
            <span className="rounded-full border border-danger/40 bg-danger/10 px-3 py-1 text-xs font-medium text-danger">
              BLOCKED
            </span>
          )}
        </div>
      </div>

      <AgentAttemptFields config={config} form={attemptForm} />

      <SimulationControls
        walletConnected={walletConnected}
        policyPassed={policyPassed}
        running={state.status === "running"}
        onRun={() => void start()}
      />

      <section className="mt-6 rounded-2xl border border-border-subtle p-4">
        <h4 className="font-medium">Buat Mandate On-chain</h4>

        <p className="mt-1 text-sm text-fg-muted">
          Membuat mandate on-chain memerlukan persetujuan wallet.
          Langkah ini belum mengirim token.
        </p>

        <Button
          className="mt-4 w-full"
          disabled={
            !walletConnected ||
            !config ||
            config.action !== "TRANSFER" ||
            mandateCreator.busy ||
            mandateCreator.sessionBusy ||
            executeBusy
          }
          onClick={() => {
            if (config) {
              void mandateCreator.create(config).catch(() => undefined);
            }
          }}
        >
          {mandateCreator.busy
            ? "Memproses transaksi..."
            : "Buat Mandate On-chain"}
        </Button>

        {activeMandate && (
          <div className="mt-4 space-y-2 rounded-xl border border-border-subtle p-3 text-sm">
            <p className="font-medium">Mandate aktif</p>

            <p className="text-fg-muted">ID aplikasi</p>
            <p className="break-all">{activeMandate.id}</p>

            <p className="text-fg-muted">Mandate PDA</p>
            <p className="break-all">{activeMandate.mandatePda}</p>

            <p className="text-fg-muted">Session public key</p>
            <p className="break-all">
              {mandateCreator.sessionPubkey}
            </p>
          </div>
        )}

        {mandateCreator.status && (
          <p
            aria-live="polite"
            className="mt-3 break-all text-sm text-fg-muted"
          >
            {mandateCreator.status}
          </p>
        )}

        {mandateCreator.error && (
          <p role="alert" className="mt-3 break-all text-sm text-danger">
            {mandateCreator.error}
          </p>
        )}

        {mandateCreator.signature && (
          <div className="mt-3 space-y-2 text-sm">
            <p className="break-all">
              Signature: {mandateCreator.signature}
            </p>

            {env.NEXT_PUBLIC_SOLANA_NETWORK === "devnet" && (
              <a
                className="text-brand-400 underline"
                href={`https://explorer.solana.com/tx/${mandateCreator.signature}?cluster=devnet`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Lihat transaksi di Solana Explorer
              </a>
            )}
          </div>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-border-subtle p-4">
        <h4 className="font-medium">Session Key Vault</h4>

        <p className="mt-1 text-sm text-fg-muted">
          Simpan session key dengan passphrase agar dapat dipulihkan
          setelah halaman dimuat ulang. Passphrase tidak boleh dibagikan.
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
          value={sessionPassphrase}
          onChange={(event) =>
            setSessionPassphrase(event.target.value)
          }
          minLength={MIN_PASSPHRASE_LENGTH}
          placeholder={`Minimal ${MIN_PASSPHRASE_LENGTH} karakter`}
          className="mt-2 w-full rounded-xl border border-border-subtle bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-400"
        />

        <Button
          className="mt-3 w-full"
          disabled={
            !walletConnected ||
            !activeMandate ||
            !mandateCreator.sessionPubkey ||
            mandateCreator.busy ||
            mandateCreator.sessionBusy ||
            executeBusy ||
            !isPassphraseValid(sessionPassphrase)
          }
          onClick={() => void handleSaveSession()}
        >
          {mandateCreator.sessionBusy
            ? "Menyimpan session..."
            : "Enkripsi & Simpan Session"}
        </Button>

        <div className="mt-5 border-t border-border-subtle pt-4">
          <label
            htmlFor="restore-mandate"
            className="block text-sm font-medium"
          >
            Pulihkan session berdasarkan mandate PDA
          </label>

          <select
            id="restore-mandate"
            value={restorePda}
            onChange={(event) => setRestorePda(event.target.value)}
            className="mt-2 w-full rounded-xl border border-border-subtle bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-400"
          >
            <option value="">Pilih session tersimpan...</option>

            {mandateCreator.storedSessions.map((pda) => (
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
            className="mt-2 w-full rounded-xl border border-border-subtle bg-transparent px-3 py-2 text-sm outline-none focus:border-brand-400"
          />

          <Button
            className="mt-3 w-full"
            disabled={
              !walletConnected ||
              !restorePda.trim() ||
              !sessionPassphrase ||
              mandateCreator.busy ||
              mandateCreator.sessionBusy ||
              executeBusy
            }
            onClick={() => void handleRestoreSession()}
          >
            {mandateCreator.sessionBusy
              ? "Memulihkan session..."
              : "Pulihkan & Verifikasi Session"}
          </Button>
        </div>

        {sessionMessage && (
          <p
            aria-live="polite"
            className="mt-3 break-all text-sm text-success"
          >
            {sessionMessage}
          </p>
        )}

        {sessionError && (
          <p
            role="alert"
            className="mt-3 break-all text-sm text-danger"
          >
            {sessionError}
          </p>
        )}

        <p className="mt-3 text-xs text-fg-subtle">
          Session tersimpan di browser ini. Menghapus data browser dapat
          menghilangkan salinan terenkripsi. Simpan passphrase dengan aman.
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-border-subtle p-4">
        <h4 className="font-medium">Execute Transfer</h4>

        <p className="mt-1 text-sm text-fg-muted">
          Mengirim token sungguhan dari vault ke penerima yang tercatat
          pada mandate. Pastikan jumlah, penerima, jaringan, dan saldo
          sudah benar.
        </p>

        {attempt && (
          <div className="mt-3 space-y-1 text-sm">
            <p>
              Jumlah percobaan:{" "}
              <span className="font-medium">
                {(
                  Number(attempt.amount) /
                  10 ** USDC_DECIMALS
                ).toLocaleString("en-US", {
                  maximumFractionDigits: USDC_DECIMALS,
                })}{" "}
                token
              </span>
            </p>

            <p className="break-all text-fg-muted">
              Penerima mandate:{" "}
              {activeMandate?.recipient ?? "Belum tersedia"}
            </p>
          </div>
        )}

        {!activeMandate && (
          <p className="mt-3 text-sm text-fg-muted">
            Buat mandate atau pulihkan session terlebih dahulu.
          </p>
        )}

        {activeMandate && !configMatchesMandate && (
          <p className="mt-3 text-sm text-danger">
            Konfigurasi saat ini berbeda dari mandate aktif. Gunakan
            recipient dan batas yang sama dengan mandate tersebut.
          </p>
        )}

        {!policyPassed && (
          <p className="mt-3 text-sm text-fg-muted">
            Jalankan simulasi dan pastikan pemeriksaan policy berstatus
            PASS sebelum mengeksekusi transfer.
          </p>
        )}

        <Button
          className="mt-4 w-full"
          disabled={!canExecute}
          onClick={() => void handleExecute()}
        >
          {executeBusy
            ? "Mengeksekusi transfer..."
            : "Execute Transfer"}
        </Button>

        {executeStatus && (
          <p
            aria-live="polite"
            className="mt-3 break-all text-sm text-fg-muted"
          >
            {executeStatus}
          </p>
        )}

        {executeError && (
          <p
            role="alert"
            className="mt-3 break-all text-sm text-danger"
          >
            {executeError}
          </p>
        )}
      </section>

      <FlowStepList steps={steps} />

      <p className="mt-8 border-t border-border-subtle pt-4 text-xs text-fg-subtle">
        Simulasi policy adalah preview lokal. Batas transfer yang
        sebenarnya tetap ditegakkan oleh program mandate on-chain.
      </p>
    </Card>
  );
}
