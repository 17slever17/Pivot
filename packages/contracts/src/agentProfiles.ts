import * as Schema from "effect/Schema";

import { IsoDateTime, TrimmedNonEmptyString } from "./baseSchemas.ts";
import { ProviderInstanceId } from "./providerInstance.ts";

/** A Pivot-owned named OMP child profile. */
export const OmpAgentProfileName = TrimmedNonEmptyString.check(
  Schema.isMaxLength(64),
  Schema.isPattern(/^[A-Za-z][A-Za-z0-9_-]*$/),
);
export type OmpAgentProfileName = typeof OmpAgentProfileName.Type;

export const OmpAgentProfileEffort = Schema.Literals([
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);
export type OmpAgentProfileEffort = typeof OmpAgentProfileEffort.Type;

export const OmpAgentProfile = Schema.Struct({
  name: OmpAgentProfileName,
  description: TrimmedNonEmptyString,
  usageHint: Schema.optionalKey(TrimmedNonEmptyString),
  model: TrimmedNonEmptyString,
  effort: OmpAgentProfileEffort,
  systemPrompt: Schema.String,
  readOnly: Schema.Boolean,
  canSpawn: Schema.Boolean,
  createdAt: IsoDateTime,
  updatedAt: IsoDateTime,
});
export type OmpAgentProfile = typeof OmpAgentProfile.Type;

export const OmpAgentProfileUpsertInput = Schema.Struct({
  name: OmpAgentProfileName,
  description: TrimmedNonEmptyString,
  usageHint: Schema.optionalKey(TrimmedNonEmptyString),
  model: TrimmedNonEmptyString,
  effort: OmpAgentProfileEffort,
  systemPrompt: Schema.String,
  readOnly: Schema.Boolean,
  canSpawn: Schema.Boolean,
});
export type OmpAgentProfileUpsertInput = typeof OmpAgentProfileUpsertInput.Type;

export const ServerOmpAgentProfilesListInput = Schema.Struct({
  instanceId: Schema.optionalKey(ProviderInstanceId),
});
export type ServerOmpAgentProfilesListInput = typeof ServerOmpAgentProfilesListInput.Type;

export const ServerOmpAgentProfilesListResult = Schema.Struct({
  profiles: Schema.Array(OmpAgentProfile),
});
export type ServerOmpAgentProfilesListResult = typeof ServerOmpAgentProfilesListResult.Type;

export const ServerOmpAgentProfileUpsertInput = Schema.Struct({
  instanceId: Schema.optionalKey(ProviderInstanceId),
  ...OmpAgentProfileUpsertInput.fields,
});
export type ServerOmpAgentProfileUpsertInput = typeof ServerOmpAgentProfileUpsertInput.Type;

export const ServerOmpAgentProfileUpsertResult = Schema.Struct({
  profile: OmpAgentProfile,
});
export type ServerOmpAgentProfileUpsertResult = typeof ServerOmpAgentProfileUpsertResult.Type;

export const ServerOmpAgentProfileDeleteInput = Schema.Struct({
  instanceId: Schema.optionalKey(ProviderInstanceId),
  name: OmpAgentProfileName,
});
export type ServerOmpAgentProfileDeleteInput = typeof ServerOmpAgentProfileDeleteInput.Type;

export const ServerOmpAgentProfileDeleteResult = Schema.Struct({
  profiles: Schema.Array(OmpAgentProfile),
});
export type ServerOmpAgentProfileDeleteResult = typeof ServerOmpAgentProfileDeleteResult.Type;

/** Explicit, local-only seed from the allow-listed Codex agent files. */
export const ServerOmpAgentProfilesImportCodexInput = Schema.Struct({
  instanceId: Schema.optionalKey(ProviderInstanceId),
});
export type ServerOmpAgentProfilesImportCodexInput =
  typeof ServerOmpAgentProfilesImportCodexInput.Type;

export const ServerOmpAgentProfilesImportCodexResult = Schema.Struct({
  profiles: Schema.Array(OmpAgentProfile),
  importedAt: IsoDateTime,
});
export type ServerOmpAgentProfilesImportCodexResult =
  typeof ServerOmpAgentProfilesImportCodexResult.Type;

export class OmpAgentProfileError extends Schema.TaggedErrorClass<OmpAgentProfileError>()(
  "OmpAgentProfileError",
  { reason: TrimmedNonEmptyString, cause: Schema.optional(Schema.Defect()) },
) {
  override get message(): string {
    return `omp agent profile failed: ${this.reason}`;
  }
}

export class ServerOmpAgentProfileError extends Schema.TaggedErrorClass<ServerOmpAgentProfileError>()(
  "ServerOmpAgentProfileError",
  { reason: TrimmedNonEmptyString, cause: Schema.optional(Schema.Defect()) },
) {
  override get message(): string {
    return `omp agent profile failed: ${this.reason}`;
  }
}
