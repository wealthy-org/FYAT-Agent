import "server-only";

export type ApiIssue = { path: string; message: string };

type ApiErrorOptions = {
  issues?: readonly ApiIssue[];
  headers?: Record<string, string>;
};

/** Error yang AMAN ditampilkan ke klien. Error lain selalu menjadi 500 generik. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly issues?: readonly ApiIssue[];
  readonly headers?: Record<string, string>;

  constructor(
    status: number,
    code: string,
    message: string,
    options: ApiErrorOptions = {},
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
    this.issues = options.issues;
    this.headers = options.headers;
  }
}

export const ApiErrors = {
  invalidJson: () =>
    new ApiError(400, "INVALID_JSON", "Request body must be valid JSON"),

  validation: (issues: readonly ApiIssue[]) =>
    new ApiError(400, "VALIDATION_FAILED", "Request validation failed", {
      issues,
    }),

  unauthenticated: (message = "Missing or invalid wallet signature") =>
    new ApiError(401, "UNAUTHENTICATED", message),

  forbidden: (message: string) => new ApiError(403, "FORBIDDEN", message),

  notFound: (message: string) => new ApiError(404, "NOT_FOUND", message),

  payloadTooLarge: () =>
    new ApiError(413, "PAYLOAD_TOO_LARGE", "Request body is too large"),

  unsupportedMediaType: () =>
    new ApiError(
      415,
      "UNSUPPORTED_MEDIA_TYPE",
      "Content-Type must be application/json",
    ),

  rateLimited: (retryAfterSeconds: number) =>
    new ApiError(429, "RATE_LIMITED", "Too many requests, slow down", {
      headers: { "Retry-After": String(retryAfterSeconds) },
    }),
};