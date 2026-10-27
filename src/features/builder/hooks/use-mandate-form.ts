"use client";

import { useCallback, useMemo, useState } from "react";
import { z } from "zod";

import { mandateConfigSchema } from "../schema";
import type { MandateFieldName, MandateFormValues } from "../types";

const INITIAL_VALUES: MandateFormValues = {
  action: "SWAP",
  venue: "METEORA_DAMM",
  recipient: "",
  maxPerAction: "5",
  maxTotal: "50",
  expiresInHours: "24",
};

type TouchedFields = Partial<Record<MandateFieldName, true>>;

export function useMandateForm() {
  const [values, setValues] = useState<MandateFormValues>(INITIAL_VALUES);
  const [touched, setTouched] = useState<TouchedFields>({});

  const result = useMemo(() => mandateConfigSchema.safeParse(values), [values]);

  const fieldErrors = useMemo<Partial<Record<string, string[]>>>(
    () => (result.success ? {} : z.flattenError(result.error).fieldErrors),
    [result],
  );

  const setField = useCallback(
    <K extends MandateFieldName>(field: K, value: MandateFormValues[K]) => {
      setValues((previous) => ({ ...previous, [field]: value }));
    },
    [],
  );

  const touchField = useCallback((field: MandateFieldName) => {
    setTouched((previous) =>
      previous[field] ? previous : { ...previous, [field]: true },
    );
  }, []);

  /** Error hanya ditampilkan setelah field pernah disentuh (blur). */
  const errorFor = (field: MandateFieldName): string | undefined =>
    touched[field] ? fieldErrors[field]?.[0] : undefined;

  return {
    values,
    /** null selama form belum valid. Konsumen (6b/6c) menangani kondisi ini. */
    config: result.success ? result.data : null,
    setField,
    touchField,
    errorFor,
  };
}

export type MandateForm = ReturnType<typeof useMandateForm>;