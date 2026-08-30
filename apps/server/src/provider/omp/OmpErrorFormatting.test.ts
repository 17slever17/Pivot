import { describe, expect, it } from "vite-plus/test";

import {
  formatOmpAssistantError,
  readOmpAgentEndError,
  readOmpAssistantOutcome,
} from "./OmpErrorFormatting.ts";

describe("OmpErrorFormatting", () => {
  it("turns an HTML provider page into a short safe error with metadata", () => {
    const outcome = readOmpAssistantOutcome({
      role: "assistant",
      provider: "openai-codex",
      model: "gpt-5.6-luna",
      stopReason: "error",
      errorStatus: 403,
      errorId: 16781312,
      contentType: "text/html; charset=utf-8",
      errorMessage:
        '<!doctype html><html><head><style>body{color:red}</style><script>alert("x")</script></head><body><h1>Unable to load site</h1><p>[IP:89.22.145.11 | Ray ID:a32f668e9f88f10e]</p><svg><path /></svg></body></html>',
    });

    expect(outcome).toBeDefined();
    const formatted = formatOmpAssistantError(outcome!);
    expect(formatted).toContain("openai-codex/gpt-5.6-luna HTTP 403 (error 16781312)");
    expect(formatted).toContain("Unable to load site");
    expect(formatted).not.toMatch(/<|>|style|script|svg|89\.22\.145\.11|Ray ID/i);
    expect(formatted!.length).toBeLessThanOrEqual(600);
  });

  it("preserves useful plain and JSON provider errors", () => {
    const plain = formatOmpAssistantError(
      readOmpAssistantOutcome({
        role: "assistant",
        provider: "openai-codex",
        stopReason: "error",
        errorMessage: "Provider rejected the request (status 403). Retry after login.",
      })!,
    );
    const json = formatOmpAssistantError(
      readOmpAssistantOutcome({
        role: "assistant",
        provider: "openai-codex",
        stopReason: "error",
        errorMessage: '{"error":{"code":"insufficient_quota","message":"Quota exceeded"}}',
      })!,
    );

    expect(plain).toContain("Provider rejected the request (status 403). Retry after login.");
    expect(json).toContain('"insufficient_quota"');
    expect(json).toContain("Quota exceeded");
  });

  it("uses streamed assistant metadata when terminal agent_end is compacted", () => {
    const formatted = readOmpAgentEndError(
      { type: "agent_end", messages: [], isTerminal: true },
      readOmpAssistantOutcome({
        role: "assistant",
        provider: "openai-codex",
        model: "gpt-5.6-luna",
        stopReason: "error",
        errorStatus: 403,
        errorMessage: "Compacted provider error.",
      }),
    );

    expect(formatted).toContain("openai-codex/gpt-5.6-luna HTTP 403");
    expect(formatted).toContain("Compacted provider error.");
  });

  it("does not report successful assistant outcomes as errors", () => {
    expect(
      formatOmpAssistantError(
        readOmpAssistantOutcome({
          role: "assistant",
          provider: "openai-codex",
          model: "gpt-5.6-luna",
          stopReason: "stop",
          errorMessage: "stale error from an earlier attempt",
        })!,
      ),
    ).toBeUndefined();
  });
});
