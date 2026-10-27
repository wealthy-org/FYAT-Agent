import {
  Check,
  Circle,
  CircleCheck,
  CircleDashed,
  CircleMinus,
  CircleX,
  LoaderCircle,
  X,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/cn";

import type { FlowStep, FlowStepStatus } from "../flow";

const STATUS_STYLES: Record<
  FlowStepStatus,
  { icon: LucideIcon; className: string; label: string }
> = {
  complete: { icon: CircleCheck, className: "text-success", label: "Complete" },
  blocked: { icon: CircleX, className: "text-danger", label: "Blocked" },
  failed: { icon: CircleX, className: "text-danger", label: "Failed" },
  running: { icon: LoaderCircle, className: "text-brand-400", label: "Running" },
  skipped: { icon: CircleMinus, className: "text-fg-subtle", label: "Skipped" },
  pending: { icon: CircleDashed, className: "text-brand-400", label: "Not run" },
  idle: { icon: Circle, className: "text-fg-subtle", label: "Waiting" },
};

export function FlowStepList({ steps }: { steps: readonly FlowStep[] }) {
  return (
    <ol className="mt-8">
      {steps.map((step, index) => {
        const { icon: Icon, className, label } = STATUS_STYLES[step.status];
        const isLast = index === steps.length - 1;

        return (
          <li key={step.id} className={cn("relative pl-10", !isLast && "pb-6")}>
            {!isLast && (
              <span
                aria-hidden="true"
                className="absolute left-2.75 top-7 h-[calc(100%-1.75rem)] w-px bg-border-subtle"
              />
            )}

            <Icon
              aria-hidden="true"
              className={cn(
                "absolute left-0 top-0 size-6",
                className,
                step.status === "running" && "animate-spin",
              )}
            />

            <div className="flex flex-wrap items-baseline gap-x-3">
              <h4 className="font-display text-sm font-medium">{step.title}</h4>
              <span className={cn("text-[11px]", className)}>{label}</span>
            </div>
            <p className="mt-1 text-sm text-fg-muted">{step.description}</p>

            {step.checks && (
              <ul className="mt-3 space-y-2">
                {step.checks.map((check) => (
                  <li key={check.id} className="flex items-start gap-2 text-xs">
                    {check.passed ? (
                      <Check
                        aria-hidden="true"
                        className="mt-0.5 size-3.5 shrink-0 text-success"
                      />
                    ) : (
                      <X
                        aria-hidden="true"
                        className="mt-0.5 size-3.5 shrink-0 text-danger"
                      />
                    )}
                    <span>
                      <span className="sr-only">
                        {check.passed ? "Passed: " : "Failed: "}
                      </span>
                      <span className="text-fg">{check.label}</span>
                      <span className="block font-mono text-fg-subtle">
                        {check.detail}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {step.logs && step.logs.length > 0 && (
              <details className="mt-3">
                <summary className="cursor-pointer text-xs text-fg-muted hover:text-fg">
                  Program logs
                </summary>
                {/* Teks biasa: log berasal dari luar aplikasi */}
                <pre
                  tabIndex={0}
                  className="mt-2 max-h-48 overflow-auto rounded-lg border border-border-subtle bg-canvas p-3 font-mono text-[11px] leading-5 text-fg-muted"
                >
                  {step.logs.join("\n")}
                </pre>
              </details>
            )}
          </li>
        );
      })}
    </ol>
  );
}