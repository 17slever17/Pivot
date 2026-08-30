import type {
  ProviderDriverKind,
  ProviderOptionDescriptor,
  ProviderOptionSelection,
  ServerProviderModel,
} from "@t3tools/contracts";
import {
  buildProviderOptionSelectionsFromDescriptors,
  getProviderOptionCurrentValue,
  getProviderOptionDescriptors,
} from "@t3tools/shared/model";

import { getProviderModelCapabilities } from "../../providerModels";

const REASONING_EFFORT_DESCRIPTOR_IDS = new Set(["effort", "reasoningEffort"]);

export function isReasoningEffortDescriptor(
  descriptor: Pick<ProviderOptionDescriptor, "id"> | string | null | undefined,
): boolean {
  const id = typeof descriptor === "string" ? descriptor : descriptor?.id;
  return id !== undefined && REASONING_EFFORT_DESCRIPTOR_IDS.has(id);
}

export function reasoningEffortOptionLabel(id: string, fallbackLabel: string): string {
  const normalized = id.toLowerCase().replace(/[ _-]/g, "");
  switch (normalized) {
    case "low":
      return "Low";
    case "medium":
      return "Medium";
    case "high":
      return "High";
    case "xhigh":
    case "extrahigh":
      return "Extra High";
    case "max":
      return "Max";
    default:
      return fallbackLabel;
  }
}

/**
 * Keep a supported reasoning effort in the current model's option bag. Model
 * changes can carry an old value that the new descriptor no longer declares,
 * and some descriptors intentionally have neither a current value nor a
 * default. In that case choose medium, then the first supported option.
 */
export function resolveReasoningEffortModelOptions(input: {
  provider: ProviderDriverKind;
  model: string | null | undefined;
  models: ReadonlyArray<ServerProviderModel>;
  modelOptions: ReadonlyArray<ProviderOptionSelection> | null | undefined;
}): ReadonlyArray<ProviderOptionSelection> | undefined {
  const caps = getProviderModelCapabilities(input.models, input.model, input.provider);
  const descriptors = getProviderOptionDescriptors({
    caps,
    selections: input.modelOptions,
  });
  const reasoningDescriptor = descriptors.find(
    (descriptor): descriptor is Extract<ProviderOptionDescriptor, { type: "select" }> =>
      descriptor.type === "select" && isReasoningEffortDescriptor(descriptor),
  );
  if (!reasoningDescriptor) {
    return input.modelOptions ?? buildProviderOptionSelectionsFromDescriptors(descriptors);
  }

  const rawSelection = input.modelOptions?.find(
    (selection) => selection.id === reasoningDescriptor.id,
  );
  const supportedOptionIds = new Set(reasoningDescriptor.options.map((option) => option.id));
  if (typeof rawSelection?.value === "string" && supportedOptionIds.has(rawSelection.value)) {
    return input.modelOptions ?? undefined;
  }

  const descriptorValue = getProviderOptionCurrentValue(reasoningDescriptor);
  const fallbackValue =
    (typeof descriptorValue === "string" && supportedOptionIds.has(descriptorValue)
      ? descriptorValue
      : undefined) ??
    reasoningDescriptor.options.find((option) => option.id === "medium")?.id ??
    reasoningDescriptor.options[0]?.id;
  if (!fallbackValue) {
    return input.modelOptions ?? buildProviderOptionSelectionsFromDescriptors(descriptors);
  }

  const nextSelections = (input.modelOptions ?? []).filter(
    (selection) => selection.id !== reasoningDescriptor.id,
  );
  nextSelections.push({ id: reasoningDescriptor.id, value: fallbackValue });
  return nextSelections;
}
