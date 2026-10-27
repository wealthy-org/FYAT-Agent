import { ChevronDown } from "lucide-react";
import {
  useId,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from "react";

import { cn } from "@/lib/cn";

type FieldMessages = {
  hint?: string;
  error?: string;
};

type FieldShellProps = FieldMessages & {
  id: string;
  label: string;
  children: ReactNode;
};

function describedBy(id: string, { hint, error }: FieldMessages) {
  if (error) return `${id}-message`;
  if (hint) return `${id}-message`;
  return undefined;
}

function FieldShell({ id, label, hint, error, children }: FieldShellProps) {
  const message = error ?? hint;

  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-xs text-fg-muted">
        {label}
      </label>
      {children}
      {/* Wadah live-region selalu ada agar perubahan pesan diumumkan screen reader */}
      <div aria-live="polite">
        {message && (
          <p
            id={`${id}-message`}
            className={cn(
              "mt-1.5 text-xs",
              error ? "text-danger" : "text-fg-subtle",
            )}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

function controlClasses(hasError: boolean) {
  return cn(
    "h-11 w-full rounded-xl border bg-surface px-4 text-sm text-fg",
    "placeholder:text-fg-subtle transition-colors",
    "focus-visible:border-border-strong",
    hasError ? "border-danger/70" : "border-border-subtle",
  );
}

/* ------------------------------ TextField ------------------------------ */

type TextFieldProps = FieldMessages &
  Omit<ComponentPropsWithoutRef<"input">, "id" | "className"> & {
    label: string;
    /** Teks tetap di sisi kanan input, misalnya satuan "USDC". */
    suffix?: string;
    inputClassName?: string;
  };

export function TextField({
  label,
  hint,
  error,
  suffix,
  inputClassName,
  ...inputProps
}: TextFieldProps) {
  const id = useId();

  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, { hint, error })}
          className={cn(controlClasses(Boolean(error)), suffix && "pr-16")}
          {...inputProps}
        />
        {suffix && (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs text-fg-subtle"
          >
            {suffix}
          </span>
        )}
      </div>
    </FieldShell>
  );
}

/* ----------------------------- SelectField ----------------------------- */

type SelectOption = { readonly value: string; readonly label: string };

type SelectFieldProps = FieldMessages & {
  label: string;
  value: string;
  options: readonly SelectOption[];
  onChange: (value: string) => void;
  onBlur?: () => void;
};

export function SelectField({
  label,
  hint,
  error,
  value,
  options,
  onChange,
  onBlur,
}: SelectFieldProps) {
  const id = useId();

  return (
    <FieldShell id={id} label={label} hint={hint} error={error}>
      <div className="relative">
        <select
          id={id}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, { hint, error })}
          className={cn(controlClasses(Boolean(error)), "appearance-none pr-10")}
        >
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown
          aria-hidden="true"
          className="pointer-events-none absolute right-4 top-1/2 size-4 -translate-y-1/2 text-fg-subtle"
        />
      </div>
    </FieldShell>
  );
}