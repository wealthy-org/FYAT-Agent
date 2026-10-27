import "server-only";

import { z } from "zod";

const serverSchema = z.object({
  DATABASE_URL: z
    .string()
    .refine(
      (value) => /^postgres(ql)?:\/\//.test(value),
      "must be a postgres:// or postgresql:// connection string",
    ),
});

type ServerEnv = z.infer<typeof serverSchema>;

let cached: ServerEnv | undefined;

export function getServerEnv(): ServerEnv {
  if (cached) return cached;

  const parsed = serverSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL,
  });

  if (!parsed.success) {
    throw new Error(
      `Invalid server environment variables:\n${z.prettifyError(parsed.error)}`,
    );
  }

  cached = parsed.data;
  return cached;
}