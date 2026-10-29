"use client";

import { Button } from "@/components/ui/button";
import { USDC_DECIMALS } from "@/features/builder/constants";

import type { ActiveMandate } from "../mandate-creator-types";

type ExecuteTransferSectionProps = {
  attemptAmount: bigint | null;
  activeMandate: ActiveMandate | null;
  configMatchesMandate: boolean;
  policyPassed: boolean;
  canExecute: boolean;
  busy: boolean;
  status: string;
  error: string;
  onExecute: () => void;
};

export function ExecuteTransferSection({
  attemptAmount,
  activeMandate,
  configMatchesMandate,
  policyPassed,
  canExecute,
  busy,
  status,
  error,
  onExecute,
}: ExecuteTransferSectionProps) {
  return (
    <section className="mt-6 rounded-2xl border border-border-subtle p-4">
      <h4 className="font-medium">Execute Transfer</h4>

      <p className="mt-1 text-sm text-fg-muted">
        Mengirim token sungguhan dari vault ke penerima yang tercatat pada
        mandate. Pastikan jumlah, penerima, jaringan, dan saldo sudah benar.
      </p>

      {attemptAmount !== null && (
        <div className="mt-3 space-y-1 text-sm">
          <p>
            Jumlah percobaan:{" "}
            <span className="font-medium">
              {(Number(attemptAmount) / 10 ** USDC_DECIMALS).toLocaleString(
                "en-US",
                { maximumFractionDigits: USDC_DECIMALS },
              )}{" "}
              token
            </span>
          </p>

          <p className="break-all text-fg-muted">
            Penerima mandate: {activeMandate?.recipient ?? "Belum tersedia"}
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
          Konfigurasi saat ini berbeda dari mandate aktif. Gunakan recipient
          dan batas yang sama dengan mandate tersebut.
        </p>
      )}

      {!policyPassed && (
        <p className="mt-3 text-sm text-fg-muted">
          Jalankan simulasi dan pastikan pemeriksaan policy berstatus PASS
          sebelum mengeksekusi transfer.
        </p>
      )}

      <Button className="mt-4 w-full" disabled={!canExecute} onClick={onExecute}>
        {busy ? "Mengeksekusi transfer..." : "Execute Transfer"}
      </Button>

      {status && (
        <p aria-live="polite" className="mt-3 break-all text-sm text-fg-muted">
          {status}
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 break-all text-sm text-danger">
          {error}
        </p>
      )}
    </section>
  );
}
