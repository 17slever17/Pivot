/**
 * Decodes omp catalog RPC payloads: available models, slash commands, and
 * login providers. The adapter owns session send; this class owns the map.
 *
 * @module provider/omp/OmpCatalogDecoder
 */
import {
  ProviderDriverKind,
  type ModelCapabilities,
  type ProviderOptionDescriptor,
  type ServerProviderModel,
  type ServerProviderSlashCommand,
} from "@t3tools/contracts";
import * as Effect from "effect/Effect";

import { ProviderAdapterRequestError } from "../Errors.ts";

const PROVIDER = ProviderDriverKind.make("omp");

const THINKING_LEVEL_LABELS: Readonly<Record<string, string>> = {
  off: "Off",
  minimal: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  xhigh: "Extra High",
  max: "Max",
  ultra: "Ultra",
};

export interface OmpLoginProvider {
  readonly id: string;
  readonly name: string;
  readonly available: boolean;
  readonly authenticated: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function formatThinkingLevelLabel(level: string): string {
  const knownLabel = THINKING_LEVEL_LABELS[level];
  if (knownLabel) {
    return knownLabel;
  }
  return level.replace(/[-_]+/g, " ").replace(/\b\w/g, (character) => character.toUpperCase());
}

function decodeModelCapabilities(entry: Record<string, unknown>): ModelCapabilities | null {
  const optionDescriptors: ProviderOptionDescriptor[] = [];
  if (isRecord(entry.thinking) && Array.isArray(entry.thinking.efforts)) {
    const efforts = Array.from(
      new Set(
        entry.thinking.efforts.flatMap((value) => {
          if (typeof value !== "string") {
            return [];
          }
          const effort = value.trim();
          return effort.length > 0 ? [effort] : [];
        }),
      ),
    );
    if (efforts.length > 0) {
      const rawDefaultLevel =
        typeof entry.thinking.defaultLevel === "string" ? entry.thinking.defaultLevel.trim() : "";
      const defaultLevel = efforts.includes(rawDefaultLevel) ? rawDefaultLevel : undefined;
      optionDescriptors.push({
        id: "reasoningEffort",
        label: "Reasoning",
        type: "select",
        options: efforts.map((effort) => ({
          id: effort,
          label: formatThinkingLevelLabel(effort),
          ...(effort === defaultLevel ? { isDefault: true } : {}),
        })),
        ...(defaultLevel === undefined ? {} : { currentValue: defaultLevel }),
      });
    }
  }

  // OMP does not currently expose a narrower service-tier capability in its
  // model catalog. The Codex provider family is the only one with a proven
  // Fast-mode RPC (`set_fast_mode`), so keep this descriptor scoped to the
  // `openai-codex` family instead of advertising it for OpenAI-compatible
  // providers such as `openai`, Kilo, or OpenCode.
  if (typeof entry.provider === "string" && entry.provider.trim() === "openai-codex") {
    optionDescriptors.push({
      id: "serviceTier",
      label: "Service Tier",
      type: "select",
      currentValue: "default",
      options: [
        { id: "default", label: "Standard", isDefault: true },
        { id: "priority", label: "Fast", description: "Faster responses at higher cost." },
      ],
    });
  }

  return optionDescriptors.length > 0 ? { optionDescriptors } : null;
}

/**
 * Maps `get_available_models`, `get_available_commands`, and
 * `get_login_providers` RPC bodies onto the catalog types Settings and the
 * composer consume.
 */
export class OmpCatalogDecoder {
  decodeModels(
    response: object,
  ): Effect.Effect<ReadonlyArray<ServerProviderModel>, ProviderAdapterRequestError> {
    if (!isRecord(response) || !isRecord(response.data) || !Array.isArray(response.data.models)) {
      return Effect.fail(
        new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "get_available_models",
          detail: "response data.models must be an array",
        }),
      );
    }
    const models: ServerProviderModel[] = [];
    for (const entry of response.data.models) {
      if (!isRecord(entry) || typeof entry.provider !== "string" || typeof entry.id !== "string") {
        return Effect.fail(
          new ProviderAdapterRequestError({
            provider: PROVIDER,
            method: "get_available_models",
            detail: "each model requires provider and id strings",
          }),
        );
      }
      const provider = entry.provider.trim();
      const id = entry.id.trim();
      const slug = `${provider}/${id}`;
      const name =
        typeof entry.name === "string" && entry.name.trim().length > 0 ? entry.name.trim() : slug;
      models.push({
        slug,
        name,
        subProvider: provider,
        isCustom: false,
        capabilities: decodeModelCapabilities(entry),
      });
    }
    return Effect.succeed(models);
  }

  decodeSlashCommands(
    response: object,
  ): Effect.Effect<ReadonlyArray<ServerProviderSlashCommand>, ProviderAdapterRequestError> {
    if (!isRecord(response) || !isRecord(response.data) || !Array.isArray(response.data.commands)) {
      return Effect.fail(
        new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "get_available_commands",
          detail: "response data.commands must be an array",
        }),
      );
    }
    const commands: ServerProviderSlashCommand[] = [];
    for (const entry of response.data.commands) {
      if (!isRecord(entry) || typeof entry.name !== "string" || entry.name.trim().length === 0) {
        return Effect.fail(
          new ProviderAdapterRequestError({
            provider: PROVIDER,
            method: "get_available_commands",
            detail: "each command requires a non-empty name",
          }),
        );
      }
      const name = entry.name.trim().replace(/^\//, "");
      const description =
        typeof entry.description === "string" && entry.description.trim().length > 0
          ? entry.description.trim()
          : undefined;
      const inputHint =
        isRecord(entry.input) &&
        typeof entry.input.hint === "string" &&
        entry.input.hint.trim().length > 0
          ? entry.input.hint.trim()
          : undefined;
      commands.push({
        name,
        ...(description === undefined ? {} : { description }),
        ...(inputHint === undefined ? {} : { input: { hint: inputHint } }),
      });
    }
    return Effect.succeed(commands);
  }

  decodeLoginProviders(
    response: object,
  ): Effect.Effect<ReadonlyArray<OmpLoginProvider>, ProviderAdapterRequestError> {
    if (
      !isRecord(response) ||
      !isRecord(response.data) ||
      !Array.isArray(response.data.providers)
    ) {
      return Effect.fail(
        new ProviderAdapterRequestError({
          provider: PROVIDER,
          method: "get_login_providers",
          detail: "response data.providers must be an array",
        }),
      );
    }
    const providers: OmpLoginProvider[] = [];
    for (const entry of response.data.providers) {
      if (
        !isRecord(entry) ||
        typeof entry.id !== "string" ||
        typeof entry.name !== "string" ||
        typeof entry.available !== "boolean" ||
        typeof entry.authenticated !== "boolean"
      ) {
        return Effect.fail(
          new ProviderAdapterRequestError({
            provider: PROVIDER,
            method: "get_login_providers",
            detail: "each login provider requires id, name, available, authenticated",
          }),
        );
      }
      providers.push({
        id: entry.id,
        name: entry.name,
        available: entry.available,
        authenticated: entry.authenticated,
      });
    }
    return Effect.succeed(providers);
  }
}
