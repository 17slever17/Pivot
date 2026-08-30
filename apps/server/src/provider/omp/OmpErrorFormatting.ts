export interface OmpAssistantOutcome {
  readonly stopReason: string | undefined;
  readonly errorMessage: string | undefined;
  readonly provider: string | undefined;
  readonly model: string | undefined;
  readonly errorStatus: string | number | undefined;
  readonly errorId: string | number | undefined;
  readonly contentType: string | undefined;
}

const PLAIN_ERROR_MESSAGE_MAX_LENGTH = 2_000;
const HTML_ERROR_MESSAGE_MAX_LENGTH = 500;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function readOptionalString(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}

function readScalar(value: unknown): string | number | undefined {
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

export function readOmpAssistantOutcome(value: unknown): OmpAssistantOutcome | undefined {
  if (!isRecord(value) || value.role !== "assistant") {
    return undefined;
  }
  return {
    stopReason: readString(value.stopReason),
    errorMessage: readOptionalString(value.errorMessage),
    provider: readString(value.provider),
    model: readString(value.model),
    errorStatus: readScalar(value.errorStatus),
    errorId: readScalar(value.errorId),
    contentType: readString(value.contentType ?? value.errorContentType ?? value.mimeType),
  };
}

function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&#x27;/gi, "'");
}

function isHtmlError(outcome: OmpAssistantOutcome, message: string): boolean {
  return (
    outcome.contentType?.toLowerCase().includes("text/html") === true ||
    /<\s*!doctype\s+html\b|<\s*html(?:\s|>)/i.test(message)
  );
}

function formatHtmlErrorMessage(message: string): string {
  const visible = decodeHtmlEntities(
    message
      .replace(/<\s*(?:style|script|svg)\b[^>]*>[\s\S]*?<\/\s*(?:style|script|svg)\s*>/gi, " ")
      .replace(/<[^>]*>/g, " ")
      .replace(/\[\s*IP\s*:[^\]]*\]/gi, " ")
      .replace(/\bRay\s*ID\s*:\s*[A-Za-z0-9-]+/gi, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
  if (visible.length === 0) {
    return "provider returned an HTML error page.";
  }
  return visible.length > HTML_ERROR_MESSAGE_MAX_LENGTH
    ? `${visible.slice(0, HTML_ERROR_MESSAGE_MAX_LENGTH)}...`
    : visible;
}

function formatPlainErrorMessage(message: string): string {
  const normalized = message.replace(/\s+/g, " ").trim();
  if (normalized.length === 0) {
    return "omp provider returned an error without details.";
  }
  return normalized.length > PLAIN_ERROR_MESSAGE_MAX_LENGTH
    ? `${normalized.slice(0, PLAIN_ERROR_MESSAGE_MAX_LENGTH)}...`
    : normalized;
}

function formatMetadata(outcome: OmpAssistantOutcome): string {
  const provider = outcome.provider;
  const model = outcome.model ? `/${outcome.model}` : "";
  const status = outcome.errorStatus === undefined ? "" : ` HTTP ${outcome.errorStatus}`;
  const errorId = outcome.errorId === undefined ? "" : ` (error ${outcome.errorId})`;
  return provider === undefined && model.length === 0 && status.length === 0 && errorId.length === 0
    ? ""
    : `${provider ?? "omp"}${model}${status}${errorId}`;
}

export function formatOmpAssistantError(outcome: OmpAssistantOutcome): string | undefined {
  if (outcome.stopReason !== "error") {
    return undefined;
  }
  const rawMessage = outcome.errorMessage ?? "";
  const message = isHtmlError(outcome, rawMessage)
    ? formatHtmlErrorMessage(rawMessage)
    : formatPlainErrorMessage(rawMessage);
  const metadata = formatMetadata(outcome);
  return metadata.length === 0 ? message : `${metadata}: ${message}`;
}

export function readOmpAgentEndError(
  frame: Record<string, unknown>,
  fallbackAssistant?: OmpAssistantOutcome,
): string | undefined {
  let lastAssistant = fallbackAssistant;
  if (Array.isArray(frame.messages)) {
    for (const message of frame.messages) {
      const outcome = readOmpAssistantOutcome(message);
      if (outcome !== undefined) {
        lastAssistant = outcome;
      }
    }
  }
  return lastAssistant === undefined ? undefined : formatOmpAssistantError(lastAssistant);
}
