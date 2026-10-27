import { cn } from "@/lib/cn";

type SegmentedOption<T extends string> = {
  readonly value: T;
  readonly label: string;
};

type SegmentedControlProps<T extends string> = {
  legend: string;
  /** Nama grup radio. Harus unik per grup di halaman. */
  name: string;
  value: T;
  options: readonly SegmentedOption<T>[];
  onChange: (value: T) => void;
};

export function SegmentedControl<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: SegmentedControlProps<T>) {
  return (
    <fieldset className="min-w-0">
      <legend className="mb-2 text-xs text-fg-muted">{legend}</legend>

      <div className="grid auto-cols-fr grid-flow-col gap-1 rounded-full border border-border-subtle bg-surface p-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "cursor-pointer rounded-full px-4 py-2 text-center text-xs font-medium",
              "text-fg-muted transition-colors hover:text-fg",
              "has-checked:bg-brand-500 has-checked:text-white",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand-400",
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}