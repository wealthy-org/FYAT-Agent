"use client";

import { useCallback, useMemo, useState } from "react";

import { parseAttemptAmount } from "../policy";
import type { AgentAttempt, AttemptTarget } from "../types";

type AttemptValues = {
  amount: string;
  target: AttemptTarget;
};

const INITIAL_VALUES: AttemptValues = { amount: "3", target: "ALLOWED" };

export function useAgentAttempt() {
  const [values, setValues] = useState<AttemptValues>(INITIAL_VALUES);

  const attempt = useMemo<AgentAttempt | null>(() => {
    const amount = parseAttemptAmount(values.amount);
    return amount === null ? null : { amount, target: values.target };
  }, [values]);

  const setAmount = useCallback((amount: string) => {
    setValues((previous) => ({ ...previous, amount }));
  }, []);

  const setTarget = useCallback((target: AttemptTarget) => {
    setValues((previous) => ({ ...previous, target }));
  }, []);

  return { values, attempt, setAmount, setTarget };
}

export type AgentAttemptForm = ReturnType<typeof useAgentAttempt>;